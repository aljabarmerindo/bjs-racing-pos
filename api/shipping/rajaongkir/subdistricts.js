export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  (async () => {
    try {
      const { district_id, district_name, city_name } = req.body;

      const apiKey = process.env.RAJAONGKIR_API_KEY || "";
      if (!apiKey) {
        return res.status(500).json({ message: "RAJAONGKIR_API_KEY tidak dikonfigurasi." });
      }

      const BASE = "https://rajaongkir.komerce.id/api/v1";

      function toTitleCase(text) {
        if (!text) return "";
        return text
          .toLowerCase()
          .split(" ")
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      if (!district_name) {
        return res.status(400).json({ message: "district_name wajib diisi." });
      }

      let searchQuery = district_name.trim();
      if (city_name && city_name.trim()) {
        searchQuery = `${city_name.trim()} ${district_name.trim()}`;
      }

      const searchRes = await fetch(
        `${BASE}/destination/domestic-destination?search=${encodeURIComponent(searchQuery)}&limit=100`,
        { headers: { key: apiKey } },
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
  })();
}
