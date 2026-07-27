// File: api/shipping/biteship/gojek-areas.js
// Vercel Serverless Function untuk GOJEK service areas CRUD.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}

async function handleGet(req, res) {
  try {
    const { data, error } = await supabase
      .from("gojek_service_areas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GOJEK areas Supabase error:", error);
      return res.status(500).json({ message: "Gagal memuat area GOJEK.", details: error.message });
    }
    res.status(200).json(data || []);
  } catch (err) {
    console.error("GOJEK areas error:", err);
    res.status(500).json({ message: "Gagal memuat area GOJEK.", details: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active } = req.body;
    if (!subdistrict_id || !district_name || !city_name || !province_name || !postal_code) {
      return res.status(400).json({ message: "Field wajib tidak lengkap." });
    }

    const { data, error } = await supabase
      .from("gojek_service_areas")
      .insert({ subdistrict_id, district_name, city_name, province_name, postal_code, is_active })
      .select()
      .single();

    if (error) {
      console.error("GOJEK area create Supabase error:", error);
      return res.status(500).json({ message: "Gagal menambah area GOJEK.", details: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("GOJEK area create error:", err);
    res.status(500).json({ message: "Gagal menambah area GOJEK.", details: err.message });
  }
}
