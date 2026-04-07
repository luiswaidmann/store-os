# Phase 7B — Store Build (Shopify Deployment)

## Status

**Phase 7B.1 EXECUTABLE.** `build-shopify-catalog` is deployed, activated, and integrated into the orchestrator.

Deployed: n8n workflow `oZE0Z9fb4ojnKiDd` — activated 2026-04-07
Smoke test: PASSED 2026-04-07 — execution 14430, PHASE_7B1_COMPLETE, 3 products created / 0 errors

---

## Phase 7B Overview

```
store_blueprint (Phase 7A output)
        │
        └──→ Phase 7B.1: build-shopify-catalog   → shopify_catalog_deployment
                │
                └──→ Phase 7B.2: build-shopify-pages (NOT YET IMPLEMENTED)
                     └──→ Phase 7B.3: build-shopify-navigation (NOT YET IMPLEMENTED)
                          └──→ Phase 7B.4: build-shopify-theme (NOT YET IMPLEMENTED)
```

---

## Phase 7B.1: build-shopify-catalog

### What it does

Consumes `store_blueprint.products` and `store_blueprint.collections` and deploys them to Shopify via the Admin API using an **idempotent upsert-by-handle** strategy.

**Safety guarantees:**
- No Shopify resources are ever deleted
- All new products are created with `status: draft` — never auto-published
- Existing resources (matched by handle) are updated, not duplicated
- `continueOnFail: true` on all HTTP nodes — individual API errors are collected, not fatal
- `neverError: true` on HTTP nodes — HTTP 4xx/5xx return as items, not exceptions

### Input Dependencies

| Input field | Source | Required |
|---|---|---|
| `store_blueprint.products` | Phase 7A (`build-store-blueprint`) | ✓ |
| `store_blueprint.collections` | Phase 7A (`build-store-blueprint`) | optional |
| `runtime_config.shop_url` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_SHOP_URL` | ✓ |
| `runtime_config.api_version` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_API_VERSION` | optional (default: 2025-01) |

### Expected Output: shopify_catalog_deployment

Schema: `schemas/phase-7b/shopify-catalog-deployment.schema.json`

| Field | Description |
|---|---|
| `status` | `PHASE_7B1_COMPLETE` \| `PHASE_7B1_PARTIAL` \| `PHASE_7B1_FAILED` |
| `products_created` | Count of new products created (HTTP 201) |
| `products_updated` | Count of existing products updated (HTTP 200) |
| `collections_created` | Count of new collections created (HTTP 201) |
| `collections_updated` | Count of existing collections updated (HTTP 200) |
| `errors` | Array of per-resource errors (handle, status, message) |
| `warnings` | Non-fatal warnings (e.g. noop, unexpected status) |
| `blueprint_summary` | Input counts for observability cross-reference |
| `safety_notes` | Confirms no-delete and draft-only guarantees |

### Node Contract

```
Pattern: 11-node (Subworkflow Trigger → Validate → Fetch×2 → Merge → Build Plan → IF → Create/Update → Merge → Summary)
Trigger: n8n-nodes-base.executeWorkflowTrigger
Input:   store_blueprint + runtime_config
Output:  shopify_catalog_deployment (inline)
Auth:    shopifyOAuth2Api (credential: edgLmgVntFGX6QYN "Shopify SuppliedTech Admin")
Cloud:   fully compatible (no filesystem, no AJV)
Deployed: oZE0Z9fb4ojnKiDd (activated 2026-04-07)
```

### Shopify API Operations

| Operation | Endpoint | Purpose |
|---|---|---|
| GET | `/custom_collections.json?limit=250` | Fetch existing collections for handle comparison |
| GET | `/products.json?limit=250&status=active,draft` | Fetch existing products for handle comparison |
| POST | `/custom_collections.json` | Create new collection |
| PUT | `/custom_collections/{id}.json` | Update existing collection |
| POST | `/products.json` | Create new product (draft) |
| PUT | `/products/{id}.json` | Update existing product |

### Upsert Logic

```
For each collection in store_blueprint.collections:
  GET existing custom_collections → index by handle
  if handle exists → PUT (update)
  else             → POST (create)

For each product in store_blueprint.products:
  GET existing products (status=active,draft) → index by handle
  if handle exists → PUT (update)
  else             → POST (create, status: draft)
```

Handle derivation: `blueprint.handle` if present, otherwise `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')`.

---

## Orchestrator Extension (Phase 7B.1)

`orchestrate-phase1` extended with 5 bridge nodes after Phase 7A Complete (total: 62 nodes):

```
Phase 7A Complete
    │
    └── Prepare Shopify Catalog Input
        └── Run build-shopify-catalog
            └── Shopify Catalog Success? (IF: status !== 'PHASE_7B1_FAILED')
                ├── [true]  Phase 7B.1 Complete
                └── [false] Halt - Shopify Catalog Failed
```

**`Phase 7B.1 Complete`** returns the full 10-artifact chain inline:
`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`,
`strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`,
`store_blueprint`, `shopify_catalog_deployment`

**Terminal statuses** (orchestrator polling):
- `PHASE_7B1_COMPLETE` — all catalog operations succeeded
- `PHASE_7B1_PARTIAL` — some operations succeeded, some failed (execution continues)
- `PHASE_7B1_FAILED` → triggers `Halt - Shopify Catalog Failed` (fatal)

---

## CLI Support

```bash
# Full run (trigger + poll until PHASE_7B1_COMPLETE or PHASE_7B1_PARTIAL):
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Poll a running execution:
node scripts/poll-execution.js <execution_id>
```

The golden-input.json `smoke_test_config` must include:
```json
{
  "STORE_OS_SHOPIFY_SHOP_URL": "8zw111-cj.myshopify.com",
  "STORE_OS_SHOPIFY_API_VERSION": "2025-01"
}
```

---

## Implementation Checklist

### Phase 7B.1

- [x] `schemas/phase-7b/shopify-catalog-deployment.schema.json`
- [x] `workflows/contracts/build-shopify-catalog.contract.json`
- [x] `workflows/n8n/build-shopify-catalog.n8n.json` — **EXECUTABLE** (deployed: `oZE0Z9fb4ojnKiDd`, activated 2026-04-07)
- [x] Extend `orchestrate-phase1` with Phase 7B.1 nodes (+5 nodes; total: 62)
- [x] `workflow-ids.json`: `build-shopify-catalog` ID recorded (`oZE0Z9fb4ojnKiDd`)
- [x] `workflow-ids.json`: Shopify OAuth2 credential ID recorded (`edgLmgVntFGX6QYN`)
- [x] `scripts/run-orchestrator.js` — updated terminal statuses + printSummary + buildRunRecord for Phase 7B.1
- [x] `scripts/poll-execution.js` — updated terminal statuses
- [x] Live smoke test against `8zw111-cj.myshopify.com` — execution 14430, PHASE_7B1_COMPLETE (2026-04-07)
- [x] `docs/runtime-status.md` smoke test entry (2026-04-07)

### Phase 7B.2 Planned Scope (NOT YET IMPLEMENTED)

Phase 7B.2 will consume `store_blueprint.pages` and deploy About, FAQ, Contact pages:

- `build-shopify-pages` — create/update Shopify pages (body_html from blueprint)

### Phase 7B.3 Planned Scope (NOT YET IMPLEMENTED)

- `build-shopify-navigation` — deploy main menu and footer menu

### Phase 7B.4 Planned Scope (NOT YET IMPLEMENTED)

- `build-shopify-theme` — configure homepage sections, hero, featured collection

---

## Credential Setup

The `build-shopify-catalog` workflow uses `shopifyOAuth2Api` credential type (distinct from the `shopifyApi` type used by `import-shopify-data`):

| Field | Value |
|---|---|
| Credential type | `shopifyOAuth2Api` |
| Credential ID | `edgLmgVntFGX6QYN` |
| Credential name | Shopify SuppliedTech Admin |
| Used in | `build-shopify-catalog.n8n.json` (4 HTTP nodes) |

To deploy to a different n8n instance, replace credential ID `edgLmgVntFGX6QYN` in the workflow JSON with your instance's shopifyOAuth2Api credential ID.
