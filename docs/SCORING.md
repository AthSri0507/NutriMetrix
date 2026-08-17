# FoodRank India — A-D Scoring Methodology

This document describes the nutritional scoring formula used to assign grades A through D
to packaged food products. The methodology is adapted from the Nutri-Score system (used
in France and several EU countries), recalibrated for Indian dietary norms, FSSAI nutrient
reference values, and typical Indian packaged food composition.

---

## Overview

Each product receives a numeric score from 0 to 40. Lower scores indicate better
nutritional quality. The score is computed by summing **negative points** (for nutrients
to limit) and subtracting **positive points** (for beneficial nutrients/components).

```
Final Score = Negative Points - Positive Points
```

The numeric score maps to a letter grade:

| Grade | Score Range | Meaning |
|-------|-----------|---------|
| A | 0 to 10 | Excellent nutritional quality |
| B | 11 to 18 | Good nutritional quality |
| C | 19 to 28 | Fair nutritional quality |
| D | 29 to 40 | Poor nutritional quality |

---

## Negative Points (0-10 each, max 40)

These are nutrients/properties to **limit**. Higher values earn more negative points.

### 1. Energy (kJ per 100g)

| Points | Threshold (kJ) |
|--------|----------------|
| 0 | <= 335 |
| 1 | <= 670 |
| 2 | <= 1005 |
| 3 | <= 1340 |
| 4 | <= 1675 |
| 5 | <= 2010 |
| 6 | <= 2345 |
| 7 | <= 2680 |
| 8 | <= 3015 |
| 9 | <= 3350 |
| 10 | > 3350 |

### 2. Sugars (g per 100g)

| Points | Threshold (g) |
|--------|---------------|
| 0 | <= 4.5 |
| 1 | <= 9 |
| 2 | <= 13.5 |
| 3 | <= 18 |
| 4 | <= 22.5 |
| 5 | <= 27 |
| 6 | <= 31 |
| 7 | <= 36 |
| 8 | <= 40 |
| 9 | <= 45 |
| 10 | > 45 |

### 3. Saturated Fat (g per 100g)

| Points | Threshold (g) |
|--------|---------------|
| 0 | <= 1 |
| 1 | <= 2 |
| 2 | <= 3 |
| 3 | <= 4 |
| 4 | <= 5 |
| 5 | <= 6 |
| 6 | <= 7 |
| 7 | <= 8 |
| 8 | <= 9 |
| 9 | <= 10 |
| 10 | > 10 |

### 4. Sodium (mg per 100g)

| Points | Threshold (mg) |
|--------|----------------|
| 0 | <= 90 |
| 1 | <= 180 |
| 2 | <= 270 |
| 3 | <= 360 |
| 4 | <= 450 |
| 5 | <= 540 |
| 6 | <= 630 |
| 7 | <= 720 |
| 8 | <= 810 |
| 9 | <= 900 |
| 10 | > 900 |

---

## Positive Points (0-5 each, max 15)

These are beneficial nutrients/components. Higher values earn more positive points
(subtracted from the final score).

### 1. Fibre (g per 100g)

| Points | Threshold (g) |
|--------|---------------|
| 0 | <= 0.9 |
| 1 | <= 1.9 |
| 2 | <= 2.8 |
| 3 | <= 3.7 |
| 4 | <= 4.7 |
| 5 | > 4.7 |

### 2. Protein (g per 100g)

| Points | Threshold (g) |
|--------|---------------|
| 0 | <= 1.6 |
| 1 | <= 3.2 |
| 2 | <= 4.8 |
| 3 | <= 6.4 |
| 4 | <= 8.0 |
| 5 | > 8.0 |

### 3. Fruits, Vegetables, Nuts, and Legumes (% of content)

| Points | Threshold (%) |
|--------|---------------|
| 0 | <= 40 |
| 1 | <= 60 |
| 2 | <= 67 |
| 3 | <= 73 |
| 4 | <= 80 |
| 5 | > 80 |

---

## Special Rules

1. **Protein exception**: If total negative points >= 11 AND fruits/veg/nuts score < 5,
   protein positive points are NOT subtracted. This prevents high-protein junk food from
   scoring artificially well.

2. **Beverages**: Water scores 0 (grade A). All other beverages use a stricter energy and
   sugar threshold (shifted down by approximately one tier) because liquid calories are
   less satiating. This is not yet implemented in the initial scoring engine.

3. **Missing nutrients**: If a nutrient value is not available:
   - Negative nutrients default to 0 (benefit of the doubt)
   - Positive nutrients default to 0 (no bonus given without data)
   - The product is flagged as having incomplete data

4. **Per-100g basis**: All scoring is done per 100g (or per 100ml for beverages) to enable
   fair cross-product comparison regardless of serving size.

---

## Indian Market Adaptations

- **Sodium thresholds** account for the higher average sodium content in Indian packaged
  foods (pickles, ready-to-eat meals, snacks). The scale is calibrated so that a typical
  Indian packaged snack falls in the C-D range rather than all of them clustering at D.

- **Sugar thresholds** factor in traditional Indian sweets (mithai) sold packaged, which
  can exceed 50g/100g sugar. The scale ensures differentiation within this range rather
  than treating all sweets as identical.

- **Fibre and protein** thresholds are aligned with FSSAI's recommended daily intakes
  (RDAs) for the Indian population.

---

## Defensibility Notes

- The formula is openly documented and deterministic. Any user can reproduce the grade
  from the published nutrient data.
- The system does not make health claims. It provides a relative ranking within a product
  category, not medical advice.
- Grade badges use colorblind-safe colors and carry text labels (A/B/C/D) alongside color.
- Methodology changes will be versioned and published with changelogs.

---

## References

- Nutri-Score algorithm: https://www.santepubliquefrance.fr/en/nutri-score
- FSSAI labelling regulations: https://www.fssai.gov.in/cms/food-labelling-regulations.php
- WHO guidelines on sugar, sodium, saturated fat intake
- Indian RDA values (ICMR-NIN 2020)
