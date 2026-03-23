# Execution Semantics

## Sequential vs Parallel Execution

The Phase 1 chain is fully sequential. Each phase depends on the output of the previous phase:

```
resolve-runtime-config
  → intake-store-input
    → import-shopify-data
      → build-store-profile
        → build-market-intelligence
          → build-brand-positioning
            → build-competitor-clusters
```

`orchestrate-phase1` is an n8n workflow that wires these subworkflows together in sequence. No phases run in parallel.

**Why sequential?** Each planning phase consumes the artifact produced by the prior phase. `build-market-intelligence` requires `store_profile`. `build-brand-positioning` requires both `store_profile` and `market_intelligence`. Parallel execution would require rearchitecting the data dependencies.

---

## Checkpoint Behavior (Self-Hosted)

In self-hosted mode, a checkpoint file tracks completed phases:

```
{project_root}/{project_id}/.runtime/checkpoint.json
```

Each phase appends a completion entry:

```json
{
  "completed_workflows": [
    {
      "workflow_id": "build-store-profile",
      "completed_at": "2026-03-23T14:23:01.000Z",
      "output_artifact": "store-profile.json",
      "status": "SUCCESS"
    }
  ],
  "last_updated_timestamp": "2026-03-23T14:23:01.000Z",
  "next_workflow": "build-market-intelligence"
}
```

Checkpoint writes are non-fatal — if the checkpoint write fails, the phase still returns success.

Checkpoint files are not used for re-entry or resume logic in Phase 16. They are diagnostic records.

---

## Cloud Mode Inline Execution (No Checkpoints)

In n8n Cloud, no filesystem operations occur:

- No checkpoint file
- No execution log
- No artifact files on disk
- All data passes inline through the n8n pipeline

The orchestrator (`orchestrate-phase1`) passes data between phases via n8n's "Execute Workflow" node. Each subworkflow receives its required inputs as JSON and returns its outputs as JSON.

The inline pipeline in cloud mode:

```
orchestrate-phase1
  → Execute: resolve-runtime-config → runtime_config (inline)
  → Execute: intake-store-input → normalized_intake_payload (inline)
  → Execute: import-shopify-data → shopify_import (inline)
  → Prepare Profile Input (Code node) → merges inline data
  → Execute: build-store-profile → store_profile (inline)
  → Prepare Market Intel Input (Code node) → merges inline data
  → Execute: build-market-intelligence → market_intelligence (inline)
  → ... and so on
```

The "Prepare X Input" nodes in the orchestrator are responsible for forwarding all required inline data to each subworkflow.

---

## Error Escalation: Halt vs Warn vs Degrade

### Halt (throw Error)

Any `Error` thrown in an n8n Code node halts execution of that node and propagates up. The orchestrator sees the error and stops the chain.

Use halt for:
- Missing required inputs (`MISSING_ARTIFACT`, `MISSING_RUNTIME_CONFIG`)
- Schema violations that would corrupt downstream phases
- LLM parse failures (the phase cannot produce a valid artifact)
- Environment misconfigurations (`MISSING_ENV_VAR`)

### Warn (console.warn + cloud_warnings)

Use warnings for:
- Skipped operations (AJV validation, disk write) in cloud mode
- Non-fatal degradations (catalog context unavailable, no competitor URLs)
- Optional feature not available (no brand signals in intake)

Warnings are logged to n8n console output and added to `cloud_warnings` and/or `envelope.status.warnings`.

### Degrade Gracefully

Use graceful degradation for:
- Optional enrichment fields that cannot be computed (set to `null` or omit the field)
- Catalog context not available (skip `market_subcategories`, continue synthesis)
- No competitor URLs (switch to archetype mode, still produce valid output)

Graceful degradation is documented in `open_questions` (store-profile) or `unknown_states` (market-intelligence).

---

## Retry Semantics

Currently, no automated retry logic is implemented in Phase 16. The `envelope.status.retryable` field is set to `false` for all phases.

For the future:
- `retryable: true` is appropriate for transient LLM API failures (network timeout, rate limit)
- `retryable: false` is appropriate for deterministic failures (missing required fields, schema violations)

In n8n Cloud, manual retries are performed by re-triggering the orchestrate-phase1 workflow.

---

## How `project_id` Flows Through All Phases

`project_id` is the namespace key for the entire chain. It is:

1. **Set** in `intake-store-input` from the raw input
2. **Validated** for format (`^[a-z0-9-]+$`) in intake
3. **Forwarded** in every pipeline step as a top-level field
4. **Verified** in `build-store-profile` via `shopify-import.project_id` consistency check
5. **Used** as the directory name for all self-hosted artifact writes: `{project_root}/{project_id}/`
6. **Present** in every artifact's `store_id` (store-profile) or `project_id` context
7. **Present** in every envelope: `envelope.store.project_id`

A `PROJECT_ID_MISMATCH` error is thrown if any artifact's `project_id` does not match the runtime `project_id`.

---

## How `runtime_config` Propagates

`runtime_config` is assembled in `resolve-runtime-config` and forwarded unchanged through every subsequent phase. It contains:

```json
{
  "cloud_mode": true,
  "env": "cloud-smoke",
  "openai_credential_name": "...",
  "shopify_credential_name": "...",
  "project_root": null,
  "llm_model": "gpt-4o",
  "max_products": 250,
  "max_collections": 50
}
```

No phase modifies `runtime_config`. It is always returned as-is in the phase output so downstream phases can access it.

---

## How Artifacts Are Forwarded in Cloud Mode

In cloud mode, artifacts are not read from disk. They are forwarded inline by the orchestrator:

1. `build-store-profile` returns `store_profile` in its output JSON
2. The orchestrator's "Prepare Market Intel Input" Code node reads `store_profile` from the previous step's output and passes it to `build-market-intelligence`'s subworkflow trigger input
3. `build-market-intelligence` returns `market_intelligence`
4. The orchestrator forwards `store_profile` + `market_intelligence` to `build-brand-positioning`
5. And so on

Each orchestrator "Prepare X Input" node must explicitly forward all required inline artifacts. Missing forwarding causes `MISSING_ARTIFACT` or `CLOUD_MODE_ERROR`.

---

## Idempotency Considerations

Phase 16 workflows are not fully idempotent:

**Self-hosted**: Re-running a phase will overwrite the existing artifact file with a new version (via atomic write). The checkpoint will accumulate duplicate entries. The execution log will accumulate additional entries.

**Cloud mode**: Re-running is naturally idempotent since nothing is persisted to disk.

**LLM phases**: Re-running will produce different LLM output (even at temperature 0.3, minor variation occurs). Artifacts are overwritten on re-run.

For production use, a run ID or version lock strategy would be needed before re-running phases on the same project.
