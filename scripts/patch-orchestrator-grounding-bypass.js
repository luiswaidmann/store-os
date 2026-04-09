#!/usr/bin/env node
/**
 * patch-orchestrator-grounding-bypass.js
 *
 * Fixes the grounding step in the orchestrator. When products have no Shopify
 * images, build-image-grounding returns 0 items and downstream nodes never fire.
 *
 * Solution: Replace the linear grounding chain with a conditional:
 *   Prepare Image Grounding Input → Has Images To Ground?
 *     → (yes) Run build-image-grounding → Normalize Grounding Result → Prepare Media Assets Input
 *     → (no)  ──────────────────────────────────────────────────────→ Prepare Media Assets Input
 *
 * Also adds "Normalize Grounding Result" to ensure 1 item is always produced
 * even if the subworkflow returns 0 items (by referencing Prepare Image Grounding Input).
 */

const fs = require('fs');
const path = require('path');

const ORCH_PATH = path.resolve(__dirname, '..', 'workflows', 'n8n', 'orchestrate-phase1.n8n.json');
const wf = JSON.parse(fs.readFileSync(ORCH_PATH, 'utf8'));

// ─── 1. Modify Prepare Image Grounding Input to add has_images flag ────────

const prepGroundNode = wf.nodes.find(n => n.name === 'Prepare Image Grounding Input');
prepGroundNode.parameters.jsCode = `// orchestrate-phase1 — Prepare Image Grounding Input (Phase 12)
// Assembles input for build-image-grounding from upstream artifacts.
// Adds has_images flag for conditional routing.

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
const hasImages = productsWithImages.length > 0;

console.log('Prepare Image Grounding Input: ' + productsWithImages.length + '/' + products.length + ' products have images. has_images=' + hasImages);

return [{
  json: {
    has_images:      hasImages,
    project_id:      phase7b2Out.project_id,
    runtime_config:  phase7b2Out.runtime_config,
    store_blueprint: { ...phase7b2Out.store_blueprint, products },
  },
}];`;

console.log('Updated Prepare Image Grounding Input with has_images flag');

// ─── 2. Add "Has Images To Ground?" If node ────────────────────────────────

const hasImagesNode = {
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      conditions: [
        {
          id: 'p12-ground-cond-0001',
          leftValue: '={{ $json.has_images }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'equals' },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  id: 'p12-orch-0010',
  name: 'Has Images To Ground?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2,
  position: [12875, 180],
};

wf.nodes.push(hasImagesNode);
console.log('Added Has Images To Ground? node');

// ─── 3. Add "Normalize Grounding Result" Code node ─────────────────────────
// Ensures 1 item is always produced after grounding, even if subworkflow returned 0.

const normalizeNode = {
  parameters: {
    jsCode: `// orchestrate-phase1 — Normalize Grounding Result
// Ensures the grounding step always produces exactly 1 item for downstream consumption.
// If build-image-grounding returned data, pass it through.
// If it returned nothing (0 items) or errored, produce a null placeholder.

const items = $input.all();

if (items.length > 0 && items[0].json && items[0].json.status) {
  // Grounding returned valid data
  console.log('Normalize Grounding Result: grounding data present — status=' + items[0].json.status);
  return items;
}

// Grounding returned nothing or errored — produce null placeholder
console.log('Normalize Grounding Result: no grounding data — continuing with text-only prompts');
const prepInput = $('Prepare Image Grounding Input').first().json;
return [{
  json: {
    status: null,
    project_id: prepInput.project_id,
    products_analyzed: 0,
    grounding_model: null,
    products: [],
    _grounding_skipped: true,
  },
}];`,
  },
  id: 'p12-orch-0011',
  name: 'Normalize Grounding Result',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [13125, 60],
};

wf.nodes.push(normalizeNode);
console.log('Added Normalize Grounding Result node');

// ─── 4. Rewire connections ──────────────────────────────────────────────────

// Prepare Image Grounding Input → Has Images To Ground? (was: Run build-image-grounding)
wf.connections['Prepare Image Grounding Input'] = {
  main: [[{ node: 'Has Images To Ground?', type: 'main', index: 0 }]],
};

// Has Images To Ground? → (true) Run build-image-grounding | (false) Prepare Media Assets Input
wf.connections['Has Images To Ground?'] = {
  main: [
    [{ node: 'Run build-image-grounding', type: 'main', index: 0 }],     // true: has images
    [{ node: 'Prepare Media Assets Input', type: 'main', index: 0 }],    // false: no images, skip
  ],
};

// Run build-image-grounding → Normalize Grounding Result (was: Prepare Media Assets Input)
wf.connections['Run build-image-grounding'] = {
  main: [[{ node: 'Normalize Grounding Result', type: 'main', index: 0 }]],
};

// Normalize Grounding Result → Prepare Media Assets Input
wf.connections['Normalize Grounding Result'] = {
  main: [[{ node: 'Prepare Media Assets Input', type: 'main', index: 0 }]],
};

console.log('Rewired connections: Has Images To Ground? → (yes) grounding → normalize → media | (no) → media');

// ─── 5. Update Prepare Media Assets Input to handle both paths ──────────────

const prepMediaNode = wf.nodes.find(n => n.name === 'Prepare Media Assets Input');
prepMediaNode.parameters.jsCode = `// orchestrate-phase1 — Prepare Media Assets Input (Phase 9)
// Assembles input for build-media-assets from all upstream artifacts.
// Receives input from EITHER:
//   1. Normalize Grounding Result (when products had images)
//   2. Has Images To Ground? false branch (when no images available)

const phase7b2Out    = $('Phase 7B.2 Complete').first().json;
const themeRulesOut  = $('Run build-theme-rules').first().json;

// Get grounding data from input (may come from either path)
const inputData = $input.first().json;

// Extract theme_rules if build-theme-rules succeeded
const themeRules = (themeRulesOut && themeRulesOut.theme_rules && themeRulesOut.theme_rules.status === 'PHASE_10_COMPLETE')
  ? themeRulesOut.theme_rules
  : null;

// Extract image_grounding — either from grounding workflow or null
let imageGrounding = null;
if (inputData && inputData.status &&
    (inputData.status === 'PHASE_12_COMPLETE' || inputData.status === 'PHASE_12_PARTIAL')) {
  imageGrounding = inputData;
}

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
    project_id:        phase7b2Out.project_id,
    runtime_config:    phase7b2Out.runtime_config,
    store_profile:     phase7b2Out.store_profile,
    brand_positioning: phase7b2Out.brand_positioning,
    store_blueprint:   phase7b2Out.store_blueprint,
    content_strategy:  phase7b2Out.content_strategy,
    theme_rules:       themeRules,
    image_grounding:   imageGrounding,
  },
}];`;

console.log('Updated Prepare Media Assets Input to handle both paths');

// ─── 6. Write result ────────────────────────────────────────────────────────

fs.writeFileSync(ORCH_PATH, JSON.stringify(wf, null, 2));
console.log(`\nWrote updated orchestrator to ${ORCH_PATH}`);
console.log(`Total nodes: ${wf.nodes.length}`);
