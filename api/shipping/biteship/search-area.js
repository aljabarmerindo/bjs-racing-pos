// File: api/shipping/biteship/search-area.js
// Vercel Serverless Function untuk Biteship Maps Search Area.
const BITESHIP_BASE = "https://api.biteship.com";
const API_KEY = process.env.BITESHIP_API_KEY || "";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
    try {
      const q = req.query.q || "";
      if (!q || q.length < 3) {
        return res.status(200).json([]);
      }

      const response = await fetch(
        `${BITESHIP_BASE}/v1/maps/areas?countries=ID&input=${encodeURIComponent(q)}&type=single&limit=10`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: API_KEY,
          },
        }
      );

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Biteship search-area error:", json);
        return res.status(response.status).json({ message: json.message || "Gagal mencari area." });
      }

      const areas = (json.areas || json.data || []).map((area) => ({
        id: String(area.id || area.area_id || ""),
        name: area.name || area.area_name || "",
        type: area.type || "",
        country: area.country || "",
        administrativeLevel1: area.administrative_level_1 || area.province_name || "",
        administrativeLevel2: area.administrative_level_2 || area.city_name || "",
        administrativeLevel3: area.administrative_level_3 || area.district_name || "",
        administrativeLevel4: area.administrative_level_4 || area.subdistrict_name || "",
        latitude: String(area.latitude || area.lat || ""),
        longitude: String(area.longitude || area.lng || ""),
        postalCode: area.postal_code || area.zip_code || "",
      }));

      res.status(200).json(areas);
    } catch (err) {
      console.error("Search area error:", err);
      res.status(500).json({ message: err.message || "Gagal mencari area." });
    }
  })();
}
