Phase 11 — Runtime Architecture

Status: draft runtime architecture
Format: store-os documentation
Version: 1.0

IMPORTANT — DRAFT RUNTIME ARCHITECTURE NOTE:
This document describes planned runtime architecture, not a production-deployed system. No
workflows have been executed against live Shopify stores. No credentials have been configured.
No n8n instance has been provisioned. All architecture described here is implementation-grade
planning intended to reduce ambiguity for the next implementation step. Human review of all
architectural decisions is required before any execution environment is provisioned.

—

Purpose

Phase 11 defines the Runtime / Execution Layer for store-os.

Phases 1–10 produced a complete set of Git-first workflow draft definitions covering the full
commerce operating cycle: intake → market intelligence → design → commerce content → SEO/AEO →
media → validation → publish decision.

Phase 11 does NOT invent new planning artifacts. Phase 11 makes the existing workflow system
operationally executable.

The goal of Phase 11 is to bridge the gap between:

  Git-first workflow draft definitions (Phases 1–10)
  and
  Actual n8n-oriented runtime execution

—

What Phase 11 Covers

1. Execution Contract Layer
   How workflows are invoked, in what order, with what inputs, and what runtime dependencies they
   require. Defined in: workflows/runtime/execution-contract.md

2. Artifact I/O Layer
   How artifacts are read, validated, written, versioned, and discovered at runtime. Defined in:
   workflows/runtime/artifact-io-spec.md

3. Credential / Runtime Config Layer
   Safe runtime handling for OpenAI and Shopify credentials, model selection, environment
   configuration, and non-hardcoded credential resolution. Defined in:
   workflows/runtime/credential-resolution-spec.md

4. Real Validation Execution Layer
   How the planned validation logic in run-validation.json is converted into runtime-capable
   architecture: AJV execution, file existence checks, dependency checks, contradiction checks,
   placeholder density checks, manifest generation. Defined in:
   workflows/runtime/validation-execution-spec.md

5. Error Handling and Recovery
   Retry policy, halt conditions, review-required escalation, partial-success semantics, and
   resumability behavior. Defined in: workflows/runtime/error-taxonomy.md

6. n8n Implementation Bridge
   How draft JSON workflow files map into real n8n node categories, execution stages, subflow
   boundaries, and orchestration rules. Defined in:
   workflows/runtime/n8n-implementation-map.md

7. Minimal Runnable Orchestration Path
   One concrete golden-path execution chain for a single store from intake through publish
   decision. Defined in: workflows/runtime/golden-path-orchestration.md

8. Runtime State / Checkpoint Layer
   Checkpoint writing, state discovery, and resumability from last successful step. Defined in:
   workflows/runtime/runtime-state-checkpoint-spec.md and schemas/runtime-checkpoint.schema.json

—

What Phase 11 Does Not Cover

- Phase 11 does not destroy or rewrite Phases 1–10 workflow definitions.
- Phase 11 does not collapse multiple phases into one workflow.
- Phase 11 does not remove human review gates.
- Phase 11 does not weaken placeholder policies.
- Phase 11 does not replace conservative fallback behavior with optimistic assumptions.
- Phase 11 does not hardcode credentials, secrets, API keys, model IDs, or shop URLs.
- Phase 11 does not implement real deployment scripts, CI/CD, or automatic publishing.
- Phase 11 does not claim any workflow is production-ready when it is not.
- Phase 11 does not pretend live Shopify data has been accessed when it has not.

—

Core Runtime Principles

These principles govern all Phase 11 architecture decisions:

1. Git-first at all times
   Workflow definitions live in Git. The n8n execution environment consumes them. Changes move
   Git → n8n, not the other direction. Runtime state (checkpoints, logs) is ephemeral. Artifact
   outputs are persisted in project folders.

2. Credentials only in n8n
   No credential, token, API key, or secret belongs in any Git-tracked file. All runtime
   credential references use placeholder names that resolve to named n8n credentials at execution
   time. See: workflows/runtime/credential-resolution-spec.md

3. Schema contracts are enforcement boundaries
   Every artifact written at runtime must conform to its schema before it is accepted as valid.
   AJV validation is the enforcement mechanism. Schema violations trigger error escalation, not
   silent continuation. See: workflows/runtime/validation-execution-spec.md

4. Human review gates are mandatory
   The system never publishes autonomously. Every execution chain terminates at a human-review
   boundary before a publish decision becomes actionable. Validation flags, quality scores, and
   publish decisions are all advisory — a human must act on them. See: docs/n8n-conventions.md
   Rule 11.

5. Placeholder policy is a hard constraint
   Artifacts that exceed the allowed placeholder density threshold are not considered complete.
   PLACEHOLDER-REQUIRES-REVIEW items require human authoring. REQUIRES-OPERATIONAL-DATA items
   require the store operator to supply facts. No automatic unblocking of placeholder failures.
   See: workflows/runtime/validation-execution-spec.md

6. Conservative fallback always
   When a check cannot complete, it fails conservative (failed or skipped — never auto-passed).
   When a workflow cannot proceed due to missing inputs, it halts — it does not invent inputs.
   When an artifact is ambiguous, it requires review — it does not get silently approved.

7. Resumability from checkpoint
   Runtime execution tracks a checkpoint after each successful workflow step. Failed runs resume
   from the last successful checkpoint, not from the beginning. Checkpoint state is per-project
   and per-execution-run. See: workflows/runtime/runtime-state-checkpoint-spec.md

—

Runtime Execution Layers

The store-os runtime is organized into five layers:

Layer 1 — Config Resolution
  Resolve credentials, environment, project ID, model selection.
  Workflow: resolve-runtime-config
  Must complete before any other workflow executes.

Layer 2 — Intake and Import
  Collect user intent and import Shopify operational data.
  Workflows: intake-store-input, import-shopify-data
  Sequential. import-shopify-data depends on intake-store-input.

Layer 3 — Strategic Planning Chain
  Build market intelligence, brand positioning, competitor clusters, pattern manifest,
  design system, homepage strategy, section plan, SEO/AEO strategy.
  Workflows: Phases 2–3 and Phase 7 (seo-strategy, aeo-strategy).
  Mostly sequential due to upstream dependency chain.

Layer 4 — Content Generation Chain
  Build all product, collection, page, SEO, FAQ, linking, structured data, media, and
  motion planning artifacts.
  Workflows: Phases 4–9.
  Some parallelism possible (product and collection chains are independent of each other
  until validation).

Layer 5 — Governance Chain
  Run validation, build quality score, build deployment manifest, build publish decision.
  Workflows: Phase 10.
  Sequential. Each depends on the output of the previous.

—

Workflow Phase Summary

Phase 1    intake-store-input, import-shopify-data, build-store-profile
Phase 2    build-market-intelligence, build-brand-positioning, build-competitor-clusters
Phase 3    build-pattern-manifest, build-design-system, build-homepage-strategy
Phase 4    build-section-plan, build-product-content, build-product-seo
Phase 5    build-product-faq, build-product-structured-data, build-collection-content
Phase 6    build-collection-seo, build-collection-navigation, build-page-content
Phase 7    build-page-seo, build-faq-page, build-seo-strategy
Phase 8    build-aeo-strategy, build-internal-linking, build-structured-data-plan
Phase 9    build-media-plan, build-video-plan, build-motion-media-strategy
Phase 10   run-validation, build-quality-score, build-deployment-manifest, build-publish-decision
Phase 11   resolve-runtime-config, orchestrate-runtime-execution (runtime infrastructure)

—

New Files Introduced in Phase 11

Runtime specs:
  workflows/runtime/execution-contract.md
  workflows/runtime/artifact-io-spec.md
  workflows/runtime/credential-resolution-spec.md
  workflows/runtime/validation-execution-spec.md
  workflows/runtime/error-taxonomy.md
  workflows/runtime/n8n-implementation-map.md
  workflows/runtime/golden-path-orchestration.md
  workflows/runtime/runtime-state-checkpoint-spec.md

New schemas:
  schemas/runtime-checkpoint.schema.json

New workflow drafts:
  workflows/subflows/resolve-runtime-config.json
  workflows/subflows/orchestrate-runtime-execution.json

—

Relationship to Prior Phases

Phase 11 does not modify any Phase 1–10 workflow draft files.
Phase 11 does not modify any schemas from Phases 1–10.
Phase 11 does not modify docs/architecture.md, docs/n8n-conventions.md, docs/repo-rules.md,
  docs/input-model.md, or docs/n8n-intake-spec.md.
Phase 11 does not modify workflows/mappings/workflow-input-output-map.md.
Phase 11 does not modify workflows/mappings/input-to-artifacts.md.

Phase 11 adds new layers on top of the existing system without disturbing its architecture.

—

Open Questions

1. n8n version and deployment: Which n8n version will the production instance use? Self-hosted
   or cloud? This affects available node types and credential management options.

2. Project folder location at runtime: Are project artifact folders stored locally on the n8n
   host machine, on a shared network volume, or in a cloud storage bucket? This affects artifact
   read/write implementation.

3. AJV version and bundling: AJV 6 (JSON Schema draft-07) or AJV 8 (JSON Schema 2020-12)?
   Which version is compatible with the existing schema files? Must be confirmed before
   implementing Code nodes that run schema validation.

4. LLM model selection: Which OpenAI model handles synthesis nodes? GPT-4o? GPT-4o-mini?
   Model selection should be a runtime config value, not hardcoded in workflow definitions.

5. Shopify API version: Which Shopify Admin API version is targeted? Must be pinned in the
   import workflow to prevent silent breaking changes.

6. Parallel execution limits: n8n has execution concurrency limits. The parallelism plan in
   this architecture assumes no concurrency bottleneck. This must be validated against the
   actual n8n instance configuration.

7. Manual review tooling: What tool does the human reviewer use to act on the publish decision?
   A separate n8n form? A Slack message? An email? This defines the last-mile boundary of the
   system.

—

Assumptions

- All Phase 1–10 workflow draft files are structurally stable and will not change before
  Phase 11 is implemented.
- The project folder pattern projects/{project_id}/ is the agreed artifact storage location.
- n8n is the agreed execution environment. No other orchestration tool is under consideration.
- AJV is the agreed JSON schema validator to run inside n8n Code nodes.
- OpenAI is the agreed LLM provider. Claude or other models are not in scope for Phase 11.
- Shopify is the agreed commerce platform. Multi-platform support is future work.
- The manual_review_required intake field defaults to true and cannot be silently overridden
  by any workflow.

—

Evidence Boundaries

All architecture decisions in Phase 11 are inferred from the existing repository structure,
documentation, schema contracts, and workflow draft definitions created in Phases 1–10.
No live system state has been observed. No n8n instance has been queried. No Shopify store
has been accessed. No credential has been tested. All implementation decisions should be
validated against actual n8n behavior before production use.
