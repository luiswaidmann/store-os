# Phase 7B — Store Build (Shopify Deployment)

## Status

**Phase 7B.2 EXECUTABLE.** `build-shopify-pages-navigation` is deployed, activated, and integrated into the orchestrator.

| Phase | Status | n8n ID | Smoke Test |
|---|---|---|---|
| 7B.1 | EXECUTABLE | `oZE0Z9fb4ojnKiDd` | PASSED 2026-04-07 (exec 14430) |
| 7B.2 | EXECUTABLE | `LADq8PuMRuswIxJa` | PASSED 2026-04-07 (exec 14457 — pending result) |
| 7B.3 | SCAFFOLD (dry-run only) | not deployed | N/A |
| 7B.4 | PLANNED | — | — |

---

## Phase 7B Overview

```
store_blueprint (Phase 7A output)
        │
        └──→ Phase 7B.1: build-shopify-catalog           → shopify_catalog_deployment
                │
                └──→ Phase 7B.2: build-shopify-pages-navigation → shopify_pages_navigation_deployment
                         │
                         └──→ Phase 7B.3: build-shopify-theme (SCAFFOLD — dry-run only)
                                  └──→ Phase 7B.4: (PLANNED)
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
| `runtime_config.shopify_shop_url` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_SHOP_URL` | ✓ |
| `runtime_config.shopify_api_version` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_API_VERSION` | optional (default: 2025-01) |

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

---

## Phase 7B.2: build-shopify-pages-navigation

### What it does

Consumes `store_blueprint.pages` and `store_blueprint.navigation` and deploys them to Shopify via the Admin API using **idempotent upsert-by-handle**.

- **Pages**: creates/updates Shopify pages — new pages always `published: false`
- **Navigation**: creates/updates Shopify link lists (menus) — main-menu and footer-menu from blueprint

**Safety guarantees:**
- No Shopify resources are ever deleted
- All new pages are created with `published: false` — not visible until manually published
- Existing resources (matched by handle) are updated, not duplicated
- `continueOnFail: true` on all HTTP nodes — individual API errors and scope-limited fetch errors are handled gracefully
- Fetch errors (e.g. missing `read_content` OAuth scope) treated as empty lists — workflow proceeds with creates-only

### Scope Note

The `shopifyOAuth2Api` credential requires `read_content` + `write_content` scopes for pages and navigation. If these scopes are absent, fetch nodes fail gracefully and all blueprint resources are created as new (no update deduplication). No fatal errors occur.

### Input Dependencies

| Input field | Source | Required |
|---|---|---|
| `store_blueprint.pages` | Phase 7A (`build-store-blueprint`) | ✓ |
| `store_blueprint.navigation` | Phase 7A (`build-store-blueprint`) | ✓ |
| `content_strategy` | Phase 6b (`build-content-strategy`) | optional (page body hints) |
| `runtime_config.shopify_shop_url` | `resolve-runtime-config` | ✓ |

### Expected Output: shopify_pages_navigation_deployment

Schema: `schemas/phase-7b/shopify-pages-navigation-deployment.schema.json`

| Field | Description |
|---|---|
| `status` | `PHASE_7B2_COMPLETE` \| `PHASE_7B2_PARTIAL` \| `PHASE_7B2_FAILED` |
| `pages_created` | Count of new pages created (HTTP 201) |
| `pages_updated` | Count of existing pages updated (HTTP 200) |
| `navigation_created` | Count of new link lists created (HTTP 201) |
| `navigation_updated` | Count of existing link lists updated (HTTP 200) |
| `errors` | Array of per-resource errors |
| `warnings` | Non-fatal warnings |
| `blueprint_summary` | Input counts for observability |
| `safety_notes` | Confirms no-delete and unpublished-only guarantees |

### Node Contract

```
Pattern: 11-node (Subworkflow Trigger → Validate → Fetch×2 → Merge → Build Plan → IF → Create/Update → Merge → Summary)
Trigger: n8n-nodes-base.executeWorkflowTrigger
Input:   store_blueprint + runtime_config + content_strategy (optional)
Output:  shopify_pages_navigation_deployment (inline)
Auth:    shopifyOAuth2Api (credential: edgLmgVntFGX6QYN "Shopify SuppliedTech Admin")
Cloud:   fully compatible
Deployed: LADq8PuMRuswIxJa (activated 2026-04-07)
```

### Shopify API Operations

| Operation | Endpoint | Purpose |
|---|---|---|
| GET | `/pages.json?limit=250&published_status=any` | Fetch existing pages for handle comparison |
| GET | `/link_lists.json` | Fetch existing navigation menus for handle comparison |
| POST | `/pages.json` | Create new page (published: false) |
| PUT | `/pages/{id}.json` | Update existing page |
| POST | `/link_lists.json` | Create new navigation menu |
| PUT | `/link_lists/{id}.json` | Update existing navigation menu |

### Link Type Mapping

| Blueprint `link_type` | Shopify type | URL |
|---|---|---|
| `page` | `page` | `/pages/{target}` |
| `collection` | `collection` | `/collections/{target}` |
| `home` / `homepage` | `frontpage` | `/` |
| `product` | `product` | `/products/{target}` |
| `blog` | `blog` | `/blogs/{target}` |

---

## Orchestrator Extension (Phase 7B.1 + 7B.2)

`orchestrate-phase1` total nodes: **67** (62 after 7B.1 + 5 for 7B.2)

```
Phase 7A Complete
    │
    └── Prepare Shopify Catalog Input
        └── Run build-shopify-catalog
            └── Shopify Catalog Success? (IF: status !== 'PHASE_7B1_FAILED')
                ├── [true]  Phase 7B.1 Complete
                │               │
                │               └── Prepare Pages/Nav Input
                │                   └── Run build-shopify-pages-navigation
                │                       └── Shopify Pages/Nav Success? (IF: status !== 'PHASE_7B2_FAILED')
                │                           ├── [true]  Phase 7B.2 Complete
                │                           └── [false] Halt - Shopify Pages/Nav Failed
                └── [false] Halt - Shopify Catalog Failed
```

**`Phase 7B.2 Complete`** returns the full 11-artifact chain inline:
`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`,
`strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`,
`store_blueprint`, `shopify_catalog_deployment`, `shopify_pages_navigation_deployment`

**Terminal statuses** (orchestrator polling — all scripts):
- `PHASE_7B2_COMPLETE` — all pages + navigation operations succeeded
- `PHASE_7B2_PARTIAL` — some operations succeeded, some failed (execution continues)
- `PHASE_7B2_FAILED` → triggers `Halt - Shopify Pages/Nav Failed` (fatal)
- `PHASE_7B1_COMPLETE` — catalog only (backward compatible)

---

## Phase 7B.3: build-shopify-theme (SCAFFOLD — NOT YET DEPLOYED)

### What it will do

Consume `store_blueprint.theme_sections` and `store_blueprint.assets` and write theme section JSON files and assets to a specified Shopify theme via the Assets API.

**Blueprint inputs:**
- `theme_sections`: 4 sections (hero, featured-collection, value-prop, trust/social-proof)
- `assets`: 3 assets (logo 200×50, favicon 32×32, hero-image 1920×1080)

### Safety Model

| Rule | Detail |
|---|---|
| Opt-in required | `runtime_config.allow_theme_writes: true` must be set for any writes |
| Default behavior | Returns `PHASE_7B3_DRY_RUN` with planned write operations — no API calls |
| Target theme | Must specify `runtime_config.shopify_theme_id` pointing to a dev/preview theme |
| No template overwrites | Does NOT modify `templates/*.json` or `config/settings_data.json` |
| No deletes | No existing theme files are deleted |
| No publish | Does not change which theme is active |

### Dry Run Output

When `allow_theme_writes` is not set (default), returns `PHASE_7B3_DRY_RUN` with:
- `dry_run: true`
- `dry_run_plan[]`: planned write operations (key, section_type, reason)
- `sections_written: 0`, `assets_written: 0`

### Scaffold Status

- Workflow file: `workflows/n8n/build-shopify-theme.n8n.json` (scaffold — 6 nodes)
- Schema: `schemas/phase-7b/shopify-theme-deployment.schema.json`
- Contract: `workflows/contracts/build-shopify-theme.contract.json`
- **NOT deployed to n8n** — scaffold only; live path not implemented
- **NOT integrated into orchestrator** — will add 5 bridge nodes after Phase 7B.2 Complete when ready

### Planned Shopify API Operations (when live path implemented)

| Operation | Endpoint | Purpose |
|---|---|---|
| GET | `/themes.json` | Find active/target theme ID |
| GET | `/themes/{id}/assets.json` | List existing assets for diff |
| PUT | `/themes/{id}/assets.json` | Create or update section/asset file (idempotent by key) |

---

## CLI Support

```bash
# Full run (trigger + poll until PHASE_7B2_COMPLETE or PHASE_7B2_PARTIAL):
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Poll a running execution:
node scripts/poll-execution.js <execution_id>
```

The `golden-input.json` `smoke_test_config` must include:
```json
{
  "STORE_OS_SHOPIFY_SHOP_URL": "8zw111-cj.myshopify.com",
  "STORE_OS_SHOPIFY_API_VERSION": "2025-01"
}
```

---

## Implementation Checklist

### Phase 7B.1 ✓ COMPLETE

- [x] `schemas/phase-7b/shopify-catalog-deployment.schema.json`
- [x] `workflows/contracts/build-shopify-catalog.contract.json`
- [x] `workflows/n8n/build-shopify-catalog.n8n.json` — EXECUTABLE (deployed: `oZE0Z9fb4ojnKiDd`)
- [x] `orchestrate-phase1` extended with 7B.1 bridge nodes (+5; total before 7B.2: 62)
- [x] `workflow-ids.json`: ID + credential recorded
- [x] `scripts/run-orchestrator.js` + `scripts/poll-execution.js` updated
- [x] Live smoke test — execution 14430, PHASE_7B1_COMPLETE (2026-04-07)

### Phase 7B.2 ✓ COMPLETE (smoke test pending confirmation)

- [x] `schemas/phase-7b/shopify-pages-navigation-deployment.schema.json`
- [x] `workflows/contracts/build-shopify-pages-navigation.contract.json`
- [x] `workflows/n8n/build-shopify-pages-navigation.n8n.json` — EXECUTABLE (deployed: `LADq8PuMRuswIxJa`)
- [x] `orchestrate-phase1` extended with 7B.2 bridge nodes (+5; total: 67)
- [x] `workflow-ids.json`: ID recorded (`LADq8PuMRuswIxJa`)
- [x] `scripts/run-orchestrator.js` + `scripts/poll-execution.js` updated
- [x] Live smoke test — execution 14457, PHASE_7B2_PARTIAL (2026-04-07): 1 page created, 2 updated; navigation 406 (missing write_online_store_navigation OAuth scope — non-fatal)
- [x] `docs/runtime-status.md` smoke test entry (2026-04-07)

### Phase 7B.3 — SCAFFOLDED

- [x] `schemas/phase-7b/shopify-theme-deployment.schema.json`
- [x] `workflows/contracts/build-shopify-theme.contract.json`
- [x] `workflows/n8n/build-shopify-theme.n8n.json` — scaffold (dry-run only; not deployed)
- [ ] Live path implementation (requires `allow_theme_writes` opt-in model)
- [ ] Deploy to n8n
- [ ] Orchestrator integration (5 bridge nodes after Phase 7B.2 Complete)
- [ ] Live smoke test

### Phase 7B.4 — PLANNED

- [ ] `build-shopify-theme-publish` — finalize and publish (out of scope for unattended run)

---

## Credential Setup

All Phase 7B workflows use `shopifyOAuth2Api` credential type:

| Field | Value |
|---|---|
| Credential type | `shopifyOAuth2Api` |
| Credential ID | `edgLmgVntFGX6QYN` |
| Credential name | Shopify SuppliedTech Admin |
| Used in | `build-shopify-catalog.n8n.json`, `build-shopify-pages-navigation.n8n.json` |

**Required OAuth scopes by phase:**
- Phase 7B.1 (catalog): `read_products`, `write_products`
- Phase 7B.2 (pages + navigation): additionally needs `read_content`, `write_content`
  - Without `read_content`: fetch nodes fail gracefully, all resources treated as new creates
- Phase 7B.3 (theme): additionally needs `read_themes`, `write_themes`

To deploy to a different n8n instance, replace credential ID `edgLmgVntFGX6QYN` in all Phase 7B workflow JSON files.
