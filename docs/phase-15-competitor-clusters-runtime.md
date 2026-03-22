# Phase 15 — Competitor Clusters Runtime

**Status**: Implemented — executable n8n workflow created.
**Date**: 2026-03-22
**Scope**: `build-competitor-clusters` subworkflow + orchestrator extension through Phase 4 Complete.

---

## What Was Built

Phase 15 adds the competitor cluster LLM synthesis step to the executable runtime chain:

```
resolve-runtime-config
  → intake-store-input
  → import-shopify-data
  → build-store-profile          [Phase 12]
  → build-market-intelligence    [Phase 13]
  → build-brand-positioning      [Phase 14]
  → build-competitor-clusters    [Phase 15 — new]
```

### New files

| File | Purpose |
|---|---|
| `workflows/n8n/build-competitor-clusters.n8n.json` | Executable n8n subworkflow — competitor cluster synthesis |
| `docs/phase-15-competitor-clusters-runtime.md` | This document |

### Modified files

| File | Change |
|---|---|
| `workflows/n8n/orchestrate-phase1.n8n.json` | Phase 3 Complete updated to carry data forward; 5 new nodes added through Phase 4 Complete |

---

## build-competitor-clusters Workflow

### Node structure

| # | Node | Type | Purpose |
|---|---|---|---|
| 1 | Subworkflow Trigger | executeWorkflowTrigger | Receives input from orchestrator |
| 2 | Validate Upstream Inputs | Code | Validates required upstream artifacts; resolves operating mode from `competitor_urls` |
| 3 | Build LLM Clustering Prompt | Code | Assembles structured prompt for url-seeded / hybrid / archetype mode |
| 4 | LLM Synthesis: Competitor Clusters | OpenAI (chat, gpt-4o) | Calls OpenAI; temp=0.3, max_tokens=3000 |
| 5 | Parse Apply Evidence and Validate | Code | Parses JSON array; applies evidence boundary enforcement; inline validation; AJV (self-hosted); write artifact |

### Input contract

```json
{
  "project_id": "string",
  "runtime_config": { "llm_model", "ajv_schema_path", "project_root", "cloud_mode", ... },
  "store_profile": { "store_id", "vertical", "price_positioning", "primary_market", "store_type", ... },
  "market_intelligence": { "market_category", "competitor_types", "positioning_goals", ... },
  "brand_positioning": { ... },
  "normalized_intake_payload": { "competitor_urls": ["string"] | [], ... }
}
```

`brand_positioning` is forwarded as context but not required for cluster synthesis. `competitor_urls` may be an empty array — this triggers archetype mode.

### Output contract

```json
{
  "project_id": "string",
  "artifact_name": "competitor-clusters",
  "artifact_path": "string | null",
  "competitor_clusters": [ ... ],
  "cluster_count": "number",
  "mode": "url-seeded | hybrid | archetype",
  "runtime_config": { ... },
  "status": "SUCCESS",
  "cloud_mode": "boolean",
  "cloud_warnings": ["string"],
  "notes": []
}
```

---

## Operating Modes

### Mode resolution (Node 2)

| `competitor_urls` | Mode | Behavior |
|---|---|---|
| `[]` or absent | `archetype` | 2–3 pure archetype clusters; all `competitor_examples.url` = `ARCHETYPE-PLACEHOLDER` |
| exactly 1 URL | `hybrid` | 1 URL-seeded cluster (user URL as label) + 1–2 archetype clusters for remaining landscape |
| 2+ URLs | `url-seeded` | LLM groups provided URLs into 2–4 clusters; no invented URLs allowed |

### Evidence boundary enforcement (Node 5)

- **Archetype clusters**: any URL that is not `ARCHETYPE-PLACEHOLDER` and not in the user-provided list is replaced with `ARCHETYPE-PLACEHOLDER`. A warning is logged.
- **URL-seeded clusters**: any URL not in the user-provided list is stripped. A warning is logged. If all examples were stripped, a fallback entry using `competitorUrls[0]` is inserted.
- **Hybrid mode**: per-cluster mode is re-derived from whether `competitor_examples` reference a user URL. Enforcement is applied per cluster individually.
- **Notes field**: every cluster receives a `notes` value containing the mode label (`URL-SEEDED` or `ARCHETYPE-MODE`), the timestamp, and the evidence boundary reminder.

---

## Validation

### Inline validation (Node 5 — both modes)

Runs in cloud and self-hosted mode. Checks per cluster:

- All 9 required fields are present: `cluster_name`, `cluster_role`, `description`, `competitor_examples`, `shared_strengths`, `shared_weaknesses`, `shared_patterns`, `non_copyable_elements`, `adaptation_opportunities`
- `cluster_role` is in enum: `premium-brand-cluster`, `value-cluster`, `editorial-cluster`, `marketplace-like-cluster`, `trend-driven-cluster`, `problem-solver-cluster`, `specialist-cluster`
- All array fields have `minItems: 1`
- `competitor_examples[*]`: `name` and `url` are present
- `shared_patterns[*]`: `pattern_type` is in enum, `description` and `why_it_works` are present
- `pattern_type` enum: `layout`, `navigation`, `pdp-structure`, `collection-strategy`, `seo-pattern`, `aeo-pattern`, `trust-pattern`, `media-pattern`, `motion-pattern`, `offer-pattern`, `copy-pattern`

A single failing cluster causes the entire workflow to halt with a clear error message indicating which cluster failed and why. No partial arrays are emitted.

### AJV validation (self-hosted only)

Full JSON Schema validation against `schemas/competitor-cluster.schema.json` applied per cluster using `ajv@8`. Cloud mode emits a warning and continues (inline validation is the cloud-mode substitute).

---

## Cloud Compatibility

### What runs in both modes

- Input validation and mode resolution (Node 2)
- LLM prompt assembly (Node 3)
- OpenAI API call (Node 4)
- JSON parsing, evidence boundary enforcement, inline enum/structure/minItems validation (Node 5)

### What is skipped in cloud mode

| Skipped | Reason | Impact |
|---|---|---|
| AJV schema validation | No local schema file access in n8n Cloud | Replaced by inline checks in Node 5 |
| Artifact write (`competitor-clusters.json`) | No filesystem in n8n Cloud | `competitor_clusters` returned inline; `artifact_path` is `null` |

In cloud mode, `competitor_clusters` is carried forward inline through the orchestrator chain and is visible in the `Phase 4 Complete` output.

---

## Orchestrator Changes

### Updated: Phase 3 Complete

Now carries `store_profile`, `normalized_intake_payload`, `runtime_config`, `market_intelligence`, and `brand_positioning` forward to Phase 4. Previously Phase 3 Complete was a terminal node.

### New nodes added

| ID suffix | Node name | Purpose |
|---|---|---|
| 000000000024 | Prepare Competitor Clusters Input | Bridge node — assembles subworkflow input |
| 000000000025 | Run build-competitor-clusters | executeWorkflow node |
| 000000000026 | Competitor Clusters Success? | IF check on status == SUCCESS |
| 000000000027 | Halt - Competitor Clusters Failed | Error halt node |
| 000000000028 | Phase 4 Complete | Terminal summary node; carries `competitor_clusters` forward |

---

## Setup Steps

### n8n Cloud (smoke test)

1. Import `workflows/n8n/build-competitor-clusters.n8n.json` into n8n Cloud.
2. In the `LLM Synthesis: Competitor Clusters` node, replace `REPLACE_WITH_N8N_OPENAI_CREDENTIAL_ID` with your OpenAI credential ID (found in n8n > Settings > Credentials > OpenAI credential URL).
3. Note the workflow ID from the URL.
4. Import `workflows/n8n/orchestrate-phase1.n8n.json` (or update the existing orchestrator).
5. In the `Run build-competitor-clusters` node, replace `REPLACE_WITH_BUILD_COMPETITOR_CLUSTERS_WORKFLOW_ID` with the workflow ID from step 3.
6. Trigger the orchestrator with the usual smoke-test payload. The chain now runs through Phase 4 Complete.

To test different operating modes, add `competitor_urls` to the intake payload:
- Omit or set to `[]` → archetype mode (default for the existing smoke-test payload)
- Add one URL → hybrid mode
- Add two or more URLs → url-seeded mode

### Self-hosted

1. Same workflow import steps as above.
2. Ensure `STORE_OS_AJV_SCHEMA_PATH` points to the `schemas/` directory containing `competitor-cluster.schema.json`.
3. Ensure `ajv@8` is installed in n8n's node_modules (`npm install ajv` in the n8n directory).
4. `STORE_OS_PROJECT_ROOT` must exist and be writable — `competitor-clusters.json` is written to `{project_root}/{project_id}/competitor-clusters.json`.

---

## Known Assumptions

- `market_intelligence` always flows inline from the orchestrator in both modes. The subworkflow does not read it from disk.
- `competitor_urls` from intake are user-provided labels only. They are not validated as reachable URLs. No HTTP requests are made against them.
- All cluster strengths, weaknesses, patterns, and opportunities are LLM inference. The evidence boundary note in each cluster's `notes` field makes this explicit.
- Inline validation (enum checks, required fields, minItems) runs in both modes. Full AJV validation is self-hosted only.
- Temperature 0.3 and max_tokens 3000 (higher than Phase 13/14 to accommodate 2–4 multi-field cluster objects).
- The output array is at root level in the artifact — no wrapper `{ clusters: [] }` envelope. Consumers iterate directly over the array.

## What Remains Partial / Cloud-Limited

| Item | Status |
|---|---|
| AJV schema validation | Self-hosted only — cloud uses inline checks |
| Artifact persistence (`competitor-clusters.json`) | Self-hosted only — cloud returns inline |
| `build-pattern-manifest` | Not yet implemented (downstream consumer) |
| Live competitor enrichment | Not in scope — future `enrich-competitor-clusters` phase |
| Human review gate enforcement | Controlled by `manual_review_required` in intake — not enforced at workflow level |

## Confirmed execution status

Phase 15 is implemented and ready for smoke-testing in n8n Cloud as the next executable runtime stage after `build-brand-positioning`.

Expected cloud execution chain after Phase 15:

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`
- `build-competitor-clusters` ← new

Expected cloud-mode outcome:

- `store_profile` is returned inline
- `market_intelligence` is returned inline
- `brand_positioning` is returned inline
- `competitor_clusters` is returned inline (array, 2–4 clusters depending on mode)
- `cloud_mode: true`
- no disk artifacts are written in cloud mode
- expected cloud warnings about missing AJV validation / persistence remain acceptable

Expected completion message pattern (archetype mode, cloud):

> Phase 4 chain completed (cloud mode) for project: \<project_id\> | No artifacts were written to disk. competitor_clusters (2 clusters, mode: archetype) available in this output. | Next: build-pattern-manifest (Phase 5+ — not yet implemented).

Notes:

- `build-competitor-clusters` requires `store_profile`, `market_intelligence`, and `normalized_intake_payload` as upstream inputs
- testing the workflow in isolation with incomplete input will fail by design
- the correct validation path is end-to-end execution through `orchestrate-phase1`
- the cloud smoke-test path from Phase 12–14 remains preserved
- the self-hosted persistence path remains conceptually open
