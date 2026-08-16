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
    const { subdistrict_id, district_name, city_name, province_name, postal_code, village_name, is_active, notes, open_time, cutoff_time, shipping_cost, etd, max_weight_gram, service_name } = req.body;
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
        village_name: (village_name || "").trim() || null,
        is_active,
        notes: notes || null,
        open_time: open_time || "08:00:00",
        cutoff_time: cutoff_time || "15:00:00",
        shipping_cost: Number(shipping_cost) || 0,
        etd: etd || "6 - 8 Hours",
        max_weight_gram: Number(max_weight_gram) || 5000,
        service_name: service_name || "BJS Express",
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
