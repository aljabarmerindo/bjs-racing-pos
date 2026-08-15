// File: api/bjs-express/assign.js
// Vercel Serverless Function — penugasan kurir internal ke pesanan BJS Express.
import { createClient } from "@supabase/supabase-js";
import { sendOrderNotification, STORE_BASE_URL } from "../../lib/notifications.js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", "POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}

async function handlePost(req, res) {
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
