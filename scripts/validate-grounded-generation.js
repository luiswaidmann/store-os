#!/usr/bin/env node
/**
 * validate-grounded-generation.js
 *
 * Phase 12B validation: full grounded generation path.
 * Shopify product image → Gemini grounding → grounded prompt → DALL-E → local file
 *
 * Uses the _test-phase12-grounding webhook wrapper which calls build-media-assets
 * with image_grounding data included.
 *
 * Usage:
 *   node scripts/validate-grounded-generation.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ─── Config ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://luwai.app.n8n.cloud/webhook/test-phase12-grounding';
const LOCAL_MEDIA_ROOT = path.resolve(__dirname, '..', 'outputs', 'media');
const ARTIFACT_DIR = path.resolve(__dirname, '..', 'outputs', 'runs');
const REQUEST_TIMEOUT = 180_000; // 3 min — DALL-E generation + grounded prompts

// ─── Grounded payload ────────────────────────────────────────────────────────
// Real Shopify product with real grounding data from Gemini Vision analysis.
// Only high-priority required shots will be generated (hero_wide, studio_packshot).

const RUN_ID = `grounded-gen-${Date.now()}`;

const payload = {
  project_id: RUN_ID,
  runtime_config: {
    allow_media_generation: true,     // FORCE REAL GENERATION
    media_generation_model: 'dall-e-3',
    cloud_mode: false,
  },
  store_profile: {
    vertical: 'electronics',
    price_positioning: 'mass-premium',
    store_name: 'SuppliedTech',
  },
  brand_positioning: {
    brand_role: 'specialist',
    tone_of_voice: { style: 'technical-trustworthy' },
    brand_traits: ['professional', 'reliable', 'efficient'],
    visual_positioning_hint: null,
    media_style_hint: null,
  },
  store_blueprint: {
    products: [
      {
        handle: 'basswave-kabellose-kopfhorer',
        title: 'BassWave Kabellose Kopfhorer',
        product_type: 'headphones',
        description_hint: 'Wireless over-ear headphones with deep bass',
      },
    ],
  },
  content_strategy: null,

  // Phase 10 — theme_rules (specialist-standard, 4-section stack)
  theme_rules: {
    status: 'PHASE_10_COMPLETE',
    store_pattern: 'specialist-standard',
    homepage_layout: {
      section_stack: [
        { section_type: 'hero', order: 1, enabled: true },
        { section_type: 'featured-collection', order: 2, enabled: true },
        { section_type: 'value-prop', order: 3, enabled: true },
        { section_type: 'trust-social-proof', order: 4, enabled: true },
      ],
    },
  },

  // Phase 12 — image_grounding (real Gemini Vision analysis of Shopify product image)
  image_grounding: {
    status: 'PHASE_12_COMPLETE',
    project_id: RUN_ID,
    completed_at: '2026-04-09T10:00:00Z',
    products_analyzed: 1,
    total_images_analyzed: 1,
    grounding_model: 'gemini-2.0-flash',
    products: [
      {
        product_handle: 'basswave-kabellose-kopfhorer',
        product_title: 'BassWave Kabellose Kopfhorer',
        primary_image_url: 'https://cdn.shopify.com/s/files/1/1006/9721/1220/files/13f25816-962f-411f-8772-2de9e51db933_trans.jpg?v=1773165308',
        source_images_analyzed: 1,
        visual_analysis: {
          category: 'wireless headphones',
          form_factor: 'over-ear headphones with padded headband and circular earcups',
          materials: ['plastic', 'foam padding', 'fabric mesh'],
          primary_colors: ['#98D4AA', '#FFFFFF'],
          color_description: 'mint green body with white accents',
          distinctive_features: ['circular earcups', 'cushioned headband', 'minimalist design', 'visible microphone boom'],
          dimensions_estimate: 'approximately 18cm tall, 16cm wide',
          orientation: 'three-quarter front view',
          surface_finish: 'matte plastic',
          brand_markings: null,
          background_quality: 'plain white studio background',
          lighting_quality: 'soft even studio lighting with minimal shadows',
          ecommerce_suitability: 'high',
          improvement_suggestions: ['add lifestyle context shot', 'show folded/travel position'],
        },
        grounding_prompt_additions: {
          product_description_grounded:
            'mint green over-ear wireless headphones with circular earcups, cushioned adjustable headband, soft foam ear padding with fabric mesh covering, matte plastic construction, minimalist Scandinavian-inspired design with clean lines, visible retractable microphone boom on left earcup',
          material_keywords: 'matte plastic, foam padding, fabric mesh, cushioned leatherette',
          shape_keywords: 'over-ear, circular earcups, adjustable headband, compact fold',
          detail_focus_areas: [
            'earcup padding texture',
            'headband adjustment mechanism',
            'microphone boom detail',
            'mint green color finish',
          ],
        },
        source_image_assessment: [
          {
            image_url: 'https://cdn.shopify.com/s/files/1/1006/9721/1220/files/13f25816-962f-411f-8772-2de9e51db933_trans.jpg?v=1773165308',
            quality_score: 0.82,
            usable_as: ['product_image'],
            issues: ['slightly low resolution for hero use'],
            reuse_recommendation: 'enhance',
          },
        ],
        analysis_error: null,
      },
    ],
  },
};

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: REQUEST_TIMEOUT,
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (d) => (buf += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 60_000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      const dir = path.dirname(destPath);
      fs.mkdirSync(dir, { recursive: true });
      const ws = fs.createWriteStream(destPath);
      res.pipe(ws);
      ws.on('finish', () => {
        ws.close();
        const stat = fs.statSync(destPath);
        resolve({ path: destPath, size: stat.size });
      });
      ws.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')); });
    req.on('error', reject);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  console.log('===============================================================');
  console.log('  PHASE 12B — GROUNDED FULL GENERATION VALIDATION');
  console.log('===============================================================');
  console.log(`  Run ID:        ${RUN_ID}`);
  console.log(`  Product:       basswave-kabellose-kopfhorer (real Shopify product)`);
  console.log(`  Grounding:     Gemini 2.0 Flash (confidence: 0.82)`);
  console.log(`  Generation:    DALL-E-3 (LIVE — not prompts_only)`);
  console.log(`  Webhook:       ${WEBHOOK_URL}`);
  console.log('---------------------------------------------------------------');
  console.log();

  // ── Step 1: Call build-media-assets with grounded payload ─────────────────
  console.log('[1/5] Sending grounded payload to build-media-assets...');
  console.log('      (allow_media_generation: true, generation_mode: grounded_generate)');
  let response;
  try {
    response = await httpPost(WEBHOOK_URL, payload);
  } catch (err) {
    console.error('  FATAL: Webhook call failed:', err.message);
    process.exit(1);
  }

  if (response.status !== 200) {
    console.error(`  FATAL: Webhook returned HTTP ${response.status}`);
    console.error('  Body:', JSON.stringify(response.data).slice(0, 500));
    process.exit(1);
  }

  const artifact = response.data;
  console.log(`  Status:       ${artifact.status}`);
  console.log(`  Assets:       ${artifact.media_assets?.length || 0}`);
  console.log(`  Generated:    ${artifact.generation_summary?.images_generated || 0}`);
  console.log(`  Failed:       ${artifact.generation_summary?.images_failed || 0}`);
  console.log(`  Skipped:      ${artifact.generation_summary?.images_skipped || 0}`);
  console.log();

  // ── Step 2: Validate grounding metadata on each asset ────────────────────
  console.log('[2/5] Validating Phase 12 grounding metadata...');
  let groundingValid = true;
  for (const asset of artifact.media_assets) {
    const checks = {
      generation_mode: asset.generation_mode,
      grounding_source_type: asset.grounding_source_type,
      grounded_from_image: !!asset.grounded_from_image,
      grounding_confidence: asset.grounding_confidence,
      product_faithfulness_required: asset.product_faithfulness_required,
      prompt_has_grounding: asset.prompt?.includes('mint green') && asset.prompt?.includes('circular earcups'),
    };
    const isGrounded = checks.generation_mode === 'grounded_generate' &&
                       checks.grounding_source_type === 'shopify_product_image' &&
                       checks.grounded_from_image &&
                       checks.grounding_confidence > 0 &&
                       checks.product_faithfulness_required === true &&
                       checks.prompt_has_grounding;
    const symbol = isGrounded ? 'OK' : 'FAIL';
    console.log(`  ${symbol}: ${asset.asset_id} (mode=${checks.generation_mode}, confidence=${checks.grounding_confidence})`);
    if (!isGrounded) groundingValid = false;
  }
  console.log(`  Grounding validation: ${groundingValid ? 'ALL PASSED' : 'SOME FAILED'}`);
  console.log();

  // ── Step 3: Download generated images ────────────────────────────────────
  console.log('[3/5] Downloading generated images to local disk...');
  const projectDir = path.join(LOCAL_MEDIA_ROOT, RUN_ID);
  let downloaded = 0;
  let downloadFailed = 0;

  for (const asset of artifact.media_assets) {
    if (asset.status !== 'generated' || !asset.url) {
      console.log(`  SKIP (${asset.status}): ${asset.asset_id}`);
      continue;
    }

    const shotDir = asset.shot_type.replace(/_/g, '-');
    const localPath = path.join(projectDir, asset.product_handle, shotDir, `${asset.asset_id}.png`);

    try {
      console.log(`  Downloading: ${asset.asset_id}...`);
      const result = await downloadFile(asset.url, localPath);
      asset.local_path = result.path;
      asset.metadata.file_size_bytes = result.size;
      downloaded++;
      console.log(`    OK: ${(result.size / 1024 / 1024).toFixed(1)}MB -> ${path.relative(process.cwd(), result.path)}`);
    } catch (err) {
      console.log(`    FAIL: ${err.message}`);
      downloadFailed++;
    }
  }
  console.log();

  // ── Step 4: Write artifact ───────────────────────────────────────────────
  console.log('[4/5] Writing artifact...');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const artifactPath = path.join(ARTIFACT_DIR, `${RUN_ID}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`  Artifact: ${path.relative(process.cwd(), artifactPath)}`);
  console.log();

  // ── Step 5: Summary ──────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const genSummary = artifact.generation_summary || {};

  console.log('[5/5] Verifying generated images exist on disk...');
  let filesExist = 0;
  for (const asset of artifact.media_assets) {
    if (asset.local_path && fs.existsSync(asset.local_path)) {
      filesExist++;
      console.log(`  EXISTS: ${path.relative(process.cwd(), asset.local_path)} (${(asset.metadata.file_size_bytes / 1024 / 1024).toFixed(1)}MB)`);
    }
  }
  console.log();

  console.log('===============================================================');
  console.log('  RESULTS — GROUNDED FULL GENERATION');
  console.log('===============================================================');
  console.log(`  1. Terminal status:         ${artifact.status}`);
  console.log(`  2. Generation mode:         ${genSummary.mode}`);
  console.log(`  3. Images generated:        ${genSummary.images_generated}`);
  console.log(`  4. Images failed:           ${genSummary.images_failed}`);
  console.log(`  5. Images skipped:          ${genSummary.images_skipped}`);
  console.log(`  6. Downloaded to disk:      ${downloaded}`);
  console.log(`  7. Files verified on disk:  ${filesExist}`);
  console.log(`  8. Grounding valid:         ${groundingValid}`);
  console.log(`  9. Runtime:                 ${elapsed}s`);
  console.log();

  // Print example grounded asset
  const example = artifact.media_assets.find(a => a.status === 'generated' && a.local_path);
  if (example) {
    console.log('  Example grounded asset:');
    console.log(`    asset_id:                  ${example.asset_id}`);
    console.log(`    shot_type:                 ${example.shot_type}`);
    console.log(`    generation_mode:           ${example.generation_mode}`);
    console.log(`    grounding_source_type:     ${example.grounding_source_type}`);
    console.log(`    grounded_from_image:       ${(example.grounded_from_image || '').slice(0, 80)}...`);
    console.log(`    grounding_confidence:      ${example.grounding_confidence}`);
    console.log(`    product_faithfulness:      ${example.product_faithfulness_required}`);
    console.log(`    local_path:                ${example.local_path}`);
    console.log(`    file_size:                 ${example.metadata.file_size_bytes} bytes`);
    console.log(`    generation_model:          ${example.metadata.generation_model}`);
    console.log(`    prompt (first 200):        ${example.prompt.slice(0, 200)}...`);
    console.log();
  }

  const isOperational = (artifact.status === 'PHASE_9_COMPLETE' || artifact.status === 'PHASE_9_PARTIAL') &&
                        downloaded > 0 && groundingValid;

  console.log('---------------------------------------------------------------');
  if (isOperational) {
    console.log('  GROUNDED GENERATION IS OPERATIONAL');
    console.log('  Real images generated from grounded prompts, downloaded, and persisted.');
  } else {
    console.log('  GROUNDED GENERATION NOT FULLY OPERATIONAL');
    console.log(`  Status: ${artifact.status}, Downloaded: ${downloaded}, Grounding: ${groundingValid}`);
  }

  if (artifact.errors && artifact.errors.length > 0) {
    console.log();
    console.log('  Errors:');
    for (const err of artifact.errors) {
      console.log(`    - ${err.asset_id}: ${err.message}`);
    }
  }

  console.log('===============================================================');

  process.exit(isOperational ? 0 : 1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
