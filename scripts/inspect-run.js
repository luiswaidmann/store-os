#!/usr/bin/env node
/**
 * inspect-run.js
 *
 * Read path for persisted store-os execution records.
 * Records are written to outputs/runs/ by run-orchestrator.js.
 *
 * Usage:
 *   node scripts/inspect-run.js <execution_id>         — full record for one run
 *   node scripts/inspect-run.js --list                 — list all runs (newest first)
 *   node scripts/inspect-run.js --latest               — show the most recent run
 *   node scripts/inspect-run.js --project <project_id> — list runs for a project
 *   node scripts/inspect-run.js --project <id> --latest — latest run for project
 *
 * Flags:
 *   --json    — print raw JSON (any mode)
 *   --summary — print compact one-line summary per run (--list only)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const RUNS_DIR = path.join(ROOT, 'outputs', 'runs');
const INDEX    = path.join(RUNS_DIR, 'index.json');

// ── Helpers ───────────────────────────────────────────────────────────────

function loadIndex() {
  if (!fs.existsSync(INDEX)) return [];
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch (_) { return []; }
}

function loadRecord(executionId) {
  const p = path.join(RUNS_DIR, `${executionId}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

// ── Formatters ────────────────────────────────────────────────────────────

function fmtDuration(ms) {
  if (!ms) return '—';
  return ms >= 60000 ? `${Math.round(ms / 1000)}s` : `${ms}ms`;
}

function printRecord(record) {
  const isSuccess = record.status === 'success';
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  store-os run — ${record.started_at || '?'}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  EXECUTION ID:   ${record.execution_id}`);
  console.log(`  PROJECT:        ${record.project_id}`);
  console.log(`  STATUS:         ${record.status}`);
  console.log(`  TERMINAL:       ${record.terminal_status || '—'}`);
  console.log(`  CLOUD MODE:     ${record.cloud_mode !== null ? record.cloud_mode : '—'}`);
  console.log(`  STARTED:        ${record.started_at}`);
  console.log(`  FINISHED:       ${record.finished_at || '—'}`);
  console.log(`  DURATION:       ${fmtDuration(record.duration_ms)}`);

  if (record.error) {
    console.log('');
    console.log(`  ERROR: ${record.error}`);
  }

  if (record.artifacts) {
    const a = record.artifacts;

    if (a.strategy_synthesis) {
      const ss = a.strategy_synthesis;
      console.log('');
      console.log('  STRATEGY SYNTHESIS:');
      if (ss.strategic_summary) {
        console.log(`    strategic_summary: ${ss.strategic_summary.slice(0, 160)}${ss.strategic_summary.length > 160 ? '…' : ''}`);
      }
      if (ss.positioning_focus) {
        console.log(`    positioning_focus: ${String(ss.positioning_focus).slice(0, 120)}`);
      }
    }

    if (a.offer_architecture) {
      const oa = a.offer_architecture;
      console.log('');
      console.log('  OFFER ARCHITECTURE:');
      console.log(`    headline:           ${oa.headline || '—'}`);
      console.log(`    target_buyer:       ${(oa.target_buyer || '—').slice(0, 100)}`);
      console.log(`    pricing_tier:       ${oa.pricing_tier || '—'}`);
      console.log(`    bundles:            ${oa.bundles_count ?? '—'} | upsell_paths: ${oa.upsell_paths_count ?? '—'}`);
    }

    if (a.content_strategy) {
      const cs = a.content_strategy;
      console.log('');
      console.log('  CONTENT STRATEGY:');
      console.log(`    primary_message:    ${(cs.primary_message || '—').slice(0, 120)}`);
      console.log(`    content_pillars:    ${cs.content_pillars_count ?? '—'} | editorial_tone: ${cs.editorial_tone || '—'}`);
      console.log(`    keyword_clusters:   ${cs.keyword_clusters_count ?? '—'} | faq_clusters: ${cs.faq_clusters_count ?? '—'}`);
    }

    if (a.gtm_plan) {
      const gp = a.gtm_plan;
      console.log('');
      console.log('  GTM PLAN:');
      if (gp.gtm_narrative) {
        console.log(`    gtm_narrative:      ${gp.gtm_narrative.slice(0, 140)}${gp.gtm_narrative.length > 140 ? '…' : ''}`);
      }
      console.log(`    launch_phases:      ${gp.launch_phases_count ?? '—'} | channels: ${gp.channels_count ?? '—'} | kpis: ${gp.kpis_count ?? '—'}`);
    }

    if (a.store_blueprint) {
      const sb = a.store_blueprint;
      console.log('');
      console.log('  STORE BLUEPRINT:');
      if (sb.blueprint_narrative) {
        console.log(`    narrative:          ${sb.blueprint_narrative.slice(0, 140)}${sb.blueprint_narrative.length > 140 ? '…' : ''}`);
      }
      console.log(`    products: ${sb.products_count ?? '—'} | collections: ${sb.collections_count ?? '—'} | pages: ${sb.pages_count ?? '—'} | sections: ${sb.theme_sections_count ?? '—'} | assets: ${sb.assets_count ?? '—'}`);
    }
  }

  console.log('');
  if (isSuccess) {
    console.log(`  ✓ ${record.terminal_status} — run complete.`);
  } else {
    console.log(`  ✗ Run failed or did not reach a terminal status.`);
  }
  console.log('');
  console.log(`  Stored at: outputs/runs/${record.execution_id}.json`);
  console.log('');
}

function printList(runs, compact) {
  if (runs.length === 0) {
    console.log('No persisted runs found.');
    return;
  }
  if (compact) {
    runs.forEach((r) => {
      const icon = r.status === 'success' ? '✓' : '✗';
      console.log(`  ${icon}  ${r.execution_id}  ${r.project_id.padEnd(20)}  ${r.terminal_status || r.status}  ${fmtDuration(r.duration_ms)}  ${(r.started_at || '').slice(0, 19)}`);
    });
    return;
  }
  console.log('');
  console.log(`  ${runs.length} run(s) — newest first:`);
  console.log('');
  runs.forEach((r, i) => {
    const icon = r.status === 'success' ? '✓' : '✗';
    console.log(`  ${String(i + 1).padStart(2)}. ${icon}  execution_id: ${r.execution_id}`);
    console.log(`       project:      ${r.project_id}`);
    console.log(`       status:       ${r.terminal_status || r.status}`);
    console.log(`       duration:     ${fmtDuration(r.duration_ms)}`);
    console.log(`       started:      ${(r.started_at || '').slice(0, 19)}`);
    console.log('');
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  const args        = process.argv.slice(2);
  const printJson   = args.includes('--json');
  const listMode    = args.includes('--list');
  const latestMode  = args.includes('--latest');
  const summaryMode = args.includes('--summary');
  const projectIdx  = args.indexOf('--project');
  const projectId   = projectIdx !== -1 ? args[projectIdx + 1] : null;
  const executionId = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a) === false || (!a.startsWith('--') && a.length > 6));

  // Normalise: execution IDs are purely positional (first non-flag arg)
  const posArg = args.find((a) => !a.startsWith('--') && a !== projectId);

  if (!fs.existsSync(RUNS_DIR)) {
    console.error('No runs directory found at outputs/runs/. Run a workflow first.');
    process.exit(1);
  }

  // ── --list ───────────────────────────────────────────────────────────────
  if (listMode) {
    let index = loadIndex();
    if (projectId) index = index.filter((r) => r.project_id === projectId);
    if (printJson) { console.log(JSON.stringify(index, null, 2)); return; }
    printList(index, summaryMode);
    return;
  }

  // ── --latest ─────────────────────────────────────────────────────────────
  if (latestMode) {
    let index = loadIndex();
    if (projectId) index = index.filter((r) => r.project_id === projectId);
    if (index.length === 0) {
      console.error(projectId ? `No runs found for project: ${projectId}` : 'No runs found.');
      process.exit(1);
    }
    const latest = index[0]; // index is newest-first
    const record = loadRecord(latest.execution_id);
    if (!record) {
      console.error(`Record file missing for execution: ${latest.execution_id}`);
      if (printJson) { console.log(JSON.stringify(latest, null, 2)); return; }
      printList([latest], false);
      return;
    }
    if (printJson) { console.log(JSON.stringify(record, null, 2)); return; }
    printRecord(record);
    return;
  }

  // ── --project (list for project) ─────────────────────────────────────────
  if (projectId && !posArg) {
    const index = loadIndex().filter((r) => r.project_id === projectId);
    if (printJson) { console.log(JSON.stringify(index, null, 2)); return; }
    printList(index, summaryMode);
    return;
  }

  // ── <execution_id> ───────────────────────────────────────────────────────
  if (posArg) {
    const record = loadRecord(posArg);
    if (!record) {
      console.error(`No persisted record found for execution: ${posArg}`);
      console.error(`  Checked: outputs/runs/${posArg}.json`);
      process.exit(1);
    }
    if (printJson) { console.log(JSON.stringify(record, null, 2)); return; }
    printRecord(record);
    return;
  }

  // ── No args ───────────────────────────────────────────────────────────────
  console.log('Usage:');
  console.log('  node scripts/inspect-run.js <execution_id>');
  console.log('  node scripts/inspect-run.js --list');
  console.log('  node scripts/inspect-run.js --latest');
  console.log('  node scripts/inspect-run.js --project <project_id>');
  console.log('  node scripts/inspect-run.js --project <project_id> --latest');
  console.log('');
  console.log('Flags: --json (raw output), --summary (compact list)');
  process.exit(1);
}

main();
