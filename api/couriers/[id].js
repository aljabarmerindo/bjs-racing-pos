// File: api/couriers/[id].js
// Vercel Serverless Function — update/hapus data kurir internal.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "ID kurir tidak valid." });
  }

  if (req.method === "PUT") {
    return handlePut(req, res, id);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res, id);
  }
  res.setHeader("Allow", "PUT, DELETE");
  return res.status(405).json({ message: "Method Not Allowed" });
}

async function handlePut(req, res, id) {
  try {
    const { name, phone, plate_number, vehicle_type, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kurir wajib diisi." });
    }

    const { data, error } = await supabase
      .from("couriers")
      .update({
        name,
        phone: phone || null,
        plate_number: plate_number || null,
        vehicle_type: vehicle_type || "motor",
        is_active: is_active ?? true,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Courier update error:", error);
      return res.status(500).json({ message: "Gagal memperbarui kurir.", details: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Courier update error:", err);
    res.status(500).json({ message: "Gagal memperbarui kurir.", details: err.message });
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase.from("couriers").delete().eq("id", id);
    if (error) {
      console.error("Courier delete error:", error);
      return res.status(500).json({ message: "Gagal menghapus kurir.", details: error.message });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Courier delete error:", err);
    res.status(500).json({ message: "Gagal menghapus kurir.", details: err.message });
  }
}
