# Validation Model

## Error Code Taxonomy

All error codes in the store-os runtime follow the format `CATEGORY_SUBCATEGORY`. They are thrown as JavaScript `Error` objects with the code as the start of the message, enabling orchestrators to pattern-match on error type.

### Input and Artifact Errors

| Code | Category | Description |
|---|---|---|
| `MISSING_ARTIFACT` | Input | A required upstream artifact is absent or missing required fields |
| `MISSING_RUNTIME_CONFIG` | Input | `runtime_config` is absent from the pipeline |
| `MISSING_REQUIRED_FIELD` | Input | A required field is absent in the intake input |
| `MISSING_INPUT` | Input | A required pipeline field (e.g., `project_id`) is absent |
| `PROJECT_ID_MISMATCH` | Consistency | `project_id` in an artifact does not match the runtime `project_id` |
| `INVALID_PROJECT_ID_FORMAT` | Validation | `project_id` does not match the `^[a-z0-9-]+$` pattern |
| `INVALID_ENUM_VALUE` | Validation | A field value is outside its allowed enum |

### Schema and Artifact Integrity Errors

| Code | Category | Description |
|---|---|---|
| `SCHEMA_VIOLATION` | Validation | Assembled artifact fails AJV schema validation. Artifact is quarantined. |
| `SCHEMA_LOAD_ERROR` | Config | Schema file not found or could not be loaded |
| `PARSE_ERROR` | Parsing | A file or LLM response could not be parsed as valid JSON |

### LLM-Specific Errors

| Code | Category | Description |
|---|---|---|
| `LLM_PARSE_ERROR` | LLM | LLM response could not be parsed as valid JSON |
| `LLM_ARRAY_PARSE_ERROR` | LLM | LLM response was valid JSON but not an array (competitor-clusters expects array) |
| `MISSING_FIELD` | LLM | LLM response is missing a required field |
| `INVALID_FIELD` | LLM | LLM response has a field with an invalid value or type |
| `SCHEMA_VALIDATION_FAILED` | LLM | Inline enum/structure validation failed on LLM output |

### Environment and Config Errors

| Code | Category | Description |
|---|---|---|
| `MISSING_ENV_VAR` | Config | A required environment variable is absent or empty |
| `INVALID_ENV_VALUE` | Config | An environment variable has an invalid value |
| `CREDENTIAL_RESOLUTION_FAILED` | Config | Named credential could not be resolved in n8n |
| `CLOUD_MODE_ERROR` | Config | Cloud-mode-specific failure (e.g., shopify_import not forwarded inline) |

---

## Severity Levels

| Severity | Meaning | Action |
|---|---|---|
| `fatal` | Unrecoverable error. Chain is halted. | Throw `Error` — n8n workflow execution stops |
| `retryable` | Transient failure. Retry may succeed. | Throw with `retryable` flag in envelope status |
| `warning` | Proceed but flag the issue. | `console.warn()` + add to `cloud_warnings` / `envelope.status.warnings` |
| `info` | Informational. No action needed. | `console.log()` |

All errors thrown by Code nodes are `fatal` in effect — they halt the node and bubble up to n8n's error handling.

---

## Validation Result Structure

The `ValidationResult` schema (defined in `schemas/runtime/validation-result.schema.json`) is used in `envelope.status.fatal_errors` and in future validation reporting:

```json
{
  "result": "PASS",
  "schema_ref": "schemas/store-profile.schema.json",
  "validated_at": "2026-03-23T14:23:01.000Z",
  "issues": [],
  "fatal_count": 0,
  "warning_count": 0,
  "summary": "Validation passed with no issues"
}
```

Each issue in `issues` follows the `ValidationResult.$defs.issue` structure:

```json
{
  "code": "MISSING_ARTIFACT",
  "severity": "fatal",
  "message": "store_profile with store_id is required",
  "field_path": "store_profile.store_id",
  "expected": "non-empty string",
  "actual": null
}
```

---

## How AJV Is Used in Self-Hosted Mode

In self-hosted mode, each planning workflow (build-store-profile, build-market-intelligence, build-brand-positioning, build-competitor-clusters) uses AJV for full JSON Schema validation:

1. Load the schema from `{ajv_schema_path}/{artifact-name}.schema.json`
2. Try `require('ajv/dist/2020')` first (JSON Schema draft 2020-12), fall back to `require('ajv')`
3. Compile the schema with `allErrors: true, strict: false`
4. Validate the assembled artifact
5. On failure: quarantine the artifact, throw `SCHEMA_VIOLATION`
6. On success: proceed to atomic write

AJV requires `ajv@8` to be installed in n8n's `node_modules` directory. The `ajv_schema_path` is set in `runtime_config` and points to the `schemas/` directory.

---

## Why AJV Is Skipped in Cloud Mode

n8n Cloud does not provide:

- Local filesystem access (no schema files accessible)
- The ability to install arbitrary npm packages via `require()`

Therefore, in cloud mode:

- AJV schema validation is replaced by **inline validation** — manual enum checks and required-field checks written directly in JavaScript
- The inline validation covers all required fields, array minItems constraints, and enum values
- `envelope.diagnostics.validation.result` is set to `SKIPPED`
- `cloud_warnings` includes `'AJV schema validation skipped — no schema files accessible in n8n Cloud'`

---

## How to Add Validation to New Phases

For a new phase:

1. **Inline validation** (required in both modes): add `REQUIRED_FIELD` and enum checks before the cloud/self-hosted branch
2. **AJV validation** (self-hosted only): wrap in the `if (!cloudMode)` branch, load schema from `runtimeConfig.ajv_schema_path`
3. **Error codes**: use the taxonomy above. Throw `new Error('CODE: message')` with the code at the start
4. **Quarantine**: on SCHEMA_VIOLATION in self-hosted, write to `.runtime/quarantine/` before throwing
5. **Envelope**: set `validation.result` to `PASS`, `FAIL`, or `SKIPPED` appropriately

---

## How to Handle Partial Outputs (`PARTIAL` status)

Use `PARTIAL` status when:
- Some required fields were computed but others fell back to defaults
- The artifact was written but with known gaps

To produce a `PARTIAL` status:
1. Set `envelope.status.code = 'PARTIAL'`
2. Populate `envelope.diagnostics.missing_data` with the affected fields
3. Add warnings to `envelope.status.warnings`
4. Still return the artifact (do not halt)

`PARTIAL` is not yet implemented in Phase 16 workflows — all current phases use `SUCCESS` with warnings for degraded conditions.

---

## Quarantine Pattern

The quarantine pattern prevents corrupted artifacts from being written to the project directory:

```javascript
// On SCHEMA_VIOLATION:
const quarantineDir = path.join(projectRoot, projectId, '.runtime', 'quarantine');
fs.mkdirSync(quarantineDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const quarantinePath = path.join(quarantineDir, `{artifact-name}.${ts}.rejected.json`);
fs.writeFileSync(quarantinePath, JSON.stringify({
  quarantine_reason: 'SCHEMA_VIOLATION',
  artifact_name: 'my-artifact',
  workflow_id: 'my-workflow',
  validation_errors: validate.errors,
  timestamp: new Date().toISOString(),
  project_id: projectId,
  artifact_payload: myArtifact,
}, null, 2), 'utf8');
throw new Error(`SCHEMA_VIOLATION: my-artifact failed validation. Quarantined to ${quarantinePath}.`);
```

Multiple rejected artifacts accumulate in the quarantine directory with timestamped filenames. The directory should be reviewed and cleared manually after investigation.
