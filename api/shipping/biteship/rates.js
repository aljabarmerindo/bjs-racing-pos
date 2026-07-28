// File: api/shipping/biteship/rates.js
// Vercel Serverless Function untuk Biteship rates.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const BITESHIP_BASE = "https://api.biteship.com";
const API_KEY = process.env.BITESHIP_API_KEY || "";

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

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
    try {
      const destination = req.body?.destination || {};
      const weight = Number(req.body?.weight || 0);
      const couriers = String(req.body?.couriers || "gojek,pos,jne,jnt,jntcargo").replace(/\s+/g, "");

      if (!weight || weight <= 0) {
        return res.status(400).json({ message: "Berat barang tidak valid." });
      }

      const origin = { latitude: Number(process.env.BITESHIP_ORIGIN_LAT || 0), longitude: Number(process.env.BITESHIP_ORIGIN_LNG || 0) };
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

      res.status(200).json(rates);
    } catch (err) {
      console.error("Biteship rates error:", err);
      res.status(500).json({ message: err.message || "Gagal mengambil tarif pengiriman." });
    }
  })();
}
