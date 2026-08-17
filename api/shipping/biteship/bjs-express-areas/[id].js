import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
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
    const { subdistrict_id, district_name, city_name, province_name, postal_code, village_name, is_active, notes, open_time, cutoff_time, shipping_cost, etd, max_weight_gram, service_name, dest_lat, dest_lng } = req.body;

    const { data, error } = await supabase
      .from("bjs_express_areas")
      .update({ 
        subdistrict_id, 
        district_name, 
        city_name, 
        province_name, 
        postal_code, 
        village_name: (village_name || "").trim() || null,
        is_active, 
        notes,
        open_time: open_time || "08:00:00",
        cutoff_time: cutoff_time || "15:00:00",
        shipping_cost: Number(shipping_cost) || 0,
        etd: etd || "6 - 8 Hours",
        max_weight_gram: Number(max_weight_gram) || 5000,
        service_name: service_name || "BJS Express",
        dest_lat: dest_lat ? Number(dest_lat) : null,
        dest_lng: dest_lng ? Number(dest_lng) : null,
      })
      .eq("id", id)
      .select("id, subdistrict_id, district_name, city_name, province_name, postal_code, is_active, notes, created_at, updated_at, open_time, cutoff_time, shipping_cost, etd, max_weight_gram, service_name, village_name, reference_rate, reference_updated_at, origin_lat, origin_lng, dest_lat, dest_lng")
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("BJS Express area update error:", err);
    res.status(500).json({ message: "Gagal memperbarui area BJS Express." });
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase
      .from("bjs_express_areas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("BJS Express area delete error:", err);
    res.status(500).json({ message: "Gagal menghapus area BJS Express." });
  }
}
