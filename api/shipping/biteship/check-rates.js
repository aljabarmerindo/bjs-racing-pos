import { createClient } from "@supabase/supabase-js";

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

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { destination_id, destination_name, weight_gram = 5000 } = req.body;

  if (!destination_id) {
    return res.status(400).json({ message: "destination_id wajib diisi." });
  }

  (async () => {
    try {
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
  })();
}
