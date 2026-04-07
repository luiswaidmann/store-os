# outputs/runs

Persisted execution records for store-os async runs.

## Structure

```
outputs/runs/
├── index.json              — lightweight run index (array of run summaries)
├── {execution_id}.json     — full run record per execution
└── README.md               — this file
```

## Run record schema

```json
{
  "execution_id": "14361",
  "project_id": "suppliedtech",
  "started_at": "2026-04-07T12:14:03.906Z",
  "finished_at": "2026-04-07T12:16:00.000Z",
  "duration_ms": 117484,
  "status": "success",
  "terminal_status": "PHASE_7A_COMPLETE",
  "cloud_mode": true,
  "artifacts": {
    "strategy_synthesis": { "strategic_summary": "...", "positioning_focus": "..." },
    "offer_architecture": { "headline": "...", "target_buyer": "...", "pricing_tier": "..." },
    "content_strategy": { "primary_message": "...", "content_pillars_count": 2, "editorial_tone": "..." },
    "gtm_plan": { "gtm_narrative": "...", "channels_count": 2, "kpis_count": 3 },
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

## Index record schema

```json
{
  "execution_id": "14361",
  "project_id": "suppliedtech",
  "started_at": "...",
  "finished_at": "...",
  "duration_ms": 117484,
  "status": "success",
  "terminal_status": "PHASE_7A_COMPLETE"
}
```

## Read path

```bash
# List all runs:
node scripts/inspect-run.js --list

# Show full record for an execution:
node scripts/inspect-run.js <execution_id>

# Show latest run for a project:
node scripts/inspect-run.js --project suppliedtech --latest

# Raw JSON output:
node scripts/inspect-run.js <execution_id> --json
```

## Write path

Run records are written automatically by `scripts/run-orchestrator.js` after a run
completes (or fails) during polling. Records accumulate here indefinitely.

These files are git-tracked so run history is preserved in the repo.
