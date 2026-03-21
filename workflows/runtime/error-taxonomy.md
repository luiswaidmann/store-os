Error Taxonomy and Recovery Policy

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — DRAFT RUNTIME ARCHITECTURE NOTE:
This document defines planned error handling behavior. No errors have been observed in
production. All policies are designed conservatively — when the right behavior is ambiguous,
the safer, more reversible option is chosen.

—

Purpose

This document defines:
  - Error categories (with codes and descriptions)
  - Retry policy per error category
  - Halt conditions (when the chain stops entirely)
  - Review-required escalation (when a human must decide before continuing)
  - Partial-success semantics (what happens when some artifacts succeed and others fail)
  - Resumability (how the chain recovers from a halted state)

—

Error Categories

Error Category 1 — CONFIG_MISSING
  Code: CONFIG_MISSING
  Description: A required environment variable or runtime configuration value is not set.
  Examples: STORE_OS_PROJECT_ROOT not set, STORE_OS_ENV not set, STORE_OS_LLM_MODEL not set.
  Retry policy: NONE — this is a configuration error, not a transient failure.
  Halt behavior: IMMEDIATE_HALT — no workflow step proceeds.
  Recovery: Human must set the missing configuration value and restart the chain.
  Resumable: YES — after fixing config, the chain can resume from the beginning (no artifacts
    have been produced yet, so there is nothing to lose).
  Scope: resolve-runtime-config only.

Error Category 2 — CREDENTIAL_NOT_FOUND
  Code: CREDENTIAL_NOT_FOUND
  Description: A required named credential does not exist in the n8n credential store.
  Examples: STORE_OS_OPENAI_CREDENTIAL_NAME refers to a credential that has not been created.
  Retry policy: NONE — credential existence does not change between retries.
  Halt behavior: IMMEDIATE_HALT.
  Recovery: Human must create the named credential in n8n and restart the chain.
  Resumable: YES — same as CONFIG_MISSING.
  Scope: resolve-runtime-config only.

Error Category 3 — CREDENTIAL_AUTH_FAILURE
  Code: CREDENTIAL_AUTH_FAILURE
  Description: A credential exists in n8n but API authentication fails.
  Examples: OpenAI API key revoked, Shopify access token expired, wrong secret.
  Retry policy: 1 retry (in case of transient auth error), then HALT.
  Halt behavior: HALT after retry exhaustion.
  Recovery: Human must update the credential values in n8n and restart from checkpoint.
  Resumable: YES — checkpoint preserves the last successful artifact writes.
  Scope: import-shopify-data (Shopify), any LLM synthesis workflow (OpenAI).

Error Category 4 — MISSING_ARTIFACT
  Code: MISSING_ARTIFACT
  Description: A required upstream artifact is not present at the expected path.
  Examples: product-seo.json is missing when build-product-structured-data runs.
  Retry policy: NONE — a missing artifact will not appear on its own.
  Halt behavior: HALT the affected workflow. Do not attempt to continue with empty inputs.
  Recovery: Determine why the upstream artifact was not produced. Re-run the workflow that
    should have produced it. Then resume from the failed step.
  Resumable: YES — checkpoint preserved state up to the last successful step.
  Scope: any workflow that reads upstream artifacts.

Error Category 5 — PARSE_ERROR
  Code: PARSE_ERROR
  Description: An artifact file exists but cannot be parsed as valid JSON.
  Examples: File was partially written (interrupted write), file contains non-JSON content.
  Retry policy: NONE — a corrupt file will not fix itself on retry.
  Halt behavior: HALT the affected workflow.
  Recovery: Delete or quarantine the corrupt artifact. Re-run the workflow that produced it.
  Resumable: YES — checkpoint preserves the state of artifact writes before the corrupt file.
  Note: The atomic write contract (tmp-then-rename) is designed to prevent partial writes.
    If PARSE_ERROR occurs, investigate whether the atomic write contract was violated.
  Scope: any workflow that reads artifacts.

Error Category 6 — SCHEMA_VIOLATION
  Code: SCHEMA_VIOLATION
  Description: An artifact fails AJV schema validation.
    Sub-type A (write-time): the artifact produced by this workflow fails its output schema.
    Sub-type B (read-time): an artifact being consumed fails the input schema check.
  Retry policy: NONE for schema violations (retrying the same LLM call will likely produce
    the same invalid structure; use SCHEMA_VIOLATION_RETRY only if a prompt fix is applied).
  Halt behavior:
    Write-time: HALT, write artifact to quarantine, do not write to normal artifact path.
    Read-time: HALT if the failing fields are required by this workflow.
  Recovery:
    Write-time: Review quarantine artifact, identify schema violation, fix the LLM prompt
      or Code node logic, re-run the affected workflow.
    Read-time: Re-run the workflow that produced the invalid artifact.
  Resumable: YES.
  Scope: any workflow that writes or reads schema-validated artifacts.

Error Category 7 — LLM_SYNTHESIS_FAILURE
  Code: LLM_SYNTHESIS_FAILURE
  Description: The OpenAI API returns an error, times out, or produces an unusable response.
  Examples: Rate limit exceeded, context window exceeded, model returns empty content,
    content filter rejection, network timeout.
  Retry policy: 3 retries with exponential backoff (1 second, 2 seconds, 4 seconds).
  Halt behavior: HALT after retry exhaustion.
  Recovery:
    If rate-limited: wait for rate limit reset window and retry.
    If context window exceeded: the prompt is too large — reduce artifact input size.
    If content filter: review prompt for policy violations.
    If model unavailable: check STORE_OS_LLM_MODEL, verify model access.
  Resumable: YES.
  Special case: In run-validation Stage 9 (LLM narrative synthesis), LLM failure does NOT
    halt the workflow — it triggers the fallback to template-based descriptions. The validation
    report is produced without narrative enrichment.
  Scope: all LLM synthesis workflows.

Error Category 8 — API_ERROR (Shopify)
  Code: SHOPIFY_API_ERROR
  Description: The Shopify Admin API returns a non-success response.
  Examples: 404 (store not found), 429 (rate limit), 500 (Shopify internal error),
    401/403 (permission denied), API version mismatch.
  Retry policy:
    429 (rate limit): wait for Retry-After header duration, then retry. Up to 3 retries.
    500 (Shopify internal): 3 retries with exponential backoff (5s, 10s, 20s).
    404, 401, 403: NONE (configuration error, not transient).
  Halt behavior: HALT after retry exhaustion.
  Recovery:
    404: Verify shopify_store_selector from intake matches a real, accessible store.
    401/403: Verify Shopify credential has the correct permissions (read_products,
      read_collections, read_content at minimum).
    429: Increase inter-request delay in import-shopify-data.
    500: Usually transient. If persistent, check Shopify status page.
  Resumable: YES.
  Scope: import-shopify-data only (no other workflow calls Shopify APIs).

Error Category 9 — WRITE_ERROR
  Code: WRITE_ERROR
  Description: An artifact cannot be written to the expected path.
  Examples: Filesystem permission denied, disk full, path does not exist.
  Retry policy: 1 retry (in case of transient filesystem issue), then HALT.
  Halt behavior: HALT after retry exhaustion.
  Recovery: Verify STORE_OS_PROJECT_ROOT is writable. Check disk space. Check permissions.
  Resumable: YES — no artifact was written, so the checkpoint is accurate.
  Scope: any workflow that writes artifacts.

Error Category 10 — PROJECT_ID_MISMATCH
  Code: PROJECT_ID_MISMATCH
  Description: An artifact's project_id field does not match the runtime project_id.
  Examples: An artifact from a different project was accidentally written to this project folder.
  Retry policy: NONE.
  Halt behavior: IMMEDIATE_HALT.
  Recovery: Human must investigate the source of contamination. The contaminated artifact
    must be removed or corrected before the chain can resume.
  Resumable: YES — but only after human investigation and remediation.
  Scope: any workflow that reads or writes artifacts.

Error Category 11 — CHECKPOINT_INCONSISTENCY
  Code: CHECKPOINT_INCONSISTENCY
  Description: The checkpoint state is inconsistent with the observed artifact state.
  Examples: Checkpoint says a workflow completed but its artifact is missing.
    Or an artifact is present but the workflow that produced it is not in the checkpoint.
  Retry policy: NONE.
  Halt behavior: IMMEDIATE_HALT — do not proceed on ambiguous state.
  Recovery: Human must investigate whether the artifact was deleted, the checkpoint was
    corrupted, or a manual intervention occurred. Decide whether to restart or repair.
  Resumable: Only after human resolution of the inconsistency.
  Scope: orchestrate-runtime-execution (checkpoint discovery at resume time).

Error Category 12 — VALIDATION_REPORT_BLOCKED
  Code: VALIDATION_REPORT_BLOCKED
  Description: The validation-report.json contains CRITICAL check failures.
  Examples: Required artifacts missing, motion ceiling exceeded, schema violations.
  Retry policy: N/A (this is a report status, not a runtime error).
  Halt behavior: The chain continues to build-quality-score and build-deployment-manifest,
    but build-publish-decision will produce a BLOCKED publish decision.
    Note: VALIDATION_REPORT_BLOCKED does NOT halt the orchestration chain. The governance
    artifacts (quality-score, deployment-manifest, publish-decision) are still produced.
    The blocked status is captured in publish-decision.json for human review.
  Recovery: Human reviews the validation report, resolves critical failures, re-runs
    affected workflows, then re-runs run-validation.
  Resumable: YES — re-run from run-validation forward.
  Scope: run-validation → build-quality-score → build-publish-decision.

—

Retry Policy Summary

Error Code                | Retries | Backoff          | After Exhaustion
--------------------------|---------|------------------|------------------
CONFIG_MISSING            | 0       | N/A              | HALT
CREDENTIAL_NOT_FOUND      | 0       | N/A              | HALT
CREDENTIAL_AUTH_FAILURE   | 1       | immediate        | HALT
MISSING_ARTIFACT          | 0       | N/A              | HALT
PARSE_ERROR               | 0       | N/A              | HALT
SCHEMA_VIOLATION          | 0       | N/A              | HALT + quarantine
LLM_SYNTHESIS_FAILURE     | 3       | 1s, 2s, 4s       | HALT (or fallback*)
SHOPIFY_API_ERROR (429)   | 3       | Retry-After      | HALT
SHOPIFY_API_ERROR (500)   | 3       | 5s, 10s, 20s     | HALT
SHOPIFY_API_ERROR (4xx)   | 0       | N/A              | HALT
WRITE_ERROR               | 1       | immediate        | HALT
PROJECT_ID_MISMATCH       | 0       | N/A              | IMMEDIATE_HALT
CHECKPOINT_INCONSISTENCY  | 0       | N/A              | IMMEDIATE_HALT

* LLM_SYNTHESIS_FAILURE in run-validation Stage 9 falls back to template descriptions.
  In all other workflows, retry exhaustion results in HALT.

—

Halt Behavior

When a workflow halts:

Step 1 — Log the error
  Write an error record to .runtime/execution-log.json with:
    - error_code
    - workflow_id
    - timestamp
    - error_message
    - affected_artifact (if applicable)
    - retry_count (if retries were attempted)

Step 2 — Update checkpoint
  Write a HALTED status to .runtime/checkpoint.json for the failed workflow step.
  The checkpoint records the last COMPLETED (not halted) workflow.
  The halted workflow is recorded separately as the failed_at field.

Step 3 — Surface the error
  n8n marks the workflow execution as FAILED.
  The n8n execution error is visible in the n8n execution history.
  If a notification channel is configured (Slack, email, etc.), send an alert.
    Note: Notification channel configuration is out of scope for Phase 11.

Step 4 — Stop chain execution
  The orchestrator detects the HALTED status and stops triggering subsequent workflows.
  No downstream workflow runs after a HALT.

—

Review-Required Escalation

Some situations require human review before the chain can continue.
These are distinct from HALT — they are intentional gates, not errors.

Review-Required Condition 1 — manual_review_required from intake
  When the intake field manual_review_required is true:
  The orchestrator pauses before build-publish-decision and waits for explicit human approval.
  Implementation: n8n Wait node (wait for webhook callback or manual trigger).
  The orchestrator resumes only when a human explicitly approves continuation.

Review-Required Condition 2 — Validation report contains critical failures
  When validation-report.json overall_status is FAIL:
  The orchestrator proceeds to build-publish-decision (to produce the governance artifacts)
  but the publish-decision.json will contain BLOCKED recommendation.
  No automatic resumption occurs after this point.
  The human reviewer must act on publish-decision.json manually.

Review-Required Condition 3 — CHECKPOINT_INCONSISTENCY
  When the checkpoint state is inconsistent with observed artifact state:
  IMMEDIATE_HALT + human review required before any chain activity resumes.

Review-Required Condition 4 — Quarantine artifacts detected
  If any artifacts are present in .runtime/quarantine/:
  The orchestrator notes this in the execution log.
  It does not automatically halt, but build-deployment-manifest should note quarantine
  artifacts in the deployment manifest's exclusions list.

—

Partial Success Semantics

Partial success occurs when some workflows complete but others halt.

Defined partial success states:

Partial State A — INTAKE_COMPLETE_IMPORT_FAILED
  intake-store-input succeeded, import-shopify-data failed.
  Artifacts present: project folder only.
  Recovery: Fix Shopify credential or store selector, resume from import-shopify-data.

Partial State B — STRATEGY_COMPLETE_CONTENT_PARTIAL
  All Phase 1–3 artifacts produced. Some Phase 4–9 artifacts missing.
  Artifacts present: store-profile through design-system, homepage-strategy.
  Recovery: Identify which content workflow failed, fix the issue, resume from that step.

Partial State C — CONTENT_COMPLETE_GOVERNANCE_FAILED
  All Phase 1–9 artifacts produced. run-validation or downstream governance failed.
  Artifacts present: all planning artifacts.
  Recovery: Fix the governance workflow issue, resume from run-validation.

Partial State D — GOVERNANCE_COMPLETE
  All artifacts including governance chain produced.
  publish-decision.json exists.
  This is a terminal state — the chain is complete, human action is required.

General principle for partial success:
  Any artifact that was successfully written before the failure remains valid and usable.
  The chain resumes from the last checkpoint — it does not re-run successful steps.
  The human reviewer may choose to re-run any upstream step if they believe its output
  needs updating, but this must be an explicit decision, not automatic behavior.

—

Resumability

The chain is resumable from any checkpoint.

Resume procedure:

Step 1 — Load checkpoint
  Read .runtime/checkpoint.json to determine last completed workflow.

Step 2 — Verify artifact state
  For each completed workflow in the checkpoint, verify its output artifact exists.
  If any output artifact is missing: CHECKPOINT_INCONSISTENCY — halt and require review.

Step 3 — Identify resume point
  The resume point is the workflow immediately after the last completed workflow.

Step 4 — Re-run from resume point
  The orchestrator triggers the chain from the resume point forward.
  All artifacts produced before the resume point are treated as inputs — they are NOT re-generated.

Step 5 — If the failed workflow is the same as the resume point
  This means the previous run halted at this step.
  Verify the error condition has been resolved before re-running.
  The orchestrator does not verify this automatically — it is the human's responsibility
  to confirm the error condition is resolved before resuming.

Non-resumable scenarios:
  - IMMEDIATE_HALT due to PROJECT_ID_MISMATCH: do not resume without human investigation.
  - IMMEDIATE_HALT due to CHECKPOINT_INCONSISTENCY: do not resume without human investigation.

—

Execution Log Format

The execution log at .runtime/execution-log.json is an append-only structured log.
Each entry is appended as a new item in the "entries" array.

Entry format:
  {
    "timestamp": "ISO 8601 datetime",
    "level": "INFO | WARNING | ERROR | CRITICAL",
    "event_type": "WORKFLOW_START | WORKFLOW_SUCCESS | WORKFLOW_HALT | ARTIFACT_WRITE |
                   ARTIFACT_QUARANTINE | CHECKPOINT_UPDATED | RETRY_ATTEMPT | ERROR",
    "workflow_id": "the workflow that generated this entry",
    "artifact": "affected artifact name, if applicable",
    "error_code": "error code if this is an error entry",
    "message": "human-readable description of the event",
    "details": {}  // optional structured details
  }

The execution log is NOT a planning artifact. It is operational metadata.
It is included in backup archives.
It must not contain credential values, API keys, or secrets.

—

Open Questions

1. What is the notification mechanism for HALT events in production? Should the orchestrator
   send a Slack or email notification, or is polling the n8n UI sufficient?

2. Should there be a maximum retry budget per execution run (e.g., no more than 10 total
   retries across all workflows in one run)? This prevents runaway retry loops.

3. Should the orchestrator emit a structured error summary artifact (.runtime/error-summary.json)
   that aggregates all errors from a run? This would be useful for human reviewers.

4. How long should the Wait node (manual review gate) wait before timing out? 24 hours?
   7 days? Should it ever time out, or wait indefinitely?

—

Assumptions

- n8n execution logs capture workflow-level errors independently of this error taxonomy.
  This taxonomy defines application-level error handling, not n8n platform error handling.
- The n8n orchestrator workflow (orchestrate-runtime-execution) is responsible for detecting
  HALT conditions in subworkflows and stopping the chain.
- n8n exposes a mechanism to pass error status from a subworkflow to the calling orchestrator
  (e.g., via error output or a status field in the subworkflow response).
- All retries happen within the workflow execution context. Retries are implemented using
  n8n's built-in retry functionality (retry on fail) or via explicit retry loops in Code nodes.
- The human reviewer is responsible for verifying that error conditions are resolved before
  resuming the chain. The system does not re-verify automatically.
