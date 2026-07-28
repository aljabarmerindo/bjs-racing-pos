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
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active, notes } = req.body;

    const { data, error } = await supabase
      .from("bjs_express_areas")
      .update({ subdistrict_id, district_name, city_name, province_name, postal_code, is_active, notes })
      .eq("id", id)
      .select()
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
