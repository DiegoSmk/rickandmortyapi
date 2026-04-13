# Architecture

## Current Runtime

The project is Cloudflare-first and Cloudflare-only.

Runtime pieces:

- `src/`
  Public portal UI and admin UI.

- `functions/api/v1/*`
  Public API for characters, episodes, locations, and votes.

- `functions/api/v1/admin/*`
  Protected admin API for imports, enrichment, moderation, and content edits.

- `functions/images/characters/*`
  Character image delivery from R2 when images have been mirrored.

- `functions/_lib/*`
  Shared auth and audit helpers.

## Storage

- `D1`
  Source of truth for:
  - imported characters
  - imported episodes
  - imported locations
  - votes
  - audit logs
  - AI profile JSON embedded in character rows

- `R2`
  Source of truth for mirrored character image binaries.

## Security Model

- `/admin/*` and `/api/v1/admin/*` are protected by Cloudflare Access.
- The application trusts Cloudflare Access identity headers at the edge.
- Authorization is role-mapped by email with:
  - `ADMIN_EMAILS`
  - `ADMIN_EDITOR_EMAILS`
  - `ADMIN_VIEWER_EMAILS`
- Privileged actions are written to `audit_logs`.

## Public Data Flow

1. Public Rick and Morty API provides upstream canonical content.
2. Admin imports upstream content into D1.
3. Public portal reads from D1 first.
4. Votes are stored in D1 and merged into public responses.
5. Character images may be mirrored into R2 and served locally.
6. AI enrichment is generated and stored inside `ai_profile_json`.

## Key Principle

The source of truth for the portal is the Cloudflare stack inside this directory.

There is no supported runtime dependency on the removed Node/Fastify backend.
