#!/usr/bin/env node
/**
 * patch-orchestrator-terminal-templates.js
 *
 * Updates the Phase 7B.3 Complete terminal node in orchestrate-phase1.n8n.json to:
 * 1. Include templates_written and written_files from theme deployment
 * 2. Add storefront assembly summary to output
 *
 * One-time use. Run: node scripts/patch-orchestrator-terminal-templates.js
 */

const fs = require('fs');
const path = require('path');

const WF_PATH = path.join(__dirname, '..', 'workflows', 'n8n', 'orchestrate-phase1.n8n.json');

const wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));

const terminalNode = wf.nodes.find(n => n.name === 'Phase 7B.3 Complete');
if (!terminalNode) throw new Error('Node "Phase 7B.3 Complete" not found');

// Replace the shopify_theme_deployment block to include new fields
const oldCode = terminalNode.parameters.jsCode;

const oldBlock = `  // Phase 7B.3 — Theme Deployment
  shopify_theme_deployment: {
    status:           themeOut.status,
    theme_id:         themeOut.theme_id,
    theme_name:       themeOut.theme_name,
    sections_written: themeOut.sections_written,
    assets_written:   themeOut.assets_written,
    dry_run:          themeOut.dry_run,
    dry_run_plan:     themeOut.dry_run_plan || undefined,
    errors:           themeOut.errors,
    warnings:         themeOut.warnings,
    shop_url:         themeOut.shop_url,
    safety_notes:     themeOut.safety_notes,
  },`;

const newBlock = `  // Phase 7B.3 — Theme Deployment + Storefront Assembly
  shopify_theme_deployment: {
    status:            themeOut.status,
    theme_id:          themeOut.theme_id,
    theme_name:        themeOut.theme_name,
    sections_written:  themeOut.sections_written,
    assets_written:    themeOut.assets_written,
    templates_written: themeOut.templates_written || 0,
    written_files:     themeOut.written_files || [],
    dry_run:           themeOut.dry_run,
    dry_run_plan:      themeOut.dry_run_plan || undefined,
    errors:            themeOut.errors,
    warnings:          themeOut.warnings,
    shop_url:          themeOut.shop_url,
    safety_notes:      themeOut.safety_notes,
  },`;

if (!oldCode.includes(oldBlock)) {
  throw new Error('Could not find the expected shopify_theme_deployment block in terminal node');
}

terminalNode.parameters.jsCode = oldCode.replace(oldBlock, newBlock);

fs.writeFileSync(WF_PATH, JSON.stringify(wf, null, 2) + '\n');
console.log('✅ Patched orchestrate-phase1.n8n.json terminal node');
console.log('   - Added templates_written and written_files to shopify_theme_deployment output');
