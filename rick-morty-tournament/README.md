# Rick and Morty Tournament Workspace

This workspace currently contains two active fronts:

- `cloudflare-portal`
  Cloudflare-first public catalog, admin portal, D1 data layer, R2 images, and AI enrichment flows.

- `src` + `src-tauri`
  Local Tauri/React application for the game shell and tournament experience.

## Source of Truth

For catalog, import, votes, admin, AI enrichment, and content moderation, the source of truth is:

- `cloudflare-portal`

## Common Commands

### Cloudflare portal

```bash
cd cloudflare-portal
npm install
npm run build
npm run cf:dev
npm run cf:deploy
```

### Tauri app

```bash
cd ..
cd rick-morty-tournament
npm install
npm run dev
npm run tauri
```
