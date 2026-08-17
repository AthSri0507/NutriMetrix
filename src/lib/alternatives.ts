/**
 * Alternatives query module.
 *
 * Given a product, finds 2–3 better-ranked alternatives within the same
 * category. Designed to work with both Supabase (via REST/Edge Function)
 * and a local SQLite cache.
 *
 * For now, this module provides the in-memory matching logic. The Supabase
 * query version will be an Edge Function wrapping similar SQL.
 */

import { Grade } from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductSummary {
    id: string;
    name: string;
    brand: string;
    category: string;
    grade: Grade;
    score: number;
    imageUrl?: string;
}

export interface AlternativesResult {
    /** The original product */
    original: ProductSummary;
    /** Better-ranked alternatives (sorted best-first, max 3) */
    alternatives: ProductSummary[];
    /** Whether there are any better alternatives available */
    hasBetterOptions: boolean;
}

// ---------------------------------------------------------------------------
// Grade ranking (lower index = better)
// ---------------------------------------------------------------------------

const GRADE_RANK: Record<Grade, number> = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
};

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Find up to `limit` better-ranked alternatives for a product from a
 * candidate list. Candidates should already be filtered to the same category.
 *
 * @param product - The product to find alternatives for
 * @param candidates - All products in the same category
 * @param limit - Maximum number of alternatives to return (default 3)
 */
export function findAlternatives(
    product: ProductSummary,
    candidates: ProductSummary[],
    limit: number = 3,
): AlternativesResult {
    const betterCandidates = candidates
        .filter(
            (c) =>
                c.id !== product.id &&
                c.category === product.category &&
                (GRADE_RANK[c.grade] < GRADE_RANK[product.grade] ||
                    (c.grade === product.grade && c.score < product.score)),
        )
        .sort((a, b) => {
            // Sort by grade rank first, then by numeric score
            const gradeCompare = GRADE_RANK[a.grade] - GRADE_RANK[b.grade];
            if (gradeCompare !== 0) return gradeCompare;
            return a.score - b.score;
        })
        .slice(0, limit);

    return {
        original: product,
        alternatives: betterCandidates,
        hasBetterOptions: betterCandidates.length > 0,
    };
}

/**
 * SQL query template for Supabase Edge Function / Postgres.
 * This is the recommended query to use server-side for performance.
 *
 * Parameters:
 *   $1 = product ID (to exclude)
 *   $2 = category
 *   $3 = product's current numeric score
 *   $4 = limit (default 3)
 */
export const ALTERNATIVES_SQL = `
  SELECT id, name, brand, category, grade, score, image_url
  FROM products
  WHERE id != $1
    AND category = $2
    AND score < $3
  ORDER BY score ASC
  LIMIT $4;
`;
