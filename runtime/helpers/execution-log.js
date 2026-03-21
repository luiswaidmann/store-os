/**
 * execution-log.js
 * Execution log append helper for store-os.
 *
 * The execution log lives at:
 *   {STORE_OS_PROJECT_ROOT}/{project_id}/.runtime/execution-log.json
 *
 * It records all significant runtime events for audit and debugging.
 * The log is append-only — events are never removed or reordered.
 * All writes are atomic (tmp-then-rename).
 *
 * IMPORTANT: The execution log must NEVER contain:
 *   - Credential values, API keys, tokens, or secrets
 *   - Full artifact content (record artifact names and paths only)
 *   - PII or sensitive business data
 *
 * Usage in n8n Code nodes: inline appendLogEntry() — n8n sandboxes do
 * not support local file imports by default.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Build the path to the execution log file.
 */
function getLogPath(projectRoot, projectId) {
  return path.join(projectRoot, projectId, '.runtime', 'execution-log.json');
}

/**
 * Read the current execution log (or return an empty log if not yet created).
 */
function readLog(projectRoot, projectId) {
  const logPath = getLogPath(projectRoot, projectId);

  if (!fs.existsSync(logPath)) {
    return { entries: [] };
  }

  try {
    const raw = fs.readFileSync(logPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    // If the log is corrupt, return empty rather than halting the chain.
    // The log is for observability — a corrupt log should not block execution.
    return { entries: [] };
  }
}

/**
 * Append a single event to the execution log. Atomic write.
 *
 * @param {string} projectRoot
 * @param {string} projectId
 * @param {object} entry - Log event fields (see below for required/optional fields)
 *
 * Entry fields:
 *   execution_run_id {string} required  - Run ID from checkpoint
 *   level            {string} required  - INFO | WARNING | ERROR | CRITICAL
 *   event_type       {string} required  - One of the event types in checkpoint spec
 *   workflow_id      {string} required  - Workflow this event relates to
 *   message          {string} required  - Human-readable description
 *   artifact         {string} optional  - Artifact filename if relevant
 *   error_code       {string} optional  - Error code if this is an error event
 *   details          {object} optional  - Additional structured data (no secrets)
 */
function appendLogEntry(projectRoot, projectId, entry) {
  const runtimeDir = path.join(projectRoot, projectId, '.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const logPath = getLogPath(projectRoot, projectId);
  const log = readLog(projectRoot, projectId);

  log.entries.push({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  const tmpPath = logPath + '.tmp';
  const content = JSON.stringify(log, null, 2);

  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, logPath);
  } catch {
    // Log write failure is non-fatal — do not halt the chain for it.
    // The checkpoint remains the authoritative state record.
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

module.exports = { appendLogEntry };
