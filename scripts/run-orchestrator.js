#!/usr/bin/env node
/**
 * run-orchestrator.js
 *
 * CLI wrapper for the store-os orchestration webhook.
 * Sends a POST to orchestrate-phase1, attaches the Bearer auth token,
 * and prints a clean structured summary of the run result.
 * Recognises terminal statuses: PHASE_5_COMPLETE, PHASE_6A_COMPLETE.
 *
 * Usage:
 *   node scripts/run-orchestrator.js --input <json-file>
 *   node scripts/run-orchestrator.js --input test-data/golden-input.json
 *
 * Required env vars (in .env or shell):
 *   N8N_BASE_URL         — e.g. https://luwai.app.n8n.cloud
 *   STORE_OS_API_TOKEN   — Bearer token for webhook auth (set in n8n vars)
 *
 * Optional:
 *   --dry-run            — validate payload locally, do not call webhook
 *   --timeout <ms>       — request timeout in ms (default: 300000 / 5 min)
 *   --silent             — suppress progress output, print only final JSON
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

const ROOT = path.resolve(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────

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

// ── Args ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { input: null, dryRun: false, timeout: 300000, silent: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1])    { result.input   = args[++i]; continue; }
    if (args[i] === '--timeout' && args[i + 1])  { result.timeout = parseInt(args[++i], 10); continue; }
    if (args[i] === '--dry-run')  { result.dryRun  = true; continue; }
    if (args[i] === '--silent')   { result.silent  = true; continue; }
  }
  return result;
}

// ── HTTP helper ───────────────────────────────────────────────────────────

function postJson(url, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = Buffer.from(JSON.stringify(body));
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': bodyBuf.length,
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
    req.write(bodyBuf);
    req.end();
  });
}

// ── Output formatter ──────────────────────────────────────────────────────

function printSummary(result, startedAt, endedAt) {
  const durationMs = endedAt - startedAt;
  const d = result.data;

  if (typeof d !== 'object' || d === null) {
    console.log('RAW RESPONSE:', d);
    return;
  }

  const TERMINAL_STATUSES = new Set(['PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE', 'PHASE_6_COMPLETE']);
  const isSuccess = TERMINAL_STATUSES.has(d.status) && result.status >= 200 && result.status < 300;
  const isError   = !isSuccess;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  store-os orchestration run — ${new Date(startedAt).toISOString()}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  STATUS:      ${d.status || 'UNKNOWN'}`);
  console.log(`  PROJECT:     ${d.project_id || '—'}`);
  console.log(`  CLOUD MODE:  ${d.cloud_mode !== undefined ? d.cloud_mode : '—'}`);
  console.log(`  DURATION:    ${durationMs}ms`);
  console.log(`  HTTP:        ${result.status}`);

  if (d.output_summary) {
    const s = d.output_summary;
    console.log('');
    console.log('  OUTPUT SUMMARY:');
    console.log(`    opportunities:         ${s.opportunity_count ?? '—'}`);
    console.log(`    risks:                 ${s.risk_count ?? '—'}`);
    console.log(`    moat_hypotheses:       ${s.moat_hypothesis_count ?? '—'}`);
    console.log(`    validation_questions:  ${s.validation_question_count ?? '—'}`);
    console.log(`    confidence_level:      ${s.confidence_level ?? '—'}`);
  }

  if (d.strategy_synthesis) {
    const ss = d.strategy_synthesis;
    console.log('');
    console.log('  STRATEGY SYNTHESIS:');
    const summary = typeof ss.strategic_summary === 'string'
      ? ss.strategic_summary.slice(0, 200) + (ss.strategic_summary.length > 200 ? '…' : '')
      : JSON.stringify(ss.strategic_summary || '').slice(0, 200);
    console.log(`    strategic_summary: ${summary}`);
    if (ss.positioning_focus) {
      const pf = typeof ss.positioning_focus === 'object'
        ? (ss.positioning_focus.primary_angle || JSON.stringify(ss.positioning_focus)).slice(0, 180)
        : String(ss.positioning_focus).slice(0, 180);
      console.log(`    positioning_focus: ${pf}`);
    }
  }

  if (d.offer_architecture) {
    const oa = d.offer_architecture;
    const core = oa.core_offer || {};
    console.log('');
    console.log('  OFFER ARCHITECTURE:');
    console.log(`    headline:       ${core.headline || '—'}`);
    console.log(`    target_buyer:   ${(core.target_buyer || '—').slice(0, 120)}`);
    console.log(`    pricing_tier:   ${(oa.pricing_logic || {}).tier || '—'}`);
    console.log(`    bundles:        ${(oa.bundle_opportunities || []).length}`);
    console.log(`    upsell_paths:   ${(oa.upsell_paths || []).length}`);
  }

  if (d.content_strategy) {
    const cs = d.content_strategy;
    const mh = cs.messaging_hierarchy || {};
    const ev = cs.editorial_voice || {};
    const pillars = cs.content_pillars || [];
    console.log('');
    console.log('  CONTENT STRATEGY:');
    console.log(`    primary_message: ${(mh.primary_message || '—').slice(0, 120)}`);
    console.log(`    content_pillars: ${pillars.length} (${pillars.slice(0, 3).map((p) => p.pillar).join(', ')})`);
    console.log(`    editorial_tone:  ${ev.tone || '—'}`);
    const seo = cs.seo_content_plan || {};
    console.log(`    keyword_clusters: ${(seo.primary_keyword_clusters || []).length} | faq_clusters: ${(seo.faq_topic_clusters || []).length}`);
  }

  if (d.next_phase) {
    console.log('');
    console.log(`  NEXT PHASE:  ${d.next_phase}`);
  }

  if (isError && d.message) {
    console.log('');
    console.log(`  ERROR: ${d.message}`);
  }

  console.log('');
  if (isSuccess) {
    const chainDesc = d.status === 'PHASE_6B_COMPLETE' ? 'Phase 1–6b chain finished.'
      : d.status === 'PHASE_6A_COMPLETE' ? 'Phase 1–6a chain finished.'
      : d.status === 'PHASE_6_COMPLETE' ? 'Phase 1–6 chain finished.'
      : 'Phase 1–5 chain finished.';
    console.log(`  ✓ Run completed successfully. ${chainDesc}`);
  } else {
    console.log('  ✗ Run did not complete. Check n8n execution log for details.');
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const args = parseArgs();

  const N8N_BASE_URL = process.env.N8N_BASE_URL;
  const API_TOKEN    = process.env.STORE_OS_API_TOKEN;

  if (!N8N_BASE_URL) {
    console.error('ERROR: N8N_BASE_URL must be set in .env');
    process.exit(1);
  }
  if (!args.input) {
    console.error('Usage: node scripts/run-orchestrator.js --input <json-file>');
    console.error('Example: node scripts/run-orchestrator.js --input test-data/golden-input.json');
    process.exit(1);
  }

  // Load input file
  const inputPath = path.resolve(ROOT, args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: Input file not found: ${inputPath}`);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Strip _meta from payload (store-os internal field)
  const sendPayload = { ...payload };
  delete sendPayload._meta;

  if (!args.silent) {
    console.log(`\nstore-os run-orchestrator`);
    console.log(`  input:   ${inputPath}`);
    console.log(`  target:  ${N8N_BASE_URL}/webhook/orchestrate-phase1`);
    console.log(`  auth:    ${API_TOKEN ? 'Bearer token configured' : 'no token (STORE_OS_API_TOKEN not set)'}`);
    if (args.dryRun) {
      console.log('\n[DRY RUN] Payload validated locally. Not sending request.');
      console.log('  project_id:', sendPayload.intake_payload?.project_id);
      console.log('  vertical:  ', sendPayload.intake_payload?.vertical);
      console.log('  market:    ', sendPayload.intake_payload?.primary_market);
      process.exit(0);
    }
    console.log('\nSending request...\n');
  }

  const webhookUrl = `${N8N_BASE_URL.replace(/\/$/, '')}/webhook/orchestrate-phase1`;
  const headers    = {};
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;

  const startedAt = Date.now();
  const result = await postJson(webhookUrl, sendPayload, headers, args.timeout);
  const endedAt = Date.now();

  if (args.silent) {
    // Silent: output only the raw JSON response
    console.log(JSON.stringify({
      http_status: result.status,
      duration_ms: endedAt - startedAt,
      ...( typeof result.data === 'object' ? result.data : { raw: result.data }),
    }, null, 2));
  } else {
    printSummary(result, startedAt, endedAt);
  }

  // Exit code: 0 on success, 1 on failure
  if (result.status < 200 || result.status >= 300) process.exit(1);
  const TERMINAL = new Set(['PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE', 'PHASE_6_COMPLETE']);
  if (typeof result.data === 'object' && result.data.status && !TERMINAL.has(result.data.status)) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
