# Execution Persistence

## Status

**ACTIVE** — confirmed on `feature/execution-persistence` (2026-04-07).
Run 14380: `PHASE_7A_COMPLETE`, persisted to `outputs/runs/14380.json`.

---

## Why persistence beyond n8n execution history

n8n Cloud execution history is:
- **Transient** — executions expire from the API after a short retention window
- **Instance-specific** — tied to one n8n Cloud account; not portable
- **Unstructured for querying** — no project-level filtering, no artifact summaries
- **Not in the repo** — lost when the n8n instance changes or resets

store-os uses the repo as the source of truth. Run history should live in the repo alongside the code that produced it.

After `feature/execution-persistence`, each completed async run is automatically persisted to `outputs/runs/` as a structured JSON record that survives n8n API expiry.

---

## Storage location

```
outputs/runs/
├── index.json              — lightweight run index (array of run summaries, newest first)
├── {execution_id}.json     — full run record for each execution
└── README.md
```

These files are **git-tracked** — run history is preserved in the repo and can be reviewed via `git log`.

---

## Run record structure

```json
{
  "execution_id": "14380",
  "project_id": "suppliedtech",
  "started_at": "2026-04-07T12:29:38.404Z",
  "finished_at": "2026-04-07T12:31:26.171Z",
  "duration_ms": 107767,
  "status": "success",
  "terminal_status": "PHASE_7A_COMPLETE",
  "cloud_mode": true,
  "artifacts": {
    "strategy_synthesis": {
      "strategic_summary": "...",
      "positioning_focus": "..."
    },
    "offer_architecture": {
      "headline": "...",
      "target_buyer": "...",
      "pricing_tier": "mass-premium",
      "bundles_count": 1,
      "upsell_paths_count": 1
    },
    "content_strategy": {
      "primary_message": "...",
      "content_pillars_count": 2,
      "editorial_tone": "Technical-trustworthy",
      "keyword_clusters_count": 2,
      "faq_clusters_count": 2
    },
    "gtm_plan": {
      "gtm_narrative": "...",
      "launch_phases_count": 3,
      "channels_count": 2,
      "kpis_count": 3
    },
    "store_blueprint": {
      "blueprint_narrative": "...",
      "products_count": 3,
      "collections_count": 2,
      "pages_count": 3,
      "theme_sections_count": 4,
      "assets_count": 3
    }
  },
  "error": null
}
```

On failure, `status` is `"error"`, `terminal_status` is `null`, `artifacts` is `null`, and `error` contains the error message.

---

## Write path

`scripts/run-orchestrator.js` writes a run record automatically after:
- A successful async run (`pollExecution` completes + `extractResultFromExecution` succeeds)
- A failed async run (polling error or n8n execution error)

Records are written from **both** run modes:
- `--input <file>` (trigger + poll): written after polling completes
- `--execution-id <id>` (poll-only): written when poll resolves

The write path is non-fatal — if the file write fails (e.g., no write access), a warning is logged and the run continues normally.

---

## Read path

```bash
# List all runs (newest first):
node scripts/inspect-run.js --list

# Compact one-liner per run:
node scripts/inspect-run.js --list --summary

# Show the most recent run:
node scripts/inspect-run.js --latest

# Show runs for a specific project:
node scripts/inspect-run.js --project suppliedtech

# Latest run for a specific project:
node scripts/inspect-run.js --project suppliedtech --latest

# Full record for a specific execution:
node scripts/inspect-run.js 14380

# Raw JSON output (any mode):
node scripts/inspect-run.js 14380 --json
node scripts/inspect-run.js --latest --json
node scripts/inspect-run.js --list --json
```

---

## Index structure

`outputs/runs/index.json` is a lightweight array of run summaries (newest first):

```json
[
  {
    "execution_id": "14380",
    "project_id": "suppliedtech",
    "started_at": "2026-04-07T12:29:38.404Z",
    "finished_at": "2026-04-07T12:31:26.171Z",
    "duration_ms": 107767,
    "status": "success",
    "terminal_status": "PHASE_7A_COMPLETE"
  }
]
```

The index is updated on every write. Existing entries are replaced (by `execution_id`), new entries are prepended.

---

## Lifecycle example

```bash
# 1. Start a run (async — returns immediately with execution_id)
node scripts/run-orchestrator.js --input test-data/golden-input.json
#   → HTTP 202 in ~2s
#   → Polls n8n API every 5s
#   → Persists outputs/runs/14380.json when done
#   → Prints formatted summary

# 2. Inspect the persisted result
node scripts/inspect-run.js 14380

# 3. List all runs
node scripts/inspect-run.js --list

# 4. Get latest run as JSON (for automation)
node scripts/inspect-run.js --latest --json | jq '.artifacts.store_blueprint'
```

---

## Limitations

- **Summaries only** — `artifacts` contains compact summaries, not the full artifact chain. Full artifact data is only available while the n8n execution is still in the API (use `GET /api/v1/executions/{id}?includeData=true`).
- **Local only** — records are written to the local filesystem. In CI/CD or serverless contexts, you would need to adapt the write path to a database or object store.
- **No deduplication across machines** — if two instances run the same `execution_id`, the last write wins.
