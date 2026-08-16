import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
    try {
      const {
        subdistrict_id,
        district_name,
        city_name,
        province_name,
        postal_code,
        desa_list,
        open_time = "08:00:00",
        cutoff_time = "15:00:00",
        shipping_cost = 0,
        etd = "6 - 8 Hours",
        max_weight_gram = 5000,
        service_name = "BJS Express",
      } = req.body;

      if (!district_name || !city_name || !province_name || !postal_code) {
        return res.status(400).json({ message: "Field wajib tidak lengkap." });
      }

      const desas = Array.isArray(desa_list)
        ? desa_list.map((d) => String(d).trim()).filter(Boolean)
        : [];

      if (desas.length === 0) {
        return res.status(400).json({ message: "Daftar desa kosong." });
      }

      const existingAreas = await supabase
        .from("bjs_express_areas")
        .select("village_name, subdistrict_id")
        .eq("subdistrict_id", subdistrict_id || "");

      const existingVillages = new Set(
        (existingAreas.data || [])
          .map((a) => (a.village_name || "").trim().toLowerCase())
          .filter(Boolean),
      );

      const rowsToInsert = [];

      const defaultVillage = "";
      if (!existingVillages.has(defaultVillage.toLowerCase())) {
        rowsToInsert.push({
          subdistrict_id: subdistrict_id || "",
          district_name,
          city_name,
          province_name,
          postal_code: String(postal_code),
          village_name: null,
          is_active: true,
          open_time,
          cutoff_time,
          shipping_cost: Number(shipping_cost) || 0,
          etd,
          max_weight_gram: Number(max_weight_gram) || 5000,
          service_name,
        });
      }

      for (const desa of desas) {
        const trimmed = desa.trim();
        if (!trimmed) continue;
        if (existingVillages.has(trimmed.toLowerCase())) continue;

        rowsToInsert.push({
          subdistrict_id: subdistrict_id || "",
          district_name,
          city_name,
          province_name,
          postal_code: String(postal_code),
          village_name: trimmed,
          is_active: true,
          open_time,
          cutoff_time,
          shipping_cost: Number(shipping_cost) || 0,
          etd,
          max_weight_gram: Number(max_weight_gram) || 5000,
          service_name,
        });
      }

      if (rowsToInsert.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Tidak ada desa baru yang perlu ditambahkan.",
          inserted: 0,
          skipped: desas.length,
        });
      }

      const { data, error } = await supabase
        .from("bjs_express_areas")
        .insert(rowsToInsert)
        .select();

      if (error) {
        console.error("Bulk import desa error:", error);
        return res.status(500).json({ message: "Gagal bulk import desa.", details: error.message });
      }

      res.status(200).json({
        success: true,
        message: `Berhasil menambahkan ${data?.length || 0} area.`,
        inserted: data?.length || 0,
        skipped: desas.length - (data?.length || 0),
      });
    } catch (err) {
      console.error("Bulk import desa error:", err);
      res.status(500).json({ message: "Gagal bulk import desa.", details: err.message });
    }
  })();
}
