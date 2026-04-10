#!/usr/bin/env node
/**
 * run-orchestrator.js
 *
 * CLI wrapper for the store-os orchestration webhook — async execution model.
 *
 * ASYNC MODEL (default):
 *   1. POST to webhook → receives 202 { execution_id, status: "started" } quickly
 *   2. Polls GET /api/v1/executions/{id} until finished
 *   3. Extracts and displays final result
 *   This eliminates the Cloudflare 100s webhook timeout for long chains.
 *
 * Usage:
 *   node scripts/run-orchestrator.js --input <json-file>
 *   node scripts/run-orchestrator.js --input test-data/golden-input.json
 *   node scripts/run-orchestrator.js --execution-id <id>   # poll only
 *
 * Required env vars (in .env):
 *   N8N_BASE_URL    — e.g. https://luwai.app.n8n.cloud
 *   N8N_API_KEY     — n8n API key for polling /api/v1/executions
 *
 * Optional:
 *   STORE_OS_API_TOKEN  — Bearer token for webhook auth (if set in n8n vars)
 *
 * Flags:
 *   --dry-run            — validate payload locally, do not send
 *   --timeout <ms>       — total run timeout in ms (default: 600000 / 10 min)
 *   --poll-interval <ms> — polling interval in ms (default: 5000)
 *   --silent             — suppress progress output
 *   --no-poll            — trigger only; print execution_id and exit
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
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
  const result = {
    input: null, executionId: null,
    dryRun: false, noPoll: false, silent: false,
    timeout: 600000, pollInterval: 5000,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1])         { result.input        = args[++i]; continue; }
    if (args[i] === '--execution-id' && args[i + 1])  { result.executionId  = args[++i]; continue; }
    if (args[i] === '--timeout' && args[i + 1])       { result.timeout      = parseInt(args[++i], 10); continue; }
    if (args[i] === '--poll-interval' && args[i + 1]) { result.pollInterval = parseInt(args[++i], 10); continue; }
    if (args[i] === '--dry-run')  { result.dryRun  = true; continue; }
    if (args[i] === '--no-poll')  { result.noPoll  = true; continue; }
    if (args[i] === '--silent')   { result.silent  = true; continue; }
  }
  return result;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

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

// ── Extract final result from execution data ──────────────────────────────

function extractResultFromExecution(exData) {
  const resultData = (exData.data || {}).resultData || {};
  const runData    = resultData.runData || {};
  const lastNode   = resultData.lastNodeExecuted;

  // Try known terminal nodes in priority order
  const terminalNodes = [
    'Phase 7B.3 Complete', 'Phase 7B.2 Complete', 'Phase 7B.1 Complete', 'Phase 7A Complete', 'Phase 6c Complete',
    'Phase 6b Complete', 'Phase 6a Complete', 'Phase 5 Complete',
  ];

  for (const nodeName of terminalNodes) {
    const nodeRuns = runData[nodeName];
    if (nodeRuns && nodeRuns[0]) {
      const mainOut = ((nodeRuns[0].data || {}).main || [[]])[0] || [];
      if (mainOut[0]) return mainOut[0].json;
    }
  }

  // Fallback: use lastNodeExecuted
  if (lastNode && runData[lastNode]) {
    const mainOut = ((runData[lastNode][0].data || {}).main || [[]])[0] || [];
    if (mainOut[0]) return mainOut[0].json;
  }

  return null;
}

// ── Poll execution until finished ─────────────────────────────────────────

async function pollExecution(executionId, apiKey, baseUrl, timeoutMs, pollInterval, silent) {
  const apiUrl = `${baseUrl}/api/v1/executions/${executionId}?includeData=true`;
  const pollHeaders = { 'X-N8N-API-KEY': apiKey };
  const start = Date.now();
  let dotCount = 0;

  if (!silent) {
    process.stdout.write(`  Polling execution ${executionId}`);
  }

  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    let result;
    try {
      result = await httpRequest('GET', apiUrl, null, pollHeaders, 30000);
    } catch (e) {
      if (!silent) process.stdout.write('?');
      continue;
    }

    if (result.status !== 200) {
      if (!silent) process.stdout.write('!');
      continue;
    }

    const ex = result.data;

    if (ex.status === 'error') {
      if (!silent) console.log(' ERROR');
      throw new Error(`n8n execution ${executionId} finished with status: error`);
    }

    if (ex.status === 'success' && ex.finished) {
      if (!silent) console.log(` done (${Math.round((Date.now() - start) / 1000)}s)`);
      return ex;
    }

    if (!silent) {
      process.stdout.write('.');
      dotCount++;
      if (dotCount % 60 === 0) process.stdout.write('\n  ');
    }
  }

  throw new Error(`Polling timed out after ${timeoutMs}ms. Check n8n execution ${executionId} manually.`);
}

// ── Output formatter ──────────────────────────────────────────────────────

function printSummary(d, httpStatus, durationMs, startedAt) {
  if (typeof d !== 'object' || d === null) {
    console.log('RAW RESPONSE:', d);
    return;
  }

  const TERMINAL = new Set(['GOLD_PATH_COMPLETE', 'GOLD_PATH_PARTIAL',
                             'PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE',
                             'PHASE_6C_COMPLETE', 'PHASE_6_COMPLETE', 'PHASE_7A_COMPLETE',
                             'PHASE_7B1_COMPLETE', 'PHASE_7B1_PARTIAL',
                             'PHASE_7B2_COMPLETE', 'PHASE_7B2_PARTIAL',
                             'PHASE_7B3_COMPLETE', 'PHASE_7B3_PARTIAL', 'PHASE_7B3_DRY_RUN', 'PHASE_7B3_BLOCKED']);
  const isSuccess = TERMINAL.has(d.status);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  store-os orchestration run — ${new Date(startedAt).toISOString()}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  STATUS:      ${d.status || 'UNKNOWN'}`);
  console.log(`  PROJECT:     ${d.project_id || '—'}`);
  console.log(`  CLOUD MODE:  ${d.cloud_mode !== undefined ? d.cloud_mode : '—'}`);
  console.log(`  DURATION:    ${durationMs}ms`);
  if (d.execution_id) console.log(`  EXEC ID:     ${d.execution_id}`);

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

  if (d.gtm_plan) {
    const gp = d.gtm_plan;
    const ls = gp.launch_sequence || {};
    const channels = gp.channel_strategy || [];
    const kpis = gp.kpis || [];
    console.log('');
    console.log('  GTM PLAN:');
    const narrative = typeof gp.gtm_narrative === 'string'
      ? gp.gtm_narrative.slice(0, 160) + (gp.gtm_narrative.length > 160 ? '…' : '')
      : '—';
    console.log(`    gtm_narrative:   ${narrative}`);
    console.log(`    launch_phases:   ${[ls.phase_1, ls.phase_2, ls.phase_3].filter(Boolean).length}`);
    console.log(`    channels:        ${channels.length} (${channels.slice(0, 3).map((c) => c.channel || c).join(', ')})`);
    console.log(`    kpis:            ${kpis.length}`);
  }

  if (d.store_blueprint || d.blueprint_summary) {
    const bs = d.blueprint_summary || {};
    const sb = d.store_blueprint || {};
    console.log('');
    console.log('  STORE BLUEPRINT:');
    const narrative = sb.blueprint_narrative
      ? String(sb.blueprint_narrative).slice(0, 160) + (sb.blueprint_narrative.length > 160 ? '…' : '')
      : '—';
    console.log(`    blueprint_narrative: ${narrative}`);
    console.log(`    products:            ${bs.products_count       ?? (sb.products       || []).length}`);
    console.log(`    collections:         ${bs.collections_count    ?? (sb.collections    || []).length}`);
    console.log(`    pages:               ${bs.pages_count          ?? (sb.pages          || []).length}`);
    console.log(`    theme_sections:      ${bs.theme_sections_count ?? (sb.theme_sections || []).length}`);
    console.log(`    assets:              ${bs.assets_count         ?? (sb.assets         || []).length}`);
  }

  if (d.shopify_catalog_deployment) {
    const cd = d.shopify_catalog_deployment;
    console.log('');
    console.log('  SHOPIFY CATALOG DEPLOYMENT:');
    console.log(`    status:              ${cd.status || '—'}`);
    console.log(`    shop:                ${cd.shop_url || '—'}`);
    console.log(`    products_created:    ${cd.products_created ?? '—'}`);
    console.log(`    products_updated:    ${cd.products_updated ?? '—'}`);
    console.log(`    collections_created: ${cd.collections_created ?? '—'}`);
    console.log(`    collections_updated: ${cd.collections_updated ?? '—'}`);
    if (cd.errors && cd.errors.length > 0) {
      console.log(`    errors:              ${cd.errors.length} (${cd.errors.map((e) => e.handle).join(', ')})`);
    }
    if (cd.warnings && cd.warnings.length > 0) {
      console.log(`    warnings:            ${cd.warnings.length}`);
    }
  }

  if (d.shopify_pages_navigation_deployment) {
    const pn = d.shopify_pages_navigation_deployment;
    console.log('');
    console.log('  SHOPIFY PAGES + NAVIGATION DEPLOYMENT:');
    console.log(`    status:              ${pn.status || '—'}`);
    console.log(`    shop:                ${pn.shop_url || '—'}`);
    console.log(`    pages_created:       ${pn.pages_created ?? '—'}`);
    console.log(`    pages_updated:       ${pn.pages_updated ?? '—'}`);
    console.log(`    navigation_created:  ${pn.navigation_created ?? '—'}`);
    console.log(`    navigation_updated:  ${pn.navigation_updated ?? '—'}`);
    if (pn.errors && pn.errors.length > 0) {
      console.log(`    errors:              ${pn.errors.length} (${pn.errors.map((e) => e.handle).join(', ')})`);
    }
    if (pn.warnings && pn.warnings.length > 0) {
      console.log(`    warnings:            ${pn.warnings.length}`);
    }
  }

  if (d.shopify_theme_deployment) {
    const td = d.shopify_theme_deployment;
    console.log('');
    console.log('  SHOPIFY THEME DEPLOYMENT:');
    console.log(`    status:              ${td.status || '—'}`);
    console.log(`    theme:               ${td.theme_name || '—'} (id: ${td.theme_id || '—'})`);
    console.log(`    dry_run:             ${td.dry_run}`);
    console.log(`    sections_written:    ${td.sections_written ?? '—'}`);
    console.log(`    assets_written:      ${td.assets_written ?? '—'}`);
    if (td.dry_run && td.dry_run_plan) {
      console.log(`    dry_run_plan:        ${td.dry_run_plan.length} operations planned`);
    }
    if (td.errors && td.errors.length > 0) {
      console.log(`    errors:              ${td.errors.length}`);
    }
    if (td.safety_notes && td.safety_notes.length > 0) {
      for (const note of td.safety_notes) {
        console.log(`    safety:              ${note}`);
      }
    }
  }

  if (d.next_phase) {
    console.log('');
    console.log(`  NEXT PHASE:  ${d.next_phase}`);
  }

  if (!isSuccess && d.message) {
    console.log('');
    console.log(`  ERROR: ${d.message}`);
  }

  console.log('');
  if (isSuccess) {
    const chainDesc = d.status === 'GOLD_PATH_COMPLETE' ? 'Gold path complete — theme deployed + media generated. Full storefront ready.'
      : d.status === 'GOLD_PATH_PARTIAL' ? 'Gold path complete with partial media results — theme fully deployed, some media assets failed (transient).'
      : d.status === 'PHASE_7B3_COMPLETE' ? 'Phase 1–7B.3 chain finished (catalog + pages + navigation + theme deployed).'
      : d.status === 'PHASE_7B3_PARTIAL' ? 'Phase 1–7B.3 finished with partial theme deployment.'
      : d.status === 'PHASE_7B3_DRY_RUN' ? 'Phase 1–7B.3 finished (theme: dry run only — no writes performed).'
      : d.status === 'PHASE_7B3_BLOCKED' ? 'Phase 1–7B.3 finished (theme: BLOCKED — no safe target theme found).'
      : d.status === 'PHASE_7B2_COMPLETE' ? 'Phase 1–7B.2 chain finished (catalog + pages + navigation deployed).'
      : d.status === 'PHASE_7B2_PARTIAL' ? 'Phase 1–7B.2 finished with partial deployment (some errors).'
      : d.status === 'PHASE_7B1_COMPLETE' ? 'Phase 1–7B.1 chain finished (Shopify catalog deployed).'
      : d.status === 'PHASE_7B1_PARTIAL' ? 'Phase 1–7B.1 finished with partial deployment (some errors).'
      : d.status === 'PHASE_7A_COMPLETE' ? 'Phase 1–7A chain finished.'
      : d.status === 'PHASE_6C_COMPLETE' ? 'Phase 1–6c chain finished.'
      : d.status === 'PHASE_6B_COMPLETE' ? 'Phase 1–6b chain finished.'
      : d.status === 'PHASE_6A_COMPLETE' ? 'Phase 1–6a chain finished.'
      : d.status === 'PHASE_6_COMPLETE' ? 'Phase 1–6 chain finished.'
      : 'Phase 1–5 chain finished.';
    console.log(`  ✓ Run completed successfully. ${chainDesc}`);
  } else {
    console.log('  ✗ Run did not complete. Check n8n execution log for details.');
  }
  console.log('');
}

// ── Persistence ──────────────────────────────────────────────────────────

const RUNS_DIR = path.join(ROOT, 'outputs', 'runs');

/**
 * Build a structured run record from a completed (or failed) execution result.
 * result  — the extracted artifact chain JSON (may be null on failure)
 * error   — Error instance if the run failed, null on success
 */
function buildRunRecord(result, executionId, startedAt, finishedAt, error) {
  const record = {
    execution_id:   executionId || (result && result.execution_id) || 'unknown',
    project_id:     (result && result.project_id) || 'unknown',
    started_at:     new Date(startedAt).toISOString(),
    finished_at:    new Date(finishedAt).toISOString(),
    duration_ms:    finishedAt - startedAt,
    status:         error ? 'error' : 'success',
    terminal_status: (result && result.status) || null,
    cloud_mode:     (result && result.cloud_mode !== undefined) ? result.cloud_mode : null,
    artifacts:      null,
    error:          error ? error.message : null,
  };

  if (result && !error) {
    const ss = result.strategy_synthesis || {};
    const oa = result.offer_architecture || {};
    const cs = result.content_strategy || {};
    const gp = result.gtm_plan || {};
    const sb = result.store_blueprint || {};
    const ls = (gp.launch_sequence) || {};

    record.artifacts = {
      strategy_synthesis: {
        strategic_summary: typeof ss.strategic_summary === 'string'
          ? ss.strategic_summary.slice(0, 300) : null,
        positioning_focus: typeof ss.positioning_focus === 'object'
          ? (ss.positioning_focus.primary_angle || JSON.stringify(ss.positioning_focus)).slice(0, 180)
          : String(ss.positioning_focus || '').slice(0, 180) || null,
      },
      offer_architecture: {
        headline:          ((oa.core_offer || {}).headline) || null,
        target_buyer:      ((oa.core_offer || {}).target_buyer || '').slice(0, 160) || null,
        pricing_tier:      ((oa.pricing_logic || {}).tier) || null,
        bundles_count:     (oa.bundle_opportunities || []).length,
        upsell_paths_count: (oa.upsell_paths || []).length,
      },
      content_strategy: {
        primary_message:      ((cs.messaging_hierarchy || {}).primary_message || '').slice(0, 200) || null,
        content_pillars_count: (cs.content_pillars || []).length,
        editorial_tone:        ((cs.editorial_voice || {}).tone) || null,
        keyword_clusters_count: ((cs.seo_content_plan || {}).primary_keyword_clusters || []).length,
        faq_clusters_count:     ((cs.seo_content_plan || {}).faq_topic_clusters || []).length,
      },
      gtm_plan: {
        gtm_narrative:      typeof gp.gtm_narrative === 'string'
          ? gp.gtm_narrative.slice(0, 200) : null,
        launch_phases_count: [ls.phase_1, ls.phase_2, ls.phase_3].filter(Boolean).length,
        channels_count:      (gp.channel_strategy || []).length,
        kpis_count:          (gp.kpis || []).length,
      },
      store_blueprint: {
        blueprint_narrative: typeof sb.blueprint_narrative === 'string'
          ? sb.blueprint_narrative.slice(0, 300) : null,
        products_count:      (sb.products       || []).length,
        collections_count:   (sb.collections    || []).length,
        pages_count:         (sb.pages          || []).length,
        theme_sections_count: (sb.theme_sections || []).length,
        assets_count:        (sb.assets         || []).length,
      },
    };

    if (result.shopify_catalog_deployment) {
      const cd = result.shopify_catalog_deployment;
      record.artifacts.shopify_catalog_deployment = {
        status:               cd.status || null,
        shop_url:             cd.shop_url || null,
        products_created:     cd.products_created ?? 0,
        products_updated:     cd.products_updated ?? 0,
        collections_created:  cd.collections_created ?? 0,
        collections_updated:  cd.collections_updated ?? 0,
        errors_count:         (cd.errors || []).length,
        warnings_count:       (cd.warnings || []).length,
      };
    }

    if (result.shopify_pages_navigation_deployment) {
      const pn = result.shopify_pages_navigation_deployment;
      record.artifacts.shopify_pages_navigation_deployment = {
        status:             pn.status || null,
        shop_url:           pn.shop_url || null,
        pages_created:      pn.pages_created ?? 0,
        pages_updated:      pn.pages_updated ?? 0,
        navigation_created: pn.navigation_created ?? 0,
        navigation_updated: pn.navigation_updated ?? 0,
        errors_count:       (pn.errors || []).length,
        warnings_count:     (pn.warnings || []).length,
      };
    }

    if (result.shopify_theme_deployment) {
      const td = result.shopify_theme_deployment;
      record.artifacts.shopify_theme_deployment = {
        status:           td.status || null,
        theme_id:         td.theme_id || null,
        theme_name:       td.theme_name || null,
        dry_run:          td.dry_run ?? true,
        sections_written: td.sections_written ?? 0,
        assets_written:   td.assets_written ?? 0,
        errors_count:     (td.errors || []).length,
        warnings_count:   (td.warnings || []).length,
      };
    }
  }

  return record;
}

/**
 * Write a run record to outputs/runs/{execution_id}.json and update the index.
 * Returns the path written.
 */
function persistRunRecord(record, silent) {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });

    const recordPath = path.join(RUNS_DIR, `${record.execution_id}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));

    const indexPath = path.join(RUNS_DIR, 'index.json');
    let index = [];
    if (fs.existsSync(indexPath)) {
      try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch (_) { index = []; }
    }

    const summary = {
      execution_id:    record.execution_id,
      project_id:      record.project_id,
      started_at:      record.started_at,
      finished_at:     record.finished_at,
      duration_ms:     record.duration_ms,
      status:          record.status,
      terminal_status: record.terminal_status,
    };
    const existing = index.findIndex((e) => e.execution_id === record.execution_id);
    if (existing >= 0) { index[existing] = summary; } else { index.unshift(summary); }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    if (!silent) console.log(`\n  Persisted: outputs/runs/${record.execution_id}.json`);
    return recordPath;
  } catch (e) {
    if (!silent) console.error(`\n  WARN: Could not persist run record: ${e.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  const args = parseArgs();

  const N8N_BASE_URL = process.env.N8N_BASE_URL;
  const N8N_API_KEY  = process.env.N8N_API_KEY;
  const API_TOKEN    = process.env.STORE_OS_API_TOKEN;

  if (!N8N_BASE_URL) {
    console.error('ERROR: N8N_BASE_URL must be set in .env');
    process.exit(1);
  }

  // ── Poll-only mode ──────────────────────────────────────────────────────
  if (args.executionId) {
    if (!N8N_API_KEY) {
      console.error('ERROR: N8N_API_KEY must be set in .env for polling.');
      process.exit(1);
    }
    if (!args.silent) console.log(`\nPolling execution ${args.executionId}...`);
    const pollStartedAt = Date.now();
    let ex, pollError;
    try {
      ex = await pollExecution(args.executionId, N8N_API_KEY, N8N_BASE_URL, args.timeout, args.pollInterval, args.silent);
    } catch (e) {
      pollError = e;
    }
    const pollFinishedAt = Date.now();
    const finalResult = ex ? extractResultFromExecution(ex) : null;
    const durationMs = pollFinishedAt - pollStartedAt;

    const record = buildRunRecord(finalResult, args.executionId, pollStartedAt, pollFinishedAt, pollError || null);
    persistRunRecord(record, args.silent);

    if (pollError) { console.error('\nFATAL:', pollError.message); process.exit(1); }

    if (finalResult) {
      if (args.silent) {
        console.log(JSON.stringify(finalResult, null, 2));
      } else {
        printSummary(finalResult, 200, durationMs, pollStartedAt);
      }
      const TERMINAL = new Set(['GOLD_PATH_COMPLETE', 'GOLD_PATH_PARTIAL',
                                 'PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE',
                                 'PHASE_6C_COMPLETE', 'PHASE_6_COMPLETE', 'PHASE_7A_COMPLETE',
                                 'PHASE_7B1_COMPLETE', 'PHASE_7B1_PARTIAL',
                                 'PHASE_7B2_COMPLETE', 'PHASE_7B2_PARTIAL',
                                 'PHASE_7B3_COMPLETE', 'PHASE_7B3_PARTIAL', 'PHASE_7B3_DRY_RUN', 'PHASE_7B3_BLOCKED']);
      if (!TERMINAL.has(finalResult.status)) process.exit(1);
    } else {
      console.error('ERROR: Could not extract result from execution data.');
      process.exit(1);
    }
    return;
  }

  // ── Trigger mode ────────────────────────────────────────────────────────
  if (!args.input) {
    console.error('Usage:');
    console.error('  node scripts/run-orchestrator.js --input <json-file>');
    console.error('  node scripts/run-orchestrator.js --execution-id <id>   # poll only');
    process.exit(1);
  }

  const inputPath = path.resolve(ROOT, args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: Input file not found: ${inputPath}`);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const sendPayload = { ...payload };
  delete sendPayload._meta;

  if (!args.silent) {
    console.log(`\nstore-os run-orchestrator`);
    console.log(`  input:   ${inputPath}`);
    console.log(`  target:  ${N8N_BASE_URL}/webhook/orchestrate-phase1`);
    console.log(`  mode:    async (webhook → execution_id → poll n8n API)`);
    console.log(`  auth:    ${API_TOKEN ? 'Bearer token configured' : 'no token (STORE_OS_API_TOKEN not set)'}`);
    console.log(`  api_key: ${N8N_API_KEY ? 'configured' : 'NOT SET (will trigger only, no polling)'}`);

    if (args.dryRun) {
      console.log('\n[DRY RUN] Payload validated locally. Not sending request.');
      console.log('  project_id:', sendPayload.intake_payload?.project_id);
      process.exit(0);
    }
    console.log('\nSending request...\n');
  }

  const webhookUrl = `${N8N_BASE_URL.replace(/\/$/, '')}/webhook/orchestrate-phase1`;
  const headers    = {};
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;

  const startedAt = Date.now();

  // Step 1: Trigger webhook — expect quick 202 with execution_id
  let startResponse;
  try {
    startResponse = await httpRequest('POST', webhookUrl, sendPayload, headers, 30000);
  } catch (e) {
    console.error('FATAL: Failed to start run:', e.message);
    process.exit(1);
  }

  if (startResponse.status < 200 || startResponse.status >= 300) {
    console.error(`FATAL: Webhook returned HTTP ${startResponse.status}`);
    if (startResponse.data) console.error('  Response:', typeof startResponse.data === 'string' ? startResponse.data.slice(0, 200) : JSON.stringify(startResponse.data).slice(0, 200));
    process.exit(1);
  }

  const startData = typeof startResponse.data === 'object' ? startResponse.data : {};

  // Detect async response vs legacy synchronous response
  const TERMINAL_STATUSES = new Set(['GOLD_PATH_COMPLETE', 'GOLD_PATH_PARTIAL',
                                      'PHASE_5_COMPLETE', 'PHASE_6A_COMPLETE', 'PHASE_6B_COMPLETE',
                                      'PHASE_6C_COMPLETE', 'PHASE_6_COMPLETE', 'PHASE_7A_COMPLETE',
                                      'PHASE_7B1_COMPLETE', 'PHASE_7B1_PARTIAL',
                                      'PHASE_7B2_COMPLETE', 'PHASE_7B2_PARTIAL',
                                      'PHASE_7B3_COMPLETE', 'PHASE_7B3_PARTIAL', 'PHASE_7B3_DRY_RUN', 'PHASE_7B3_BLOCKED']);
  const isLegacySync = startData.status && TERMINAL_STATUSES.has(startData.status);

  if (isLegacySync) {
    // Old-style synchronous response — display directly
    if (!args.silent) console.log('[legacy] Synchronous response received.');
    const durationMs = Date.now() - startedAt;
    if (args.silent) {
      console.log(JSON.stringify({ http_status: startResponse.status, duration_ms: durationMs, ...startData }, null, 2));
    } else {
      printSummary(startData, startResponse.status, durationMs, startedAt);
    }
    if (!TERMINAL_STATUSES.has(startData.status)) process.exit(1);
    return;
  }

  const executionId = startData.execution_id;
  if (!executionId) {
    console.error('ERROR: No execution_id in webhook response. Cannot poll.');
    console.error('  Response:', JSON.stringify(startData).slice(0, 300));
    process.exit(1);
  }

  if (!args.silent) {
    console.log(`  execution_id: ${executionId}`);
    console.log(`  project_id:   ${startData.project_id || '—'}`);
    console.log(`  started_at:   ${startData.started_at || new Date().toISOString()}`);
  }

  // Step 2: --no-poll mode — just print id and exit
  if (args.noPoll) {
    console.log(`\nExecution started: ${executionId}`);
    console.log(`Poll with: node scripts/run-orchestrator.js --execution-id ${executionId}`);
    return;
  }

  // Step 3: Poll for result
  if (!N8N_API_KEY) {
    console.log(`\n⚠  N8N_API_KEY not set — cannot poll automatically.`);
    console.log(`   Execution started: ${executionId}`);
    console.log(`   Add N8N_API_KEY to .env, then poll with:`);
    console.log(`   node scripts/run-orchestrator.js --execution-id ${executionId}`);
    return;
  }

  if (!args.silent) {
    console.log(`\n  Waiting for chain to complete (polling every ${args.pollInterval / 1000}s)...`);
  }

  let executionData, runError;
  try {
    executionData = await pollExecution(executionId, N8N_API_KEY, N8N_BASE_URL, args.timeout, args.pollInterval, args.silent);
  } catch (e) {
    runError = e;
  }

  const finishedAt  = Date.now();
  const durationMs  = finishedAt - startedAt;
  const finalResult = executionData ? extractResultFromExecution(executionData) : null;

  // Persist regardless of success or failure
  const record = buildRunRecord(finalResult, executionId, startedAt, finishedAt, runError || null);
  persistRunRecord(record, args.silent);

  if (runError) {
    console.error('\nFATAL:', runError.message);
    process.exit(1);
  }

  if (!finalResult) {
    console.error('\nERROR: Could not extract final result from completed execution.');
    console.error('  Execution ID:', executionId, '| Last node:', (executionData.data?.resultData?.lastNodeExecuted || 'unknown'));
    process.exit(1);
  }

  if (args.silent) {
    console.log(JSON.stringify({ http_status: startResponse.status, duration_ms: durationMs, ...finalResult }, null, 2));
  } else {
    printSummary(finalResult, startResponse.status, durationMs, startedAt);
  }

  if (!TERMINAL_STATUSES.has(finalResult.status)) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
