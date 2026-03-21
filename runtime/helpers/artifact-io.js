/**
 * artifact-io.js
 * JSON artifact read, write, and quarantine helpers for store-os.
 *
 * Implements the contracts defined in workflows/runtime/artifact-io-spec.md:
 *   - Read contract: existence check → parse check → return parsed object
 *   - Write contract: schema validation (caller's responsibility) →
 *     atomic write (tmp-then-rename) → return final path
 *   - Quarantine: write rejected artifact with metadata to .runtime/quarantine/
 *   - Directory bootstrap: create project + .runtime + quarantine directories
 *
 * Usage in n8n Code nodes: inline the functions you need — n8n sandboxes
 * do not support local file imports by default.
 *
 * IMPORTANT: No credential values, API keys, or secrets are handled here.
 * This module deals only with artifact JSON files on the local filesystem.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read and parse a JSON artifact from the project folder.
 *
 * @param {string} projectRoot - STORE_OS_PROJECT_ROOT value
 * @param {string} projectId   - The project identifier
 * @param {string} artifactName - Artifact name without .json extension (e.g. 'store-profile')
 * @returns {object} Parsed artifact object
 * @throws {object} Structured error with code, message, artifact fields
 */
function readArtifact(projectRoot, projectId, artifactName) {
  const artifactPath = path.join(projectRoot, projectId, `${artifactName}.json`);

  if (!fs.existsSync(artifactPath)) {
    throw {
      code: 'MISSING_ARTIFACT',
      message: `Required artifact not found: ${artifactPath}`,
      artifact: artifactName,
      path: artifactPath,
    };
  }

  let raw;
  try {
    raw = fs.readFileSync(artifactPath, 'utf8');
  } catch (err) {
    throw {
      code: 'READ_ERROR',
      message: `Failed to read artifact ${artifactPath}: ${err.message}`,
      artifact: artifactName,
      path: artifactPath,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw {
      code: 'PARSE_ERROR',
      message: `Failed to parse artifact ${artifactPath}: ${err.message}`,
      artifact: artifactName,
      path: artifactPath,
    };
  }

  return parsed;
}

/**
 * Write a JSON artifact atomically (tmp-then-rename) to the project folder.
 * Ensures the project directory exists before writing.
 *
 * Callers are responsible for schema validation BEFORE calling writeArtifact.
 * If schema validation fails, call quarantineArtifact instead.
 *
 * @param {string} projectRoot  - STORE_OS_PROJECT_ROOT value
 * @param {string} projectId    - The project identifier
 * @param {string} artifactName - Artifact name without .json extension
 * @param {object} data         - The artifact object to write
 * @returns {string} The final artifact path
 * @throws {object} Structured error with code and message
 */
function writeArtifact(projectRoot, projectId, artifactName, data) {
  const projectDir = path.join(projectRoot, projectId);
  fs.mkdirSync(projectDir, { recursive: true });

  const finalPath = path.join(projectDir, `${artifactName}.json`);
  const tmpPath = path.join(projectDir, `${artifactName}.tmp.json`);
  const content = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
  } catch (err) {
    throw {
      code: 'WRITE_ERROR',
      message: `Failed to write tmp file ${tmpPath}: ${err.message}`,
      artifact: artifactName,
    };
  }

  try {
    fs.renameSync(tmpPath, finalPath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
    throw {
      code: 'WRITE_ERROR',
      message: `Failed to rename ${tmpPath} → ${finalPath}: ${err.message}`,
      artifact: artifactName,
    };
  }

  return finalPath;
}

/**
 * Write a rejected artifact to the quarantine directory with validation metadata.
 * Called when schema validation fails at write time.
 *
 * @param {string} projectRoot      - STORE_OS_PROJECT_ROOT value
 * @param {string} projectId        - The project identifier
 * @param {string} artifactName     - Artifact name without .json extension
 * @param {object} data             - The rejected artifact payload
 * @param {Array}  validationErrors - AJV error array
 * @param {string} workflowId       - The calling workflow's ID
 * @returns {string} The quarantine file path
 */
function quarantineArtifact(projectRoot, projectId, artifactName, data, validationErrors, workflowId) {
  const quarantineDir = path.join(projectRoot, projectId, '.runtime', 'quarantine');
  fs.mkdirSync(quarantineDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const quarantinePath = path.join(quarantineDir, `${artifactName}.${timestamp}.rejected.json`);

  const payload = {
    quarantine_reason: 'SCHEMA_VIOLATION',
    artifact_name: artifactName,
    workflow_id: workflowId,
    validation_errors: validationErrors,
    timestamp: new Date().toISOString(),
    project_id: projectId,
    artifact_payload: data,
  };

  fs.writeFileSync(quarantinePath, JSON.stringify(payload, null, 2), 'utf8');
  return quarantinePath;
}

/**
 * Ensure all required subdirectories for a project exist.
 * Safe to call multiple times (idempotent).
 *
 * @param {string} projectRoot - STORE_OS_PROJECT_ROOT value
 * @param {string} projectId   - The project identifier
 * @returns {object} Paths for projectDir, runtimeDir, quarantineDir
 */
function ensureProjectDirectories(projectRoot, projectId) {
  const projectDir = path.join(projectRoot, projectId);
  const runtimeDir = path.join(projectDir, '.runtime');
  const quarantineDir = path.join(runtimeDir, 'quarantine');

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(quarantineDir, { recursive: true });

  return { projectDir, runtimeDir, quarantineDir };
}

module.exports = {
  readArtifact,
  writeArtifact,
  quarantineArtifact,
  ensureProjectDirectories,
};
