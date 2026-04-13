# 🧪 Rick and Morty Tournament Portal

> **A Dimensional Monitoring Interface for the multiverse's most notable entities.**

![Preview](https://wallpaperaccess.com/full/401140.jpg)

This project is a high-performance Dimensional Portal built to monitor, analyze, and vote on variants of characters across the Rick and Morty multiverse.

## 🚀 Key Features

-   🌀 **Interdimensional Splash**: Seamless portal opening effect using Framer Motion.
-   🧠 **AI-Powered Dossier**: Deep analysis of character attributes (Genius, Chaos, Survival) enriched by Interdimensional Intelligence.
-   ⚡ **Edge-Ready**: Designed for Cloudflare Pages with built-in API functions.
-   🌍 **Multilingual Hub**: Full support for English and Portuguese (PT-BR).
-   🛰️ **Monitoring Log**: Real-time access to episode history and variant status.

## 🛠️ Technology Stack

-   **Frontend**: React 19 + TypeScript + Vite
-   **Animations**: Framer Motion (3D Hover effects, AnimatePresence)
-   **Icons**: Lucide React
-   **Styling**: Vanilla CSS (Advanced Glassmorphism, Scanning Effects)
-   **i18n**: i18next
-   **Backend**: Node.js + Fastify (Dockerized) or Cloudflare Pages Functions

## 📦 Setup & Initialization

### 1. API (Backend)
The API runs in a dockerized environment. Ensure Docker is installed.

```bash
cd api
docker compose up -d
```

### 2. Portal (Frontend)
Install dependencies and start the interdimensional hub.

```bash
cd cloudflare-portal
npm install
npm run dev
```

### 3. Cloudflare Pages + D1
For the Cloudflare deploy, the portal now uses Pages Functions under `/api/v1/characters`.

- In local development, Vite proxies `/api/*` to `http://localhost:8080/*`.
- In Cloudflare Pages, the function can:
  - proxy to a custom backend if `API_BASE_URL` is configured
  - or fetch directly from the Rick and Morty public API and merge persisted votes from D1

Create the D1 table with [d1/schema.sql](/media/diegops/Dados1/projects/2026/rick-an-morty/rick-morty-tournament/cloudflare-portal/d1/schema.sql:1) and bind it as `DB`.

Recommended bindings:

- `DB`: D1 database for vote persistence
- `API_BASE_URL`: optional; URL of a richer upstream API exposing `/v1/characters`
- `RICK_AND_MORTY_API_BASE_URL`: optional override for the public API base URL
- `ADMIN_EMAILS`: comma-separated list of full admin emails allowed in `/admin`
- `ADMIN_EDITOR_EMAILS`: optional comma-separated editors
- `ADMIN_VIEWER_EMAILS`: optional comma-separated viewers

The project now includes a baseline Wrangler config in [wrangler.toml](/media/diegops/Dados1/projects/2026/rick-an-morty/rick-morty-tournament/cloudflare-portal/wrangler.toml:1) and an example local env file in [.dev.vars.example](/media/diegops/Dados1/projects/2026/rick-an-morty/rick-morty-tournament/cloudflare-portal/.dev.vars.example:1).

Recommended setup steps:

```bash
cd cloudflare-portal
cp .dev.vars.example .dev.vars
```

Then update:

- `wrangler.toml` with the real `database_id`
- `.dev.vars` with your admin e-mails
- `API_BASE_URL` only if you want Pages Functions to proxy to a richer backend

Useful commands:

```bash
npx wrangler d1 create rick-morty-portal
npx wrangler d1 execute rick-morty-portal --file=./d1/schema.sql
npx wrangler pages dev dist
```

Package scripts are also available:

```bash
npm run cf:d1:create
npm run cf:d1:migrate
npm run build
npm run cf:dev
npm run cf:deploy
```

### 4. Secure Admin Area
The portal now includes a dedicated `/admin` surface and protected `/api/v1/admin/*` endpoints.

Security model:

- Cloudflare Access should protect `/admin/*` and `/api/v1/admin/*`
- Pages Functions authorize using `Cf-Access-Authenticated-User-Email`
- authorization is mapped by role via `ADMIN_EMAILS`, `ADMIN_EDITOR_EMAILS`, `ADMIN_VIEWER_EMAILS`
- privileged actions are written to `audit_logs`

Recommended production policy:

- require identity provider login and MFA in Cloudflare Access
- allow only named operators or a dedicated admin group
- reserve `admin` for destructive or moderation actions only

The admin API now includes a Cloudflare-native import endpoint:

- `POST /api/v1/admin/characters/import-public-api`

This imports characters from the public Rick and Morty API into the `characters` table in D1. After importing, `/api/v1/characters` and `/api/v1/characters/:id` read from D1 first.

## 🌌 Dimensional Integrity

This project follows the **C-137 Security Protocols**.
- **Visuals**: Premium glassmorphism and CRT/Scanline filters.
- **Performance**: Optimized assets and lazy-loaded dossiers.
- **Data**: Dual-layer strategy with local API and Global Fallback.

---
*Created by the Smith-Sanchez Development Team • "Wubba Lubba Dub Dub"*
