Execution Contract

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — DRAFT RUNTIME ARCHITECTURE NOTE:
This document is a planned execution contract, not a deployed system. No workflows have been
executed. No n8n instance has been provisioned. All contracts defined here are
implementation-grade specifications intended to remove ambiguity for the next build step.

—

Purpose

This document defines how each workflow in the store-os chain is invoked at runtime:
  - Invocation mechanism (trigger type, caller, execution mode)
  - Required input contracts (what must exist before a workflow can start)
  - Required environment/credential contracts (what must be available in the runtime env)
  - Output contract (what artifact is produced and where it is written)
  - Downstream trigger contract (what the workflow notifies or invokes next)
  - Blocking conditions (what causes the workflow to halt vs. continue with warning)

This document covers all 32 workflows in the standard chain, plus the two Phase 11 runtime
infrastructure workflows.

—

Core Invocation Rules

Rule 1 — Entry point is always intake-store-input
  No workflow in the chain may be invoked before intake-store-input completes successfully.
  The project_id established at intake is the namespace for all subsequent artifact writes.

Rule 2 — Sequential execution is the safe default
  Unless explicitly listed as parallelizable below, all workflows execute sequentially.
  Parallel execution requires explicit documentation of which workflows are independent.

Rule 3 — Checkpoint before proceeding
  After each workflow completes successfully, a checkpoint entry is written before the next
  workflow is triggered. See: workflows/runtime/runtime-state-checkpoint-spec.md

Rule 4 — Credential validation before chain start
  resolve-runtime-config must successfully validate all required credentials before any
  data-producing workflow is invoked. Missing credentials cause immediate halt — not warning.

Rule 5 — Missing required artifact = halt, not skip
  If a workflow's required upstream artifact is missing, the workflow halts and reports
  MISSING_ARTIFACT. It does not attempt to continue with empty inputs.

Rule 6 — Schema validation is the write gate
  No artifact is written to the project folder until it passes schema validation. Failed
  artifacts are written to a quarantine path and flagged for review.

Rule 7 — Publish decision is never automatic
  build-publish-decision produces a publish-decision.json artifact. It does not trigger
  any publish action. A human must explicitly act on the publish decision.

—

Parallelism Rules

The following workflow pairs may run in parallel (no shared output dependencies):

Parallel Group A — Product and Collection chains (after build-design-system completes):
  build-product-content and build-collection-content may run in parallel.
  build-product-seo and build-collection-seo may run in parallel (after their content phases).
  build-product-faq and build-collection-navigation may run in parallel.

Parallel Group B — Page and FAQ chains (after build-aeo-strategy completes):
  build-page-content and build-faq-page may run in parallel (faq-page depends on aeo-strategy
  and page-content; page-content depends on brand-positioning and design-system — confirm
  dependency graph before enabling parallelism).

Important: All parallelism is conditional on the dependency graph being verified at build time.
When in doubt, run sequentially.

—

Workflow Execution Contracts

The following table defines the runtime contract for each workflow.
Format per workflow:
  trigger: how this workflow is started
  required_artifacts: artifacts that must exist before this workflow runs
  required_credentials: credentials that must be configured in the n8n environment
  required_env: environment variables that must be set
  output_artifact: the primary artifact written by this workflow
  output_path: where the artifact is written
  downstream: what is triggered or notified after success
  blocking_conditions: conditions that halt the workflow entirely

—

Phase 11 Runtime Infrastructure Workflows

resolve-runtime-config
  trigger: manual trigger or n8n webhook, always first in chain
  required_artifacts: none
  required_credentials: SHOPIFY_CREDENTIAL (n8n named credential), OPENAI_CREDENTIAL (n8n named credential)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_ENV (dev | staging | production)
  output_artifact: runtime-config payload (in-memory, not persisted to disk)
  output_path: n8n in-memory context only
  downstream: intake-store-input
  blocking_conditions:
    - SHOPIFY_CREDENTIAL not found in n8n credential store
    - OPENAI_CREDENTIAL not found in n8n credential store
    - STORE_OS_PROJECT_ROOT not set or path does not exist
    - STORE_OS_ENV not set or not one of allowed values

orchestrate-runtime-execution
  trigger: called by resolve-runtime-config on success
  required_artifacts: runtime-config payload
  required_credentials: inherited from resolve-runtime-config
  required_env: inherited from resolve-runtime-config
  output_artifact: runtime-checkpoint.json (per workflow step)
  output_path: projects/{project_id}/.runtime/checkpoint.json
  downstream: coordinates full chain sequentially
  blocking_conditions:
    - Any required workflow in chain reports HALT status
    - project_id is not set in runtime config
    - Checkpoint write fails (filesystem permission error)

—

Phase 1 Workflows

intake-store-input
  trigger: n8n Form trigger or Webhook trigger (user submits intake form)
  required_artifacts: none (this is the chain entry point)
  required_credentials: none at this step
  required_env: STORE_OS_PROJECT_ROOT
  output_artifact: normalized intake payload (in-memory) + project folder created
  output_path: projects/{project_id}/ (folder creation only at this step)
  downstream: import-shopify-data
  blocking_conditions:
    - project_id field is missing or empty
    - project_id collides with existing project folder (unless resume mode is active)
    - Required intake fields are missing (see docs/n8n-intake-spec.md for required field list)

import-shopify-data
  trigger: called by orchestrator after intake-store-input
  required_artifacts: normalized intake payload (from intake-store-input, in-memory)
  required_credentials: SHOPIFY_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT
  output_artifact: shopify-import.json (raw Shopify data snapshot)
  output_path: projects/{project_id}/shopify-import.json
  downstream: build-store-profile
  blocking_conditions:
    - SHOPIFY_CREDENTIAL authentication fails
    - Shopify API returns non-200 response after retry exhaustion
    - shopify_store_selector from intake does not match any reachable store
    - API rate limit exceeded after retry exhaustion

build-store-profile
  trigger: called by orchestrator after import-shopify-data
  required_artifacts:
    - normalized intake payload (in-memory)
    - projects/{project_id}/shopify-import.json
  required_credentials: OPENAI_CREDENTIAL (LLM synthesis)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: store-profile.json
  output_path: projects/{project_id}/store-profile.json
  downstream: build-market-intelligence
  blocking_conditions:
    - shopify-import.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails (artifact written to quarantine)
    - project_id in output does not match project_id from intake

—

Phase 2 Workflows

build-market-intelligence
  trigger: called by orchestrator after build-store-profile
  required_artifacts: projects/{project_id}/store-profile.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: market-intelligence.json
  output_path: projects/{project_id}/market-intelligence.json
  downstream: build-brand-positioning (and build-competitor-clusters after brand-positioning)
  blocking_conditions:
    - store-profile.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-brand-positioning
  trigger: called by orchestrator after build-market-intelligence
  required_artifacts:
    - projects/{project_id}/store-profile.json
    - projects/{project_id}/market-intelligence.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: brand-positioning.json
  output_path: projects/{project_id}/brand-positioning.json
  downstream: build-competitor-clusters
  blocking_conditions:
    - store-profile.json or market-intelligence.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-competitor-clusters
  trigger: called by orchestrator after build-brand-positioning
  required_artifacts:
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: competitor-cluster.json
  output_path: projects/{project_id}/competitor-cluster.json
  downstream: build-pattern-manifest
  blocking_conditions:
    - market-intelligence.json or brand-positioning.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 3 Workflows

build-pattern-manifest
  trigger: called by orchestrator after build-competitor-clusters
  required_artifacts:
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/competitor-cluster.json
    - projects/{project_id}/store-profile.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: pattern-manifest.json
  output_path: projects/{project_id}/pattern-manifest.json
  downstream: build-design-system
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-design-system
  trigger: called by orchestrator after build-pattern-manifest
  required_artifacts:
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/pattern-manifest.json
    - projects/{project_id}/store-profile.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: design-system.json
  output_path: projects/{project_id}/design-system.json
  downstream: build-homepage-strategy
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-homepage-strategy
  trigger: called by orchestrator after build-design-system
  required_artifacts:
    - projects/{project_id}/store-profile.json
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/pattern-manifest.json
    - projects/{project_id}/design-system.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: homepage-strategy.json
  output_path: projects/{project_id}/homepage-strategy.json
  downstream: build-section-plan (and build-seo-strategy)
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 4 Workflows

build-section-plan
  trigger: called by orchestrator after build-homepage-strategy
  required_artifacts:
    - projects/{project_id}/homepage-strategy.json
    - projects/{project_id}/design-system.json
    - projects/{project_id}/pattern-manifest.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: section-library.json + section-instances (array)
  output_path:
    projects/{project_id}/section-library.json
    projects/{project_id}/section-instances/ (one file per section instance)
  downstream: build-product-content, build-collection-content (may run in parallel after this)
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of any output fails

build-seo-strategy
  trigger: called by orchestrator after build-homepage-strategy (can run in parallel with
    build-section-plan — both depend on homepage-strategy but not on each other)
  required_artifacts:
    - projects/{project_id}/store-profile.json
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: seo-strategy.json
  output_path: projects/{project_id}/seo-strategy.json
  downstream: build-aeo-strategy, build-product-seo, build-collection-seo, build-page-seo
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-product-content
  trigger: called by orchestrator after build-section-plan
  required_artifacts:
    - projects/{project_id}/shopify-import.json (raw product data)
    - projects/{project_id}/store-profile.json
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/design-system.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: product-content.json (or one file per product)
  output_path: projects/{project_id}/product-content.json
  downstream: build-product-seo, build-product-faq, build-product-structured-data
  blocking_conditions:
    - shopify-import.json missing (no product data to plan)
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 5 Workflows

build-product-seo
  trigger: called by orchestrator after build-product-content and build-seo-strategy
  required_artifacts:
    - projects/{project_id}/product-content.json
    - projects/{project_id}/seo-strategy.json
    - projects/{project_id}/shopify-import.json (product basics)
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: product-seo.json
  output_path: projects/{project_id}/product-seo.json
  downstream: build-product-structured-data, run-validation
  blocking_conditions:
    - product-content.json or seo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-product-faq
  trigger: called by orchestrator after build-product-content and build-aeo-strategy
  required_artifacts:
    - projects/{project_id}/product-content.json
    - projects/{project_id}/aeo-strategy.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: product-faq.json
  output_path: projects/{project_id}/product-faq.json
  downstream: build-product-structured-data, run-validation
  blocking_conditions:
    - product-content.json or aeo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-product-structured-data
  trigger: called by orchestrator after build-product-seo and build-product-faq
  required_artifacts:
    - projects/{project_id}/shopify-import.json (product data)
    - projects/{project_id}/product-seo.json
    - projects/{project_id}/product-faq.json
  optional_artifacts:
    - projects/{project_id}/structured-data-plan.json (if already available)
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: product-structured-data.json
  output_path: projects/{project_id}/product-structured-data.json
  downstream: run-validation
  blocking_conditions:
    - product-seo.json or product-faq.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-collection-content
  trigger: called by orchestrator after build-section-plan (may run in parallel with
    build-product-content)
  required_artifacts:
    - projects/{project_id}/shopify-import.json (collection data)
    - projects/{project_id}/store-profile.json
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: collection-content.json
  output_path: projects/{project_id}/collection-content.json
  downstream: build-collection-seo, build-collection-navigation
  blocking_conditions:
    - shopify-import.json missing
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 6 Workflows

build-collection-seo
  trigger: called by orchestrator after build-collection-content and build-seo-strategy
  required_artifacts:
    - projects/{project_id}/collection-content.json
    - projects/{project_id}/seo-strategy.json
  optional_artifacts:
    - projects/{project_id}/aeo-strategy.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: collection-seo.json
  output_path: projects/{project_id}/collection-seo.json
  downstream: build-collection-navigation, run-validation
  blocking_conditions:
    - collection-content.json or seo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-collection-navigation
  trigger: called by orchestrator after build-collection-seo
  required_artifacts:
    - projects/{project_id}/shopify-import.json (collection list)
    - projects/{project_id}/collection-content.json
    - projects/{project_id}/collection-seo.json
    - projects/{project_id}/homepage-strategy.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: collection-navigation.json
  output_path: projects/{project_id}/collection-navigation.json
  downstream: run-validation
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-page-content
  trigger: called by orchestrator after build-design-system
  required_artifacts:
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/design-system.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: page-content.json
  output_path: projects/{project_id}/page-content.json
  downstream: build-page-seo, build-faq-page
  blocking_conditions:
    - Any required artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 7 Workflows

build-page-seo
  trigger: called by orchestrator after build-page-content and build-seo-strategy
  required_artifacts:
    - projects/{project_id}/page-content.json
    - projects/{project_id}/seo-strategy.json
  optional_artifacts:
    - projects/{project_id}/aeo-strategy.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: page-seo.json
  output_path: projects/{project_id}/page-seo.json
  downstream: run-validation
  blocking_conditions:
    - page-content.json or seo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-faq-page
  trigger: called by orchestrator after build-page-content and build-aeo-strategy
  required_artifacts:
    - projects/{project_id}/aeo-strategy.json
    - projects/{project_id}/page-content.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: faq-page.json
  output_path: projects/{project_id}/faq-page.json
  downstream: build-structured-data-plan, run-validation
  blocking_conditions:
    - aeo-strategy.json or page-content.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 8 Workflows

build-aeo-strategy
  trigger: called by orchestrator after build-seo-strategy
  required_artifacts:
    - projects/{project_id}/market-intelligence.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/seo-strategy.json
  optional_artifacts:
    - projects/{project_id}/faq-page.json (if available at planning time)
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: aeo-strategy.json
  output_path: projects/{project_id}/aeo-strategy.json
  downstream: build-product-faq, build-collection-seo, build-page-seo, build-faq-page,
    build-structured-data-plan
  blocking_conditions:
    - market-intelligence.json, brand-positioning.json, or seo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-internal-linking
  trigger: called by orchestrator after build-page-seo, build-product-seo, and
    build-collection-seo are all complete
  required_artifacts:
    - projects/{project_id}/seo-strategy.json
    - projects/{project_id}/aeo-strategy.json
    - projects/{project_id}/homepage-strategy.json
    - projects/{project_id}/product-seo.json (or product content artifacts)
    - projects/{project_id}/collection-seo.json (or collection content artifacts)
    - projects/{project_id}/page-content.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: internal-linking.json
  output_path: projects/{project_id}/internal-linking.json
  downstream: run-validation
  blocking_conditions:
    - seo-strategy.json or aeo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-structured-data-plan
  trigger: called by orchestrator after build-faq-page and build-aeo-strategy
  required_artifacts:
    - projects/{project_id}/seo-strategy.json
    - projects/{project_id}/aeo-strategy.json
    - projects/{project_id}/faq-page.json
  optional_artifacts:
    - projects/{project_id}/product-faq.json
    - projects/{project_id}/collection-content.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: structured-data-plan.json
  output_path: projects/{project_id}/structured-data-plan.json
  downstream: build-product-structured-data, run-validation
  blocking_conditions:
    - seo-strategy.json or aeo-strategy.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 9 Workflows

build-media-plan
  trigger: called by orchestrator after build-page-content and build-collection-content
    are both complete
  required_artifacts:
    - projects/{project_id}/homepage-strategy.json
    - projects/{project_id}/section-instances/ (array)
    - projects/{project_id}/product-content.json
    - projects/{project_id}/collection-content.json
    - projects/{project_id}/page-content.json
    - projects/{project_id}/design-system.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/store-profile.json
  optional_artifacts:
    - projects/{project_id}/market-intelligence.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: media-plan.json
  output_path: projects/{project_id}/media-plan.json
  downstream: build-video-plan
  blocking_conditions:
    - homepage-strategy.json or design-system.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-video-plan
  trigger: called by orchestrator after build-media-plan
  required_artifacts:
    - projects/{project_id}/media-plan.json
    - projects/{project_id}/homepage-strategy.json
    - projects/{project_id}/design-system.json
    - projects/{project_id}/brand-positioning.json
    - projects/{project_id}/store-profile.json
  optional_artifacts:
    - projects/{project_id}/seo-strategy.json (for performance ceiling reinforcement)
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: video-plan.json
  output_path: projects/{project_id}/video-plan.json
  downstream: build-motion-media-strategy
  blocking_conditions:
    - media-plan.json, homepage-strategy.json, or design-system.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-motion-media-strategy
  trigger: called by orchestrator after build-video-plan
  required_artifacts:
    - projects/{project_id}/design-system.json
    - projects/{project_id}/homepage-strategy.json
    - projects/{project_id}/section-instances/ (array)
    - projects/{project_id}/media-plan.json
    - projects/{project_id}/video-plan.json
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: motion-media-strategy.json
  output_path: projects/{project_id}/motion-media-strategy.json
  downstream: run-validation
  blocking_conditions:
    - design-system.json, media-plan.json, or video-plan.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

—

Phase 10 Workflows

run-validation
  trigger: called by orchestrator after ALL Phase 1–9 artifacts have been produced
    (or after the maximum available artifact set — missing artifacts are reported as failed checks)
  required_artifacts: all artifacts from Phases 1–9 (see run-validation.json for full list)
  required_credentials: OPENAI_CREDENTIAL (LLM synthesis for narrative check descriptions)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: validation-report.json
  output_path: projects/{project_id}/validation-report.json
  downstream: build-quality-score
  blocking_conditions:
    - Critical validation failure that prevents report generation itself
    - LLM synthesis for check narratives fails after retry exhaustion
    - Schema validation of validation-report output fails
  note: run-validation does NOT block on individual check failures. It aggregates all checks
    into the report. Blocking vs. warning semantics are defined per-check within the workflow.

build-quality-score
  trigger: called by orchestrator after run-validation
  required_artifacts:
    - projects/{project_id}/validation-report.json
    - major planning artifacts (for coverage scoring)
  required_credentials: OPENAI_CREDENTIAL
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: quality-score.json
  output_path: projects/{project_id}/quality-score.json
  downstream: build-deployment-manifest
  blocking_conditions:
    - validation-report.json missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails

build-deployment-manifest
  trigger: called by orchestrator after build-quality-score
  required_artifacts:
    - projects/{project_id}/validation-report.json
    - projects/{project_id}/quality-score.json
    - all major planning artifacts (for artifact inventory)
  required_credentials: none (deterministic artifact inventory — no LLM required)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_ENV
  output_artifact: deployment-manifest.json
  output_path: projects/{project_id}/deployment-manifest.json
  downstream: build-publish-decision
  blocking_conditions:
    - validation-report.json or quality-score.json missing
    - Artifact inventory enumeration fails

build-publish-decision
  trigger: called by orchestrator after build-deployment-manifest
  required_artifacts:
    - projects/{project_id}/validation-report.json
    - projects/{project_id}/quality-score.json
    - projects/{project_id}/deployment-manifest.json
  required_credentials: OPENAI_CREDENTIAL (LLM synthesis for decision narrative)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_LLM_MODEL
  output_artifact: publish-decision.json
  output_path: projects/{project_id}/publish-decision.json
  downstream: human reviewer (no automatic downstream workflow)
  blocking_conditions:
    - Any required governance artifact missing
    - LLM synthesis fails after retry exhaustion
    - Schema validation of output fails
  critical: build-publish-decision does NOT trigger any publishing action. The publish-decision.json
    artifact is a recommendation for human review. No downstream automation should be connected
    to this workflow's output without explicit human approval.

backup-project
  trigger: called by orchestrator after build-publish-decision completes (regardless of
    publish decision outcome)
  required_artifacts: projects/{project_id}/ (entire folder)
  required_credentials: none (or cloud storage credential if applicable)
  required_env: STORE_OS_PROJECT_ROOT, STORE_OS_BACKUP_ROOT
  output_artifact: timestamped backup archive
  output_path: STORE_OS_BACKUP_ROOT/{project_id}/{timestamp}.zip (or equivalent)
  downstream: none (end of chain)
  blocking_conditions:
    - Backup destination not accessible
    - Disk space insufficient

—

Environment Variables Summary

The following environment variables must be set in the n8n execution environment:

  STORE_OS_PROJECT_ROOT
    The root directory where project folders are created.
    Example format: /data/store-os-projects
    Must be writable by the n8n process.
    Must be on a persistent volume (not ephemeral).

  STORE_OS_ENV
    Execution environment identifier.
    Allowed values: dev, staging, production
    Controls whether safety checks are strict or relaxed (dev allows more permissive behavior).

  STORE_OS_LLM_MODEL
    The model identifier used for LLM synthesis nodes.
    Must reference a valid model available through the configured OPENAI_CREDENTIAL.
    Example: gpt-4o
    Must not be hardcoded in workflow definitions.

  STORE_OS_BACKUP_ROOT
    The destination path for project backups.
    Required only for the backup-project workflow.
    Must be writable by the n8n process.

  STORE_OS_AJV_SCHEMA_PATH
    The path to the schemas/ directory from which AJV loads schema files at runtime.
    Example format: /app/store-os/schemas
    Must be accessible to the n8n Code node execution context.

—

Open Questions

1. How are section instance files named? (e.g., section-instance-hero.json,
   section-instance-{type}.json, or a single array file?) This affects the execution contract
   for build-section-plan and all downstream consumers that read section-instances.

2. How is product-content.json structured when there are multiple products? One file with an
   array, or one file per product under a products/ subdirectory?

3. At what phase boundary does the orchestrator wait for human review before continuing? After
   build-store-profile? After run-validation? Only at build-publish-decision?

4. Should intake-store-input support a resume mode where a partially-completed project can
   continue from its last checkpoint? If so, what is the collision policy when project_id
   already has a project folder with existing artifacts?

—

Assumptions

- All artifact paths follow the pattern projects/{project_id}/{artifact-name}.json unless
  otherwise noted in this document.
- n8n Execute Workflow nodes are used to invoke subworkflows within the chain.
- The orchestrator (orchestrate-runtime-execution) is a single n8n workflow that coordinates
  all subworkflow invocations.
- LLM synthesis retry policy: 3 attempts with exponential backoff (1s, 2s, 4s) before HALT.
- Shopify API retry policy: 3 attempts with exponential backoff before HALT.
- Schema validation is performed using AJV running in a n8n Code node.
- The OPENAI_CREDENTIAL and SHOPIFY_CREDENTIAL are named credentials in the n8n credential store.
  Their exact names are resolved at runtime by resolve-runtime-config and injected into each
  subworkflow as parameters.
