# FoodRank India

A mobile application that grades packaged food products on a scale of A to D based on nutritional quality, adapted for the Indian market. Inspired by systems like Nutri-Score and Yuka, FoodRank India provides consumers with quick, data-driven guidance on the healthiness of packaged food products available in India.

India's FSSAI currently has no equivalent mandatory nutrition grading system. This app fills that gap independently: users scan a barcode or search a product catalog, and the app returns a health grade, a full nutrient breakdown, and better-ranked alternatives within the same category.

---

## Features

- Barcode scanning via device camera for instant product lookup
- A-D nutrition grade for each product, computed from a documented scoring formula
- Nutrient breakdown per 100g and per serving
- Better-ranked alternative suggestions within the same product category
- Side-by-side nutrient comparison between products
- Manual catalog search by name, brand, or category
- OCR-based nutrition label scanning with guided capture and human confirmation
- Offline support with local caching and background sync
- "Where to buy" deep-links to quick-commerce platforms

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native + Expo (TypeScript) |
| Barcode Scanning | react-native-vision-camera (on-device) |
| OCR | Google ML Kit (on-device primary), Google Cloud Vision (fallback) |
| Database, Auth, Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| Image Storage | Cloudflare R2 |
| Offline Cache | expo-sqlite / WatermelonDB |
| Product Data Source | Open Food Facts API |
| CI/CD | EAS Build |
| Analytics | PostHog |
| Error Tracking | Sentry |
| Scheduled Keep-Alive | GitHub Actions |

---

## Project Structure

```
food/
  .github/workflows/      CI and scheduled keep-alive workflows
  app/                     Expo Router screens (future)
  src/
    lib/                   Scoring engine, API clients, utilities
    components/            Reusable UI components
    hooks/                 Custom React hooks
    constants/             App-wide constants, colors, configuration
    i18n/                  Locale files (en.json, hi.json, etc.)
  supabase/
    migrations/            SQL migration files
  scripts/                 Seed scripts, data import tools
  docs/                    Scoring methodology, architecture notes
  __tests__/               Unit and integration tests
  assets/                  Icons, splash screens, static images
```

---

## Prerequisites

- Node.js 20 LTS or later
- npm 10 or later
- Expo CLI (`npx expo`)
- Android Studio (for Android emulator) or a physical Android device with Expo Go
- A Supabase project (free tier is sufficient)

---

## Setup

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/foodrank-india.git
cd foodrank-india
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
cp .env.example .env
```

4. Fill in the required values in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

5. Start the development server:

```bash
npx expo start
```

6. Scan the QR code with Expo Go on your Android device, or press `a` to open in the Android emulator.

---

## Running Tests

```bash
npm test
```

---

## Linting and Type Checking

```bash
npm run lint
npm run typecheck
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

See `.env.example` for the full list.

---

## License

MIT
