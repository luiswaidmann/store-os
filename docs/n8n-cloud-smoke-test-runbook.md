# n8n Cloud smoke-test runbook

## Purpose

This runbook documents the manual steps required to execute the current cloud-compatible smoke-test path for `store-os`.

It is intentionally focused on orchestration validation in n8n Cloud, not on the full self-hosted persistence target path.

## Confirmed current smoke-test chain

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`

## Required imported workflows

The following workflow JSON files must exist in n8n Cloud:

- `workflows/n8n/resolve-runtime-config.n8n.json`
- `workflows/n8n/intake-store-input.n8n.json`
- `workflows/n8n/import-shopify-data.n8n.json`
- `workflows/n8n/build-store-profile.n8n.json`
- `workflows/n8n/build-market-intelligence.n8n.json`
- `workflows/n8n/build-brand-positioning.n8n.json`
- `workflows/n8n/orchestrate-phase1.n8n.json`

## Required manual setup in n8n Cloud

### Credentials

The following credentials must be bound manually in n8n:

- Shopify credential for `import-shopify-data`
- OpenAI credential for `build-market-intelligence`
- OpenAI credential for `build-brand-positioning`

### Workflow IDs

The following workflow-ID placeholders in `orchestrate-phase1` must be replaced with actual n8n workflow IDs:

- `REPLACE_WITH_INTAKE_STORE_INPUT_WORKFLOW_ID`
- `REPLACE_WITH_IMPORT_SHOPIFY_DATA_WORKFLOW_ID`
- `REPLACE_WITH_BUILD_STORE_PROFILE_WORKFLOW_ID`
- `REPLACE_WITH_BUILD_MARKET_INTELLIGENCE_WORKFLOW_ID`
- `REPLACE_WITH_BUILD_BRAND_POSITIONING_WORKFLOW_ID`

### Credential placeholders

The following credential-ID placeholders remain expected in repo JSON and must be resolved in n8n UI context:

- `REPLACE_WITH_N8N_SHOPIFY_CREDENTIAL_ID`
- `REPLACE_WITH_N8N_OPENAI_CREDENTIAL_ID`

## Execution mode

The cloud smoke-test path is executed through `orchestrate-phase1` using trigger input that includes:

- `intake_payload`
- `smoke_test_config`

## Important cloud-mode assumptions

Cloud mode currently accepts these tradeoffs:

- no filesystem persistence
- no checkpoint files on disk
- no path-based AJV schema validation
- inline artifact return instead of disk writes

This is expected and not treated as a failure for smoke-test purposes.

## Expected successful output

A successful current cloud smoke test should produce inline output containing:

- `store_profile`
- `market_intelligence`
- `brand_positioning`

Expected completion message pattern:

> Phase 3 chain completed (cloud mode) for project: <project_id> | No artifacts were written to disk. brand_positioning is available in this output. | Next: build-competitor-clusters (Phase 4+ — not yet implemented).

## Common failure modes

### Missing workflow ID

Symptoms:

- subworkflow does not run
- orchestrator fails before or at execution node

Cause:

- one of the `REPLACE_WITH_*_WORKFLOW_ID` placeholders was not replaced with an actual workflow ID

### Missing credential binding

Symptoms:

- OpenAI or Shopify node fails during execution

Cause:

- imported workflow exists, but credential was not rebound in n8n UI

### Testing a downstream workflow in isolation

Symptoms:

- `build-brand-positioning` fails with missing `store_profile`
- downstream runtime stages complain about missing upstream artifacts

Cause:

- downstream workflows were run directly without the required upstream runtime artifacts

Correct approach:

- validate end-to-end through `orchestrate-phase1`

### Repo/UI drift

Symptoms:

- repo looks correct, but n8n behavior does not match documentation

Cause:

- imported n8n workflow is still on an older UI version
- repo JSON and n8n UI state are no longer synchronized

Correct approach:

- re-import or manually sync the affected workflow and re-check workflow IDs and credentials

## Current next phase

The current next executable runtime target after the confirmed Phase 3 chain is:

- `build-competitor-clusters`
