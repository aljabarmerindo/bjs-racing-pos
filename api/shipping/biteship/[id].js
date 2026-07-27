// File: api/shipping/biteship/[id].js
// Vercel Serverless Function untuk update/delete GOJEK service area by ID.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default function handler(req, res) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "ID area tidak valid." });
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
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active } = req.body;

    const { data, error } = await supabase
      .from("gojek_service_areas")
      .update({ subdistrict_id, district_name, city_name, province_name, postal_code, is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("GOJEK area update error:", err);
    res.status(500).json({ message: "Gagal memperbarui area GOJEK." });
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase
      .from("gojek_service_areas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("GOJEK area delete error:", err);
    res.status(500).json({ message: "Gagal menghapus area GOJEK." });
  }
}
