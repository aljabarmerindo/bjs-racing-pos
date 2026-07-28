import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

let supabase = null;
try {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars:", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY });
  } else {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
} catch (err) {
  console.error("Supabase client init error:", err);
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!supabase) {
    return res.status(500).json({ message: "Supabase client tidak terinisialisasi." });
  }

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
      .from("bjs_express_areas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("BJS Express areas Supabase error:", error);
      return res.status(500).json({ message: "Gagal memuat area BJS Express.", details: error.message });
    }
    res.status(200).json(data || []);
  } catch (err) {
    console.error("BJS Express areas error:", err);
    res.status(500).json({ message: "Gagal memuat area BJS Express.", details: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active, notes } = req.body;
    if (!district_name || !city_name || !province_name || !postal_code) {
      return res.status(400).json({ message: "Field wajib tidak lengkap." });
    }

    const { data, error } = await supabase
      .from("bjs_express_areas")
      .insert({
        subdistrict_id: subdistrict_id || "",
        district_name,
        city_name,
        province_name,
        postal_code: String(postal_code),
        is_active,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("BJS Express area create Supabase error:", error);
      return res.status(500).json({ message: "Gagal menambah area BJS Express.", details: error.message });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("BJS Express area create error:", err);
    res.status(500).json({ message: "Gagal menambah area BJS Express.", details: err.message });
  }
}
