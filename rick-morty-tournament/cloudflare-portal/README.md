# Rick and Morty Cloudflare Portal

Portal catalog, admin surface, import pipeline, voting, and AI enrichment running directly on Cloudflare Pages Functions.

## Stack

- React 19 + TypeScript + Vite
- Cloudflare Pages Functions
- D1 for catalog, votes, and audit logs
- R2 for mirrored character images
- Cloudflare Access for `/admin` and `/api/v1/admin/*`

## Architecture

This project is now Cloudflare-only.

- Public catalog routes live under `/api/v1/*`
- Admin routes live under `/api/v1/admin/*`
- Characters, episodes, and locations are imported from the Rick and Morty public API into D1
- Character images can be mirrored into R2 and served from `/images/characters/*`
- AI enrichment is generated and stored directly in D1

There is no longer a supported proxy path to the old Node/Fastify API.

## Setup

```bash
cd cloudflare-portal
npm install
cp .dev.vars.example .dev.vars
```

Update:

- `wrangler.toml` with the real `database_id`
- `.dev.vars` with your admin emails and `GEMINI_API_KEY`

## Required Bindings

- `DB`: D1 database
- `CHARACTER_IMAGES`: R2 bucket for mirrored character images

## Optional Vars

- `RICK_AND_MORTY_API_BASE_URL`
- `ADMIN_EMAILS`
- `ADMIN_EDITOR_EMAILS`
- `ADMIN_VIEWER_EMAILS`
- `GEMINI_API_KEY`
- `GEMINI_API_BASE_URL`
- `GEMINI_MODEL`

## Commands

```bash
npm run build
npm run cf:dev
npm run cf:deploy
npm run cf:d1:create
npm run cf:d1:migrate
```

Useful manual commands:

```bash
npx wrangler d1 execute rick-morty-portal --remote --file=./d1/schema.sql
npx wrangler r2 bucket create rick-morty-character-images
```

## Production Checklist

1. Create the D1 database and apply `d1/schema.sql`
2. Create the R2 bucket and bind it as `CHARACTER_IMAGES`
3. Configure `ADMIN_EMAILS` and `GEMINI_API_KEY`
4. Protect `/admin/*` and `/api/v1/admin/*` with Cloudflare Access
5. Deploy with `npm run cf:deploy`
6. Use `/admin` to import characters, episodes, and locations into D1

## Notes

- The source of truth is the Cloudflare stack in this directory
- Re-running imports updates existing rows instead of duplicating them
- `Clear AI Sections` removes generated AI sections while preserving manual overrides
