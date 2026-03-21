/**
 * resolve-config.js
 * Runtime configuration resolution for store-os.
 *
 * Reads required environment variables, validates them, and returns a
 * structured runtime config object. Used by resolve-runtime-config and
 * orchestrate-phase1.
 *
 * Usage in n8n Code nodes: inline this file's resolveRuntimeConfig()
 * function body — n8n sandboxes do not support local file imports.
 *
 * IMPORTANT: This file must never contain credential values, API keys,
 * tokens, or secrets of any kind. All values come from environment
 * variables set in the n8n process environment.
 *
 * NOTE on credential store validation: This function confirms that
 * credential NAMES are configured in env vars. It does NOT verify that
 * those names exist in n8n's credential store — that requires n8n-internal
 * access not available from a Code node. See credential-resolution-spec.md
 * open question #1 for the full discussion.
 */

'use strict';

const fs = require('fs');

const REQUIRED_ENV_VARS = [
  'STORE_OS_OPENAI_CREDENTIAL_NAME',
  'STORE_OS_SHOPIFY_CREDENTIAL_NAME',
  'STORE_OS_SHOPIFY_SHOP_URL',
  'STORE_OS_LLM_MODEL',
  'STORE_OS_ENV',
  'STORE_OS_PROJECT_ROOT',
  'STORE_OS_SHOPIFY_API_VERSION',
  'STORE_OS_AJV_SCHEMA_PATH',
];

const OPTIONAL_ENV_VARS = [
  'STORE_OS_BACKUP_ROOT',
];

const ALLOWED_ENVS = ['dev', 'staging', 'production'];

/**
 * Resolves and validates the runtime configuration from environment variables.
 * @returns {object} The validated runtime config object.
 * @throws {object} Structured error with code, message, and missing_vars.
 */
function resolveRuntimeConfig() {
  const missing = REQUIRED_ENV_VARS.filter(
    (v) => !process.env[v] || !process.env[v].trim()
  );

  if (missing.length > 0) {
    throw {
      code: 'CONFIG_MISSING',
      message:
        `Required environment variables not set: ${missing.join(', ')}. ` +
        'Check the n8n process environment or n8n settings > Variables.',
      missing_vars: missing,
    };
  }

  const env = process.env.STORE_OS_ENV.trim();
  if (!ALLOWED_ENVS.includes(env)) {
    throw {
      code: 'CONFIG_MISSING',
      message: `STORE_OS_ENV must be one of: ${ALLOWED_ENVS.join(', ')}. Got: "${env}"`,
      missing_vars: ['STORE_OS_ENV'],
    };
  }

  const projectRoot = process.env.STORE_OS_PROJECT_ROOT.trim();
  if (!fs.existsSync(projectRoot)) {
    throw {
      code: 'CONFIG_MISSING',
      message: `STORE_OS_PROJECT_ROOT path does not exist: ${projectRoot}`,
      missing_vars: ['STORE_OS_PROJECT_ROOT'],
    };
  }

  const ajvSchemaPath = process.env.STORE_OS_AJV_SCHEMA_PATH.trim();
  if (!fs.existsSync(ajvSchemaPath)) {
    throw {
      code: 'CONFIG_MISSING',
      message: `STORE_OS_AJV_SCHEMA_PATH path does not exist: ${ajvSchemaPath}`,
      missing_vars: ['STORE_OS_AJV_SCHEMA_PATH'],
    };
  }

  const config = {
    env,
    project_root: projectRoot,
    openai_credential_name: process.env.STORE_OS_OPENAI_CREDENTIAL_NAME.trim(),
    shopify_credential_name: process.env.STORE_OS_SHOPIFY_CREDENTIAL_NAME.trim(),
    shopify_shop_url: process.env.STORE_OS_SHOPIFY_SHOP_URL.trim(),
    llm_model: process.env.STORE_OS_LLM_MODEL.trim(),
    shopify_api_version: process.env.STORE_OS_SHOPIFY_API_VERSION.trim(),
    ajv_schema_path: ajvSchemaPath,
    backup_root: process.env.STORE_OS_BACKUP_ROOT
      ? process.env.STORE_OS_BACKUP_ROOT.trim()
      : null,
    resolved_at: new Date().toISOString(),
  };

  return config;
}

module.exports = { resolveRuntimeConfig };
