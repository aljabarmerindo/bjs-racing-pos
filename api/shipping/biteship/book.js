// File: api/shipping/biteship/book.js
// Vercel Serverless Function untuk Biteship booking.
import { createClient } from "@supabase/supabase-js";

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

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
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

      res.status(200).json({
        waybill_id: result.courier?.waybill_id || "",
        tracking_id: result.courier?.tracking_id || "",
        status: result.status,
        price: result.price,
      });
    } catch (err) {
      console.error("Biteship book error:", err);
      res.status(500).json({ message: err.message || "Gagal booking kurir." });
    }
  })();
}
