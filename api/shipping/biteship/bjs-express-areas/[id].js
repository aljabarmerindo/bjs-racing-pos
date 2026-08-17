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
    const body = req.body || {};
    const updateData = {};

    if (body.subdistrict_id !== undefined) updateData.subdistrict_id = body.subdistrict_id;
    if (body.district_name !== undefined) updateData.district_name = body.district_name;
    if (body.city_name !== undefined) updateData.city_name = body.city_name;
    if (body.province_name !== undefined) updateData.province_name = body.province_name;
    if (body.postal_code !== undefined) updateData.postal_code = body.postal_code;
    if (body.village_name !== undefined) updateData.village_name = (body.village_name || "").trim() || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.open_time !== undefined) updateData.open_time = body.open_time || "08:00:00";
    if (body.cutoff_time !== undefined) updateData.cutoff_time = body.cutoff_time || "15:00:00";
    if (body.shipping_cost !== undefined) updateData.shipping_cost = Number(body.shipping_cost) || 0;
    if (body.etd !== undefined) updateData.etd = body.etd || "6 - 8 Hours";
    if (body.max_weight_gram !== undefined) updateData.max_weight_gram = Number(body.max_weight_gram) || 5000;
    if (body.service_name !== undefined) updateData.service_name = body.service_name || "BJS Express";
    if (body.dest_lat !== undefined) updateData.dest_lat = body.dest_lat ? Number(body.dest_lat) : null;
    if (body.dest_lng !== undefined) updateData.dest_lng = body.dest_lng ? Number(body.dest_lng) : null;

    const { data, error } = await supabase
      .from("bjs_express_areas")
      .update(updateData)
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
