// File: api/bjs-express/orders.js
// Vercel Serverless Function — daftar pesanan BJS Express (kurir internal)
// untuk tab Penugasan di modul admin.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return handleGet(req, res);
  }
  res.setHeader("Allow", "GET");
  return res.status(405).json({ message: "Method Not Allowed" });
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
        courier_details,
        shipping_address,
        customer_id,
        customers (id, nama_pelanggan, telepon),
        courier_assignments (id, status, notes, photo_url, completed_at, couriers (id, name, phone))
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
