import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const RAJAONGKIR_BASE = "https://rajaongkir.komerce.id/api/v1";
const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || "";

const BITESHIP_BASE = "https://api.biteship.com";
const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || "";
const ORIGIN = {
  contactName: process.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
  contactPhone: process.env.BITESHIP_ORIGIN_PHONE || "",
  address: process.env.BITESHIP_ORIGIN_ADDRESS || "",
  postalCode: process.env.BITESHIP_ORIGIN_POSTAL || "",
  latitude: Number(process.env.BITESHIP_ORIGIN_LAT || 0),
  longitude: Number(process.env.BITESHIP_ORIGIN_LNG || 0),
};

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

async function handleCheckRates(req, res) {
  try {
    const { destination_id, destination_name, weight_gram = 5000 } = req.body;

    if (!destination_id) {
      return res.status(400).json({ message: "destination_id wajib diisi." });
    }

    const { data: area, error: areaError } = await supabase
      .from("bjs_express_areas")
      .select("dest_lat, dest_lng, district_name, village_name")
      .eq("id", destination_id)
      .single();

    if (areaError || !area) {
      return res.status(404).json({ message: "Area BJS Express tidak ditemukan." });
    }

    if (!area.dest_lat || !area.dest_lng) {
      return res.status(400).json({ message: "Koordinat destinasi belum diisi untuk area ini." });
    }

    const originAreaId = process.env.BITESHIP_ORIGIN_POSTAL || "";

    const ratesPayload = {
      origin: {
        location_id: originAreaId,
        latitude: ORIGIN.latitude,
        longitude: ORIGIN.longitude,
      },
      destination: {
        location_id: destination_id,
        latitude: Number(area.dest_lat),
        longitude: Number(area.dest_lng),
      },
      weight: Number(weight_gram),
      couriers: "gojek",
    };

    const ratesRes = await fetch(`${BITESHIP_BASE}/v1/rates/couriers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: BITESHIP_API_KEY,
      },
      body: JSON.stringify(ratesPayload),
    });

    const ratesJson = await ratesRes.json();

    if (!ratesRes.ok || ratesJson.meta?.status !== "success") {
      return res.status(ratesJson.meta?.code || 500).json({
        message: ratesJson.meta?.message || "Gagal mengambil rates dari Biteship.",
      });
    }

    const gojekPricing = (ratesJson.data || []).find(
      (item) => item.courier_code === "gojek" || item.company === "gojek"
    );

    if (!gojekPricing) {
      return res.status(404).json({
        success: false,
        message: "Gojek tidak tersedia untuk rute ini.",
        available_couriers: (ratesJson.data || []).map((item) => item.courier_code),
      });
    }

    res.json({
      success: true,
      reference_rate: gojekPricing.shipping_fee || gojekPricing.price || 0,
      currency: gojekPricing.currency || "IDR",
      courier: "gojek",
      service_name: gojekPricing.courier_service_name,
      duration: gojekPricing.duration,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Biteship check-rates error:", err);
    res.status(500).json({ message: "Gagal mengecek rates Biteship.", details: err.message });
  }
}

async function handleUpdateReferenceRates(req, res) {
  try {
    const { areas } = req.body;

    if (!Array.isArray(areas) || areas.length === 0) {
      return res.status(400).json({ message: "Data area kosong." });
    }

    let updated = 0;
    const results = [];

    for (const area of areas) {
      const { id, reference_rate, reference_updated_at } = area;

      if (!id) continue;

      const updateData = {
        reference_rate: Number(reference_rate) || 0,
        reference_updated_at: reference_updated_at || new Date().toISOString(),
      };

      const { error } = await supabase
        .from("bjs_express_areas")
        .update(updateData)
        .eq("id", id);

      if (error) {
        results.push({ id, success: false, error: error.message });
        continue;
      }

      updated++;
      results.push({ id, success: true });
    }

    res.json({
      success: true,
      updated,
      failed: areas.length - updated,
      results,
    });
  } catch (err) {
    console.error("Update reference rates error:", err);
    res.status(500).json({ message: "Gagal update reference rates.", details: err.message });
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

  if (path.includes("/check-rates")) {
    return handleCheckRates(req, res);
  }

  if (path.includes("/update-reference-rates")) {
    return handleUpdateReferenceRates(req, res);
  }

  return handleBulkImport(req, res);
}
