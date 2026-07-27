// File: api/shipping/internal/rates.js
// Vercel Serverless Function untuk internal shipping rates.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
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
        return res.status(200).json({ available: false });
      }

      res.status(200).json({
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
  })();
}
