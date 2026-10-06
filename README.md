# N5Deal — Marketplace Prototype

A working prototype of an M&A marketplace for licensed financial businesses, built for the N5Deal
technical assignment. Three roles — **Buyer**, **Seller**, **Platform Manager** — each with a
complete, usable flow rather than a set of static screens.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · PostgreSQL (Neon) + Prisma · Tailwind
CSS v4 · Google Gemini (free tier) with deterministic fallbacks · Vitest + Playwright.

---

## 1. Quick start

Requirements: Node.js 20+ and a PostgreSQL database (a free [Neon](https://neon.com) project is
the fastest option).

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx prisma migrate deploy     # create the schema
npm run db:seed               # load demo data (14 accounts, 24 listings, conversations)
npm run dev                   # http://localhost:3000
```

Then open **`/demo`** and log in to any role with one click — no registration needed for review.
All seeded accounts share the password from `DEMO_PASSWORD` (default `demo1234`).

| Role | Account | What to look at |
| --- | --- | --- |
| Buyer | `buyer@n5deal.demo` | mandate editor, AI matches, smart search, messaging |
| Buyer (anonymous) | `zenith@n5deal.demo` | how an anonymous mandate appears to sellers |
| Buyer (empty mandate) | `newcomer@n5deal.demo` | onboarding nudge and empty-match state |
| Seller | `seller@n5deal.demo` | listing CRUD, AI listing review, buyer search, AI buyer matches |
| Platform Manager | `manager@n5deal.demo` | participants, listings, suspend/remove, audit log |
| Suspended seller | `ghost@n5deal.demo` | login is refused; their listing is hidden from the catalogue |

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + `next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (34) |
| `npm run test:e2e` | Playwright end-to-end flows (6) |
| `npm run db:seed` / `db:reset` / `db:studio` | database helpers |

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** connection (`...-pooler...`), used at runtime |
| `DIRECT_URL` | yes | Neon **direct** connection (no `-pooler`), used by `prisma migrate` |
| `AUTH_SECRET` | yes | ≥16 chars; signs the session JWT. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `GEMINI_API_KEY` | no | free key from [Google AI Studio](https://aistudio.google.com/apikey). **Without it the app works fully** — every AI feature falls back to its deterministic engine and the UI says so |
| `GEMINI_MODEL` | no | default `gemini-2.5-flash-lite` (free tier: 30 req/min, 1000 req/day) |
| `DEMO_PASSWORD` | no | password for the seeded demo accounts, default `demo1234` |

Config is validated at boot in `src/lib/env.ts`, so a missing secret fails fast instead of
producing a half-working deployment.

---

## 2. Deploying to Vercel + Neon

1. **Neon** → create a project, copy both connection strings (pooled and direct).
2. **Vercel** → import the repository. Framework preset *Next.js*, no build overrides needed.
3. Add the environment variables above (Production + Preview). `AUTH_SECRET` must be a fresh random
   value, not the local one.
4. Deploy. The `build` script runs `prisma migrate deploy`, so the schema is created on the first
   deployment.
5. Seed the demo data once, from your machine against the production database:

   ```bash
   DATABASE_URL="<neon pooled url>" DIRECT_URL="<neon direct url>" npm run db:seed
   ```

   The seed is idempotent (upsert on natural keys), so it is safe to re-run after a schema change.

Notes for production, deliberately out of scope here: migrations run inside the build, which is
convenient for a prototype but would belong in a release step for a real service; the AI rate
limiter is per-instance in-memory and would move to Vercel KV / Redis.

---

## 3. Key technical decisions

**Filters live in the URL, not in client state.** Every list view parses `searchParams` into a typed
filter object (`src/lib/filters/*`) and renders on the server. Consequences: state survives a
refresh and the back button, result pages are shareable, there is no client store to keep in sync,
and the "application state persists after refresh" requirement is satisfied by the architecture
instead of by `localStorage`. Unknown values are dropped against the taxonomy, so a tampered query
string cannot reach the database layer.

**Mutations are Server Actions, authorisation lives next to the data.** There are no CRUD API
routes; `src/lib/actions/*` holds Zod-validated server actions, and each one re-checks role and
ownership (`requireRole`, explicit `sellerId` comparison) rather than trusting the page that
rendered the form. `src/proxy.ts` (Next 16's renamed middleware) only does the cheap anonymous
bounce — it is a UX optimisation, never the security boundary. `/api` is reserved for the AI
endpoints, which need rate limiting and are called from client components.

**Sessions are a signed cookie carrying only a user id.** `jose` JWT in an httpOnly cookie, bcrypt
password hashes. Role and status are re-read from the database on every request, so suspending a
participant takes effect on their next click instead of when their token expires. Auth.js would
have added configuration without buying anything the prototype needs; the tradeoff is no OAuth, no
password reset, no refresh-token rotation.

**Nothing is deleted.** Moderation flips `status` (`ACTIVE | SUSPENDED | REMOVED`,
`DRAFT | PUBLISHED | SUSPENDED | ARCHIVED`) and writes an append-only `ModerationAction` row in the
same transaction, so the audit log and the state change cannot diverge. Visibility is expressed in
the query itself (`buildAssetWhere`) with three scopes — public, owner, manager — rather than
filtered in the view, so no page can leak a suspended listing by accident.

**Money is stored as whole currency units in `Int`.** M&A tickets are quoted in millions, cent
precision is noise, and `Int` stays JSON-serialisable across the server/client boundary, unlike
Prisma `Decimal` or `BigInt`. `null` means "not disclosed" and is handled explicitly everywhere
(sorting with `nulls: "last"`, neutral scoring in matching, excluded when a budget filter is on).

**One taxonomy, used by everything.** `src/lib/taxonomy.ts` is the single vocabulary for sectors,
jurisdictions, licences and aliases; filters, forms, seed data, the AI prompts and the AI output
validation all read from it. Industry terms stay in English in both locales — an "EMI licence" is
an EMI licence in Ukrainian too — while UI copy and enum labels are translated.

**i18n without locale routes.** A cookie (`n5_locale`) plus typed dictionaries
(`src/i18n/dictionaries/*`), where `uk` must structurally satisfy `typeof en`, so a missing
translation is a compile error. No `/en/...` prefix: the query string already belongs to filters,
and one canonical URL per listing means a shared link opens in the reader's own language. Only the
locale crosses the RSC boundary; client components resolve the dictionary from their own bundle
because the dictionaries contain interpolation functions.

---

## 4. Data model

```text
User ──1:1── BuyerProfile        (mandate: sectors, geographies, deal types, ticket range, thesis)
     ──1:1── SellerProfile
     ──1:N── Asset               (listing: sector, jurisdiction, licence, deal type, financials)
     ──N:M── Conversation ──1:N── Message
     ──1:N── ModerationAction    (append-only audit log, survives its target)
```

- A `Conversation` is scoped to an asset (`@@unique([assetId, buyerId, sellerId])`) because in M&A
  every conversation is about one specific deal; `lastMessageAt` is denormalised for cheap inbox
  ordering, and unread counts come from `Message.readAt`.
- `ModerationAction` uses `onDelete: SetNull` on its targets so the log outlives them.
- Sectors/geographies are Postgres string arrays validated against the taxonomy. Lookup tables
  would be the production choice; for a prototype a centralised typed vocabulary buys the same
  consistency with far less machinery.
- Indexes are on the access paths that exist: `Asset(status, sector)`, `Asset(sellerId, status)`,
  `Conversation(buyerId|sellerId, lastMessageAt)`, `Message(conversationId, createdAt)`.

---

## 5. Product & UX decisions

- **The buyer catalogue is not public.** Mandates are commercially sensitive, so `/buyers` is open
  to sellers (who have something to offer) and managers only. Browsing assets, by contrast, is
  public — that is the marketplace's shop window.
- **Buyers choose between a public and an anonymous mandate.** An anonymous buyer still appears in
  the catalogue, because the mandate is the useful part for a seller, but the company and personal
  name are withheld until a conversation exists between the two parties. The masking happens in the
  query layer, not in the template.
- **Both sides can initiate.** A buyer contacts a seller from a listing; a seller contacts a buyer
  from a mandate or from the AI match list. Both entry points open the same thread model, so there
  is one inbox and one history.
- **Managers moderate, they do not trade.** They cannot start conversations and cannot read deal
  correspondence — the brief asks them to police participants and listings, which is what they get,
  with a mandatory reason on every action.
- **Honest empty and partial states.** A buyer with a mandate below 40% completeness is shown the
  onboarding nudge instead of an arbitrary "recommendation" list. Listings without a price are
  labelled *price on request* rather than `€0`. A suspended counterparty disables the composer with
  an explanation instead of failing on submit.
- **Visual language follows n5deal.com:** near-black canvas, thin cool-grey borders, a single mint
  accent reserved for actions and signal, and listing cards keyed on the filters that matter in this
  market (sector, licence, jurisdiction, deal type, price).

---

## 6. AI functionality

Four features, each with a deterministic engine that produces a useful result on its own. The model
is an enhancement, never a dependency — `GEMINI_API_KEY` can be absent, rate-limited or return
malformed JSON, and the UI degrades to *Heuristic mode* with a visible badge.

| Feature | Where | AI role | Fallback |
| --- | --- | --- | --- |
| **Smart search** | `/assets` | sentence → structured filters, applied to the URL | regex + alias parser over the taxonomy (`heuristicParse`) |
| **Match suggestions** | `/buyer/matches`, `/seller/assets/[id]/matches` | scores and explains a shortlist in one sentence | rule-based scoring with structured, translated reasons |
| **Listing review** | listing form | reads the live form, names what buyers will ask about, proposes a sharper summary | weighted completeness rules |
| **Intro message draft** | contact panel | drafts the first outreach from mandate + listing facts | localised template |

Design points worth noting:

- **Rules pick the shortlist, the model ranks it.** `scoreMatch` (sector/geography/deal
  type/ticket/thesis overlap) selects ~8–9 candidates, so the prompt stays inside the free tier and
  the ranking is explainable. The final score is a 60/40 blend of rule score and model score, and
  ids the model invents are discarded.
- **Every response is Zod-validated and taxonomy-clamped.** Invalid output is treated exactly like
  an outage. The listing review may be *stricter* than the rules but never more lenient, so a
  listing missing its financials cannot score 90 because it reads well.
- **Prompts are locale-aware**, so reasons and drafts come back in the UI language.
- Calls are rate-limited per user (8/min, `src/lib/ai/rate-limit.ts`) and time out after 15s.
- The provider is a ~90-line `fetch` wrapper (`src/lib/ai/provider.ts`) instead of an SDK: one
  JSON-mode call is all that is needed, and swapping providers touches one function.

---

## 7. Edge cases handled explicitly

- Suspending a seller instantly removes their listings from the public catalogue and from matching,
  while the owner and managers can still see them.
- A suspended or removed account cannot log in, and an existing session stops working on the next
  request.
- Messaging rejects: yourself, a manager, the wrong counterparty role, an inactive counterparty, a
  thread you are not part of, and an asset that does not belong to the seller in that thread — all
  enforced in the server action, not only in the UI.
- Sellers can set `PUBLISHED / DRAFT / ARCHIVED` but never clear `SUSPENDED`; that transition is
  manager-only.
- An inverted price or ticket range is swapped rather than rejected; junk pagination and sort values
  fall back to defaults.
- Ticket filtering uses range *overlap* with open-ended sides treated as unbounded, which is what a
  seller asking "who could write a €2M cheque" actually means.
- Short aliases match on word boundaries — "payments business **under** 1M" no longer resolves to
  Germany via the `de` alias (covered by a regression test).

---

## 8. Testing

```bash
npm test          # 34 unit tests: filters, matching, NL parsing, review rules, rate limiting
npm run test:e2e  # 6 Playwright flows against the seeded database
```

Unit tests cover the logic where mistakes are silent: filter parsing and SQL-shape construction
(including visibility scopes), match scoring and mandate completeness, the deterministic NL parser,
the listing-review rules in both locales, and the rate limiter. The e2e suite covers what unit tests
cannot: demo login per role, filtering with URL persistence, smart search, publishing a listing,
buyer → seller messaging arriving in the seller's inbox, suspending a seller and seeing their
inventory disappear from the catalogue (then restoring the seeded state), and the locale switch.

---

## 9. Assumptions

- Identity verification, NDAs, data rooms and payments are out of scope; `verified` is a seeded flag
  rather than a workflow.
- One asset belongs to one seller, and a seller is also the advisor — no brokerage hierarchy.
- All amounts are stored in whole units of the listing/mandate currency; no FX conversion is
  performed, so cross-currency comparisons are approximate by design.
- Email is not sent anywhere; notifications are the in-app inbox with unread counts.
- "Remove" is a soft delete. A real platform would need a GDPR erasure path separate from it.
- Demo accounts use a shared password on purpose, to make review one click.

## 10. AI tools used while building this

- **Claude Code (Opus)** as the main driver: schema and architecture decisions were made by me in a
  plan step, then implemented and iterated with the agent; it also wrote the bulk of the seed data
  and the test suites to my specification.
- **Gemini 2.5 Flash-Lite** is the runtime model inside the product (see §6).
- Decisions I deliberately kept ownership of: the data model and its soft-delete/audit design, the
  three visibility scopes, the rules-first/AI-second matching split, the URL-as-state approach, the
  i18n strategy, and the choice to make every AI feature optional.

## 11. What I would improve with more time

1. **Saved searches and alerts** — a buyer should be notified when a matching asset is published;
   the matching engine already produces everything needed for it.
2. **Deal stages instead of a flat inbox** — NDA requested → signed → data room → LOI, with the
   conversation attached to the stage. This is the real product shape, and the schema is one table
   away from it.
3. **Real search infrastructure** — `ILIKE` across six columns is fine at this size; Postgres
   full-text search with a `tsvector` column (and embeddings for semantic matching, which would also
   make matching cheaper than an LLM call) is the next step.
4. **Durable AI plumbing** — move the rate limiter to Vercel KV, cache match explanations per
   (asset, mandate) version, and stream the long responses instead of awaiting them.
5. **Verification workflow** — document upload, manager review queue, and a verified badge that
   means something, plus the report/flag path for participants.
6. **Harder test coverage** — integration tests for the server actions against a throwaway database
   (currently their guards are only covered end-to-end), accessibility assertions, and CI running
   lint/typecheck/unit/e2e on every push.
7. **Observability** — structured logs and metrics for AI fallbacks, so "heuristic mode" shows up on
   a dashboard rather than only in the UI.
