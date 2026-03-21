Runtime State and Checkpoint Specification

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — DRAFT RUNTIME ARCHITECTURE NOTE:
This document is a planned checkpoint specification. No checkpoint system has been deployed.
All specifications defined here are implementation-grade planning.

—

Purpose

This document defines the checkpoint and runtime state architecture for store-os.
It covers:
  - What a checkpoint is and why it matters
  - The checkpoint file format and schema
  - When checkpoints are written
  - How checkpoints are read at resume time
  - The execution log format
  - What runtime state is and is not

—

What Is a Checkpoint

A checkpoint is a persistent record of which workflows have successfully completed in a
run of the store-os execution chain.

Checkpoints serve one purpose: enabling resumability.

When an execution run is interrupted (by an error, a halt, or a system restart), the
checkpoint tells the orchestrator where to pick up without re-running already-completed
workflows. This is critical because:
  - Re-running early workflows (e.g., build-market-intelligence) would overwrite already-accepted
    planning artifacts.
  - Shopify import has real API costs and rate limits.
  - LLM synthesis has real API costs.
  - Some workflows require human review artifacts to be stable (not regenerated).

—

Checkpoint File Location

Path: {STORE_OS_PROJECT_ROOT}/{project_id}/.runtime/checkpoint.json
Example: /data/store-os-projects/example-store-2025/.runtime/checkpoint.json

The .runtime/ directory is created by intake-store-input as part of project folder setup.
The checkpoint file is created by orchestrate-runtime-execution after the first workflow completes.

—

Checkpoint File Format

The checkpoint file conforms to schemas/runtime-checkpoint.schema.json.

Example checkpoint (mid-run, paused after build-design-system):
{
  "schema_version": "1.0",
  "project_id": "example-store-2025",
  "execution_run_id": "run-20250320-143022",
  "chain_start_timestamp": "2025-03-20T14:30:22Z",
  "last_updated_timestamp": "2025-03-20T14:55:41Z",
  "chain_status": "IN_PROGRESS",
  "completed_workflows": [
    {
      "workflow_id": "resolve-runtime-config",
      "completed_at": "2025-03-20T14:30:25Z",
      "output_artifact": null,
      "status": "SUCCESS"
    },
    {
      "workflow_id": "intake-store-input",
      "completed_at": "2025-03-20T14:31:10Z",
      "output_artifact": null,
      "status": "SUCCESS"
    },
    {
      "workflow_id": "import-shopify-data",
      "completed_at": "2025-03-20T14:33:55Z",
      "output_artifact": "shopify-import.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-store-profile",
      "completed_at": "2025-03-20T14:35:12Z",
      "output_artifact": "store-profile.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-market-intelligence",
      "completed_at": "2025-03-20T14:37:08Z",
      "output_artifact": "market-intelligence.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-brand-positioning",
      "completed_at": "2025-03-20T14:39:22Z",
      "output_artifact": "brand-positioning.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-competitor-clusters",
      "completed_at": "2025-03-20T14:41:45Z",
      "output_artifact": "competitor-cluster.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-pattern-manifest",
      "completed_at": "2025-03-20T14:44:03Z",
      "output_artifact": "pattern-manifest.json",
      "status": "SUCCESS"
    },
    {
      "workflow_id": "build-design-system",
      "completed_at": "2025-03-20T14:55:41Z",
      "output_artifact": "design-system.json",
      "status": "SUCCESS"
    }
  ],
  "failed_at": null,
  "next_workflow": "build-homepage-strategy",
  "review_gate_status": "NOT_REACHED",
  "review_gate_approved_at": null,
  "env": "staging",
  "llm_model_used": "gpt-4o",
  "notes": []
}

—

Example checkpoint (halted mid-run):
{
  "schema_version": "1.0",
  "project_id": "example-store-2025",
  "execution_run_id": "run-20250320-143022",
  "chain_start_timestamp": "2025-03-20T14:30:22Z",
  "last_updated_timestamp": "2025-03-20T15:12:03Z",
  "chain_status": "HALTED",
  "completed_workflows": [
    ... (same as above through build-design-system) ...
  ],
  "failed_at": {
    "workflow_id": "build-homepage-strategy",
    "failed_at": "2025-03-20T15:12:03Z",
    "error_code": "LLM_SYNTHESIS_FAILURE",
    "error_message": "OpenAI API returned 429 rate limit after 3 retries",
    "output_artifact": null
  },
  "next_workflow": "build-homepage-strategy",
  "review_gate_status": "NOT_REACHED",
  "review_gate_approved_at": null,
  "env": "staging",
  "llm_model_used": "gpt-4o",
  "notes": []
}

—

Example checkpoint (complete, waiting for human review gate):
{
  ...
  "chain_status": "AWAITING_REVIEW",
  "completed_workflows": [...all Phase 1-9 workflows...],
  "failed_at": null,
  "next_workflow": "run-validation",
  "review_gate_status": "WAITING",
  "review_gate_approved_at": null,
  ...
}

—

Example checkpoint (fully complete):
{
  ...
  "chain_status": "COMPLETE",
  "completed_workflows": [...all 34 workflows...],
  "failed_at": null,
  "next_workflow": null,
  "review_gate_status": "APPROVED",
  "review_gate_approved_at": "2025-03-20T16:30:00Z",
  ...
}

—

Checkpoint Field Definitions

schema_version (string, required)
  The version of the checkpoint schema.
  Always "1.0" for Phase 11 initial implementation.

project_id (string, required)
  The project identifier. Must match the project folder name.

execution_run_id (string, required)
  A unique identifier for this execution run.
  Format: "run-{YYYYMMDD}-{HHMMSS}" (timestamp-based, constructed at chain start).
  Used to correlate checkpoint entries with execution log entries.

chain_start_timestamp (ISO 8601 datetime string, required)
  When the chain started (when resolve-runtime-config began).

last_updated_timestamp (ISO 8601 datetime string, required)
  When the checkpoint was last written. Updated after each workflow completes.

chain_status (string, required)
  Current overall status of the chain.
  Allowed values:
    IN_PROGRESS: chain is running or was running (no terminal state yet)
    AWAITING_REVIEW: chain is paused at the manual review gate
    HALTED: chain stopped due to an error
    COMPLETE: all workflows have completed successfully

completed_workflows (array of objects, required)
  Ordered list of workflows that have completed successfully.
  Each object:
    workflow_id: the workflow identifier
    completed_at: ISO 8601 datetime
    output_artifact: the primary artifact file name produced (null if none)
    status: always "SUCCESS" (only successful completions are recorded here)

failed_at (object or null)
  If chain_status is HALTED, this contains the failure details.
  If not HALTED, this is null.
  Object fields:
    workflow_id: which workflow failed
    failed_at: ISO 8601 datetime of failure
    error_code: the error category code (from error-taxonomy.md)
    error_message: human-readable error description
    output_artifact: null (artifact was not written on failure)

next_workflow (string or null)
  The workflow_id of the next workflow to execute.
  If chain_status is COMPLETE: null.
  If chain_status is HALTED: the workflow that should be re-run on resume.
  If chain_status is IN_PROGRESS: the next sequential workflow.
  If chain_status is AWAITING_REVIEW: the workflow to run after review approval.

review_gate_status (string, required)
  Status of the manual review gate.
  Allowed values:
    NOT_REACHED: the chain has not reached the review gate yet
    WAITING: the chain is paused at the review gate
    APPROVED: the review gate was approved, chain continued
    REJECTED: the review gate was rejected, chain did not proceed
    NOT_APPLICABLE: manual_review_required was false (gate was skipped)

review_gate_approved_at (ISO 8601 datetime string or null)
  When the review gate was approved. Null if not yet approved.

env (string, required)
  The STORE_OS_ENV value at the time of chain start.

llm_model_used (string, required)
  The STORE_OS_LLM_MODEL value at the time of chain start.
  This records which model was used, for audit and reproducibility purposes.

notes (array of strings)
  Human-readable notes added during the run. May be empty.
  Used to record non-error observations (e.g., "10 products found, 3 collections").

—

Checkpoint Write Rules

Rule 1 — Write after SUCCESS only
  Checkpoints are only updated after a workflow completes SUCCESSFULLY.
  If a workflow fails (HALT), the checkpoint records the failure in failed_at
  but does NOT add the failed workflow to completed_workflows.

Rule 2 — Atomic checkpoint write
  Checkpoints must be written atomically (tmp file → rename) to prevent corruption.
  A partially-written checkpoint is worse than a missing one.

Rule 3 — Full rewrite (not append)
  The checkpoint file is rewritten in full on each update.
  It is not appended. This ensures the file always reflects the current state.

Rule 4 — Checkpoint precedes chain continuation
  After writing the checkpoint, the orchestrator confirms the write succeeded
  before triggering the next workflow. Write failure = HALT (WRITE_ERROR).

Rule 5 — Initial checkpoint
  The initial checkpoint is written by intake-store-input after the project folder
  is created. It records intake-store-input as the first completed workflow.

—

Execution Log

The execution log at .runtime/execution-log.json is a companion file to the checkpoint.
The checkpoint records WHAT was completed. The execution log records EVENTS during execution.

Key difference:
  Checkpoint: current state (what's done, what failed, what's next)
  Execution log: history (everything that happened, in order)

Execution log format: JSON array of event objects (append-only).
New events are appended to the "entries" array.

Event object fields:
  timestamp (ISO 8601 datetime string, required): when this event occurred
  execution_run_id (string, required): the run this event belongs to
  level (string, required): INFO | WARNING | ERROR | CRITICAL
  event_type (string, required): one of:
    CHAIN_START, CHAIN_COMPLETE, CHAIN_HALT, CHAIN_RESUME
    WORKFLOW_START, WORKFLOW_SUCCESS, WORKFLOW_HALT
    ARTIFACT_WRITE, ARTIFACT_QUARANTINE
    CHECKPOINT_UPDATED
    RETRY_ATTEMPT
    REVIEW_GATE_REACHED, REVIEW_GATE_APPROVED, REVIEW_GATE_REJECTED
    LLM_CALL_START, LLM_CALL_SUCCESS, LLM_CALL_FAILURE
    API_CALL_START, API_CALL_SUCCESS, API_CALL_FAILURE
    ERROR
  workflow_id (string, required): the workflow this event relates to
  artifact (string, optional): the artifact file name, if relevant
  error_code (string, optional): the error code, if this is an error event
  message (string, required): human-readable description
  details (object, optional): additional structured information

IMPORTANT: The execution log must NEVER contain:
  - Credential values, API keys, or secrets
  - Full artifact content (only artifact names and paths)
  - PII or sensitive business data

—

Checkpoint and Execution Log Cleanup

The checkpoint and execution log are persistent across runs unless explicitly cleared.

When to clear:
  - At the start of a fresh run for the same project_id (human explicitly starts over)
  - NEVER clear automatically (auto-clearing removes the audit trail)

Archival:
  - The backup-project workflow archives the .runtime/ directory including checkpoint and log.
  - Each backup archive contains the complete runtime history for that run.

—

Resume Procedure

When resuming from a halted run:

Step 1 — Load checkpoint
  Read .runtime/checkpoint.json.
  If missing: CHECKPOINT_INCONSISTENCY halt (cannot determine where to resume).
  If corrupt (parse error): CHECKPOINT_INCONSISTENCY halt.

Step 2 — Verify chain_status is HALTED (or IN_PROGRESS if a crash left no HALTED record)
  If COMPLETE: no resume needed, chain is done.
  If AWAITING_REVIEW: resume at review gate.
  If IN_PROGRESS: chain may have been interrupted mid-execution (crash recovery).
    Treat last completed_workflows entry as the last successful step.

Step 3 — Verify artifact existence for each completed_workflow
  For each completed workflow that has an output_artifact:
    Check that the artifact file exists at the expected path.
    If missing: CHECKPOINT_INCONSISTENCY halt.

Step 4 — Log resume event
  Append CHAIN_RESUME event to execution log.
  Record which workflow is being resumed from (next_workflow from checkpoint).

Step 5 — Set next_workflow in orchestrator
  Instruct the orchestrator to start from the next_workflow.
  All completed_workflows are skipped.

Step 6 — Execute from next_workflow
  Continue the chain as normal from this point.
  After each successful step: update checkpoint with the new completed workflow.

—

Open Questions

1. Should the execution_run_id carry through multiple resume attempts? Or should each
   resume get a new execution_run_id? The current spec uses the same run_id for all
   resumes of the same run (for audit continuity), but a new run_id would distinguish
   the resume attempt.

2. Should there be a maximum number of HALTED-and-resume cycles before the system
   requires a full restart? Infinite resumes could mask systematic issues.

3. Should the checkpoint include a hash of each artifact file for integrity verification?
   This would allow detection of out-of-band artifact modifications between runs.

4. How does the review gate approval work technically? What is the n8n mechanism
   for resuming a Wait node? (Webhook callback is the most common approach.)

—

Assumptions

- The .runtime/ directory is created at project folder setup time (intake-store-input).
- The checkpoint file is writable by the n8n execution context.
- Atomic file writes (tmp-then-rename) are supported by the filesystem.
- The execution log grows over time. For long-lived projects with many re-runs,
  the log may become large. Log rotation or archival is a future concern.
- The checkpoint schema (schemas/runtime-checkpoint.schema.json) defines the structure
  used by Code nodes to write and read checkpoints.
