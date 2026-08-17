/**
 * Open Food Facts API client.
 *
 * Provides typed access to the Open Food Facts v2 API for product lookup
 * by barcode and text search. Used as a fallback data source when a product
 * is not in our own database, and as a source for the initial seed catalog.
 *
 * API docs: https://wiki.openfoodfacts.org/API
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OFFNutriments {
    "energy-kj_100g"?: number;
    "energy-kcal_100g"?: number;
    sugars_100g?: number;
    "saturated-fat_100g"?: number;
    sodium_100g?: number;
    fiber_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    salt_100g?: number;
}

export interface OFFProduct {
    code: string;
    product_name?: string;
    brands?: string;
    categories?: string;
    /** Comma-separated list of category tags (machine-readable) */
    categories_tags?: string[];
    image_url?: string;
    image_nutrition_url?: string;
    nutriments?: OFFNutriments;
    nutriscore_grade?: string;
    /** Serving size as a string, e.g. "30g" */
    serving_size?: string;
    /** Country tags — used to filter for India */
    countries_tags?: string[];
}

export interface OFFSearchResult {
    count: number;
    page: number;
    page_size: number;
    products: OFFProduct[];
}

export interface OFFProductResult {
    status: 0 | 1;
    product?: OFFProduct;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "https://world.openfoodfacts.org";
const USER_AGENT = "FoodRankIndia/0.1.0 (https://github.com/foodrank-india)";

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

/**
 * Fetch a single product by barcode.
 * Returns null if the product is not found.
 */
export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
    const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`;

    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`OFF API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OFFProductResult;

    if (data.status === 0 || !data.product) {
        return null;
    }

    return data.product;
}

/**
 * Search products by text query.
 *
 * @param query - Search string (product name, brand, etc.)
 * @param page - Page number (1-indexed)
 * @param pageSize - Results per page (max 100)
 * @param countryFilter - Optional country tag to filter results (e.g. "en:india")
 */
export async function searchProducts(
    query: string,
    page: number = 1,
    pageSize: number = 24,
    countryFilter?: string,
): Promise<OFFSearchResult> {
    const params = new URLSearchParams({
        search_terms: query,
        page: String(page),
        page_size: String(Math.min(pageSize, 100)),
        json: "true",
        search_simple: "1",
    });

    if (countryFilter) {
        params.set("tagtype_0", "countries");
        params.set("tag_contains_0", "contains");
        params.set("tag_0", countryFilter);
    }

    const url = `${BASE_URL}/cgi/search.pl?${params.toString()}`;

    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
        throw new Error(`OFF search error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as OFFSearchResult;
}

/**
 * Convenience: search specifically for Indian products.
 */
export async function searchIndianProducts(
    query: string,
    page: number = 1,
    pageSize: number = 24,
): Promise<OFFSearchResult> {
    return searchProducts(query, page, pageSize, "en:india");
}

/**
 * Convert OFF nutriments to our NutrientInput format.
 * Returns null if minimum required fields (energy + sugar + sat fat + sodium) are missing.
 */
export function offNutrimentsToInput(
    nutriments: OFFNutriments,
): {
    energyKj: number;
    sugarsG: number;
    saturatedFatG: number;
    sodiumMg: number;
    fibreG?: number;
    proteinG?: number;
} | null {
    // Energy: prefer kJ, fall back from kcal
    let energyKj = nutriments["energy-kj_100g"];
    if (energyKj === undefined && nutriments["energy-kcal_100g"] !== undefined) {
        energyKj = nutriments["energy-kcal_100g"] * 4.184;
    }

    const sugarsG = nutriments.sugars_100g;
    const saturatedFatG = nutriments["saturated-fat_100g"];

    // Sodium: OFF stores in grams, our scoring uses mg
    let sodiumMg: number | undefined;
    if (nutriments.sodium_100g !== undefined) {
        sodiumMg = nutriments.sodium_100g * 1000;
    } else if (nutriments.salt_100g !== undefined) {
        // salt (g) → sodium (mg): sodium = salt / 2.5 * 1000
        sodiumMg = (nutriments.salt_100g / 2.5) * 1000;
    }

    // Check minimum required fields
    if (
        energyKj === undefined ||
        sugarsG === undefined ||
        saturatedFatG === undefined ||
        sodiumMg === undefined
    ) {
        return null;
    }

    return {
        energyKj,
        sugarsG,
        saturatedFatG,
        sodiumMg,
        fibreG: nutriments.fiber_100g,
        proteinG: nutriments.proteins_100g,
    };
}
