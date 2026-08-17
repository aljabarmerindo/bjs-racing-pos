import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  return handlePost(req, res);
}

async function handlePost(req, res) {
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
