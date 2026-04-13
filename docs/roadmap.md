# Roadmap

## Done

- Cloudflare-only architecture established
- D1-backed public catalog for characters, episodes, and locations
- votes persisted in D1
- admin portal protected with Cloudflare Access
- AI enrichment stored in D1
- bilingual descriptions (`pt` / `en`)
- controlled field-analysis taxonomy
- admin editing of base content
- selective clearing of AI-generated sections
- R2-based character image mirroring path

## In Progress / Active Direction

- make the Cloudflare portal the stable content service for the game
- finish operational polish around import flows and image mirroring
- keep admin tooling compact and safe for content operators

## Next Recommended Steps

### 1. Complete image mirroring rollout

- ensure `CHARACTER_IMAGES` is configured in production
- reimport characters so stored image paths switch to local delivery

### 2. Strengthen admin observability

- expose clearer import progress and image mirroring status
- improve action-result feedback in the admin UI

### 3. Formalize game-facing contract

- define which public endpoints the Rust game will consume
- keep those route shapes stable

### 4. Expand content quality workflows

- review queues for partially enriched characters
- manual QA pass for AI text quality

### 5. Consider richer upstream-independent content later

- only after the current Cloudflare pipeline is stable
- no return to a separate operational backend unless a real need appears

## Explicit Direction

The intended path is:

- Cloudflare Pages Functions
- D1
- R2
- Cloudflare Access

The project should continue consolidating around that stack rather than splitting again into multiple backends.
