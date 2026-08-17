/**
 * Seed script — pulls products from Open Food Facts for common Indian
 * packaged food categories and computes grades.
 *
 * Usage:
 *   npx ts-node scripts/seed.ts
 *
 * This script is meant to be run locally against your Supabase instance.
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.
 *
 * NOTE: This is a scaffold. The actual Supabase insert logic requires
 * the @supabase/supabase-js client, which will be added when the
 * Supabase project is configured.
 */

import { searchIndianProducts, offNutrimentsToInput, OFFProduct } from "../src/lib/openFoodFacts";
import { computeScore, NutrientInput, Grade } from "../src/lib/scoring";

// ---------------------------------------------------------------------------
// Categories to seed (common Indian packaged food)
// ---------------------------------------------------------------------------

const SEED_QUERIES = [
    "biscuits",
    "chips",
    "noodles",
    "namkeen",
    "bread",
    "milk",
    "curd",
    "paneer",
    "juice",
    "soft drink",
    "tea",
    "coffee",
    "atta",
    "rice",
    "dal",
    "oil",
    "ghee",
    "sauce",
    "pickle",
    "chocolate",
    "ice cream",
    "cereal",
    "muesli",
    "protein bar",
    "energy drink",
    "butter",
    "cheese",
    "ketchup",
    "mayonnaise",
    "masala",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedProduct {
    barcode: string;
    name: string;
    brand: string;
    category: string;
    grade: Grade;
    score: number;
    nutrients: NutrientInput;
    imageUrl?: string;
    dataSource: "off_api";
    offId: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`Starting seed process for ${SEED_QUERIES.length} categories...\n`);

    const allProducts: SeedProduct[] = [];
    const skippedNoData: string[] = [];

    for (const query of SEED_QUERIES) {
        console.log(`Searching: "${query}"...`);

        try {
            const result = await searchIndianProducts(query, 1, 50);
            console.log(`  Found ${result.count} total, processing ${result.products.length} results`);

            for (const offProduct of result.products) {
                const processed = processProduct(offProduct, query);
                if (processed) {
                    allProducts.push(processed);
                } else {
                    skippedNoData.push(offProduct.product_name ?? offProduct.code);
                }
            }

            // Rate limiting — be polite to the OFF API
            await sleep(500);
        } catch (err) {
            console.error(`  Error searching "${query}":`, err);
        }
    }

    // Deduplicate by barcode
    const unique = new Map<string, SeedProduct>();
    for (const p of allProducts) {
        if (!unique.has(p.barcode)) {
            unique.set(p.barcode, p);
        }
    }

    const finalProducts = Array.from(unique.values());

    // Grade distribution
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };
    for (const p of finalProducts) {
        gradeDistribution[p.grade]++;
    }

    console.log("\n--- Seed Summary ---");
    console.log(`Total products processed: ${allProducts.length}`);
    console.log(`Unique products (by barcode): ${finalProducts.length}`);
    console.log(`Skipped (insufficient nutrient data): ${skippedNoData.length}`);
    console.log(`Grade distribution:`, gradeDistribution);
    console.log("");

    // TODO: Insert into Supabase when configured
    // For now, write to a JSON file for inspection
    const fs = await import("fs");
    const outputPath = "./scripts/seed-output.json";
    fs.writeFileSync(outputPath, JSON.stringify(finalProducts, null, 2));
    console.log(`Seed data written to ${outputPath}`);
    console.log("Import to Supabase manually or configure the script with your Supabase credentials.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function processProduct(offProduct: OFFProduct, searchCategory: string): SeedProduct | null {
    if (!offProduct.code || !offProduct.product_name) return null;
    if (!offProduct.nutriments) return null;

    const nutrientInput = offNutrimentsToInput(offProduct.nutriments);
    if (!nutrientInput) return null;

    const fullInput: NutrientInput = {
        ...nutrientInput,
        fruitsVegPercent: 0, // OFF doesn't reliably provide this for Indian products
    };

    const result = computeScore(fullInput);

    return {
        barcode: offProduct.code,
        name: offProduct.product_name,
        brand: offProduct.brands ?? "Unknown",
        category: offProduct.categories?.split(",")[0]?.trim() ?? searchCategory,
        grade: result.grade,
        score: result.score,
        nutrients: fullInput,
        imageUrl: offProduct.image_url,
        dataSource: "off_api",
        offId: offProduct.code,
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
});
