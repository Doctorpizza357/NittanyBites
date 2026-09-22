# NittanyBites 🍽️

Penn State Dining Hall Meal Tracker & Analytics Dashboard. A statically-exported Next.js app with **Firebase Authentication** (login) and **Cloud Firestore** (database), designed to be hosted for free on **GitHub Pages**.

## Stack

- **Next.js 14** (App Router, static export) + TypeScript + React
- **Firebase Auth** (Google + email/password) and **Cloud Firestore**
- **Tailwind CSS** with shadcn/ui-style patterns, `clsx`, `tailwind-merge`
- **framer-motion** animations · **recharts** visualizations · **lucide-react** icons
- **SWR** for client caching + optimistic mutations

## How it works

Because GitHub Pages only serves static files, there is **no server**. All auth and data access happen client-side against Firebase:

- **Login** is gated by Firebase Auth. Signed-out users see a login screen.
- **Data** lives in Firestore collections `meals` and `dishes`. Reads and writes go directly from the browser, secured by Firestore Security Rules.
- The Firebase web config keys are **public identifiers, not secrets** — they're safe to ship in the bundle. Security is enforced by Auth + Rules.
- **Demo Mode:** if no Firebase config is present, the app skips login and shows the bundled seed data so you can explore locally.

## Getting Started (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no `.env.local` values, it runs in Demo Mode.

## Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
3. **Firestore Database:** create a database (production mode).
4. **Project Settings → Your apps → Web app:** register a web app and copy the config.
5. Copy `.env.local.example` → `.env.local` and paste the values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

6. Publish the security rules from `firestore.rules` (Firestore → Rules → paste → Publish).
7. First sign-in auto-seeds the historical data if the database is empty.

### Data model (Firestore)

- `meals/{id}` — `{ date, day, meal, location, rating, favorites[], dislikes[], notes, createdAt }`
- `dishes/{id}` — `{ date, meal, dish, location, category, rating, sentiment, notes, createdAt }`

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**.
3. Add your Firebase config as repo **Secrets** (Settings → Secrets and variables → Actions):
   `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
4. For a **project site** (`username.github.io/repo-name`), add a repo **Variable** `NEXT_PUBLIC_BASE_PATH` = `/repo-name`. For a **user site** (`username.github.io`), leave it unset.
5. In Firebase → Authentication → Settings → **Authorized domains**, add `username.github.io`.
6. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys automatically.

## Single-owner model

This is a personal rating site. **Only you** (the owner) can sign in and add or
edit ratings; everyone else is a read-only viewer with no account needed.

1. Sign in once with the account you'll own the site with.
2. Find your uid: Firebase Console → Authentication → Users → your row → **User UID**.
3. Set it locally in `.env.local` as `NEXT_PUBLIC_OWNER_UID=<your-uid>`, and as a
   GitHub Actions **Variable** `NEXT_PUBLIC_OWNER_UID` for the live site.
4. In `firestore.rules`, replace `OWNER_UID` with your uid, then publish the rules.

Only requests from that uid can write; reads are public.

## Logging with natural language (JSON import)

While signed in as the owner, click **Import**. The modal gives you:
- **Copy prompt** — paste it into any LLM (ChatGPT, Claude, Gemini…), then
  describe your meal in plain English.
- **Copy JSON schema** — the formal draft-07 schema if your tool wants it.

Paste the JSON the LLM returns back into the modal and hit **Import**. It
validates the payload and appends it to your ratings. The contract lives in
`lib/importSchema.ts` (`ImportPayload`, `JSON_SCHEMA`, `LLM_PROMPT`).

## Importing your existing data (CLI)

A one-time Admin-SDK script writes the bundled seed history into your account.

```powershell
# Admin credentials (service account with Firestore access):
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
$env:TARGET_EMAIL="you@psu.edu"    # or $env:TARGET_UID="<firebase-uid>"
npm run import-data                # add --force to re-import
```

Get the service account JSON from Firebase Console → Project Settings →
Service Accounts → Generate new private key. Keep it out of git.

## AI logging with Gemini

Log meals from natural language. The script parses your note with Google
Gemini into structured meal + dish records and writes them to your account.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
$env:GEMINI_API_KEY="<key from https://aistudio.google.com/apikey>"
$env:TARGET_EMAIL="you@psu.edu"

npm run log-meal -- "Dinner at Waring, 8.3. Shrimp ravioli was amazing (8.7),
  brisket dry at first (6.8). Loved the ravioli."

# preview the parsed JSON without writing:
npm run log-meal -- --dry "Lunch at Redifer, custom Italian sub 8.7..."
```

This runs off the static site (on your machine, a cron job, or a Cloud
Function), since GitHub Pages can't run server code. The default model is
`gemini-2.5-flash` (override with `GEMINI_MODEL`).

## Structure

```
app/
  layout.tsx           Providers: Toast → Auth → AuthGate
  page.tsx             Tabbed dashboard: Timeline · Rankings · Trends
  people/page.tsx      Diner directory (search + browse)
  u/page.tsx           Shared read-only profile (?id=<uid>)
components/            Navbar, AuthProvider, AuthGate, LoginScreen,
                       MealTimeline, RankingsList, TrendChart,
                       ProfileView, LogMealModal, Toast, DemoBanner
lib/                   firebase, firestore, useMeals, types, seedData, utils
scripts/               admin, writeMeals, importData, logMeal (Gemini)
firestore.rules        Firestore security rules (per-user ownership)
```
