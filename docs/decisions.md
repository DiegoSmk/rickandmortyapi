# Decisions

## Architecture Decisions

### 1. Cloudflare-only backend

Decision:

- keep catalog, admin, votes, imports, and enrichment in Pages Functions + D1 + R2

Reason:

- simpler deployment
- fewer moving parts
- no external app server required
- aligned with current operational path

Implication:

- the previous Node/Fastify API was removed
- no `API_BASE_URL` proxy path remains

### 2. D1 as the canonical app database

Decision:

- persist imported content and interaction data in D1

Reason:

- single source of truth for the portal
- direct use inside Pages Functions

### 3. R2 for image binaries

Decision:

- do not store binary images in D1
- mirror character images into R2 when available

Reason:

- D1 should store metadata, not blobs
- R2 is the correct storage layer for assets

### 4. Admin protected by Cloudflare Access

Decision:

- no custom auth inside the app
- use Cloudflare Access as the identity gate

Reason:

- professional access control
- fewer auth surfaces to maintain
- MFA and provider-based login available upstream

### 5. AI content is separated from imported content

Decision:

- imported/base content is edited separately from AI content
- AI output is stored in `ai_profile_json`

Reason:

- avoids mixing source data with generated data
- allows reset of generated sections
- preserves operator edits

### 6. Reset AI must preserve manual work

Decision:

- `Clear AI Sections` removes only sections whose source is `ai`
- manual sections are preserved

Reason:

- operators need safe rollback of generated content
- manual corrections should not be lost

### 7. Traits, weaknesses, and abilities are controlled vocabularies

Decision:

- field analysis cannot invent arbitrary slugs
- the system validates against approved libraries

Reason:

- consistent gameplay taxonomy
- easier balancing and downstream use in the game

### 8. Description is bilingual

Decision:

- generated and manual descriptions are stored in `pt` and `en`

Reason:

- language should be selected at render time
- avoid runtime machine translation

### 9. Public empty states should be diegetic

Decision:

- when no AI content exists, the UI shows in-universe placeholder copy
- it must not pretend content came from the public API if it did not

Reason:

- clearer source separation
- stronger product voice

### 10. Admin UI favors compact cards and focused editing

Decision:

- cards should stay short by default
- heavy editing must happen in an expanded/editor context

Reason:

- large inline cards became hard to scan and maintain
