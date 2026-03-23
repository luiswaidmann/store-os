# Extension Guide

## Adding a New Phase to the Runtime

This guide covers how to add a new planning phase to the store-os execution chain.

---

## Step 1: Create the Contract File

Create `workflows/contracts/{new-phase-id}.contract.json` following the contract format:

```json
{
  "_meta": {
    "format": "store-os-runtime-contract",
    "version": "1.0",
    "phase_id": "my-new-phase",
    "category": "planning",
    "cloud_compatibility": "PARTIAL",
    "description": "What this phase does."
  },
  "phase_id": "my-new-phase",
  "upstream_dependencies": ["build-competitor-clusters"],
  "required_inputs": {
    "from_pipeline": [
      { "field": "competitor_clusters", "source": "build-competitor-clusters" },
      { "field": "store_profile", "source": "build-store-profile" },
      { "field": "runtime_config", "source": "resolve-runtime-config" },
      { "field": "project_id", "source": "intake-store-input" }
    ]
  },
  "output_contract": {
    "my_artifact": {
      "description": "What the artifact contains",
      "artifact_path_pattern": "{project_root}/{project_id}/my-artifact.json",
      "schema_ref": "schemas/my-artifact.schema.json",
      "required_fields": [],
      "new_optional_fields": []
    },
    "envelope": {
      "description": "Runtime envelope",
      "schema_ref": "schemas/runtime/runtime-envelope.schema.json"
    }
  },
  "validation_errors": [
    { "code": "MISSING_ARTIFACT", "severity": "fatal", "description": "..." }
  ],
  "cloud_behavior": {
    "skipped": ["AJV schema validation", "Artifact write"],
    "inline_output": "my_artifact returned inline"
  }
}
```

---

## Step 2: Create the Artifact Schema

Create `schemas/my-artifact.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/my-artifact.schema.json",
  "title": "My Artifact Schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["field1", "field2"],
  "properties": {
    "field1": { "type": "string", "minLength": 1 },
    "field2": { "type": "array", "minItems": 1, "items": { "type": "string" } },
    "notes": { "type": "string" },
    "_meta": { "type": "object" }
  }
}
```

Rules:
- Always include `"$schema": "https://json-schema.org/draft/2020-12/schema"`
- Always use `"additionalProperties": false` (required for AJV validation in self-hosted mode)
- Only put fields in `required` that are truly required for the artifact to be useful
- Always include `notes` and `_meta` as optional properties
- Enum fields must exactly match the values used in n8n Code node validation

---

## Step 3: Create the n8n Workflow

Create `workflows/n8n/my-new-phase.n8n.json`. Follow the established pattern:

### Node structure:
1. `Subworkflow Trigger` — n8n-nodes-base.executeWorkflowTrigger
2. `Validate Upstream Inputs` — Code node (validation + signal extraction)
3. `Build LLM Prompt` — Code node (prompt assembly) — if LLM is used
4. `LLM Synthesis: My Phase` — OpenAI node — if LLM is used
5. `Parse and Write` — Code node (parse + validate + write + envelope)

### Required patterns in every Code node:

**Cloud-mode detection** (must appear in every Code node):
```javascript
let cloudMode = false;
try { require('fs'); } catch (_e) { cloudMode = true; }
```

**buildRunId helper** (in the parse/write node):
```javascript
function buildRunId() {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return 'run-' + ts + '-' + rand;
}
```

**Envelope construction** (in the parse/write node):
```javascript
const runId = buildRunId();
const executionTs = new Date().toISOString();

const envelope = {
  runtime: {
    run_id: runId,
    phase_id: 'my-new-phase',
    execution_ts: executionTs,
    cloud_mode: cloudMode,
    env: cloudMode ? 'cloud-smoke' : (runtimeConfig.env || 'dev'),
    schema_version: '1.0'
  },
  store: { project_id: projectId, artifact_name: 'my-artifact', artifact_path: cloudMode ? null : finalPath },
  status: { code: 'SUCCESS', completed_at: executionTs, fatal_errors: [], warnings: [], retryable: false },
  diagnostics: {
    input_summary: { /* key inputs */ },
    output_summary: { /* key outputs */ },
    validation: { schema_ref: 'schemas/my-artifact.schema.json', result: cloudMode ? 'SKIPPED' : 'PASS', errors: [], warnings: [] },
    lineage: { upstream_phases: ['...'], upstream_artifacts: ['...'] },
    missing_data: []
  }
};
```

**Return object** — always include all existing keys plus envelope:
```javascript
return [{
  json: {
    project_id: projectId,
    artifact_path: cloudMode ? null : finalPath,
    artifact_name: 'my-artifact',
    my_artifact: myArtifact,
    runtime_config: runtimeConfig,
    status: 'SUCCESS',
    cloud_mode: cloudMode,
    cloud_warnings: cloudMode ? ['AJV validation skipped', 'Artifact write skipped'] : [],
    notes: [],
    envelope: envelope,
  },
}];
```

---

## Step 4: Add to Gold Path Example

Add the new phase to `workflows/examples/gold-path-example.json`:

1. Add `"my-new-phase"` to `_meta.chain`
2. Add expected minimum outputs under `expected_minimum_outputs`
3. Add acceptance criteria under `acceptance_criteria.per_phase`
4. Add a smoke test checklist item

---

## Step 5: Add Documentation

Update the following documentation files:

- `docs/phase-contracts.md`: add row to the Phase Summary Table and a Phase Contract Details section
- `docs/runtime-status.md`: update the confirmed executable chain
- Create or update any relevant runbooks

---

## Adding New Optional Fields to an Existing Schema

To add optional fields to an existing artifact schema:

1. Add the field to the schema `properties` section (NOT to `required`)
2. Verify the field type and any enum values match what the n8n Code node will produce
3. Update the contract file's `output_contract.{artifact}.new_optional_fields` list
4. In the n8n Code node: compute the field conditionally. Use `undefined` (which gets stripped) if the field cannot be computed, not `null`
5. Strip `undefined` values before returning: `Object.keys(obj).forEach(k => obj[k] === undefined && delete obj[k])`
6. Update `envelope.diagnostics.output_summary` to include the new field count or presence flag

### Rules: never break existing consumers

- Never remove a field from `properties` if it may be present in existing artifacts on disk
- Never remove a field from `required`
- Never rename an existing field
- New enum values on existing optional fields are safe
- New enum values on existing required fields need careful handling

---

## Checklist for a New Phase

```
[ ] Contract file created: workflows/contracts/{phase-id}.contract.json
[ ] Artifact schema created: schemas/{artifact-name}.schema.json
[ ] Schema uses $schema: "https://json-schema.org/draft/2020-12/schema"
[ ] Schema uses additionalProperties: false
[ ] n8n workflow created: workflows/n8n/{phase-id}.n8n.json
[ ] Cloud-mode detection pattern present in every Code node
[ ] buildRunId() helper present in parse/write node
[ ] Runtime envelope added to return object
[ ] All existing return keys preserved (additive only)
[ ] Inline validation covers required fields and enum values
[ ] AJV validation in self-hosted branch
[ ] Quarantine pattern implemented on SCHEMA_VIOLATION
[ ] Cloud skip branch returns artifact inline with cloud_warnings
[ ] Gold path example updated
[ ] phase-contracts.md updated
[ ] runtime-status.md updated
```
