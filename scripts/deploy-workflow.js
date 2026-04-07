#!/usr/bin/env node
/**
 * deploy-workflow.js
 *
 * One-command deploy: repo workflow JSON → n8n.
 *
 * Usage:
 *   node scripts/deploy-workflow.js <workflow-name>
 *
 * Examples:
 *   node scripts/deploy-workflow.js orchestrate-phase1
 *   node scripts/deploy-workflow.js build-strategy-synthesis
 *
 * What it does:
 *   1. Reads workflows/n8n/<workflow-name>.n8n.json from the repo.
 *   2. Reads workflows/n8n/workflow-ids.json for the ID mapping.
 *   3. Substitutes all REPLACE_WITH_* placeholders with live n8n IDs.
 *   4. Calls the n8n REST API to update the workflow in-place.
 *
 * Required environment variables (set in .env or shell):
 *   N8N_BASE_URL   — e.g. https://your-instance.app.n8n.cloud
 *   N8N_API_KEY    — n8n API key (Settings > API > Create API Key)
 *
 * The workflow ID for the target workflow is read from workflow-ids.json.
 * The repo JSON is never committed with real IDs — REPLACE_WITH_* placeholders
 * are the source of truth for portability. This script bridges repo → n8n.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT         = path.resolve(__dirname, '..');
const IDS_FILE     = path.join(ROOT, 'workflows', 'n8n', 'workflow-ids.json');
const WORKFLOWS_DIR = path.join(ROOT, 'workflows', 'n8n');

function loadEnv() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const workflowName = process.argv[2];
  if (!workflowName) {
    console.error('Usage: node scripts/deploy-workflow.js <workflow-name>');
    console.error('Example: node scripts/deploy-workflow.js orchestrate-phase1');
    process.exit(1);
  }

  const N8N_BASE_URL = process.env.N8N_BASE_URL;
  const N8N_API_KEY  = process.env.N8N_API_KEY;

  if (!N8N_BASE_URL || !N8N_API_KEY) {
    console.error('ERROR: N8N_BASE_URL and N8N_API_KEY must be set in .env or environment.');
    console.error('  N8N_BASE_URL — e.g. https://your-instance.app.n8n.cloud');
    console.error('  N8N_API_KEY  — n8n API key from Settings > API > Create API Key');
    process.exit(1);
  }

  // Load workflow ID manifest
  if (!fs.existsSync(IDS_FILE)) {
    console.error(`ERROR: workflow-ids.json not found at ${IDS_FILE}`);
    process.exit(1);
  }
  const idsManifest = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  const workflowIds    = idsManifest.workflows;
  const placeholderMap = idsManifest.placeholder_map;

  // Resolve target workflow ID
  const targetId = workflowIds[workflowName];
  if (!targetId) {
    console.error(`ERROR: No workflow ID found for "${workflowName}" in workflow-ids.json.`);
    console.error('Known workflows:', Object.keys(workflowIds).join(', '));
    process.exit(1);
  }

  // Load repo workflow JSON
  const jsonFile = path.join(WORKFLOWS_DIR, `${workflowName}.n8n.json`);
  if (!fs.existsSync(jsonFile)) {
    console.error(`ERROR: Workflow JSON not found at ${jsonFile}`);
    process.exit(1);
  }

  let rawJson = fs.readFileSync(jsonFile, 'utf8');

  // Substitute REPLACE_WITH_* placeholders (workflow IDs)
  let substitutions = 0;
  for (const [placeholder, workflowKey] of Object.entries(placeholderMap)) {
    const resolvedId = workflowIds[workflowKey];
    if (!resolvedId) {
      console.warn(`WARN: No ID found for placeholder ${placeholder} → ${workflowKey}`);
      continue;
    }
    const before = rawJson;
    rawJson = rawJson.split(placeholder).join(resolvedId);
    if (rawJson !== before) {
      console.log(`  Substituted: ${placeholder} → ${resolvedId}`);
      substitutions++;
    }
  }

  // Substitute credential placeholders (from credential_placeholders section)
  const credentialPlaceholders = idsManifest.credential_placeholders || {};
  for (const [placeholder, info] of Object.entries(credentialPlaceholders)) {
    if (placeholder.startsWith('_')) continue; // skip _note etc.
    const credId = typeof info === 'object' ? info.value : String(info);
    if (!credId || credId.startsWith('NOT_YET_RECORDED')) {
      console.warn(`WARN: Credential placeholder ${placeholder} has no recorded value — skipping`);
      continue;
    }
    const before = rawJson;
    rawJson = rawJson.split(placeholder).join(credId);
    if (rawJson !== before) {
      console.log(`  Substituted credential: ${placeholder} → ${credId}`);
      substitutions++;
    }
  }

  console.log(`\nSubstitutions applied: ${substitutions}`);

  // Parse, inject the correct workflow ID, and strip non-API fields
  const workflowJson = JSON.parse(rawJson);
  workflowJson.id = targetId;

  // n8n API v1 PUT /workflows/{id} rejects any unknown top-level properties.
  // Strip store-os internal fields (_meta, etc.) before sending.
  // id, active, staticData, tags, pinData are not accepted by the PUT endpoint.
  const API_ALLOWED_KEYS = new Set(['name', 'nodes', 'connections', 'settings']);
  for (const key of Object.keys(workflowJson)) {
    if (!API_ALLOWED_KEYS.has(key)) {
      console.log(`  Stripped non-API field: ${key}`);
      delete workflowJson[key];
    }
  }

  // Deploy to n8n via REST API
  const baseUrl = N8N_BASE_URL.replace(/\/$/, '');
  const apiPath = `/api/v1/workflows/${targetId}`;

  console.log(`\nDeploying "${workflowName}" to ${baseUrl}${apiPath}...`);

  const body = JSON.stringify(workflowJson);
  await apiRequest(baseUrl, apiPath, 'PUT', N8N_API_KEY, body);

  console.log(`\n✓ Deployed "${workflowName}" (ID: ${targetId}) to n8n successfully.`);
}

function apiRequest(baseUrl, apiPath, method, apiKey, body) {
  return new Promise((resolve, reject) => {
    const url    = new URL(baseUrl + apiPath);
    const isHttps = url.protocol === 'https:';
    const lib    = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'X-N8N-API-KEY': apiKey,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          console.error(`API error ${res.statusCode}: ${data}`);
          reject(new Error(`n8n API responded with ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
