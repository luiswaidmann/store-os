# Phase 12 — Cloud Compatibility Notes

**Status**: Cloud-hardening pass completed after smoke test on n8n Cloud (2026-03-21).
**Scope**: Phase 1 chain only — intake → import → build-store-profile.

---

## Background

Phase 12 was designed and tested against **n8n Self-Hosted** with local filesystem access.
A smoke test on **n8n Cloud** revealed that Code nodes throw `Module 'fs' is disallowed`
because n8n Cloud sandboxes `require()` and blocks Node.js built-ins including `fs` and `path`.

This document records what is cloud-compatible, what is self-hosted-only, and what remains
blocked, after the cloud-hardening pass.

---

## Execution Mode Classification

### Cloud-compatible (both n8n Cloud and self-hosted)

| Component | What works |
|---|---|
| `orchestrate-phase1` — Resolve Runtime Config | Env var validation for core vars; `cloud_mode: true` propagated in `runtime_config` |
| `intake-store-input` — Validate and Normalize | All field validation and normalization logic; `execution_run_id` generation |
| `import-shopify-data` — all HTTP Request nodes | Shopify API calls (shop, products, custom/smart collections) |
| `import-shopify-data` — Assemble Write and Checkpoint | API response assembly; `shopify_import` object construction; `import_summary` |
| `build-store-profile` — Map Validate and Write | Field mapping; `catalog_type` derivation; `operating_mode` mapping |
| `orchestrate-phase1` — Prepare Profile Input | Bridge node; `shopify_import` passthrough for cloud data flow |
| `orchestrate-phase1` — Phase 1 Complete | Summary assembly from upstream outputs |

### Self-hosted only (requires local filesystem)

| Component | Why |
|---|---|
| `resolve-runtime-config` — path existence checks | `fs.existsSync(STORE_OS_PROJECT_ROOT)`, `fs.existsSync(STORE_OS_AJV_SCHEMA_PATH)` |
| `intake-store-input` — Create Directories and Checkpoint | `fs.mkdirSync`, `fs.writeFileSync`, `fs.renameSync` for project dirs, checkpoint, log |
| `import-shopify-data` — artifact write | Atomic write of `shopify-import.json` to `{project_root}/{project_id}/` |
| `import-shopify-data` — checkpoint update | `fs.writeFileSync` + `fs.renameSync` on `checkpoint.json` |
| `build-store-profile` — Read Upstream Artifacts | `fs.existsSync` + `fs.readFileSync` on `shopify-import.json` |
| `build-store-profile` — Map Validate and Write | `fs.readFileSync` on `store-profile.schema.json`; AJV validation; atomic artifact write; quarantine |
| `orchestrate-phase1` — Phase 1 Complete | `fs.readFileSync` on final `checkpoint.json` |
| `runtime/helpers/checkpoint.js` | All operations — `fs` throughout |
| `runtime/helpers/execution-log.js` | All operations — `fs` throughout |
| `runtime/helpers/artifact-io.js` | All operations — `fs` throughout |
| `runtime/helpers/resolve-config.js` | Path existence checks — `fs.existsSync` |
| `runtime/helpers/schema-validator.js` | Schema loading — `fs.readFileSync`; AJV |

### Blocked in n8n Cloud (no fallback possible without a storage layer)

| What | Why blocked | Required to unblock |
|---|---|---|
| Artifact persistence (`shopify-import.json`, `store-profile.json`) | No local filesystem | Cloud storage client (S3, GCS, etc.) |
| Checkpoint and execution log writes | No local filesystem | Cloud storage or n8n variables/database |
| AJV schema validation | Schema files not accessible | Inline schema bundling or cloud schema hosting |
| `runtime/helpers/*` modules | `require('fs')` blocked; helper files not accessible to Code nodes in n8n Cloud | N/A — these are Node.js modules, not loadable in n8n Cloud |

---

## What Changed in This Pass

All changes are **additive guards only** — the self-hosted path is preserved exactly.

### Pattern applied (identical across all affected Code nodes)

```javascript
let fs, path;
let cloudMode = false;
try {
  fs   = require('fs');
  path = require('path');
} catch (_e) {
  cloudMode = true;
}
```

When `cloudMode` is true:
- All `fs.*` calls are skipped
- `project_root: null`, `ajv_schema_path: null` in `runtime_config`
- `STORE_OS_PROJECT_ROOT` and `STORE_OS_AJV_SCHEMA_PATH` are no longer required env vars
- `cloud_mode: true` and `cloud_warnings: [...]` are added to each node's output
- Data flows through n8n's native item pipeline instead of through the filesystem

### Key data flow change for cloud mode

In self-hosted mode, `build-store-profile` reads `shopify-import.json` from disk.
In cloud mode, this file is never written. Instead:

1. `import-shopify-data` includes `shopify_import` in its output JSON when `cloudMode` is true
2. `orchestrate-phase1` — "Prepare Profile Input" passes `shopify_import` through when present
3. `build-store-profile` — "Read Upstream Artifacts" reads `shopify_import` from the trigger input when `cloudMode` is true

### Files changed

| File | Change |
|---|---|
| `workflows/n8n/resolve-runtime-config.n8n.json` | Cloud-mode detection; filesystem checks conditional |
| `workflows/n8n/orchestrate-phase1.n8n.json` | Cloud-mode detection in 3 Code nodes; `shopify_import` passthrough in Prepare Profile Input |
| `workflows/n8n/intake-store-input.n8n.json` | Cloud-mode detection; `Create Directories and Checkpoint` skips all fs ops in cloud mode |
| `workflows/n8n/import-shopify-data.n8n.json` | Cloud-mode detection; `Assemble Write and Checkpoint` skips fs ops, returns `shopify_import` inline; **aggregation fix: added Merge node before Code node** |
| `workflows/n8n/build-store-profile.n8n.json` | Cloud-mode detection in both Code nodes; reads `shopify_import` from input; skips AJV + writes |

### Aggregation fix — import-shopify-data (post-smoke-test)

During the successful n8n Cloud run, the four Shopify fetch branches (`Fetch Shop Basics`, `Fetch Active Products`, `Fetch Custom Collections`, `Fetch Smart Collections`) were connected directly to `Assemble Write and Checkpoint` on separate input indexes (0–3). In n8n Cloud this produced unreliable execution: the Code node could fire before all branches completed, resulting in missing entries in `$input.all()`.

**Fix**: A `Merge` node (`Aggregate API Responses`, mode: `append`) was inserted between the four fetch branches and the Code node. The Merge node acts as an explicit synchronization barrier — it waits for all four inputs before emitting. Append mode preserves deterministic branch order: `[0] shop`, `[1] products`, `[2] customCollections`, `[3] smartCollections]`, which matches the `allItems` index assumptions already in the Code node.

This is a workflow structure fix only. No business logic, no cloud/self-hosted behavior, and no Code node code was changed.

### Files NOT changed

- `runtime/helpers/*` — these are self-hosted-only Node.js modules; they are not loadable in n8n Cloud Code nodes and were never called from the n8n workflows directly
- `docs/phase-11-runtime-architecture.md` — self-hosted architecture remains intact
- All schemas under `schemas/` — unchanged

---

## What Remains Blocked After This Pass

1. **No artifact persistence in n8n Cloud** — `shopify-import.json` and `store-profile.json` are never written. The assembled objects exist in n8n execution memory only. They are not available after the workflow run completes.

2. **No schema validation in n8n Cloud** — `store-profile.schema.json` cannot be loaded from disk. The store_profile is returned unvalidated. Field mapping logic still runs, but no schema contract enforcement occurs.

3. **No checkpoint or execution log in n8n Cloud** — The audit trail that self-hosted execution maintains is absent. There is no run history recoverable from the cloud execution.

4. **AJV not available** — Even if we bundled the schema inline, AJV itself requires `require('ajv')` which is blocked in n8n Cloud Code nodes.

5. **`runtime/helpers/*` modules are not usable** — n8n Cloud Code nodes cannot `require()` local files. The helper layer exists for self-hosted use only.

---

## Recommended Next Steps

### For cloud execution (Phase 12.6 or Phase 13 — cloud-first track)

If the target is full n8n Cloud support:

1. **Persist artifacts to cloud storage** — Replace `fs.writeFileSync` with an HTTP call to S3 / GCS / Cloudflare R2. Credentials stored in n8n credential vault.
2. **Read artifacts from cloud storage** — Replace `fs.readFileSync(shopify-import.json)` with an HTTP GET from the same storage bucket.
3. **Bundle schemas inline** — Embed the relevant JSON Schema as a literal object in the Code node (or fetch it from a URL). Remove AJV dependency or replace with a lightweight inline validator.
4. **Replace helpers with inline equivalents** — The checkpoint and log helpers have no n8n Cloud analog yet; they must be either replaced with in-memory state or externalized.

### For self-hosted execution (Phase 12.6 — self-hosted-first track)

The self-hosted path is feature-complete for Phase 1. Recommended additions:

1. **Pagination loop** — import-shopify-data fetches only 250 products/collections. Use n8n's Split In Batches node or a Code loop for stores with larger catalogs.
2. **AJV availability check** — Verify `ajv@8` is pre-installed in the n8n self-hosted `node_modules`.
3. **Backup write** — `STORE_OS_BACKUP_ROOT` is accepted but not yet used; implement backup copy on artifact write.
4. **Phase 2 workflows** — `build-market-intelligence` and subsequent workflows are not yet implemented.

### Recommendation

**Self-hosted first.** The architecture is already working on self-hosted (Shopify auth works, HTTP nodes work, the chain runs). The cloud fallback introduced here is sufficient for smoke testing only — it proves the Shopify integration and field mapping logic are correct, but it does not produce durable artifacts.

Cloud persistence is a meaningful infrastructure decision (storage bucket, IAM, schema hosting) that should be designed deliberately rather than retrofitted as a smoke-test patch.
