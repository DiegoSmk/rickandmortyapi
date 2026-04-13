# Admin And Ops

## Admin Surface

The admin is an operator tool, not a public feature.

It is intended to:

- import upstream data
- review catalog coverage
- run AI enrichment
- override or replace content manually
- clear generated sections safely
- moderate votes

## Required Access Model

- protect `/admin/*`
- protect `/api/v1/admin/*`
- use Cloudflare Access
- map roles by email at the edge

## Role Intent

- `admin`
  Full access, including destructive or recovery actions.

- `editor`
  Content editing and enrichment operations.

- `viewer`
  Read-only operational visibility.

## Import Rules

- imports are page-based and repeatable
- re-running imports updates rows instead of duplicating them
- character import supports gradual full import
- episodes and locations import progressively as well

## AI Rules

- generated content must remain separable from imported/base content
- `Clear AI Sections` removes only sections whose source is `ai`
- manual sections must be preserved
- operators may override any generated section manually

## Image Rules

- if `CHARACTER_IMAGES` is bound, character images should be mirrored to R2
- the portal should prefer serving local mirrored images
- fallback to upstream image URLs is acceptable only when the bucket path is unavailable

## Audit Expectations

These actions should leave an audit trail:

- imports
- vote overrides
- manual enrichments
- AI enrichments
- AI reset actions
- base content edits

## Operational Constraints

- keep Cloudflare execution limits in mind for imports
- batch imports conservatively
- avoid giant one-shot jobs in a single request

## UX Rules For Admin

- character cards must stay scannable
- heavy editing should happen in a focused editor state, not as an endless wall of fields
- destructive actions must be explicit

## Non-goals

- custom authentication inside the app
- reintroducing a dedicated Node backend
- mixing gameplay taxonomy with free-form uncontrolled AI output
