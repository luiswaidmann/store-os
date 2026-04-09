#!/usr/bin/env node
/**
 * validate-media-generation.js
 *
 * Triggers build-media-assets with allow_media_generation: true,
 * downloads real DALL-E images to local disk, and writes the
 * complete artifact with local_path + file_size.
 *
 * Usage:
 *   node scripts/validate-media-generation.js [--products N] [--dry-run]
 *
 * Options:
 *   --products N   Number of products to include (default: 1, max: 2)
 *   --dry-run      Send allow_media_generation: false (prompts_only)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ─── Config ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://luwai.app.n8n.cloud/webhook/test-media-gen-live';
const LOCAL_MEDIA_ROOT = path.resolve(__dirname, '..', 'outputs', 'media');
const ARTIFACT_DIR = path.resolve(__dirname, '..', 'outputs', 'runs');
const REQUEST_TIMEOUT = 120_000; // 2 min — DALL-E can be slow

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prodIdx = args.indexOf('--products');
const numProducts = prodIdx >= 0 ? Math.min(parseInt(args[prodIdx + 1]) || 1, 2) : 1;

// ─── Test products ───────────────────────────────────────────────────────────
const ALL_PRODUCTS = [
  {
    handle: 'industrial-sensor-v2',
    title: 'Industrial Sensor V2',
    description: 'Precision industrial sensor for harsh environments. IP68 rated, stainless steel housing.',
    price: '299.00',
    category: 'sensors',
  },
  {
    handle: 'heavy-duty-cable-ties',
    title: 'Heavy Duty Cable Ties',
    description: 'UV-resistant nylon cable ties rated for outdoor industrial use.',
    price: '24.99',
    category: 'fasteners',
  },
];

const products = ALL_PRODUCTS.slice(0, numProducts);

// ─── Payload ─────────────────────────────────────────────────────────────────
const payload = {
  project_id: `media-gen-validation-${Date.now()}`,
  runtime_config: {
    allow_media_generation: !dryRun,
    media_generation_model: 'dall-e-3',
  },
  theme_rules: {
    status: 'PHASE_10_COMPLETE',
    store_pattern: 'technical-b2b-specialist',
    homepage_layout: {
      section_stack: [
        { section_type: 'hero', order: 1, enabled: true, variant: 'standard' },
        { section_type: 'value-prop', order: 2, enabled: true, variant: 'icon-led' },
        { section_type: 'featured-collection', order: 3, enabled: true, variant: 'grid-3' },
        { section_type: 'trust-social-proof', order: 4, enabled: true, variant: 'evidence-led' },
      ],
      visual_density: 'medium',
      whitespace_level: 'balanced',
    },
    section_system: {
      hero: { variant: 'standard', cta_prominence: 'balanced', copy_density: 'medium', media_type: 'image' },
      featured_collection: { enabled: true, grid_columns: 3, products_to_show: 6 },
      value_prop: { enabled: true, column_count: 4, style: 'icon-led' },
      trust_social_proof: { enabled: true, proof_mode: 'evidence-led', block_count: 4, placement: 'end-page' },
    },
    visual_system: { density: 'medium', whitespace: 'balanced', contrast: 'high-clarity' },
    media_placement_rules: { hero_media_type: 'image', product_image_priority: 'studio-packshot-first', lifestyle_prominence: 'low' },
  },
  store_blueprint: {
    products,
    store_name: 'SuppliedTech',
    primary_color: '#1a3a5c',
    typography: 'Inter',
  },
  brand_positioning: {
    brand_role: 'specialist',
    tone_of_voice: { style: 'technical-trustworthy', emotional_intensity: 'low' },
    price_positioning: 'premium',
    brand_traits: ['reliable', 'efficient', 'professional'],
    visual_style: { aesthetic: 'technical-precision', color_temperature: 'cool' },
    trust_style: { proof_mode: 'evidence-led', reassurance_level: 'high' },
  },
  store_profile: {
    price_positioning: 'premium',
    catalog_type: 'specialist-catalog',
    assortment_shape: 'multi-product',
    store_type: 'category-specialist',
  },
  content_strategy: {
    messaging_hierarchy: { primary_message: 'Industrial-grade sensors built for precision' },
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
      // Follow redirects
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

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MEDIA GENERATION VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Mode:          ${dryRun ? 'DRY RUN (prompts_only)' : 'LIVE GENERATION'}`);
  console.log(`  Products:      ${products.length} (${products.map(p => p.handle).join(', ')})`);
  console.log(`  Project ID:    ${payload.project_id}`);
  console.log(`  Store pattern: ${payload.theme_rules.store_pattern}`);
  console.log(`  Webhook:       ${WEBHOOK_URL}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log();

  // ── Step 1: Call build-media-assets via webhook ──────────────────────────
  console.log('[1/4] Sending payload to build-media-assets...');
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
  console.log(`  media_plan:   ${artifact.media_plan ? 'present' : 'MISSING'}`);
  console.log();

  // ── Step 2: Validate media_plan ──────────────────────────────────────────
  console.log('[2/4] Validating media_plan...');
  const mp = artifact.media_plan;
  if (!mp) {
    console.error('  FATAL: media_plan is null — Phase 11 not active');
    process.exit(1);
  }
  console.log(`  derived_from_theme_rules: ${mp.derived_from_theme_rules}`);
  console.log(`  store_pattern:            ${mp.store_pattern}`);
  console.log(`  total_shot_types:         ${mp.total_shot_types}`);
  console.log(`  required_shots:           ${mp.required_shots}`);
  console.log(`  optional_shots:           ${mp.optional_shots}`);
  console.log(`  section_coverage:         ${mp.section_coverage.map(s => s.section_type).join(' → ')}`);
  console.log();

  // ── Step 3: Download generated images ────────────────────────────────────
  console.log('[3/4] Downloading generated images to local disk...');
  const projectDir = path.join(LOCAL_MEDIA_ROOT, payload.project_id);
  let downloaded = 0;
  let downloadFailed = 0;
  const downloadResults = [];

  for (const asset of artifact.media_assets) {
    const hasUrl = asset.url && asset.status === 'generated';
    const isPromptOnly = asset.status === 'prompt_only';
    const isFailed = asset.status === 'failed';

    if (isPromptOnly) {
      console.log(`  SKIP (prompt_only): ${asset.asset_id}`);
      downloadResults.push({ asset_id: asset.asset_id, action: 'skip_prompt_only' });
      continue;
    }
    if (isFailed) {
      console.log(`  SKIP (failed):      ${asset.asset_id}`);
      downloadResults.push({ asset_id: asset.asset_id, action: 'skip_failed' });
      continue;
    }
    if (!hasUrl) {
      console.log(`  SKIP (no url):      ${asset.asset_id}`);
      downloadResults.push({ asset_id: asset.asset_id, action: 'skip_no_url' });
      continue;
    }

    // Compute local path
    const shotDir = asset.shot_type.replace(/_/g, '-');
    const ext = 'png';
    const localPath = path.join(projectDir, asset.product_handle, shotDir, `${asset.asset_id}.${ext}`);

    try {
      console.log(`  Downloading: ${asset.asset_id}...`);
      const result = await downloadFile(asset.url, localPath);
      asset.local_path = result.path;
      asset.metadata.file_size_bytes = result.size;
      downloaded++;
      console.log(`    ✓ ${result.size} bytes → ${path.relative(process.cwd(), result.path)}`);
      downloadResults.push({ asset_id: asset.asset_id, action: 'downloaded', size: result.size, path: result.path });
    } catch (err) {
      console.log(`    ✗ Download failed: ${err.message}`);
      downloadFailed++;
      downloadResults.push({ asset_id: asset.asset_id, action: 'download_failed', error: err.message });
    }
  }
  console.log();

  // ── Step 4: Write final artifact ─────────────────────────────────────────
  console.log('[4/4] Writing artifact...');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const artifactPath = path.join(ARTIFACT_DIR, `media-gen-${Date.now()}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`  Artifact: ${path.relative(process.cwd(), artifactPath)}`);
  console.log();

  // ── Summary ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const genSummary = artifact.generation_summary || {};
  const totalAssets = artifact.media_assets?.length || 0;
  const generated = genSummary.images_generated || 0;
  const failed = genSummary.images_failed || 0;
  const skipped = genSummary.images_skipped || 0;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  1. Generation mode:        ${genSummary.mode || 'unknown'}`);
  console.log(`  2. Jobs created:           ${generated + failed}`);
  console.log(`  3. Images generated:       ${generated}`);
  console.log(`  4. Images failed:          ${failed}`);
  console.log(`  5. Images skipped:         ${skipped}`);
  console.log(`  6. Downloaded to disk:     ${downloaded}`);
  console.log(`  7. Download failures:      ${downloadFailed}`);
  console.log(`  8. Total assets in plan:   ${totalAssets}`);
  console.log(`  9. Terminal status:        ${artifact.status}`);
  console.log(` 10. Runtime:                ${elapsed}s`);
  console.log(`  Artifact written to:       ${path.relative(process.cwd(), artifactPath)}`);
  if (downloaded > 0) {
    console.log(`  Media stored in:           ${path.relative(process.cwd(), projectDir)}`);
  }
  console.log();

  // Print one example asset
  const exampleAsset = artifact.media_assets.find(a => a.status === 'generated' && a.local_path);
  if (exampleAsset) {
    console.log('  Example asset:');
    console.log(`    asset_id:                ${exampleAsset.asset_id}`);
    console.log(`    shot_type:               ${exampleAsset.shot_type}`);
    console.log(`    source_section:          ${exampleAsset.source_section}`);
    console.log(`    priority:                ${exampleAsset.priority}`);
    console.log(`    required:                ${exampleAsset.required}`);
    console.log(`    intended_usage:          ${exampleAsset.intended_usage}`);
    console.log(`    derived_from_theme_rules:${exampleAsset.derived_from_theme_rules}`);
    console.log(`    local_path:              ${exampleAsset.local_path}`);
    console.log(`    file_size:               ${exampleAsset.metadata.file_size_bytes} bytes`);
    console.log(`    generation_model:        ${exampleAsset.metadata.generation_model}`);
    console.log(`    url:                     ${(exampleAsset.url || '').slice(0, 80)}...`);
    console.log();
  }

  // Operational check
  const isOperational = artifact.status === 'PHASE_9_COMPLETE' && downloaded > 0;
  const isPartial = artifact.status === 'PHASE_9_PARTIAL' && downloaded > 0;
  console.log('───────────────────────────────────────────────────────────────');
  if (isOperational) {
    console.log('  ✅ MEDIA RUNTIME IS OPERATIONAL');
    console.log('     Real images generated, downloaded, and persisted.');
  } else if (isPartial) {
    console.log('  ⚠️  MEDIA RUNTIME PARTIALLY OPERATIONAL');
    console.log(`     ${generated} of ${generated + failed} succeeded. ${downloaded} downloaded.`);
  } else if (artifact.status === 'PHASE_9_PROMPTS_ONLY') {
    console.log('  ℹ️  PROMPTS ONLY — no generation attempted');
    console.log('     Set --live flag or allow_media_generation: true');
  } else {
    console.log('  ❌ MEDIA RUNTIME NOT OPERATIONAL');
    console.log(`     Status: ${artifact.status}, Downloaded: ${downloaded}`);
  }

  if (artifact.errors && artifact.errors.length > 0) {
    console.log();
    console.log('  Errors:');
    for (const err of artifact.errors) {
      console.log(`    - ${err.asset_id}: ${err.message}`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(isOperational ? 0 : isPartial ? 0 : 1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
