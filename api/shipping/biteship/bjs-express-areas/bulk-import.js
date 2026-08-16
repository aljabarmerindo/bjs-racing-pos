import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const RAJAONGKIR_BASE = "https://rajaongkir.komerce.id/api/v1";
const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || "";

function toTitleCase(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function handleRajaOngkir(req, res) {
  try {
    const { district_name, city_name } = req.body;

    if (!RAJAONGKIR_API_KEY) {
      return res.status(500).json({ message: "RAJAONGKIR_API_KEY tidak dikonfigurasi." });
    }

    if (!district_name) {
      return res.status(400).json({ message: "district_name wajib diisi." });
    }

    let searchQuery = district_name.trim();
    if (city_name && city_name.trim()) {
      searchQuery = `${city_name.trim()} ${district_name.trim()}`;
    }

    const searchRes = await fetch(
      `${RAJAONGKIR_BASE}/destination/domestic-destination?search=${encodeURIComponent(searchQuery)}&limit=100`,
      { headers: { key: RAJAONGKIR_API_KEY } },
    );

    const searchJson = await searchRes.json();

    if (!searchRes.ok || searchJson.meta?.status !== "success") {
      return res.status(searchJson.meta?.code || 500).json({
        message: searchJson.meta?.message || "Gagal mencari daerah di RajaOngkir.",
      });
    }

    const matches = (searchJson.data || []).filter((item) => {
      const districtMatch = (item.district_name || "").toLowerCase() === district_name.trim().toLowerCase();
      const cityMatch = !city_name || (item.city_name || "").toLowerCase() === city_name.trim().toLowerCase();
      return districtMatch && cityMatch;
    });

    if (matches.length === 0) {
      return res.status(404).json({ message: "Kecamatan tidak ditemukan di RajaOngkir." });
    }

    const seen = new Set();
    const normalized = [];
    for (const item of matches) {
      const name = toTitleCase(item.subdistrict_name || item.label || "");
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      normalized.push({
        id: item.id,
        name,
        zip_code: item.zip_code || "",
      });
    }

    res.json({ district_id: matches[0].id, subdistricts: normalized });
  } catch (err) {
    console.error("RajaOngkir subdistrict fetch error:", err);
    res.status(500).json({ message: "Gagal mengambil data desa dari RajaOngkir.", details: err.message });
  }
}

async function handleBulkImport(req, res) {
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

    const existingDefault = (existingAreas.data || []).some(
      (a) => !a.village_name || !a.village_name.trim()
    );

    const existingVillages = new Set(
      (existingAreas.data || [])
        .map((a) => (a.village_name || "").trim().toLowerCase())
        .filter((v) => v)
    );

    const rowsToInsert = [];

    if (!existingDefault) {
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
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const path = req.url || "";

  if (path.includes("/rajaongkir/subdistricts")) {
    return handleRajaOngkir(req, res);
  }

  return handleBulkImport(req, res);
}
