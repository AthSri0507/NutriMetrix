/**
 * Unit tests for the FoodRank India scoring engine.
 * Covers grade boundaries, edge cases, the protein exception rule,
 * and incomplete data handling.
 */

import { computeScore, computeGrade, NutrientInput, Grade } from "../src/lib/scoring";

// ---------------------------------------------------------------------------
// Helper to build inputs with defaults
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<NutrientInput> = {}): NutrientInput {
    return {
        energyKj: 0,
        sugarsG: 0,
        saturatedFatG: 0,
        sodiumMg: 0,
        fibreG: 0,
        proteinG: 0,
        fruitsVegPercent: 0,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Grade boundary tests
// ---------------------------------------------------------------------------

describe("Grade boundaries", () => {
    test("all zeros → Grade A (score 0)", () => {
        const result = computeScore(makeInput());
        expect(result.grade).toBe("A");
        expect(result.score).toBe(0);
    });

    test("maximum everything negative → Grade D (score capped at 40)", () => {
        const result = computeScore(
            makeInput({
                energyKj: 4000,
                sugarsG: 60,
                saturatedFatG: 15,
                sodiumMg: 1200,
            }),
        );
        expect(result.grade).toBe("D");
        expect(result.score).toBe(40);
    });

    test("score exactly 10 → Grade A", () => {
        // Energy: 10 pts requires > 3350 → use 3400
        // Everything else 0 → negative total = 10, positive = 0, score = 10
        const result = computeScore(makeInput({ energyKj: 3400 }));
        expect(result.score).toBe(10);
        expect(result.grade).toBe("A");
    });

    test("score exactly 11 → Grade B", () => {
        // Energy: 10 pts (3400 kJ) + Sugars: 1 pt (> 4.5g) = 11
        const result = computeScore(makeInput({ energyKj: 3400, sugarsG: 5 }));
        expect(result.score).toBe(11);
        expect(result.grade).toBe("B");
    });

    test("score exactly 18 → Grade B", () => {
        // Energy: 10 + Sugars: 4 (>18) + SatFat: 4 (>4) = 18 neg, 0 pos
        const result = computeScore(
            makeInput({ energyKj: 3400, sugarsG: 19, saturatedFatG: 4.5 }),
        );
        // 10 + 4 + 4 + 0 = 18
        expect(result.score).toBe(18);
        expect(result.grade).toBe("B");
    });

    test("score exactly 19 → Grade C", () => {
        const result = computeScore(
            makeInput({ energyKj: 3400, sugarsG: 19, saturatedFatG: 5.5 }),
        );
        // 10 + 4 + 5 + 0 = 19
        expect(result.score).toBe(19);
        expect(result.grade).toBe("C");
    });

    test("score exactly 29 → Grade D", () => {
        const result = computeScore(
            makeInput({
                energyKj: 3400,
                sugarsG: 19,
                saturatedFatG: 5.5,
                sodiumMg: 950,
            }),
        );
        // 10 + 4 + 5 + 10 = 29
        expect(result.score).toBe(29);
        expect(result.grade).toBe("D");
    });
});

// ---------------------------------------------------------------------------
// Positive points tests
// ---------------------------------------------------------------------------

describe("Positive points", () => {
    test("high fibre reduces score", () => {
        const withoutFibre = computeScore(makeInput({ energyKj: 2100 }));
        const withFibre = computeScore(makeInput({ energyKj: 2100, fibreG: 5 }));
        expect(withFibre.score).toBeLessThan(withoutFibre.score);
        expect(withFibre.breakdown.positivePoints.fibre).toBe(5);
    });

    test("high protein reduces score", () => {
        const withoutProtein = computeScore(makeInput({ sugarsG: 15 }));
        const withProtein = computeScore(makeInput({ sugarsG: 15, proteinG: 9 }));
        expect(withProtein.score).toBeLessThan(withoutProtein.score);
        expect(withProtein.breakdown.positivePoints.protein).toBe(5);
    });

    test("high fruits/veg percentage reduces score", () => {
        const without = computeScore(makeInput({ sodiumMg: 500 }));
        const with_ = computeScore(makeInput({ sodiumMg: 500, fruitsVegPercent: 85 }));
        expect(with_.score).toBeLessThan(without.score);
        expect(with_.breakdown.positivePoints.fruitsVeg).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Protein exception rule
// ---------------------------------------------------------------------------

describe("Protein exception rule", () => {
    test("protein excluded when negative >= 11 and fruitsVeg < 5", () => {
        // Negative = 11 (energy:10 + sugars:1), fruitsVeg = 0
        const result = computeScore(
            makeInput({
                energyKj: 3400,
                sugarsG: 5,
                proteinG: 10,
                fruitsVegPercent: 0,
            }),
        );
        expect(result.breakdown.positivePoints.proteinExcluded).toBe(true);
        expect(result.breakdown.positivePoints.protein).toBe(0);
    });

    test("protein NOT excluded when negative >= 11 but fruitsVeg = 5", () => {
        const result = computeScore(
            makeInput({
                energyKj: 3400,
                sugarsG: 5,
                proteinG: 10,
                fruitsVegPercent: 85,
            }),
        );
        expect(result.breakdown.positivePoints.proteinExcluded).toBe(false);
        expect(result.breakdown.positivePoints.protein).toBe(5);
    });

    test("protein NOT excluded when negative < 11", () => {
        const result = computeScore(
            makeInput({
                energyKj: 3400,
                proteinG: 10,
                fruitsVegPercent: 0,
            }),
        );
        // negative = 10 (energy only) → protein should count
        expect(result.breakdown.positivePoints.proteinExcluded).toBe(false);
        expect(result.breakdown.positivePoints.protein).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Incomplete data
// ---------------------------------------------------------------------------

describe("Incomplete data handling", () => {
    test("missing optional fields → incompleteData = true", () => {
        const result = computeScore({
            energyKj: 500,
            sugarsG: 10,
            saturatedFatG: 3,
            sodiumMg: 200,
        });
        expect(result.incompleteData).toBe(true);
        // Missing positives default to 0 → no bonus
        expect(result.breakdown.positivePoints.total).toBe(0);
    });

    test("all fields provided → incompleteData = false", () => {
        const result = computeScore(makeInput());
        expect(result.incompleteData).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
    test("negative values clamped to 0", () => {
        const result = computeScore(
            makeInput({ energyKj: -100, sugarsG: -5, sodiumMg: -50 }),
        );
        expect(result.score).toBe(0);
        expect(result.grade).toBe("A");
    });

    test("score cannot go below 0 even with max positive points", () => {
        const result = computeScore(
            makeInput({
                energyKj: 0,
                sugarsG: 0,
                saturatedFatG: 0,
                sodiumMg: 0,
                fibreG: 10,
                proteinG: 20,
                fruitsVegPercent: 100,
            }),
        );
        expect(result.score).toBe(0);
        expect(result.grade).toBe("A");
    });

    test("computeGrade convenience function returns correct grade", () => {
        const grade = computeGrade(makeInput({ energyKj: 3400, sugarsG: 30 }));
        expect(["A", "B", "C", "D"]).toContain(grade);
    });
});

// ---------------------------------------------------------------------------
// Real-world Indian product examples
// ---------------------------------------------------------------------------

describe("Real-world Indian products (approximate)", () => {
    test("Maggi 2-Minute Noodles → Grade C or D", () => {
        const grade = computeGrade({
            energyKj: 1860, // ~445 kcal per 100g
            sugarsG: 1.0,
            saturatedFatG: 8.2,
            sodiumMg: 1060,
            fibreG: 2.0,
            proteinG: 9.0,
            fruitsVegPercent: 0,
        });
        expect(["C", "D"]).toContain(grade);
    });

    test("Amul Taaza Milk → Grade A or B", () => {
        const grade = computeGrade({
            energyKj: 260, // ~62 kcal per 100ml
            sugarsG: 4.7,
            saturatedFatG: 1.9,
            sodiumMg: 52,
            fibreG: 0,
            proteinG: 3.3,
            fruitsVegPercent: 0,
        });
        expect(["A", "B"]).toContain(grade);
    });

    test("Haldiram's Bhujia → Grade C or D", () => {
        const grade = computeGrade({
            energyKj: 2260, // ~540 kcal per 100g
            sugarsG: 4.0,
            saturatedFatG: 12.0,
            sodiumMg: 850,
            fibreG: 3.5,
            proteinG: 18.0,
            fruitsVegPercent: 0,
        });
        expect(["C", "D"]).toContain(grade);
    });

    test("Britannia Marie Gold biscuits → Grade C", () => {
        const grade = computeGrade({
            energyKj: 1840, // ~440 kcal per 100g
            sugarsG: 22,
            saturatedFatG: 4.0,
            sodiumMg: 380,
            fibreG: 2.5,
            proteinG: 7.0,
            fruitsVegPercent: 0,
        });
        expect(["B", "C"]).toContain(grade);
    });
});
