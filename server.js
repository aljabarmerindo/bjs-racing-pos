import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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

// Internal shipping rates (Kurir Toko BJS RACING)
app.get("/api/shipping/internal/rates", async (req, res) => {
  try {
    const destinationId = req.query.destination_id;
    if (!destinationId) {
      return res.status(400).json({ message: "destination_id diperlukan." });
    }

    const { data: zone } = await supabase
      .from("internal_shipping_zones")
      .select("shipping_cost, zone_name")
      .eq("subdistrict_id", destinationId)
      .eq("is_active", true)
      .single();

    if (!zone) {
      return res.json({ available: false });
    }

    res.json({
      available: true,
      name: "Kurir Toko BJS RACING",
      code: "internal",
      cost: zone.shipping_cost,
      service: "Kurir Toko BJS RACING",
      description: "",
      etd: "0 hari (sameday)",
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
    const couriers = String(req.body?.couriers || "gojek,pos,jne,jnt,sicepat").replace(/\s+/g, "");

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`POS backend running on http://localhost:${PORT}`);
});
