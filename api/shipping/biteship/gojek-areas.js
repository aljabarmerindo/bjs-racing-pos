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
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active, open_time, cutoff_time } = req.body;
    if (!district_name || !city_name || !province_name || !postal_code) {
      return res.status(400).json({ message: "Field wajib tidak lengkap." });
    }

    const { data, error } = await supabase
      .from("gojek_service_areas")
      .insert({
        subdistrict_id: subdistrict_id || "",
        district_name,
        city_name,
        province_name,
        postal_code: String(postal_code),
        is_active,
        open_time: open_time || "08:00:00",
        cutoff_time: cutoff_time || "18:00:00",
      })
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
