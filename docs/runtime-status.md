# store-os runtime status

## Current confirmed repo state

Branch baseline:

- `main`

Latest confirmed merge relevant to executable runtime progression:

- `e25fe42` Merge pull request #8 from `feature/phase-14-brand-positioning-runtime`

Recent runtime progression merges:

- `35c8d51` Merge pull request #7 from `feature/phase-13-market-intelligence-runtime`
- `4a37e26` Merge pull request #6 from `feature/phase-12-cloud-aggregation-fix`
- `1f54815` Merge pull request #5 from `feature/phase-12-cloud-config-fix`
- `0404ef5` Merge pull request #4 from `feature/phase-12-cloud-hardening`
- `8ad40d5` Merge pull request #3 from `feature/phase-12-executable-foundation`

## Current confirmed executable chain

The currently confirmed n8n Cloud smoke-test path is:

- `resolve-runtime-config`
- `intake-store-input`
- `import-shopify-data`
- `build-store-profile`
- `build-market-intelligence`
- `build-brand-positioning`

## Current confirmed inline outputs

The chain currently returns these runtime artifacts inline in cloud mode:

- `store_profile`
- `market_intelligence`
- `brand_positioning`

## Current cloud strategy

n8n Cloud is currently used as a smoke-test and orchestration validation path.

Accepted cloud limitations:

- no real filesystem access
- no normal `process.env` dependency
- no disk artifact persistence
- no checkpoint files on disk
- no AJV / local schema validation through file paths

These limitations are currently acceptable because cloud mode is being used to validate runtime wiring and phase execution.

## Self-hosted strategy

Self-hosted remains the intended fuller operational target path for later phases, especially where persistence, local validation, or filesystem-backed checkpointing becomes important.

No self-hosted migration is currently required for the next implementation step.

## Current setup assumptions in n8n

The repo intentionally keeps `REPLACE_WITH_*` placeholders for:

- workflow IDs in orchestrators
- credential IDs in importable workflow JSON files

Manual n8n setup remains expected for:

- workflow import
- credential binding
- workflow ID replacement
- cloud smoke-test trigger input execution

## Confirmed next planned runtime step

Next likely executable phase:

- `build-competitor-clusters`

Suggested next working branch:

- `feature/phase-15-competitor-clusters-runtime`

## Operational warning

Always distinguish between:

- repo state
- n8n UI state

A successful merge to `main` does not update the n8n UI automatically. Imported workflows, credentials, and workflow-ID wiring must still be synchronized manually in n8n Cloud.
