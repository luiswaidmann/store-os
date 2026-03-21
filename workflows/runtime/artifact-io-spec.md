Artifact I/O Specification

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — DRAFT RUNTIME ARCHITECTURE NOTE:
This document is a planned artifact I/O specification, not a deployed system. No artifacts
have been written by a runtime execution. All specifications defined here are
implementation-grade planning intended to reduce ambiguity for the next build step.

—

Purpose

This document defines how store-os artifacts are read, written, validated, versioned,
and discovered at runtime. It covers:
  - Artifact storage layout
  - Path resolution rules
  - Read contracts (what a workflow must do before consuming an artifact)
  - Write contracts (what a workflow must do before writing an artifact)
  - Versioning strategy
  - Artifact discovery at resume time
  - Quarantine behavior for invalid artifacts
  - Section instance special handling

—

Artifact Storage Layout

All project artifacts are stored under:

  {STORE_OS_PROJECT_ROOT}/{project_id}/

Example (with a project_id of "suppliedtech-2025"):

  /data/store-os-projects/suppliedtech-2025/
  ├── store-profile.json
  ├── market-intelligence.json
  ├── brand-positioning.json
  ├── competitor-cluster.json
  ├── pattern-manifest.json
  ├── design-system.json
  ├── homepage-strategy.json
  ├── section-library.json
  ├── section-instances/
  │   ├── hero.json
  │   ├── featured-collections.json
  │   ├── trust-bar.json
  │   └── ... (one file per section instance)
  ├── seo-strategy.json
  ├── aeo-strategy.json
  ├── product-content.json
  ├── product-seo.json
  ├── product-faq.json
  ├── product-structured-data.json
  ├── collection-content.json
  ├── collection-seo.json
  ├── collection-navigation.json
  ├── page-content.json
  ├── page-seo.json
  ├── faq-page.json
  ├── internal-linking.json
  ├── structured-data-plan.json
  ├── media-plan.json
  ├── video-plan.json
  ├── motion-media-strategy.json
  ├── shopify-import.json
  ├── validation-report.json
  ├── quality-score.json
  ├── deployment-manifest.json
  ├── publish-decision.json
  └── .runtime/
      ├── checkpoint.json
      ├── execution-log.json
      └── quarantine/
          └── {artifact-name}.{timestamp}.rejected.json

—

Path Resolution Rules

Rule 1 — Project root is environment-defined
  STORE_OS_PROJECT_ROOT is an environment variable, never hardcoded.
  Workflows must read the project root from runtime config, not from a constant.

Rule 2 — project_id is intake-defined
  The project_id is established at intake-store-input and never mutated downstream.
  All subsequent artifact paths are constructed as:
    {STORE_OS_PROJECT_ROOT}/{project_id}/{artifact-name}.json

Rule 3 — Artifact names are fixed
  Artifact file names are defined by this spec and must not vary across runs.
  The artifact name is the schema name minus the ".schema.json" suffix.
  Example: schemas/store-profile.schema.json → artifact name: store-profile → path: store-profile.json

Rule 4 — Section instances are in a subdirectory
  Because the section plan may produce multiple section instance records, they are stored
  in a dedicated subdirectory: {project_id}/section-instances/
  Each file is named after the section type: {section-type}.json
  A directory listing of section-instances/ is used as the input for downstream consumers.

Rule 5 — Shopify import is a special artifact
  shopify-import.json is produced by import-shopify-data and is a raw snapshot of Shopify
  data. It is NOT schema-validated against any planning artifact schema. It is treated as
  operational data input only.

Rule 6 — Runtime state lives in .runtime/
  The .runtime/ directory is hidden from normal artifact enumeration.
  It contains runtime-internal state (checkpoint, execution log, quarantine).
  It is not part of any planning artifact schema.

—

Read Contract

Before any workflow consumes an upstream artifact, it must:

Step 1 — Existence check
  Verify the artifact file exists at the expected path.
  If the file does not exist:
    - Log MISSING_ARTIFACT with the expected path
    - Halt if the artifact is required
    - Skip (with warning) if the artifact is optional

Step 2 — Parse check
  Attempt to JSON.parse() the artifact file.
  If parsing fails:
    - Log PARSE_ERROR with the file path and parse error message
    - Halt (a corrupted artifact cannot be safely consumed)

Step 3 — Schema conformance check (for downstream consumers)
  When a workflow consumes an artifact as a planning input, it should validate the artifact
  against its schema using AJV before using its fields.
  If schema validation fails:
    - Log SCHEMA_VIOLATION with the artifact path and AJV error details
    - Halt if the schema violation affects fields this workflow depends on
    - Warn and continue if the failing fields are not used by this workflow
  Note: Full schema conformance checking is enforced at write time. Read-time checking is
  a defense-in-depth measure and may be relaxed for performance in later builds.

Step 4 — project_id consistency check
  Verify that the artifact's project_id field matches the runtime project_id.
  If it does not match:
    - Log PROJECT_ID_MISMATCH with both values
    - Halt (cross-project artifact contamination is a critical error)

—

Write Contract

Before any workflow writes an artifact to disk, it must:

Step 1 — Schema validation
  Validate the artifact JSON against its schema using AJV.
  Schema files are loaded from STORE_OS_AJV_SCHEMA_PATH.
  If AJV validation fails:
    - Do NOT write the artifact to the normal path
    - Write the artifact to .runtime/quarantine/{artifact-name}.{timestamp}.rejected.json
    - Log SCHEMA_VIOLATION_QUARANTINE with the artifact name, AJV errors, and quarantine path
    - Halt the workflow

Step 2 — project_id injection
  Before writing, confirm the artifact's project_id field matches the runtime project_id.
  If missing, inject the project_id from runtime config.
  If present but mismatched, halt (do not overwrite with wrong project_id).

Step 3 — Atomic write
  Write the artifact to a temporary path first: {artifact-name}.tmp.json
  Then rename to the final path: {artifact-name}.json
  This prevents partial writes from creating corrupted artifacts visible to downstream consumers.
  If the rename fails, log WRITE_ERROR and halt.

Step 4 — Write timestamp recording
  After successful write, record the artifact name, path, and timestamp in the execution log
  at .runtime/execution-log.json.

Step 5 — Checkpoint update
  After successful artifact write, update the checkpoint at .runtime/checkpoint.json to record
  that this workflow step completed successfully. See: runtime-state-checkpoint-spec.md

—

Versioning Strategy

Phase 11 does not implement full artifact versioning in the initial architecture.
The design choice is intentional: artifact files are overwritten on each run.

Rationale:
  - The primary versioning mechanism is Git (project folders may be committed to Git)
  - The backup-project workflow creates timestamped snapshots
  - n8n execution logs provide run-level history

Future versioning behavior (out of scope for Phase 11 initial implementation):
  - Artifact version counter: {artifact-name}.v{N}.json alongside the current artifact
  - Version manifest: .runtime/artifact-versions.json tracking each artifact's version history
  - Rollback: restore a specific version by overwriting the current file with a versioned copy

Current overwrite behavior:
  - If an artifact already exists at the target path, it is overwritten on each successful run
  - The prior version is NOT preserved automatically (rely on Git or backup for recovery)
  - If an artifact write fails, the prior version is preserved (atomic write ensures this)

—

Artifact Discovery at Resume Time

When a run is resumed from a checkpoint, the orchestrator must discover which artifacts
already exist in the project folder. This is the artifact discovery procedure:

Step 1 — Read checkpoint
  Load .runtime/checkpoint.json to determine the last successfully completed workflow step.
  See: runtime-state-checkpoint-spec.md for checkpoint format.

Step 2 — Enumerate existing artifacts
  For each artifact in the standard artifact list (all artifact paths from this spec):
    Check if the file exists at the expected path.
    Record presence/absence in a discovery map.

Step 3 — Compare with checkpoint
  Cross-reference the discovery map with the completed_workflows list in the checkpoint.
  If an artifact is present but its workflow is not in completed_workflows:
    Flag as ARTIFACT_WITHOUT_CHECKPOINT (unexpected state — may be from a prior failed run)
    Do not use this artifact without explicit human confirmation.
  If a workflow is in completed_workflows but its artifact is missing:
    Flag as CHECKPOINT_WITHOUT_ARTIFACT (critical inconsistency — artifact was deleted)
    Halt and require human review.

Step 4 — Resume from checkpoint
  Set the next_workflow to the workflow immediately after the last completed_workflow.
  Run from next_workflow forward, using existing artifacts as read inputs.
  Do not re-run completed workflows unless explicitly requested.

—

Quarantine Behavior

When an artifact fails schema validation at write time, it is placed in quarantine:

  Path: {project_id}/.runtime/quarantine/{artifact-name}.{iso-timestamp}.rejected.json

Contents of a quarantine file:
  - The raw artifact JSON (as produced by the workflow)
  - A wrapper with quarantine metadata:
    {
      "quarantine_reason": "SCHEMA_VIOLATION",
      "artifact_name": "...",
      "workflow_id": "...",
      "validation_errors": [...AJV error array...],
      "timestamp": "...",
      "project_id": "...",
      "artifact_payload": {...the rejected artifact...}
    }

A quarantine file is never consumed by downstream workflows.
A quarantine file requires human review and manual repair before the workflow can be re-run.
The quarantine directory is included in the backup-project snapshot.

—

Section Instance Special Handling

build-section-plan produces multiple section instance records.
Each instance is written as a separate file in the section-instances/ subdirectory.

File naming convention: {section-type}.json
  where section-type is the lowercase slug form of the section type field in the instance.
  Example: a section instance with type "hero" → section-instances/hero.json
  Example: a section instance with type "featured-collections" →
    section-instances/featured-collections.json

Consumer behavior for section-instances/:
  Workflows that consume section instances (build-media-plan, build-motion-media-strategy,
  run-validation) must enumerate all files in the section-instances/ directory.
  The enumeration result is treated as an ordered array.
  Order within the directory is determined by the section_order or position field within
  each instance file (if present), otherwise by filesystem sort order.

Schema validation:
  Each file in section-instances/ is validated against schemas/section-instance.schema.json
  at write time.

—

Artifact Dependency Graph

The following table lists each artifact and the artifacts it directly depends on.
This is the definitive read-dependency graph for runtime input validation.

store-profile.json
  depends on: shopify-import.json (operational context), intake payload (strategic context)

market-intelligence.json
  depends on: store-profile.json

brand-positioning.json
  depends on: store-profile.json, market-intelligence.json

competitor-cluster.json
  depends on: market-intelligence.json, brand-positioning.json

pattern-manifest.json
  depends on: market-intelligence.json, brand-positioning.json, competitor-cluster.json,
    store-profile.json

design-system.json
  depends on: brand-positioning.json, pattern-manifest.json, store-profile.json

homepage-strategy.json
  depends on: store-profile.json, market-intelligence.json, brand-positioning.json,
    pattern-manifest.json, design-system.json

section-library.json, section-instances/
  depends on: homepage-strategy.json, design-system.json, pattern-manifest.json

seo-strategy.json
  depends on: store-profile.json, market-intelligence.json, brand-positioning.json

aeo-strategy.json
  depends on: market-intelligence.json, brand-positioning.json, seo-strategy.json

product-content.json
  depends on: shopify-import.json, store-profile.json, market-intelligence.json,
    brand-positioning.json, design-system.json

product-seo.json
  depends on: product-content.json, seo-strategy.json, shopify-import.json

product-faq.json
  depends on: product-content.json, aeo-strategy.json

product-structured-data.json
  depends on: shopify-import.json, product-seo.json, product-faq.json

collection-content.json
  depends on: shopify-import.json, store-profile.json, market-intelligence.json,
    brand-positioning.json

collection-seo.json
  depends on: collection-content.json, seo-strategy.json

collection-navigation.json
  depends on: shopify-import.json, collection-content.json, collection-seo.json,
    homepage-strategy.json

page-content.json
  depends on: brand-positioning.json, market-intelligence.json, design-system.json

page-seo.json
  depends on: page-content.json, seo-strategy.json

faq-page.json
  depends on: aeo-strategy.json, page-content.json

internal-linking.json
  depends on: seo-strategy.json, aeo-strategy.json, homepage-strategy.json,
    product-seo.json, collection-seo.json, page-content.json

structured-data-plan.json
  depends on: seo-strategy.json, aeo-strategy.json, faq-page.json

media-plan.json
  depends on: homepage-strategy.json, section-instances/, product-content.json,
    collection-content.json, page-content.json, design-system.json,
    brand-positioning.json, store-profile.json

video-plan.json
  depends on: media-plan.json, homepage-strategy.json, design-system.json,
    brand-positioning.json, store-profile.json

motion-media-strategy.json
  depends on: design-system.json, homepage-strategy.json, section-instances/,
    media-plan.json, video-plan.json

validation-report.json
  depends on: all artifacts from store-profile.json through motion-media-strategy.json

quality-score.json
  depends on: validation-report.json

deployment-manifest.json
  depends on: validation-report.json, quality-score.json

publish-decision.json
  depends on: validation-report.json, quality-score.json, deployment-manifest.json

—

Open Questions

1. Should the section-instances/ directory use a manifest file (e.g., section-instances/index.json)
   listing all instances in order, rather than relying on filesystem enumeration? A manifest
   would make the order deterministic and explicit.

2. How large will shopify-import.json be for large stores with thousands of products and
   collections? If it exceeds n8n's in-memory limits, a streaming or pagination approach
   may be required.

3. Should artifacts be compressed (gzip) for storage? Some LLM synthesis artifacts may be
   large. This affects the read contract (decompress before parsing) and backup size.

4. Should the project folder be a Git repository itself (nested Git)? This would give free
   artifact versioning. The tradeoff is complexity of nested Git management from n8n.

—

Assumptions

- STORE_OS_PROJECT_ROOT is set and writable before any workflow runs.
- All artifact files are UTF-8 encoded JSON.
- File size limits: individual artifact files are expected to stay under 10MB. If a file
  exceeds this limit, the architecture must be revisited.
- AJV can load schema files from a local filesystem path at n8n Code node execution time.
- Atomic writes via tmp-then-rename are supported by the underlying filesystem.
- The .runtime/ directory is excluded from any Git tracking of the project folder
  (via .gitignore) but is included in backup archives.
