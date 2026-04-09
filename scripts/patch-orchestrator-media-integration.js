#!/usr/bin/env node
/**
 * patch-orchestrator-media-integration.js
 *
 * Modifies orchestrate-phase1.n8n.json to:
 * 1. Insert build-image-grounding + build-media-assets into the orchestrator chain
 * 2. Harden success criteria (replace != FAILED with == COMPLETE || == PARTIAL)
 * 3. Update terminal output to include media artifacts + section→media mapping
 * 4. Shift downstream node positions to make room
 */

const fs = require('fs');
const path = require('path');

const ORCH_PATH = path.resolve(__dirname, '..', 'workflows', 'n8n', 'orchestrate-phase1.n8n.json');
const wf = JSON.parse(fs.readFileSync(ORCH_PATH, 'utf8'));

// ─── 1. SHIFT DOWNSTREAM NODES ─────────────────────────────────────────────
// Nodes from "Prepare Theme Input" onwards need to shift right by 1500px
// to make room for 6 new nodes (each ~250px apart)

const SHIFT_X = 1500;
const shiftNodes = [
  'Prepare Theme Input',
  'Run build-shopify-theme',
  'Shopify Theme Success?',
  'Phase 7B.3 Complete',
  'Halt - Shopify Theme Failed',
];

for (const n of wf.nodes) {
  if (shiftNodes.includes(n.name)) {
    n.position[0] += SHIFT_X;
    console.log(`  Shifted ${n.name} to [${n.position}]`);
  }
}

// ─── 2. ADD NEW NODES ──────────────────────────────────────────────────────

const newNodes = [
  // ── Prepare Image Grounding Input ──
  {
    parameters: {
      jsCode: `// orchestrate-phase1 — Prepare Image Grounding Input (Phase 12)
// Assembles input for build-image-grounding from upstream artifacts.
// Uses shopify_import for real product image URLs from Shopify CDN.

const phase7b2Out = $('Phase 7B.2 Complete').first().json;
const importOut   = $('Run import-shopify-data').first().json;

// Get product image URLs from Shopify import (real CDN images)
const shopifyImport = importOut.shopify_import || importOut;
const rawProducts = shopifyImport.raw_products || shopifyImport.products || [];

// Map product handles to their images from Shopify
const productImages = {};
for (const p of rawProducts) {
  const handle = p.handle;
  if (handle && p.images && p.images.length > 0) {
    productImages[handle] = p.images;
  }
}

// Merge image URLs into store_blueprint products
const products = (phase7b2Out.store_blueprint.products || []).map(bp => {
  const shopifyImages = productImages[bp.handle] || [];
  return {
    ...bp,
    images: shopifyImages.length > 0
      ? shopifyImages.map(img => ({ src: img.src, alt: img.alt || bp.title }))
      : (bp.images || []),
  };
});

const productsWithImages = products.filter(p => p.images && p.images.length > 0);
console.log('Prepare Image Grounding Input: ' + productsWithImages.length + '/' + products.length + ' products have images');

return [{
  json: {
    project_id:      phase7b2Out.project_id,
    runtime_config:  phase7b2Out.runtime_config,
    store_blueprint: { ...phase7b2Out.store_blueprint, products },
  },
}];`,
    },
    id: 'p12-orch-0001',
    name: 'Prepare Image Grounding Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [12750, 180],
  },

  // ── Run build-image-grounding ──
  {
    parameters: {
      source: 'database',
      workflowId: {
        __rl: true,
        value: 'REPLACE_WITH_BUILD_IMAGE_GROUNDING_WORKFLOW_ID',
        mode: 'id',
      },
      options: {},
    },
    id: 'p12-orch-0002',
    name: 'Run build-image-grounding',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [13000, 180],
    continueOnFail: true,
  },

  // ── Prepare Media Assets Input ──
  {
    parameters: {
      jsCode: `// orchestrate-phase1 — Prepare Media Assets Input (Phase 9)
// Assembles input for build-media-assets from all upstream artifacts.
// Includes theme_rules (Phase 10) and image_grounding (Phase 12) when available.

const phase7b2Out    = $('Phase 7B.2 Complete').first().json;
const themeRulesOut  = $('Run build-theme-rules').first().json;
const groundingOut   = $input.first().json;  // from Run build-image-grounding

// Extract theme_rules if build-theme-rules succeeded
const themeRules = (themeRulesOut && themeRulesOut.theme_rules && themeRulesOut.theme_rules.status === 'PHASE_10_COMPLETE')
  ? themeRulesOut.theme_rules
  : null;

// Extract image_grounding if build-image-grounding succeeded
const imageGrounding = (groundingOut && groundingOut.status &&
  (groundingOut.status === 'PHASE_12_COMPLETE' || groundingOut.status === 'PHASE_12_PARTIAL'))
  ? groundingOut
  : null;

if (themeRules) {
  console.log('Prepare Media Assets Input: theme_rules present — pattern=' + themeRules.store_pattern);
} else {
  console.log('Prepare Media Assets Input: no theme_rules — will use 5-shot fallback');
}

if (imageGrounding) {
  console.log('Prepare Media Assets Input: image_grounding present — ' + (imageGrounding.products_analyzed || 0) + ' products analyzed');
} else {
  console.log('Prepare Media Assets Input: no image_grounding — will use text-only prompts');
}

return [{
  json: {
    project_id:       phase7b2Out.project_id,
    runtime_config:   phase7b2Out.runtime_config,
    store_profile:    phase7b2Out.store_profile,
    brand_positioning: phase7b2Out.brand_positioning,
    store_blueprint:  phase7b2Out.store_blueprint,
    content_strategy: phase7b2Out.content_strategy,
    theme_rules:      themeRules,
    image_grounding:  imageGrounding,
  },
}];`,
    },
    id: 'p9-orch-0001',
    name: 'Prepare Media Assets Input',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [13250, 180],
  },

  // ── Run build-media-assets ──
  {
    parameters: {
      source: 'database',
      workflowId: {
        __rl: true,
        value: 'REPLACE_WITH_BUILD_MEDIA_ASSETS_WORKFLOW_ID',
        mode: 'id',
      },
      options: {},
    },
    id: 'p9-orch-0002',
    name: 'Run build-media-assets',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [13500, 180],
  },

  // ── Media Assets Success? ──
  {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
        },
        conditions: [
          {
            id: 'p9-orch-cond-0001',
            leftValue: '={{ $json.status }}',
            rightValue: 'PHASE_9_COMPLETE',
            operator: { type: 'string', operation: 'equals' },
          },
          {
            id: 'p9-orch-cond-0002',
            leftValue: '={{ $json.status }}',
            rightValue: 'PHASE_9_PARTIAL',
            operator: { type: 'string', operation: 'equals' },
          },
        ],
        combinator: 'or',
      },
      options: {},
    },
    id: 'p9-orch-0003',
    name: 'Media Assets Success?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [13750, 180],
  },

  // ── Halt - Media Assets Failed ──
  {
    parameters: {
      jsCode: `// orchestrate-phase1 — Halt: Media Assets Failed
// Reached when build-media-assets does not return PHASE_9_COMPLETE or PHASE_9_PARTIAL.

const mediaOut = $('Run build-media-assets').first().json;

throw new Error(
  'CHAIN_HALT: build-media-assets returned ' + (mediaOut.status || 'unknown') +
  '. Expected PHASE_9_COMPLETE or PHASE_9_PARTIAL. ' +
  'Errors: ' + JSON.stringify(mediaOut.errors || [])
);`,
    },
    id: 'p9-orch-0004',
    name: 'Halt - Media Assets Failed',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [14000, 300],
  },
];

wf.nodes.push(...newNodes);
console.log(`Added ${newNodes.length} new nodes`);

// ─── 3. REWIRE CONNECTIONS ──────────────────────────────────────────────────

// Break: Run build-theme-rules → Prepare Theme Input
// Insert: Run build-theme-rules → Prepare Image Grounding Input → ... → Prepare Theme Input

wf.connections['Run build-theme-rules'] = {
  main: [[{ node: 'Prepare Image Grounding Input', type: 'main', index: 0 }]],
};

wf.connections['Prepare Image Grounding Input'] = {
  main: [[{ node: 'Run build-image-grounding', type: 'main', index: 0 }]],
};

wf.connections['Run build-image-grounding'] = {
  main: [[{ node: 'Prepare Media Assets Input', type: 'main', index: 0 }]],
};

wf.connections['Prepare Media Assets Input'] = {
  main: [[{ node: 'Run build-media-assets', type: 'main', index: 0 }]],
};

wf.connections['Run build-media-assets'] = {
  main: [[{ node: 'Media Assets Success?', type: 'main', index: 0 }]],
};

wf.connections['Media Assets Success?'] = {
  main: [
    [{ node: 'Prepare Theme Input', type: 'main', index: 0 }],     // true (success)
    [{ node: 'Halt - Media Assets Failed', type: 'main', index: 0 }], // false (failure)
  ],
};

console.log('Rewired connections for media integration chain');

// ─── 4. UPDATE PREPARE THEME INPUT ─────────────────────────────────────────
// Now also receives media_assets from upstream and passes to build-shopify-theme

const prepThemeNode = wf.nodes.find(n => n.name === 'Prepare Theme Input');
prepThemeNode.parameters.jsCode = `// orchestrate-phase1 — Prepare Theme Input
// Assembles Phase 7B.3 input from upstream artifacts.
// Now includes theme_rules (Phase 10) and media_assets (Phase 9).

const phase7b2Out   = $('Phase 7B.2 Complete').first().json;
const themeRulesOut = $('Run build-theme-rules').first().json;
const mediaOut      = $('Run build-media-assets').first().json;

// Extract theme_rules if build-theme-rules succeeded
const themeRules = (themeRulesOut && themeRulesOut.theme_rules && themeRulesOut.theme_rules.status === 'PHASE_10_COMPLETE')
  ? themeRulesOut.theme_rules
  : null;

if (themeRules) {
  console.log('Prepare Theme Input: theme_rules present — pattern=' + themeRules.store_pattern);
} else {
  console.log('Prepare Theme Input: no theme_rules — build-shopify-theme will use blueprint sections');
}

// Extract media_assets for theme asset binding
const mediaAssets = (mediaOut && (mediaOut.status === 'PHASE_9_COMPLETE' || mediaOut.status === 'PHASE_9_PARTIAL'))
  ? mediaOut.media_assets
  : [];

console.log('Prepare Theme Input: ' + mediaAssets.length + ' media assets available for theme binding');

const output = {
  project_id:       phase7b2Out.project_id,
  runtime_config:   phase7b2Out.runtime_config,
  store_blueprint:  phase7b2Out.store_blueprint,
  content_strategy: phase7b2Out.content_strategy,
  theme_rules:      themeRules,
  media_assets:     mediaAssets,
};

if (!output.store_blueprint) {
  throw new Error('Prepare Theme Input: store_blueprint missing from Phase 7B.2 Complete output.');
}
if (!output.runtime_config) {
  throw new Error('Prepare Theme Input: runtime_config missing from Phase 7B.2 Complete output.');
}

console.log('Prepare Theme Input: assembled for project=' + output.project_id);
return [{ json: output }];`;

console.log('Updated Prepare Theme Input to include media_assets');

// ─── 5. UPDATE PHASE 7B.3 COMPLETE (TERMINAL) ──────────────────────────────
// Include media generation results + section→media mapping in final output

const terminalNode = wf.nodes.find(n => n.name === 'Phase 7B.3 Complete');
terminalNode.parameters.jsCode = `// orchestrate-phase1 — Phase 7B.3 Complete (TERMINAL)
// Returns all artifacts inline. Includes media generation + section→media mapping.
// Success requires: theme written + media generated + mappings confirmed.

const phase7b2Out = $('Phase 7B.2 Complete').first().json;
const themeOut    = $('Run build-shopify-theme').first().json;
const mediaOut    = $('Run build-media-assets').first().json;
const groundOut   = $('Run build-image-grounding').first().json;
const themeRulesOut = $('Run build-theme-rules').first().json;

// ── Determine top-level status ──
const themeStatus = themeOut.status || 'PHASE_7B3_FAILED';
const mediaStatus = mediaOut.status || 'PHASE_9_FAILED';

let topStatus;
if (themeStatus === 'PHASE_7B3_COMPLETE' && mediaStatus === 'PHASE_9_COMPLETE') {
  topStatus = 'GOLD_PATH_COMPLETE';
} else if (themeStatus === 'PHASE_7B3_COMPLETE' && mediaStatus === 'PHASE_9_PARTIAL') {
  topStatus = 'GOLD_PATH_PARTIAL';
} else if (themeStatus === 'PHASE_7B3_PARTIAL' || mediaStatus === 'PHASE_9_PARTIAL') {
  topStatus = 'GOLD_PATH_PARTIAL';
} else {
  topStatus = themeStatus;  // DRY_RUN, BLOCKED, etc.
}

// ── Build section → media mapping ──
const mediaAssets = mediaOut.media_assets || [];
const sectionMediaMap = {};
for (const asset of mediaAssets) {
  const section = asset.source_section || 'unassigned';
  if (!sectionMediaMap[section]) sectionMediaMap[section] = [];
  sectionMediaMap[section].push({
    asset_id:         asset.asset_id,
    shot_type:        asset.shot_type,
    product_handle:   asset.product_handle,
    status:           asset.status,
    generation_mode:  asset.generation_mode,
    grounding_confidence: asset.grounding_confidence,
    url:              asset.url || null,
    local_path:       asset.local_path || null,
  });
}

// ── Build product → media mapping ──
const productMediaMap = {};
for (const asset of mediaAssets) {
  const handle = asset.product_handle;
  if (!productMediaMap[handle]) productMediaMap[handle] = [];
  productMediaMap[handle].push({
    asset_id:   asset.asset_id,
    shot_type:  asset.shot_type,
    status:     asset.status,
    url:        asset.url || null,
  });
}

// ── Extract theme_rules ──
const themeRules = (themeRulesOut && themeRulesOut.theme_rules && themeRulesOut.theme_rules.status === 'PHASE_10_COMPLETE')
  ? themeRulesOut.theme_rules
  : null;

// ── Extract image_grounding summary ──
const groundingSummary = (groundOut && groundOut.status)
  ? {
      status: groundOut.status,
      products_analyzed: groundOut.products_analyzed || 0,
      grounding_model: groundOut.grounding_model || null,
    }
  : null;

// ── Assemble final output ──
const summary = {
  ...phase7b2Out,
  status: topStatus,

  // Phase 10 — Theme Rules
  theme_rules: themeRules,

  // Phase 12 — Image Grounding
  image_grounding_summary: groundingSummary,

  // Phase 9 — Media Generation
  media_generation: {
    status:             mediaOut.status,
    mode:               (mediaOut.generation_summary || {}).mode,
    images_generated:   (mediaOut.generation_summary || {}).images_generated || 0,
    images_failed:      (mediaOut.generation_summary || {}).images_failed || 0,
    images_skipped:     (mediaOut.generation_summary || {}).images_skipped || 0,
    prompts_generated:  (mediaOut.generation_summary || {}).prompts_generated || 0,
    total_assets:       mediaAssets.length,
    assets_by_status:   mediaAssets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
  },

  // Visible output mappings
  section_media_map:  sectionMediaMap,
  product_media_map:  productMediaMap,

  // Phase 7B.3 — Theme Deployment
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
  },
};

return [{ json: summary }];`;

console.log('Updated Phase 7B.3 Complete with media artifacts + section/product mapping');

// ─── 6. HARDEN SUCCESS CRITERIA ────────────────────────────────────────────
// Replace all `!= FAILED` checks with `== COMPLETE || == PARTIAL`

const successChecks = [
  {
    name: 'Shopify Catalog Success?',
    conditions: [
      { id: '7b1-hard-0001', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B1_COMPLETE', operator: { type: 'string', operation: 'equals' } },
      { id: '7b1-hard-0002', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B1_PARTIAL', operator: { type: 'string', operation: 'equals' } },
    ],
    combinator: 'or',
  },
  {
    name: 'Shopify Pages/Nav Success?',
    conditions: [
      { id: '7b2-hard-0001', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B2_COMPLETE', operator: { type: 'string', operation: 'equals' } },
      { id: '7b2-hard-0002', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B2_PARTIAL', operator: { type: 'string', operation: 'equals' } },
    ],
    combinator: 'or',
  },
  {
    name: 'Shopify Theme Success?',
    conditions: [
      { id: '7b3-hard-0001', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B3_COMPLETE', operator: { type: 'string', operation: 'equals' } },
      { id: '7b3-hard-0002', leftValue: '={{ $json.status }}', rightValue: 'PHASE_7B3_PARTIAL', operator: { type: 'string', operation: 'equals' } },
    ],
    combinator: 'or',
  },
];

for (const check of successChecks) {
  const node = wf.nodes.find(n => n.name === check.name);
  if (!node) {
    console.warn(`  WARNING: Node "${check.name}" not found — skipping`);
    continue;
  }
  node.parameters.conditions.conditions = check.conditions;
  node.parameters.conditions.combinator = check.combinator;
  console.log(`  Hardened: ${check.name} → == COMPLETE || == PARTIAL`);
}

// ─── 7. WRITE RESULT ───────────────────────────────────────────────────────

fs.writeFileSync(ORCH_PATH, JSON.stringify(wf, null, 2));
console.log(`\nWrote updated orchestrator to ${ORCH_PATH}`);
console.log(`Total nodes: ${wf.nodes.length}`);
