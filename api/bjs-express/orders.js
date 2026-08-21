// File: api/bjs-express/orders.js
// Vercel Serverless Function — daftar pesanan BJS Express (kurir internal)
// untuk tab Penugasan di modul admin, plus penugasan kurir (POST /api/bjs-express/assign).
import { createClient } from "@supabase/supabase-js";
import { sendOrderNotification, STORE_BASE_URL } from "../../lib/notifications.js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST" && isAssignPath(req.url)) {
    return handleAssign(req, res);
  }
  if (req.method === "POST" && isCancelPath(req.url)) {
    return handleCancel(req, res);
  }
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}

function isAssignPath(url) {
  return /\/api\/bjs-express\/assign$/.test(String(url || ""));
}

function isCancelPath(url) {
  return /\/api\/bjs-express\/cancel-assignment$/.test(String(url || ""));
}

async function handleGet(req, res) {
  try {
    const status = String(req.query.status || "paid,shipped")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        created_at,
        total_amount,
        shipping_cost,
        notes,
        courier_details,
        shipping_address,
        customer_id,
        customers (id, nama_pelanggan, telepon),
        order_items (id, quantity, price, products (id, nama, kode, image_url)),
        courier_assignments (id, status, notes, photo_url, completed_at, couriers (id, name, phone), courier_assignment_events (id, status, note, created_at))
      `)
      .eq("courier_details->>code", "internal")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status.length > 0) {
      query = query.in("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("BJS Express orders Supabase error:", error);
      return res.status(500).json({ message: "Gagal memuat pesanan BJS Express.", details: error.message });
    }
    res.status(200).json(data || []);
  } catch (err) {
    console.error("BJS Express orders error:", err);
    res.status(500).json({ message: "Gagal memuat pesanan BJS Express.", details: err.message });
  }
}

async function handleAssign(req, res) {
  try {
    const { order_id, courier_id, notes } = req.body;
    if (!order_id || !courier_id) {
      return res.status(400).json({ message: "order_id dan courier_id wajib diisi." });
    }

    // 1) Cek pesanan + kurir valid
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, courier_details, order_number, customer_id, customers (nama_pelanggan, telepon)")
      .eq("id", order_id)
      .single();
    if (orderError || !order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }

    const courierCode = String(order.courier_details?.code || "").toLowerCase();
    if (courierCode !== "internal") {
      return res.status(400).json({ message: "Pesanan ini bukan kurir internal BJS Express." });
    }

    const { data: courier, error: courierError } = await supabase
      .from("couriers")
      .select("id, name, is_active")
      .eq("id", courier_id)
      .maybeSingle();
    if (courierError || !courier || !courier.is_active) {
      return res.status(400).json({ message: "Kurir tidak ditemukan atau nonaktif." });
    }

    // 2) Insert/update penugasan (1 per order via UNIQUE order_id)
    const { data: assignment, error: assignError } = await supabase
      .from("courier_assignments")
      .upsert(
        {
          order_id,
          courier_id,
          notes: notes || null,
          status: "assigned",
          assigned_at: new Date().toISOString(),
          photo_url: null,
          completed_at: null,
        },
        { onConflict: "order_id" },
      )
      .select()
      .single();
    if (assignError) {
      console.error("Assign upsert error:", assignError);
      return res.status(500).json({ message: "Gagal menyimpan penugasan.", details: assignError.message });
    }

    // 3) Catat event timeline
    await supabase.from("courier_assignment_events").insert({
      assignment_id: assignment.id,
      status: "assigned",
      note: notes || null,
    });

    // 4) Update status pesanan -> shipped (shipping_status assigned)
    const cd = order.courier_details || {};
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        courier_details: {
          ...cd,
          shipping_status: "assigned",
          courier_name: courier.name,
          courier_id,
        },
      })
      .eq("id", order_id);
    if (updateError) {
      console.error("Assign order update error:", updateError);
      return res.status(500).json({ message: "Penugasan tersimpan, tapi gagal update pesanan.", details: updateError.message });
    }

    // 5) Notifikasi WhatsApp ke pelanggan (tidak menggagalkan penugasan)
    const customer = Array.isArray(order.customers) ? (order.customers[0] || null) : (order.customers || null);
    const phone = customer?.telepon || "";
    if (phone) {
      const trackingUrl = `${STORE_BASE_URL}/tracking/${order.order_number}`;
      sendOrderNotification({
        to: phone,
        channel: "whatsapp",
        event: "order_shipped",
        data: {
          orderNumber: order.order_number,
          customerName: customer?.nama_pelanggan,
          courierName: courier.name,
          trackingUrl,
          storeName: process.env.STORE_NAME || "BJS Racing Store",
        },
      }).catch((err) => console.error("[Assign] notifikasi gagal:", err));
    }

    res.status(200).json({ success: true, assignment, message: `Pesanan #${order.order_number} ditugaskan ke ${courier.name}.` });
  } catch (err) {
    console.error("BJS Express assign error:", err);
    res.status(500).json({ message: "Gagal menugaskan kurir.", details: err.message });
  }
}

// Batal penugasan kurir (POST /api/bjs-express/cancel-assignment)
// Order kembali ke status 'paid' sehingga bisa di-assign ulang ke kurir lain.
async function handleCancel(req, res) {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) {
      return res.status(400).json({ message: "order_id wajib diisi." });
    }

    // 1) Cek pesanan valid + kurir internal
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, courier_details, order_number")
      .eq("id", order_id)
      .single();
    if (orderError || !order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }

    const courierCode = String(order.courier_details?.code || "").toLowerCase();
    if (courierCode !== "internal") {
      return res.status(400).json({ message: "Pesanan ini bukan kurir internal BJS Express." });
    }
    if (["completed", "cancelled"].includes(String(order.status))) {
      return res.status(400).json({ message: `Pesanan berstatus ${order.status} tidak bisa dibatalkan.` });
    }

    // 2) Cek ada penugasan aktif (belum dibatalkan)
    const { data: assignment, error: asgError } = await supabase
      .from("courier_assignments")
      .select("id, status, courier_id")
      .eq("order_id", order_id)
      .neq("status", "cancelled")
      .maybeSingle();
    if (asgError || !assignment) {
      return res.status(400).json({ message: "Tidak ada penugasan aktif untuk pesanan ini." });
    }

    const note = reason ? String(reason).slice(0, 500) : null;

    // 3) Update penugasan -> cancelled
    const { error: cancelError } = await supabase
      .from("courier_assignments")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", assignment.id);
    if (cancelError) throw cancelError;

    // 4) Catat event timeline
    await supabase.from("courier_assignment_events").insert({
      assignment_id: assignment.id,
      status: "cancelled",
      note,
    });

    // 5) Reset pesanan -> paid (siap di-assign ulang)
    const cd = order.courier_details || {};
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        courier_details: {
          ...cd,
          shipping_status: null,
          courier_id: null,
          courier_name: null,
        },
      })
      .eq("id", order_id);
    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: `Penugasan pesanan #${order.order_number} dibatalkan. Pesanan siap di-assign ulang.`,
    });
  } catch (err) {
    console.error("BJS Express cancel error:", err);
    res.status(500).json({ message: "Gagal membatalkan penugasan.", details: err.message });
  }
}
