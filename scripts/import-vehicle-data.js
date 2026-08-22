import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DATA_DIR = "/workspaces/bjs-racing-store/data-kendaraan";

async function loadJsonFiles() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".md"));
  const allData = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    try {
      const jsonMatch = content.match(/^\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      const data = JSON.parse(jsonMatch[0]);
      allData.push(...data);
      console.log(`Loaded ${file}: ${data.length} entries`);
    } catch (e) {
      console.error(`Failed to parse ${file}:`, e.message);
    }
  }

  return allData;
}

async function importKategoris(data) {
  const categories = [...new Set(data.map(d => d.category))];
  console.log("\nImporting vehicle_kategori...");

  for (const cat of categories) {
    const { error } = await supabase
      .from("vehicle_kategori")
      .upsert({ name: cat }, { onConflict: "name" });

    if (error) {
      console.error(`  Failed to insert kategori "${cat}":`, error.message);
    } else {
      console.log(`  ✓ ${cat}`);
    }
  }
}

async function importBrands(data) {
  const brands = [...new Set(data.map(d => d.vehicle_brand))];
  console.log("\nImporting vehicle_brands...");

  for (const brand of brands) {
    const { error } = await supabase
      .from("vehicle_brands")
      .upsert({ name: brand }, { onConflict: "name" });

    if (error) {
      console.error(`  Failed to insert brand "${brand}":`, error.message);
    } else {
      console.log(`  ✓ ${brand}`);
    }
  }
}

async function importModels(data) {
  console.log("\nImporting vehicle_models...");

  const { data: kategoris } = await supabase.from("vehicle_kategori").select("id, name");
  const { data: brands } = await supabase.from("vehicle_brands").select("id, name");

  const kategoriMap = new Map(kategoris?.map(k => [k.name, k.id]) || []);
  const brandMap = new Map(brands?.map(b => [b.name, b.id]) || []);

  const modelMap = new Map();
  for (const d of data) {
    const key = `${d.vehicle_brand}|${d.vehicle_model}`;
    if (!modelMap.has(key)) {
      modelMap.set(key, {
        brand_name: d.vehicle_brand,
        model_name: d.vehicle_model,
        kategori_name: d.category,
      });
    }
  }

  let inserted = 0;
  for (const [key, val] of modelMap) {
    const brandId = brandMap.get(val.brand_name);
    const kategoriId = kategoriMap.get(val.kategori_name);

    if (!brandId) {
      console.error(`  Brand not found: ${val.brand_name}`);
      continue;
    }

    const { error } = await supabase
      .from("vehicle_models")
      .upsert(
        {
          brand_id: brandId,
          name: val.model_name,
          vehicle_kategori_id: kategoriId,
        },
        { onConflict: "brand_id,name" }
      );

    if (error) {
      console.error(`  Failed to insert model "${val.model_name}":`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`  ✓ Imported ${inserted} models`);
}

async function importCodes(data) {
  console.log("\nImporting vehicle_codes...");

  const { data: models } = await supabase
    .from("vehicle_models")
    .select("id, name, vehicle_brands(name)");

  const modelMap = new Map(models?.map(m => [m.name, m.id]) || []);

  let inserted = 0;
  for (const d of data) {
    const modelId = modelMap.get(d.vehicle_model);
    if (!modelId) {
      console.error(`  Model not found: ${d.vehicle_model}`);
      continue;
    }

    const { error } = await supabase
      .from("vehicle_codes")
      .upsert(
        {
          vehicle_model_id: modelId,
          code: d.vehicle_code,
          name: d.vehicle_model,
          year_start: d.year_start,
          year_end: d.year_end,
        },
        { onConflict: "code" }
      );

    if (error) {
      console.error(`  Failed to insert code "${d.vehicle_code}":`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`  ✓ Imported ${inserted} codes`);
}

async function main() {
  console.log("=== Import Vehicle Data ===\n");

  const data = await loadJsonFiles();
  console.log(`\nTotal entries loaded: ${data.length}`);

  await importKategoris(data);
  await importBrands(data);
  await importModels(data);
  await importCodes(data);

  console.log("\n=== Import Complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
