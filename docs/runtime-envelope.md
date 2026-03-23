# Runtime Envelope

## Purpose and Motivation

The runtime envelope is a standard observability wrapper added to every workflow output in the store-os Phase 1 chain. It provides:

- **Traceability**: unique run IDs, execution timestamps, phase identity
- **Observability**: structured diagnostics, input/output summaries, lineage tracking
- **Contract validation**: explicit status codes, fatal error lists, validation results
- **Debugging**: missing data catalog, upstream artifact references, warnings

The envelope was introduced in Phase 16 (runtime-hardening-artifact-contracts) as an additive layer. It does not replace any existing output key.

---

## Envelope Shape

The envelope is a single `envelope` key added to every workflow output object. It has four top-level sections:

### `envelope.runtime`

Identity and execution context of this phase invocation.

| Field | Type | Description |
|---|---|---|
| `run_id` | string | Unique run identifier. Format: `run-{yyyymmddHHmmss}-{rand4}` |
| `phase_id` | string | Workflow phase identifier, e.g. `build-store-profile` |
| `execution_ts` | ISO 8601 string | Timestamp when the phase completed |
| `cloud_mode` | boolean | Whether the phase ran in n8n Cloud mode |
| `env` | string | `dev \| staging \| production \| cloud-smoke` |
| `schema_version` | string | Envelope schema version, currently `1.0` |

### `envelope.store`

Project and artifact identity.

| Field | Type | Description |
|---|---|---|
| `project_id` | string | Store project identifier |
| `artifact_name` | string | Name of the artifact produced by this phase |
| `artifact_path` | string or null | Absolute path to artifact on disk. `null` in cloud mode. |

### `envelope.status`

Phase outcome. This is a structured expansion alongside the existing top-level `status: 'SUCCESS'` string key — they are separate keys.

| Field | Type | Description |
|---|---|---|
| `code` | string | `SUCCESS \| PARTIAL \| FAILED \| SKIPPED` |
| `completed_at` | ISO 8601 string | When the phase completed |
| `fatal_errors` | array | Array of ValidationResult issues with `severity=fatal` |
| `warnings` | array of strings | Human-readable warning strings |
| `retryable` | boolean | Whether a retry may resolve any failure |

### `envelope.diagnostics`

Observability layer for log-friendly summaries and lineage.

| Field | Type | Description |
|---|---|---|
| `input_summary` | object | Key input signals received by this phase |
| `output_summary` | object | Key output fields produced |
| `validation.schema_ref` | string | Schema file used for validation |
| `validation.result` | string | `PASS \| FAIL \| SKIPPED` |
| `validation.errors` | array | Validation errors (empty on PASS/SKIPPED) |
| `lineage.upstream_phases` | array of strings | Phase IDs consumed as input |
| `lineage.upstream_artifacts` | array of strings | Artifact names consumed as input |
| `missing_data` | array | Explicit unknown fields with reason and impact |

---

## Relationship to Existing Output Keys

The envelope is purely additive. All existing output keys are preserved unchanged:

```
Existing keys (unchanged):
  project_id, artifact_path, artifact_name, store_profile,
  market_intelligence, brand_positioning, competitor_clusters,
  runtime_config, status, cloud_mode, cloud_warnings, notes

New key added:
  envelope: { runtime, store, status, diagnostics }
```

Orchestrators and downstream phases that only read existing keys are not affected.

---

## Cloud Mode Behavior

In n8n Cloud:

- `envelope.runtime.cloud_mode` is `true`
- `envelope.runtime.env` is `cloud-smoke`
- `envelope.store.artifact_path` is `null`
- `envelope.status.warnings` includes `'AJV schema validation skipped — cloud mode'` and `'Artifact write skipped — cloud mode'`
- `envelope.diagnostics.validation.result` is `SKIPPED`

The envelope itself is always computed inline — no filesystem access is needed to build the envelope.

---

## Self-Hosted Mode Behavior

In self-hosted n8n:

- `envelope.runtime.cloud_mode` is `false`
- `envelope.runtime.env` reflects `STORE_OS_ENV` value
- `envelope.store.artifact_path` is the absolute path to the written artifact
- `envelope.status.warnings` is empty on success
- `envelope.diagnostics.validation.result` is `PASS` (or `FAIL` which halts with quarantine)

---

## Reading `envelope.status` vs Top-Level `status`

The top-level `status` key is a string: `'SUCCESS'`.

The `envelope.status` object is a structured expansion:

```javascript
// Top-level key (unchanged from before envelope was added)
output.status === 'SUCCESS'

// Envelope status (new structured key)
output.envelope.status.code === 'SUCCESS'
output.envelope.status.fatal_errors  // array — empty on success
output.envelope.status.warnings      // array — may have cloud-mode warnings
output.envelope.status.retryable     // boolean
```

For most consumers, the top-level `status` string is sufficient. The envelope status is for observability systems, dashboards, and future retry logic.

---

## Reading Diagnostics for Observability

The `diagnostics` section provides log-friendly data:

```javascript
// Check what the phase received
envelope.diagnostics.input_summary.vertical
envelope.diagnostics.input_summary.active_products  // store-profile only

// Check what the phase produced
envelope.diagnostics.output_summary.catalog_type     // store-profile
envelope.diagnostics.output_summary.market_category  // market-intelligence
envelope.diagnostics.output_summary.brand_role       // brand-positioning
envelope.diagnostics.output_summary.cluster_count    // competitor-clusters

// Check lineage
envelope.diagnostics.lineage.upstream_phases   // ["resolve-runtime-config", ...]
envelope.diagnostics.lineage.upstream_artifacts // ["store_profile", ...]
```

---

## Interpreting `missing_data`

The `missing_data` array is a catalog of fields that were unknown or defaulted:

```javascript
// Each entry:
{ field: "catalog_type", reason: "No active products found", impact: "degraded-output" }
{ field: "market_subcategories", reason: "No catalog context available", impact: "skipped-field" }
{ field: "brand_voice_hint", reason: "No brand direction signals in intake", impact: "used-default" }
```

Impact values:
- `degraded-output`: field was included but with a default/provisional value
- `skipped-field`: field was entirely omitted
- `used-default`: a hardcoded fallback was used

---

## Code Example: Building an Envelope

The following JavaScript pattern is used in all n8n Code nodes:

```javascript
function buildRunId() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return 'run-' + ts + '-' + rand;
}

const runId = buildRunId();
const executionTs = new Date().toISOString();

const envelope = {
  runtime: {
    run_id: runId,
    phase_id: 'my-phase-id',
    execution_ts: executionTs,
    cloud_mode: cloudMode,
    env: cloudMode ? 'cloud-smoke' : (runtimeConfig.env || 'dev'),
    schema_version: '1.0'
  },
  store: {
    project_id: projectId,
    artifact_name: 'my-artifact',
    artifact_path: cloudMode ? null : finalPath
  },
  status: {
    code: 'SUCCESS',
    completed_at: executionTs,
    fatal_errors: [],
    warnings: cloudMode ? ['AJV validation skipped — cloud mode'] : [],
    retryable: false
  },
  diagnostics: {
    input_summary: { project_id: projectId, /* ... key signals */ },
    output_summary: { /* ... key outputs */ },
    validation: {
      schema_ref: 'schemas/my-artifact.schema.json',
      result: cloudMode ? 'SKIPPED' : 'PASS',
      errors: [],
      warnings: []
    },
    lineage: {
      upstream_phases: ['resolve-runtime-config', 'intake-store-input'],
      upstream_artifacts: ['normalized_intake_payload']
    },
    missing_data: []
  }
};
```

---

## Extension Guidance for Future Phases

To add the runtime envelope to a new phase:

1. Copy the `buildRunId()` helper into the parse/write Code node
2. Compute `runId` and `executionTs` before the return statement
3. Build the `envelope` object following the schema above
4. Add `envelope: envelope` to the return JSON — alongside, never replacing, existing keys
5. In cloud mode, set `artifact_path: null` and add cloud warnings to `status.warnings`
6. Populate `input_summary` and `output_summary` with the most diagnostically useful fields
7. Populate `lineage.upstream_phases` and `lineage.upstream_artifacts` accurately
8. Use `missing_data` to catalog any fields that were unknown or defaulted

The envelope schema is defined in `schemas/runtime/runtime-envelope.schema.json`.
