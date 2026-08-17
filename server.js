import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const BITESHIP_BASE = "https://api.biteship.com";
const API_KEY = process.env.BITESHIP_API_KEY || "";
const ORIGIN = {
  contactName: process.env.BITESHIP_ORIGIN_NAME || "BJS Racing Store",
  contactPhone: process.env.BITESHIP_ORIGIN_PHONE || "",
  address: process.env.BITESHIP_ORIGIN_ADDRESS || "",
  postalCode: process.env.BITESHIP_ORIGIN_POSTAL || "",
  latitude: Number(process.env.BITESHIP_ORIGIN_LAT || 0),
  longitude: Number(process.env.BITESHIP_ORIGIN_LNG || 0),
};

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

async function biteshipRequest(method, path, body) {
  const res = await fetch(`${BITESHIP_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Biteship ${path} gagal: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

// BJS Express internal shipping rates
app.get("/api/shipping/internal/rates", async (req, res) => {
  try {
    const destinationId = req.query.destination_id;
    const gojekCostParam = req.query.gojek_cost;

    if (!destinationId) {
      return res.status(400).json({ message: "destination_id diperlukan." });
    }

    const { data: area } = await supabase
      .from("bjs_express_areas")
      .select("id")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true)
      .maybeSingle();

    if (!area) {
      return res.json({ available: false });
    }

    const gojekCost = gojekCostParam ? Number(gojekCostParam) : null;
    if (!gojekCost || gojekCost < 1000) {
      return res.json({ available: false });
    }

    const bjsCost = gojekCost - 1000;

    res.json({
      available: true,
      name: "BJS RACING",
      code: "internal",
      cost: bjsCost,
      service: "BJS Express",
      description: "",
      etd: "6 - 8 Hours",
    });
  } catch (err) {
    console.error("Internal rates error:", err);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// Biteship rates
app.post("/api/shipping/biteship/rates", async (req, res) => {
  try {
    const destination = req.body?.destination || {};
    const weight = Number(req.body?.weight || 0);
    const couriers = String(req.body?.couriers || "gojek,pos,jne,jnt,jntcargo").replace(/\s+/g, "");

    if (!weight || weight <= 0) {
      return res.status(400).json({ message: "Berat barang tidak valid." });
    }

    const origin = { latitude: ORIGIN.latitude, longitude: ORIGIN.longitude };
    const dest = {};
    if (destination.latitude && destination.longitude) {
      dest.latitude = Number(destination.latitude);
      dest.longitude = Number(destination.longitude);
    }
    if (destination.postal_code) {
      dest.postal_code = destination.postal_code;
    }

    const json = await biteshipRequest("POST", "/v1/rates/couriers", {
      origin,
      destination: dest,
      couriers,
      items: [
        {
          name: "Pesanan BJS Racing",
          description: "Pakaian & sparepart motor",
          length: 10,
          width: 10,
          height: 10,
          weight: Math.max(1, Math.round(weight)),
        },
      ],
    });

    const pricing = json.pricing || [];
    const rates = pricing.map((p) => ({
      company: p.company,
      courier_name: p.courier_name,
      courier_service_code: p.courier_service_code,
      courier_service_name: p.courier_service_name,
      price: p.price,
      duration: p.duration || `${p.shipment_duration_range || ""} ${p.shipment_duration_unit || ""}`.trim(),
    }));

    res.json(rates);
  } catch (err) {
    console.error("Biteship rates error:", err);
    res.status(500).json({ message: err.message || "Gagal mengambil tarif pengiriman." });
  }
});

// Biteship book/create order
app.post("/api/shipping/biteship/book", async (req, res) => {
  try {
    const { order_id, courier_company, courier_service_code, items, shipping_address, customer } = req.body;
    if (!order_id || !courier_service_code) {
      return res.status(400).json({ message: "order_id & courier_service_code wajib." });
    }

    const addr = shipping_address || {};
    const mappedItems = (items || []).map((it) => ({
      name: it.name || "Item BJS",
      description: "Pesanan BJS Racing",
      quantity: it.quantity || 1,
      weight: Math.max(1, Math.round(it.weight || 500)),
      value: Number(it.value || 0),
    }));

    const result = await biteshipRequest("POST", "/v1/orders", {
      reference_id: order_id,
      origin_contact_name: ORIGIN.contactName,
      origin_contact_phone: ORIGIN.contactPhone,
      origin_address: ORIGIN.address,
      origin_postal_code: Number(ORIGIN.postalCode),
      destination_contact_name: addr.recipient_name || customer?.nama_pelanggan || "",
      destination_contact_phone: addr.recipient_phone || customer?.telepon || "",
      destination_address: addr.full_address || "",
      destination_postal_code: addr.postal_code ? Number(addr.postal_code) : undefined,
      courier_company: courier_company || "gojek",
      courier_type: courier_service_code,
      delivery_type: "now",
      items: mappedItems,
      ...(addr.latitude && addr.longitude
        ? { destination_coordinate: { latitude: Number(addr.latitude), longitude: Number(addr.longitude) } }
        : {}),
    });

    res.json({
      waybill_id: result.courier?.waybill_id || "",
      tracking_id: result.courier?.tracking_id || "",
      status: result.status,
      price: result.price,
    });
  } catch (err) {
    console.error("Biteship book error:", err);
    res.status(500).json({ message: err.message || "Gagal booking kurir." });
  }
});

// GOJEK service areas CRUD
app.get("/api/shipping/biteship/gojek-areas", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("gojek_service_areas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("GOJEK areas error:", err);
    res.status(500).json({ message: "Gagal memuat area GOJEK." });
  }
});

app.post("/api/shipping/biteship/gojek-areas", async (req, res) => {
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

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("GOJEK area create error:", err);
    res.status(500).json({ message: "Gagal menambah area GOJEK." });
  }
});

app.put("/api/shipping/biteship/gojek-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active } = req.body;

    const { data, error } = await supabase
      .from("gojek_service_areas")
      .update({ subdistrict_id, district_name, city_name, province_name, postal_code, is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("GOJEK area update error:", err);
    res.status(500).json({ message: "Gagal memperbarui area GOJEK." });
  }
});

app.delete("/api/shipping/biteship/gojek-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("gojek_service_areas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("GOJEK area delete error:", err);
    res.status(500).json({ message: "Gagal menghapus area GOJEK." });
  }
});

// BJS Express service areas CRUD
app.get("/api/shipping/biteship/bjs-express-areas", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bjs_express_areas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("BJS Express areas error:", err);
    res.status(500).json({ message: "Gagal memuat area BJS Express." });
  }
});

app.post("/api/shipping/biteship/bjs-express-areas", async (req, res) => {
  try {
    const { subdistrict_id, district_name, city_name, province_name, postal_code, is_active, notes, open_time, cutoff_time, shipping_cost, etd, max_weight_gram, service_name, dest_lat, dest_lng } = req.body;
    if (!district_name || !city_name || !province_name || !postal_code) {
      return res.status(400).json({ message: "Field wajib tidak lengkap." });
    }
    if (open_time && cutoff_time && open_time >= cutoff_time) {
      return res.status(400).json({ message: "Jam buka harus lebih awal dari jam cut-off." });
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
        open_time: open_time || "08:00:00",
        cutoff_time: cutoff_time || "15:00:00",
        shipping_cost: Number(shipping_cost) || 0,
        etd: etd || "6 - 8 Hours",
        max_weight_gram: Number(max_weight_gram) || 5000,
        service_name: service_name || "BJS Express",
        dest_lat: dest_lat ? Number(dest_lat) : null,
        dest_lng: dest_lng ? Number(dest_lng) : null,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("BJS Express area create error:", err);
    res.status(500).json({ message: "Gagal menambah area BJS Express." });
  }
});

app.put("/api/shipping/biteship/bjs-express-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updateData = {};

    if (body.subdistrict_id !== undefined) updateData.subdistrict_id = body.subdistrict_id;
    if (body.district_name !== undefined) updateData.district_name = body.district_name;
    if (body.city_name !== undefined) updateData.city_name = body.city_name;
    if (body.province_name !== undefined) updateData.province_name = body.province_name;
    if (body.postal_code !== undefined) updateData.postal_code = body.postal_code;
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

    if (updateData.open_time && updateData.cutoff_time && updateData.open_time >= updateData.cutoff_time) {
      return res.status(400).json({ message: "Jam buka harus lebih awal dari jam cut-off." });
    }

    const { data, error } = await supabase
      .from("bjs_express_areas")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("BJS Express area update error:", err);
    res.status(500).json({ message: "Gagal memperbarui area BJS Express." });
  }
});

app.delete("/api/shipping/biteship/bjs-express-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("bjs_express_areas")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("BJS Express area delete error:", err);
    res.status(500).json({ message: "Gagal menghapus area BJS Express." });
  }
});


app.post("/api/shipping/biteship/check-rates", async (req, res) => {
  try {
    const { destination_id, destination_name, weight_gram = 5000 } = req.body;
    console.log("[Biteship] check-rates request:", { destination_id, weight_gram });

    if (!destination_id) {
      return res.status(400).json({ message: "destination_id wajib diisi." });
    }

    const { data: area, error: areaError } = await supabase
      .from("bjs_express_areas")
      .select("dest_lat, dest_lng, district_name, village_name")
      .eq("id", destination_id)
      .single();
    console.log("[Biteship] check-rates area from DB:", area);

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
        Authorization: API_KEY,
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
});

app.post("/api/shipping/biteship/update-reference-rates", async (req, res) => {
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
});
app.post("/api/shipping/biteship/bjs-express-areas/bulk-import", async (req, res) => {
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

    if (open_time && cutoff_time && open_time >= cutoff_time) {
      return res.status(400).json({ message: "Jam buka harus lebih awal dari jam cut-off." });
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
      return res.json({
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

    res.json({
      success: true,
      message: `Berhasil menambahkan ${data?.length || 0} area.`,
      inserted: data?.length || 0,
      skipped: desas.length - (data?.length || 0),
    });
  } catch (err) {
    console.error("Bulk import desa error:", err);
    res.status(500).json({ message: "Gagal bulk import desa.", details: err.message });
  }
});

// RajaOngkir: fetch subdistricts (desa/kelurahan) by district name or id
app.post("/api/shipping/rajaongkir/subdistricts", async (req, res) => {
  try {
    const { district_id, district_name, city_name } = req.body;

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
});

// Data kurir internal (mirror dari api/couriers.js & api/couriers/[id].js)
app.get("/api/couriers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("couriers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Couriers list error:", err);
    res.status(500).json({ message: "Gagal memuat data kurir." });
  }
});

app.post("/api/couriers", async (req, res) => {
  try {
    const { email, password, name, phone, plate_number, vehicle_type, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kurir wajib diisi." });
    }

    let userId = null;
    if (email) {
      if (!password) {
        return res.status(400).json({ message: "Password wajib diisi saat membuat akun login." });
      }
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) throw authError;
      userId = authUser.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, role: "courier" }, { onConflict: "id" });
      if (profileError) throw profileError;
    }

    const { data, error } = await supabase
      .from("couriers")
      .insert({
        user_id: userId,
        name,
        phone: phone || null,
        plate_number: plate_number || null,
        vehicle_type: vehicle_type || "motor",
        is_active: is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Courier create error:", err);
    res.status(500).json({ message: "Gagal menambah kurir.", details: err.message });
  }
});

app.put("/api/couriers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, plate_number, vehicle_type, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Nama kurir wajib diisi." });
    }
    const { data, error } = await supabase
      .from("couriers")
      .update({
        name,
        phone: phone || null,
        plate_number: plate_number || null,
        vehicle_type: vehicle_type || "motor",
        is_active: is_active ?? true,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Courier update error:", err);
    res.status(500).json({ message: "Gagal memperbarui kurir." });
  }
});

app.delete("/api/couriers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("couriers").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Courier delete error:", err);
    res.status(500).json({ message: "Gagal menghapus kurir." });
  }
});

// Daftar pesanan BJS Express untuk tab Penugasan (mirror dari api/bjs-express/orders.js)
app.get("/api/bjs-express/orders", async (req, res) => {
  try {
    const status = String(req.query.status || "paid,shipped")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        created_at,
        total_amount,
        shipping_cost,
        courier_details,
        shipping_address,
        customer_id,
        customers (id, nama_pelanggan, telepon),
        courier_assignments (id, status, notes, photo_url, completed_at, couriers (id, name, phone), courier_assignment_events (id, status, note, created_at))
      `)
      .eq("courier_details->>code", "internal")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status.length > 0) {
      query = query.in("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("BJS Express orders error:", err);
    res.status(500).json({ message: "Gagal memuat pesanan BJS Express." });
  }
});

// Penugasan kurir (mirror dari api/bjs-express/assign.js)
app.post("/api/bjs-express/assign", async (req, res) => {
  try {
    const { order_id, courier_id, notes } = req.body;
    if (!order_id || !courier_id) {
      return res.status(400).json({ message: "order_id dan courier_id wajib diisi." });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, courier_details, order_number")
      .eq("id", order_id)
      .single();
    if (orderError || !order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }

    const courierCode = String(order.courier_details?.code || "").toLowerCase();
    if (courierCode !== "internal") {
      return res.status(400).json({ message: "Pesanan ini bukan kurir internal BJS Express." });
    }

    const { data: courier, error: courierError } = await supabase
      .from("couriers")
      .select("id, name, is_active")
      .eq("id", courier_id)
      .maybeSingle();
    if (courierError || !courier || !courier.is_active) {
      return res.status(400).json({ message: "Kurir tidak ditemukan atau nonaktif." });
    }

    const { data: assignment, error: assignError } = await supabase
      .from("courier_assignments")
      .upsert(
        {
          order_id,
          courier_id,
          notes: notes || null,
          status: "assigned",
          assigned_at: new Date().toISOString(),
          photo_url: null,
          completed_at: null,
        },
        { onConflict: "order_id" },
      )
      .select()
      .single();
    if (assignError) throw assignError;

    await supabase.from("courier_assignment_events").insert({
      assignment_id: assignment.id,
      status: "assigned",
      note: notes || null,
    });

    const cd = order.courier_details || {};
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        courier_details: {
          ...cd,
          shipping_status: "assigned",
          courier_name: courier.name,
          courier_id,
        },
      })
      .eq("id", order_id);
    if (updateError) throw updateError;

    res.json({ success: true, assignment, message: `Pesanan #${order.order_number} ditugaskan ke ${courier.name}.` });
  } catch (err) {
    console.error("BJS Express assign error:", err);
    res.status(500).json({ message: "Gagal menugaskan kurir.", details: err.message });
  }
});

// Batal penugasan kurir (mirror dari api/bjs-express/orders.js)
app.post("/api/bjs-express/cancel-assignment", async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    if (!order_id) {
      return res.status(400).json({ message: "order_id wajib diisi." });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, courier_details, order_number")
      .eq("id", order_id)
      .single();
    if (orderError || !order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    }

    const courierCode = String(order.courier_details?.code || "").toLowerCase();
    if (courierCode !== "internal") {
      return res.status(400).json({ message: "Pesanan ini bukan kurir internal BJS Express." });
    }
    if (["completed", "cancelled"].includes(String(order.status))) {
      return res.status(400).json({ message: `Pesanan berstatus ${order.status} tidak bisa dibatalkan.` });
    }

    const { data: assignment, error: asgError } = await supabase
      .from("courier_assignments")
      .select("id, status, courier_id")
      .eq("order_id", order_id)
      .neq("status", "cancelled")
      .maybeSingle();
    if (asgError || !assignment) {
      return res.status(400).json({ message: "Tidak ada penugasan aktif untuk pesanan ini." });
    }

    const note = reason ? String(reason).slice(0, 500) : null;

    const { error: cancelError } = await supabase
      .from("courier_assignments")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", assignment.id);
    if (cancelError) throw cancelError;

    await supabase.from("courier_assignment_events").insert({
      assignment_id: assignment.id,
      status: "cancelled",
      note,
    });

    const cd = order.courier_details || {};
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        courier_details: {
          ...cd,
          shipping_status: null,
          courier_id: null,
          courier_name: null,
        },
      })
      .eq("id", order_id);
    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `Penugasan pesanan #${order.order_number} dibatalkan. Pesanan siap di-assign ulang.`,
    });
  } catch (err) {
    console.error("BJS Express cancel error:", err);
    res.status(500).json({ message: "Gagal membatalkan penugasan.", details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`POS backend running on http://localhost:${PORT}`);
});
