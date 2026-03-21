/**
 * checkpoint.js
 * Runtime checkpoint read/write for store-os.
 *
 * Implements the contracts defined in:
 *   workflows/runtime/runtime-state-checkpoint-spec.md
 *
 * The checkpoint file lives at:
 *   {STORE_OS_PROJECT_ROOT}/{project_id}/.runtime/checkpoint.json
 *
 * All writes are atomic (tmp-then-rename). The checkpoint conforms to
 * schemas/runtime-checkpoint.schema.json.
 *
 * Usage in n8n Code nodes: inline the functions you need — n8n sandboxes
 * do not support local file imports by default.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Build the path to the checkpoint file.
 */
function getCheckpointPath(projectRoot, projectId) {
  return path.join(projectRoot, projectId, '.runtime', 'checkpoint.json');
}

/**
 * Read and parse the checkpoint file.
 * Returns null if the file does not exist (fresh run).
 *
 * @param {string} projectRoot
 * @param {string} projectId
 * @returns {object|null} Parsed checkpoint or null
 * @throws {object} Structured error if file exists but cannot be read/parsed
 */
function readCheckpoint(projectRoot, projectId) {
  const checkpointPath = getCheckpointPath(projectRoot, projectId);

  if (!fs.existsSync(checkpointPath)) {
    return null;
  }

  let raw;
  try {
    raw = fs.readFileSync(checkpointPath, 'utf8');
  } catch (err) {
    throw {
      code: 'CHECKPOINT_INCONSISTENCY',
      message: `Failed to read checkpoint at ${checkpointPath}: ${err.message}`,
    };
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw {
      code: 'CHECKPOINT_INCONSISTENCY',
      message: `Failed to parse checkpoint at ${checkpointPath}: ${err.message}`,
    };
  }
}

/**
 * Write a checkpoint atomically (tmp-then-rename).
 *
 * @param {string} projectRoot
 * @param {string} projectId
 * @param {object} checkpoint  - The checkpoint object to write
 * @returns {string} The checkpoint file path
 * @throws {object} Structured error on write failure
 */
function writeCheckpoint(projectRoot, projectId, checkpoint) {
  const runtimeDir = path.join(projectRoot, projectId, '.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const checkpointPath = getCheckpointPath(projectRoot, projectId);
  const tmpPath = checkpointPath + '.tmp';
  const content = JSON.stringify(checkpoint, null, 2);

  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, checkpointPath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
    throw {
      code: 'WRITE_ERROR',
      message: `Failed to write checkpoint at ${checkpointPath}: ${err.message}`,
    };
  }

  return checkpointPath;
}

/**
 * Create and persist the initial checkpoint at chain start.
 * Called by intake-store-input after project directories are created.
 *
 * @param {string} projectRoot
 * @param {string} projectId
 * @param {object} runtimeConfig - The resolved runtime config object
 * @returns {object} The initial checkpoint
 */
function createInitialCheckpoint(projectRoot, projectId, runtimeConfig) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const runId = [
    'run',
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join('-');

  const checkpoint = {
    schema_version: '1.0',
    project_id: projectId,
    execution_run_id: runId,
    chain_start_timestamp: now.toISOString(),
    last_updated_timestamp: now.toISOString(),
    chain_status: 'IN_PROGRESS',
    completed_workflows: [
      {
        workflow_id: 'intake-store-input',
        completed_at: now.toISOString(),
        output_artifact: null,
        status: 'SUCCESS',
      },
    ],
    failed_at: null,
    next_workflow: 'import-shopify-data',
    review_gate_status: 'NOT_REACHED',
    review_gate_approved_at: null,
    env: runtimeConfig.env,
    llm_model_used: runtimeConfig.llm_model || null,
    shopify_api_version_used: runtimeConfig.shopify_api_version || null,
    notes: [],
  };

  writeCheckpoint(projectRoot, projectId, checkpoint);
  return checkpoint;
}

/**
 * Record a successful workflow completion and advance the chain.
 *
 * @param {string}      projectRoot
 * @param {string}      projectId
 * @param {string}      workflowId      - The workflow that just completed
 * @param {string|null} outputArtifact  - The artifact filename produced (or null)
 * @param {string|null} nextWorkflow    - The next workflow to run (null = chain complete)
 * @returns {object} The updated checkpoint
 */
function updateCheckpoint(projectRoot, projectId, workflowId, outputArtifact, nextWorkflow) {
  const checkpoint = readCheckpoint(projectRoot, projectId);
  if (!checkpoint) {
    throw {
      code: 'CHECKPOINT_INCONSISTENCY',
      message: `Cannot update checkpoint — no checkpoint found for project: ${projectId}`,
    };
  }

  const now = new Date().toISOString();

  checkpoint.completed_workflows.push({
    workflow_id: workflowId,
    completed_at: now,
    output_artifact: outputArtifact || null,
    status: 'SUCCESS',
  });

  checkpoint.last_updated_timestamp = now;
  checkpoint.next_workflow = nextWorkflow || null;

  if (!nextWorkflow) {
    checkpoint.chain_status = 'COMPLETE';
  }

  writeCheckpoint(projectRoot, projectId, checkpoint);
  return checkpoint;
}

/**
 * Record a workflow failure and set chain status to HALTED.
 *
 * @param {string} projectRoot
 * @param {string} projectId
 * @param {string} workflowId    - The workflow that failed
 * @param {string} errorCode     - Error code from error taxonomy
 * @param {string} errorMessage  - Human-readable error description
 * @returns {object|null} The updated checkpoint, or null if none exists
 */
function haltCheckpoint(projectRoot, projectId, workflowId, errorCode, errorMessage) {
  const checkpoint = readCheckpoint(projectRoot, projectId);
  if (!checkpoint) return null;

  const now = new Date().toISOString();

  checkpoint.chain_status = 'HALTED';
  checkpoint.last_updated_timestamp = now;
  checkpoint.failed_at = {
    workflow_id: workflowId,
    failed_at: now,
    error_code: errorCode,
    error_message: errorMessage,
    output_artifact: null,
  };
  // next_workflow stays as the failed workflow so resume re-runs it
  checkpoint.next_workflow = workflowId;

  writeCheckpoint(projectRoot, projectId, checkpoint);
  return checkpoint;
}

module.exports = {
  readCheckpoint,
  writeCheckpoint,
  createInitialCheckpoint,
  updateCheckpoint,
  haltCheckpoint,
};
