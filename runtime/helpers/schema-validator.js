/**
 * schema-validator.js
 * AJV-based JSON schema validation for store-os artifacts.
 *
 * Wraps AJV to provide a consistent validation interface across all
 * build-* workflows. Schema files are loaded from the filesystem at
 * STORE_OS_AJV_SCHEMA_PATH (set in n8n process environment).
 *
 * Usage in n8n Code nodes: inline the validateAgainstSchema() function —
 * n8n sandboxes do not support local file imports by default.
 *
 * n8n AJV availability note:
 *   AJV is a dependency of n8n itself and is typically available via
 *   require('ajv') in Code nodes. If require('ajv') fails, install AJV
 *   in the n8n environment: npm install ajv@8 ajv-formats
 *
 * Schema draft note:
 *   - schemas/store-profile.schema.json uses JSON Schema 2020-12
 *   - schemas/runtime-checkpoint.schema.json uses JSON Schema draft-07
 *   This module uses strict: false to handle both drafts without errors.
 *   For full 2020-12 support, use require('ajv/dist/2020') if available.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load a schema file and validate data against it using AJV.
 *
 * @param {string} schemaPath - Absolute path to the .schema.json file
 * @param {object} data       - The object to validate
 * @returns {{ valid: boolean, errors: Array }} Validation result
 * @throws {object} Structured error if AJV or schema cannot be loaded
 */
function validateAgainstSchema(schemaPath, data) {
  if (!fs.existsSync(schemaPath)) {
    throw {
      code: 'SCHEMA_LOAD_ERROR',
      message: `Schema file not found: ${schemaPath}`,
    };
  }

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (err) {
    throw {
      code: 'SCHEMA_LOAD_ERROR',
      message: `Failed to parse schema file ${schemaPath}: ${err.message}`,
    };
  }

  let AjvClass;
  try {
    // Prefer AJV v8 2020-12 mode if available
    AjvClass = require('ajv/dist/2020');
  } catch {
    try {
      AjvClass = require('ajv');
    } catch (err) {
      throw {
        code: 'SCHEMA_LOAD_ERROR',
        message: `AJV not available in n8n environment: ${err.message}. ` +
          'Install ajv@8 in the n8n node_modules directory.',
      };
    }
  }

  const ajv = new AjvClass({ allErrors: true, strict: false });

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (err) {
    throw {
      code: 'SCHEMA_LOAD_ERROR',
      message: `Failed to compile schema ${schemaPath}: ${err.message}`,
    };
  }

  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : (validate.errors || []),
  };
}

/**
 * Convenience function: validate and return errors as a formatted string.
 * Useful for throwing a readable error from a Code node.
 *
 * @param {string} schemaPath - Absolute path to the .schema.json file
 * @param {object} data       - The object to validate
 * @returns {string|null} Formatted error string, or null if valid
 */
function getValidationErrorString(schemaPath, data) {
  const result = validateAgainstSchema(schemaPath, data);
  if (result.valid) return null;

  return result.errors
    .map((e) => `${e.instancePath || '(root)'} ${e.message}`)
    .join('; ');
}

module.exports = { validateAgainstSchema, getValidationErrorString };
