import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const [gojekAreas, bjsExpressAreas] = await Promise.all([
      supabase
        .from("gojek_service_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true)
        .limit(1),
      supabase
        .from("bjs_express_areas")
        .select("open_time, cutoff_time, is_active")
        .eq("is_active", true)
        .limit(1),
    ]);

    const gojekSchedule = gojekAreas.data?.[0] || null;
    const bjsSchedule = bjsExpressAreas.data?.[0] || null;

    const config = {
      gojek: {
        enabled: !!gojekSchedule,
        open_time: gojekSchedule?.open_time || "08:00:00",
        cutoff_time: gojekSchedule?.cutoff_time || "18:00:00",
      },
      bjs_express: {
        enabled: !!bjsSchedule,
        open_time: bjsSchedule?.open_time || "08:00:00",
        cutoff_time: bjsSchedule?.cutoff_time || "15:00:00",
      },
    };

    res.status(200).json(config);
  } catch (err) {
    console.error("Courier config error:", err);
    res.status(500).json({ message: "Gagal memuat konfigurasi kurir." });
  }
}
