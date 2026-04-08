#!/usr/bin/env node
/**
 * poll-execution.js
 *
 * Standalone poller for a store-os n8n execution.
 * Use this to check or retrieve the result of a previously-started async run.
 *
 * Usage:
 *   node scripts/poll-execution.js <execution_id>
 *   node scripts/poll-execution.js <execution_id> --timeout 600000
 *   node scripts/poll-execution.js <execution_id> --silent
 *   node scripts/poll-execution.js <execution_id> --json   # print raw result JSON
 *
 * Required env vars (in .env):
 *   N8N_BASE_URL  — e.g. https://luwai.app.n8n.cloud
 *   N8N_API_KEY   — n8n API key
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
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

function httpRequest(method, url, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...(bodyBuf ? { 'Content-Type': 'application/json', 'Content-Length': bodyBuf.length } : {}),
        ...headers,
      },
    };
    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let data;
        try { data = JSON.parse(raw); } catch (_) { data = raw; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Request timed out after ${timeoutMs}ms`)); });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

function extractResultFromExecution(exData) {
  const resultData = (exData.data || {}).resultData || {};
  const runData    = resultData.runData || {};
  const lastNode   = resultData.lastNodeExecuted;

  const terminalNodes = [
    'Phase 7B.2 Complete', 'Phase 7B.1 Complete', 'Phase 7A Complete', 'Phase 6c Complete',
    'Phase 6b Complete', 'Phase 6a Complete', 'Phase 5 Complete',
  ];

  for (const nodeName of terminalNodes) {
    const nodeRuns = runData[nodeName];
    if (nodeRuns && nodeRuns[0]) {
      const mainOut = ((nodeRuns[0].data || {}).main || [[]])[0] || [];
      if (mainOut[0]) return mainOut[0].json;
    }
  }

  if (lastNode && runData[lastNode]) {
    const mainOut = ((runData[lastNode][0].data || {}).main || [[]])[0] || [];
    if (mainOut[0]) return mainOut[0].json;
  }

  return null;
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const executionId = args.find((a) => !a.startsWith('--'));
  const silent      = args.includes('--silent');
  const printJson   = args.includes('--json');
  const timeoutIdx  = args.indexOf('--timeout');
  const timeoutMs   = timeoutIdx !== -1 ? parseInt(args[timeoutIdx + 1], 10) : 600000;
  const intervalIdx = args.indexOf('--poll-interval');
  const pollInterval = intervalIdx !== -1 ? parseInt(args[intervalIdx + 1], 10) : 5000;

  if (!executionId) {
    console.error('Usage: node scripts/poll-execution.js <execution_id> [--timeout ms] [--silent] [--json]');
    process.exit(1);
  }

  const N8N_BASE_URL = process.env.N8N_BASE_URL;
  const N8N_API_KEY  = process.env.N8N_API_KEY;

  if (!N8N_BASE_URL || !N8N_API_KEY) {
    console.error('ERROR: N8N_BASE_URL and N8N_API_KEY must be set in .env');
    process.exit(1);
  }

  const apiUrl     = `${N8N_BASE_URL}/api/v1/executions/${executionId}?includeData=true`;
  const apiHeaders = { 'X-N8N-API-KEY': N8N_API_KEY };
  const start      = Date.now();

  if (!silent) {
    console.log(`\nPolling execution ${executionId}...`);
    process.stdout.write('  Progress');
  }

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollInterval));

    let res;
    try {
      res = await httpRequest('GET', apiUrl, null, apiHeaders, 30000);
    } catch (e) {
      if (!silent) process.stdout.write('?');
      continue;
    }

    if (res.status !== 200) {
      if (!silent) process.stdout.write('!');
      continue;
    }

    const ex = res.data;

    if (ex.status === 'error') {
      if (!silent) console.log(' ERROR');
      console.error(`\nExecution ${executionId} finished with status: error`);
      if (ex.data?.resultData?.error) {
        console.error('  Error:', JSON.stringify(ex.data.resultData.error).slice(0, 300));
      }
      process.exit(1);
    }

    if (ex.status === 'success' && ex.finished) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      if (!silent) console.log(` done (${elapsed}s)\n`);

      const result = extractResultFromExecution(ex);
      if (!result) {
        console.error('ERROR: Execution completed but no result could be extracted.');
        console.error('  Last node:', ex.data?.resultData?.lastNodeExecuted || 'unknown');
        process.exit(1);
      }

      if (printJson || silent) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const TERMINAL = new Set(['PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE',
                                   'PHASE_6C_COMPLETE', 'PHASE_6_COMPLETE', 'PHASE_7A_COMPLETE',
                                   'PHASE_7B1_COMPLETE', 'PHASE_7B1_PARTIAL',
                                   'PHASE_7B2_COMPLETE', 'PHASE_7B2_PARTIAL',
                                   'PHASE_7B3_COMPLETE', 'PHASE_7B3_PARTIAL', 'PHASE_7B3_DRY_RUN', 'PHASE_7B3_BLOCKED',
                                   'PHASE_9_COMPLETE', 'PHASE_9_PARTIAL', 'PHASE_9_PROMPTS_ONLY', 'PHASE_9_FAILED',
                                   'PHASE_10_COMPLETE', 'PHASE_10_FAILED']);
        console.log(`  STATUS:   ${result.status || 'UNKNOWN'}`);
        console.log(`  PROJECT:  ${result.project_id || '—'}`);
        if (result.store_blueprint) {
          const sb = result.store_blueprint;
          console.log(`  PRODUCTS: ${(sb.products || []).length} | COLLECTIONS: ${(sb.collections || []).length} | PAGES: ${(sb.pages || []).length}`);
        }
        if (result.gtm_plan) {
          console.log(`  GTM:      ${(result.gtm_plan.gtm_narrative || '').slice(0, 80)}…`);
        }
        console.log('');
        if (TERMINAL.has(result.status)) {
          console.log(`  ✓ ${result.status} — execution complete.`);
        } else {
          console.log(`  ✗ Non-terminal status: ${result.status}`);
          process.exit(1);
        }
      }

      const TERMINAL = new Set(['PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE',
                                 'PHASE_6C_COMPLETE', 'PHASE_6_COMPLETE', 'PHASE_7A_COMPLETE',
                                 'PHASE_7B1_COMPLETE', 'PHASE_7B1_PARTIAL',
                                 'PHASE_7B2_COMPLETE', 'PHASE_7B2_PARTIAL',
                                   'PHASE_7B3_COMPLETE', 'PHASE_7B3_PARTIAL', 'PHASE_7B3_DRY_RUN', 'PHASE_7B3_BLOCKED',
                                   'PHASE_9_COMPLETE', 'PHASE_9_PARTIAL', 'PHASE_9_PROMPTS_ONLY', 'PHASE_9_FAILED',
                                   'PHASE_10_COMPLETE', 'PHASE_10_FAILED']);
      if (result && !TERMINAL.has(result.status)) process.exit(1);
      return;
    }

    if (!silent) process.stdout.write('.');
  }

  console.error(`\nERROR: Polling timed out after ${timeoutMs}ms.`);
  console.error(`  Check n8n execution ${executionId} manually.`);
  process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
