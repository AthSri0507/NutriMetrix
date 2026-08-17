/**
 * NutriMetrix — Scoring Engine
 *
 * Computes an A–D nutritional grade for a packaged food product based on
 * nutrient values per 100g. Methodology adapted from Nutri-Score, recalibrated
 * for Indian market norms. See docs/SCORING.md for the full specification.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Grade = "A" | "B" | "C" | "D";

export interface NutrientInput {
    /** Energy in kJ per 100g */
    energyKj: number;
    /** Sugars in grams per 100g */
    sugarsG: number;
    /** Saturated fat in grams per 100g */
    saturatedFatG: number;
    /** Sodium in milligrams per 100g */
    sodiumMg: number;
    /** Fibre in grams per 100g (optional — defaults to 0) */
    fibreG?: number;
    /** Protein in grams per 100g (optional — defaults to 0) */
    proteinG?: number;
    /** Fruits, vegetables, nuts, legumes percentage (optional — defaults to 0) */
    fruitsVegPercent?: number;
}

export interface ScoringResult {
    /** Numeric score (0–40, lower is better) */
    score: number;
    /** Letter grade */
    grade: Grade;
    /** Breakdown of points for transparency */
    breakdown: {
        negativePoints: {
            energy: number;
            sugars: number;
            saturatedFat: number;
            sodium: number;
            total: number;
        };
        positivePoints: {
            fibre: number;
            protein: number;
            fruitsVeg: number;
            total: number;
            /** Whether protein was excluded due to the high-negative-points rule */
            proteinExcluded: boolean;
        };
    };
    /** Whether any nutrient data was missing (defaulted to 0) */
    incompleteData: boolean;
}

// ---------------------------------------------------------------------------
// Threshold tables
// ---------------------------------------------------------------------------

const ENERGY_THRESHOLDS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SAT_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SODIUM_THRESHOLDS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];

const FIBRE_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7];
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0];
const FRUITS_VEG_THRESHOLDS = [40, 60, 67, 73, 80];

// Grade boundaries — score <= upper bound of previous grade
const GRADE_BOUNDARIES: Array<{ maxScore: number; grade: Grade }> = [
    { maxScore: 10, grade: "A" },
    { maxScore: 18, grade: "B" },
    { maxScore: 28, grade: "C" },
    { maxScore: 40, grade: "D" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a value and an ascending threshold array, return how many thresholds
 * the value exceeds. E.g. value=5, thresholds=[1,3,7] → 2 (exceeds 1 and 3).
 */
function countExceeded(value: number, thresholds: number[]): number {
    let points = 0;
    for (const t of thresholds) {
        if (value > t) {
            points++;
        } else {
            break;
        }
    }
    return points;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

/**
 * Compute the nutritional grade for a food product.
 *
 * @param input - Nutrient values per 100g
 * @returns Full scoring result with grade, numeric score, and breakdown
 */
export function computeScore(input: NutrientInput): ScoringResult {
    const energyKj = clamp(input.energyKj, 0, 5000);
    const sugarsG = clamp(input.sugarsG, 0, 100);
    const saturatedFatG = clamp(input.saturatedFatG, 0, 100);
    const sodiumMg = clamp(input.sodiumMg, 0, 5000);
    const fibreG = clamp(input.fibreG ?? 0, 0, 100);
    const proteinG = clamp(input.proteinG ?? 0, 0, 100);
    const fruitsVegPercent = clamp(input.fruitsVegPercent ?? 0, 0, 100);

    // Track whether optional fields were missing
    const incompleteData =
        input.fibreG === undefined ||
        input.proteinG === undefined ||
        input.fruitsVegPercent === undefined;

    // --- Negative points (0-10 each) ---
    const energyPts = countExceeded(energyKj, ENERGY_THRESHOLDS);
    const sugarsPts = countExceeded(sugarsG, SUGARS_THRESHOLDS);
    const satFatPts = countExceeded(saturatedFatG, SAT_FAT_THRESHOLDS);
    const sodiumPts = countExceeded(sodiumMg, SODIUM_THRESHOLDS);
    const totalNegative = energyPts + sugarsPts + satFatPts + sodiumPts;

    // --- Positive points (0-5 each) ---
    const fibrePts = countExceeded(fibreG, FIBRE_THRESHOLDS);
    const proteinPts = countExceeded(proteinG, PROTEIN_THRESHOLDS);
    const fruitsVegPts = countExceeded(fruitsVegPercent, FRUITS_VEG_THRESHOLDS);

    // Protein exception: if negative >= 11 and fruits/veg < 5, protein doesn't count
    const proteinExcluded = totalNegative >= 11 && fruitsVegPts < 5;
    const effectiveProteinPts = proteinExcluded ? 0 : proteinPts;

    const totalPositive = fibrePts + effectiveProteinPts + fruitsVegPts;

    // --- Final score ---
    const rawScore = totalNegative - totalPositive;
    const score = clamp(rawScore, 0, 40);

    // --- Grade ---
    let grade: Grade = "D";
    for (const boundary of GRADE_BOUNDARIES) {
        if (score <= boundary.maxScore) {
            grade = boundary.grade;
            break;
        }
    }

    return {
        score,
        grade,
        breakdown: {
            negativePoints: {
                energy: energyPts,
                sugars: sugarsPts,
                saturatedFat: satFatPts,
                sodium: sodiumPts,
                total: totalNegative,
            },
            positivePoints: {
                fibre: fibrePts,
                protein: effectiveProteinPts,
                fruitsVeg: fruitsVegPts,
                total: totalPositive,
                proteinExcluded,
            },
        },
        incompleteData,
    };
}

/**
 * Convenience: compute grade only (without full breakdown).
 */
export function computeGrade(input: NutrientInput): Grade {
    return computeScore(input).grade;
}
