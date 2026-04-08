# Phase 7B — Store Build (Shopify Deployment)

## Status

**Phase 7B.3 EXECUTABLE.** `build-shopify-theme` is deployed, activated, and integrated into the orchestrator. Full chain through theme deployment confirmed.

| Phase | Status | n8n ID | Smoke Test |
|---|---|---|---|
| 7B.1 | EXECUTABLE | `oZE0Z9fb4ojnKiDd` | PASSED 2026-04-07 (exec 14430) |
| 7B.2 | EXECUTABLE | `LADq8PuMRuswIxJa` | PASSED 2026-04-08 (exec 14604) |
| 7B.3 | EXECUTABLE | `QG5ezHb3qKjKcvvn` | PASSED 2026-04-08 (exec 14728) |
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
                         └──→ Phase 7B.3: build-shopify-theme       → shopify_theme_deployment
                                  └──→ Phase 7B.4: (PLANNED — theme publish)
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
| `runtime_config.shopify_api_version` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_API_VERSION` | optional (default: 2026-01) |

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
Auth:    shopifyOAuth2Api (credential: CO1JGlTR5RJ9Cs6x "Shopify SuppliedTech Admin")
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
Auth:    shopifyOAuth2Api (credential: CO1JGlTR5RJ9Cs6x "Shopify SuppliedTech Admin")
Cloud:   fully compatible
Deployed: LADq8PuMRuswIxJa (activated 2026-04-07)
```

### Shopify API Operations

| Operation | Endpoint | API | Purpose |
|---|---|---|---|
| GET | `/pages.json?limit=250&published_status=any` | REST | Fetch existing pages for handle comparison |
| POST | `/graphql.json` | GraphQL | Fetch existing menus (`{ menus(first:50) { ... } }`) |
| POST | `/pages.json` | REST | Create new page (published: false) |
| PUT | `/pages/{id}.json` | REST | Update existing page |
| POST | `/graphql.json` | GraphQL | `menuCreate` — create new navigation menu |
| POST | `/graphql.json` | GraphQL | `menuUpdate` — update existing navigation menu |

**API Note:** Navigation was migrated from REST `link_lists` (removed in Shopify API 2025-04) to GraphQL Menu API in April 2026. Pages remain on REST Admin API.

### Link Type Mapping (GraphQL MenuItemType)

| Blueprint `link_type` | GraphQL type | URL |
|---|---|---|
| `page` | `HTTP` | `/pages/{target}` |
| `collection` | `HTTP` | `/collections/{target}` |
| `home` / `homepage` | `FRONTPAGE` | `/` |
| `product` | `HTTP` | `/products/{target}` |
| `blog` | `HTTP` | `/blogs/{target}` |

---

## Orchestrator Extension (Phase 7B.1 + 7B.2 + 7B.3)

`orchestrate-phase1` total nodes: **72** (62 after 7B.1 + 5 for 7B.2 + 5 for 7B.3)

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
                │                           │               │
                │                           │               └── Prepare Theme Input
                │                           │                   └── Run build-shopify-theme
                │                           │                       └── Shopify Theme Success? (IF: status !== 'PHASE_7B3_FAILED')
                │                           │                           ├── [true]  Phase 7B.3 Complete
                │                           │                           └── [false] Halt - Shopify Theme Failed
                │                           └── [false] Halt - Shopify Pages/Nav Failed
                └── [false] Halt - Shopify Catalog Failed
```

**`Phase 7B.3 Complete`** returns the full 12-artifact chain inline:
`store_profile`, `market_intelligence`, `brand_positioning`, `competitor_clusters`,
`strategy_synthesis`, `offer_architecture`, `content_strategy`, `gtm_plan`,
`store_blueprint`, `shopify_catalog_deployment`, `shopify_pages_navigation_deployment`,
`shopify_theme_deployment`

**Terminal statuses** (orchestrator polling — all scripts):
- `PHASE_7B3_COMPLETE` — all theme sections + assets written
- `PHASE_7B3_PARTIAL` — some writes succeeded, some failed (execution continues)
- `PHASE_7B3_DRY_RUN` — dry run completed (allow_theme_writes not set)
- `PHASE_7B3_BLOCKED` — no safe theme target found
- `PHASE_7B3_FAILED` → triggers `Halt - Shopify Theme Failed` (fatal)
- `PHASE_7B2_COMPLETE` / `PHASE_7B1_COMPLETE` — backward compatible

---

## Phase 7B.3: build-shopify-theme

### What it does

Consumes `store_blueprint.theme_sections` and `store_blueprint.assets` and deploys Shopify OS 2.0 section files and SVG placeholder assets to a target theme via the Theme Assets API.

**Blueprint inputs:**
- `theme_sections`: 4 sections (hero, featured-collection, value-prop, trust/social-proof)
- `assets`: 3 assets (logo 200×50, favicon 32×32, hero-image 1920×800)

**Safety guarantees:**
- No writes unless `runtime_config.allow_theme_writes: true` is explicitly set (default: dry-run)
- Auto-selects unpublished theme; blocks if only active theme exists (no accidental live deploys)
- Explicit `shopify_theme_id` overrides auto-selection (can target active theme by choice)
- All section keys prefixed `store-os-` to avoid overwriting existing Dawn sections
- Does NOT modify `templates/*.json` or `config/settings_data.json`
- No existing theme files are deleted
- `continueOnFail: true` + `neverError: true` on HTTP nodes — individual 4xx errors are collected
- PUT `/themes/{id}/assets.json` is inherently idempotent by key

### Theme Targeting Logic

1. If `runtime_config.shopify_theme_id` is set → use that theme (warns if role: main)
2. Else if unpublished themes exist → auto-select most recently updated unpublished theme
3. Else → `PHASE_7B3_BLOCKED` (refuses to auto-target active theme)

### Input Dependencies

| Input field | Source | Required |
|---|---|---|
| `store_blueprint.theme_sections` | Phase 7A (`build-store-blueprint`) | ✓ |
| `store_blueprint.assets` | Phase 7A (`build-store-blueprint`) | ✓ |
| `runtime_config.shopify_shop_url` | `resolve-runtime-config` | ✓ |
| `runtime_config.shopify_api_version` | `resolve-runtime-config` | optional (default: 2026-01) |
| `runtime_config.allow_theme_writes` | `resolve-runtime-config` → `STORE_OS_ALLOW_THEME_WRITES` | ✓ for live writes |
| `runtime_config.shopify_theme_id` | `resolve-runtime-config` → `STORE_OS_SHOPIFY_THEME_ID` | optional (auto-select) |

### Expected Output: shopify_theme_deployment

Schema: `schemas/phase-7b/shopify-theme-deployment.schema.json`

| Field | Description |
|---|---|
| `status` | `PHASE_7B3_COMPLETE` \| `PHASE_7B3_PARTIAL` \| `PHASE_7B3_FAILED` \| `PHASE_7B3_DRY_RUN` \| `PHASE_7B3_BLOCKED` |
| `theme_id` | Target theme numeric ID |
| `theme_name` | Target theme display name |
| `sections_written` | Count of section .liquid files written |
| `assets_written` | Count of SVG placeholder assets written |
| `dry_run` | `true` if no writes were performed |
| `errors` | Array of per-asset errors (key, status, message) |
| `warnings` | Non-fatal warnings |
| `safety_notes` | Confirms theme targeting, no-delete, no-template-modify guarantees |

### Node Contract

```
Pattern: 7-node (Trigger → Validate → Fetch Themes → Build Plan → IF write → Write Asset → Summary)
Trigger: n8n-nodes-base.executeWorkflowTrigger
Input:   store_blueprint + runtime_config + content_strategy (optional)
Output:  shopify_theme_deployment (inline)
Auth:    shopifyOAuth2Api (credential: CO1JGlTR5RJ9Cs6x "Shopify SuppliedTech Admin")
Cloud:   fully compatible (no filesystem, no AJV)
Deployed: QG5ezHb3qKjKcvvn (activated 2026-04-08)
```

### Shopify API Operations

| Operation | Endpoint | Purpose |
|---|---|---|
| GET | `/themes.json` | Fetch all themes for target selection |
| PUT | `/themes/{id}/assets.json` | Write section .liquid or SVG asset (idempotent by key) |

### Generated Section Types

| Section | File Key | Schema Name | Features |
|---|---|---|---|
| Hero | `sections/store-os-hero.liquid` | `store-os: {heading}` | heading, content, CTA |
| Featured Collection | `sections/store-os-featured-collection.liquid` | `store-os: {heading}` | collection picker, product grid |
| Value Prop | `sections/store-os-value-prop.liquid` | `store-os: {heading}` | column blocks (max 6) |
| Trust/Social Proof | `sections/store-os-trust-social-proof.liquid` | `store-os: {heading}` | trust item blocks (max 6) |

Schema names are truncated to 25 characters (Shopify limit). All sections include presets for theme editor discovery.

---

## CLI Support

```bash
# Full run (trigger + poll until PHASE_7B3_COMPLETE or similar):
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Poll a running execution:
node scripts/poll-execution.js <execution_id>
```

The `golden-input.json` `smoke_test_config` must include:
```json
{
  "STORE_OS_SHOPIFY_SHOP_URL": "8zw111-cj.myshopify.com",
  "STORE_OS_SHOPIFY_API_VERSION": "2026-01",
  "STORE_OS_ALLOW_THEME_WRITES": "true",
  "STORE_OS_SHOPIFY_THEME_ID": "193655701844"
}
```

Omit `STORE_OS_ALLOW_THEME_WRITES` to get a dry-run (PHASE_7B3_DRY_RUN). Omit `STORE_OS_SHOPIFY_THEME_ID` to auto-select an unpublished theme.

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

### Phase 7B.3 ✓ COMPLETE

- [x] `schemas/phase-7b/shopify-theme-deployment.schema.json`
- [x] `workflows/contracts/build-shopify-theme.contract.json`
- [x] `workflows/n8n/build-shopify-theme.n8n.json` — EXECUTABLE (deployed: `QG5ezHb3qKjKcvvn`)
- [x] `orchestrate-phase1` extended with 7B.3 bridge nodes (+5; total: 72)
- [x] `workflow-ids.json`: ID + placeholder recorded
- [x] `resolve-runtime-config`: added `allow_theme_writes` + `shopify_theme_id` fields
- [x] `orchestrate-phase1` Resolve Runtime Config: added same fields to inline config assembly
- [x] `test-data/golden-input.json`: added `STORE_OS_ALLOW_THEME_WRITES` + `STORE_OS_SHOPIFY_THEME_ID`
- [x] `scripts/run-orchestrator.js` + `scripts/poll-execution.js`: added PHASE_7B3_* statuses
- [x] Live smoke test — execution 14728, PHASE_7B3_COMPLETE (2026-04-08): 4 sections + 3 assets, 0 errors

### Phase 7B.4 — PLANNED

- [ ] `build-shopify-theme-publish` — finalize and publish (out of scope for unattended run)

---

## Credential Setup

All Phase 7B workflows use `shopifyOAuth2Api` credential type:

| Field | Value |
|---|---|
| Credential type | `shopifyOAuth2Api` |
| Credential ID | `CO1JGlTR5RJ9Cs6x` |
| Credential name | Shopify SuppliedTech Admin |
| Used in | `build-shopify-catalog.n8n.json`, `build-shopify-pages-navigation.n8n.json`, `build-shopify-theme.n8n.json` |

**Required OAuth scopes by phase:**
- Phase 7B.1 (catalog): `read_products`, `write_products`
- Phase 7B.2 (pages + navigation): additionally needs `read_content`, `write_content`
  - Without `read_content`: fetch nodes fail gracefully, all resources treated as new creates
- Phase 7B.3 (theme): additionally needs `read_themes`, `write_themes`

To deploy to a different n8n instance, replace credential ID `CO1JGlTR5RJ9Cs6x` in all Phase 7B workflow JSON files.
