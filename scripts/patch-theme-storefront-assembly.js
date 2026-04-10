#!/usr/bin/env node
/**
 * patch-theme-storefront-assembly.js
 *
 * Patches build-shopify-theme.n8n.json to add storefront assembly:
 * 1. Generate and write templates/index.json (homepage template)
 * 2. Fix CTA link paths (plain handles → /collections/handle)
 * 3. Add hero image_url setting support
 * 4. Pre-populate blocks for value-prop and trust sections
 * 5. Pass media_assets through for asset binding
 * 6. Update deployment summary to track template writes
 *
 * One-time use. Run: node scripts/patch-theme-storefront-assembly.js
 */

const fs = require('fs');
const path = require('path');

const WF_PATH = path.join(__dirname, '..', 'workflows', 'n8n', 'build-shopify-theme.n8n.json');

const wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));

// ── Patch 1: Validate Theme Input — add media_assets + navigation passthrough ─
const validateNode = wf.nodes.find(n => n.name === 'Validate Theme Input');
if (!validateNode) throw new Error('Node "Validate Theme Input" not found');

validateNode.parameters.jsCode = `// build-shopify-theme — Validate Theme Input
// Validates store_blueprint (theme_sections + assets) and runtime_config.
// Resolves Shopify config and opt-in flags.
// Also accepts optional theme_rules, media_assets from upstream.

const input = $input.first().json;

const runtimeConfig   = input.runtime_config   || {};
const storeBlueprint  = input.store_blueprint   || null;
const contentStrategy = input.content_strategy  || {};
const themeRules      = input.theme_rules       || null;  // Phase 10 — optional
const mediaAssets     = input.media_assets      || [];    // Phase 9 — optional
const projectId       = input.project_id        || runtimeConfig.project_id || null;

if (!projectId) {
  throw new Error('MISSING_RUNTIME_CONFIG: build-shopify-theme requires project_id');
}

if (!storeBlueprint) {
  throw new Error('MISSING_ARTIFACT: store_blueprint is required');
}

const themeSections = storeBlueprint.theme_sections || [];
const assets        = storeBlueprint.assets         || [];
const navigation    = storeBlueprint.navigation     || [];
const collections   = storeBlueprint.collections    || storeBlueprint.collection_list || [];

// When theme_rules is present, the section stack comes from theme_rules — blueprint sections are fallbacks.
const hasThemeRules = themeRules && themeRules.status === 'PHASE_10_COMPLETE' &&
                      themeRules.homepage_layout && themeRules.homepage_layout.section_stack &&
                      themeRules.homepage_layout.section_stack.length > 0;

if (!hasThemeRules && themeSections.length === 0 && assets.length === 0) {
  throw new Error('INVALID_BLUEPRINT: store_blueprint.theme_sections and store_blueprint.assets are both empty (and no theme_rules provided)');
}

const shopUrl    = runtimeConfig.shopify_shop_url || null;
const apiVersion = runtimeConfig.shopify_api_version || '2026-01';

if (!shopUrl) {
  throw new Error('MISSING_CONFIG: shopify_shop_url not found in runtime_config');
}

const shopDomain  = shopUrl.replace(/^https?:\\/\\//, '').replace(/\\/$/, '');
const shopifyBase = 'https://' + shopDomain + '/admin/api/' + apiVersion;

const allowThemeWrites = runtimeConfig.allow_theme_writes === true || runtimeConfig.allow_theme_writes === 'true';
const targetThemeId    = runtimeConfig.shopify_theme_id || null;

console.log('build-shopify-theme: theme_rules=' + (hasThemeRules ? themeRules.store_pattern : 'NONE (fallback to blueprint)'));
console.log('build-shopify-theme: media_assets=' + mediaAssets.length + ', navigation=' + navigation.length);

return [{
  json: {
    project_id:         projectId,
    runtime_config:     runtimeConfig,
    store_blueprint:    storeBlueprint,
    content_strategy:   contentStrategy,
    theme_rules:        hasThemeRules ? themeRules : null,
    media_assets:       mediaAssets,
    navigation:         navigation,
    collections:        collections,
    shop_domain:        shopDomain,
    api_version:        apiVersion,
    shopify_base:       shopifyBase,
    allow_theme_writes: allowThemeWrites,
    target_theme_id:    targetThemeId,
    theme_sections:     themeSections,
    assets:             assets,
  },
}];`;


// ── Patch 2: Build Deployment Plan — add template generation + CTA fix + hero image ─
const buildPlanNode = wf.nodes.find(n => n.name === 'Build Deployment Plan');
if (!buildPlanNode) throw new Error('Node "Build Deployment Plan" not found');

buildPlanNode.parameters.jsCode = `// build-shopify-theme — Resolve Target Theme + Build Deployment Plan
// Selects safe target theme, generates section .liquid content, homepage template JSON,
// and outputs write actions.
//
// SAFETY RULES:
// 1. NEVER target the active (role: main) theme unless explicitly overridden by shopify_theme_id
// 2. Prefer unpublished/development themes
// 3. If no safe target exists and no explicit theme_id → PHASE_7B3_BLOCKED
// 4. If allow_theme_writes is false → return dry-run plan (no writes)
//
// STOREFRONT ASSEMBLY:
// - Generates section .liquid files with inline {% schema %}
// - Generates templates/index.json to wire sections onto the homepage
// - Pre-populates section settings and blocks from theme_rules/blueprint
// - Ensures CTA links use proper Shopify paths (/collections/handle, etc.)
//
// Phase 10 integration:
// If theme_rules present: use section_stack as authoritative section list
// If absent: fall back to store_blueprint.theme_sections

const validated = $('Validate Theme Input').first().json;
const themesResponse = $input.first().json;

const projectId        = validated.project_id;
const shopDomain       = validated.shop_domain;
const shopifyBase      = validated.shopify_base;
const allowWrites      = validated.allow_theme_writes;
const requestedThemeId = validated.target_theme_id;
const themeSections    = validated.theme_sections;
const assets           = validated.assets;
const contentStrategy  = validated.content_strategy || {};
const themeRules       = validated.theme_rules || null;
const mediaAssets      = validated.media_assets || [];
const navigation       = validated.navigation || [];
const collections      = validated.collections || [];

// ── Parse themes response ─────────────────────────────────────────────────
const body = themesResponse.body || themesResponse;
const themes = (body.themes || body.data?.themes || []);

if (themes.length === 0) {
  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_BLOCKED',
      project_id: projectId,
      shop_url: shopDomain,
      theme_id: null,
      theme_name: null,
      completed_at: new Date().toISOString(),
      sections_written: 0,
      assets_written: 0,
      templates_written: 0,
      dry_run: true,
      dry_run_plan: [],
      errors: [{ key: 'themes', status: themesResponse.statusCode || 0, message: 'Failed to fetch themes or no themes found' }],
      warnings: [],
      blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
      safety_notes: ['BLOCKED: Could not retrieve themes from Shopify'],
    },
  }];
}

// ── Select target theme ───────────────────────────────────────────────────
const activeTheme = themes.find(t => t.role === 'main');
const unpublishedThemes = themes.filter(t => t.role === 'unpublished' || t.role === 'demo');
let targetTheme = null;
let safetyNote = '';

if (requestedThemeId) {
  targetTheme = themes.find(t => String(t.id) === String(requestedThemeId));
  if (!targetTheme) {
    return [{
      json: {
        _action: 'terminal',
        status: 'PHASE_7B3_BLOCKED',
        project_id: projectId,
        shop_url: shopDomain,
        theme_id: null,
        theme_name: null,
        completed_at: new Date().toISOString(),
        sections_written: 0,
        assets_written: 0,
        templates_written: 0,
        dry_run: true,
        dry_run_plan: [],
        errors: [{ key: 'theme_id', status: 404, message: 'Requested theme ID ' + requestedThemeId + ' not found. Available: ' + themes.map(t => t.id + ' (' + t.role + ')').join(', ') }],
        warnings: [],
        blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
        safety_notes: ['BLOCKED: Requested shopify_theme_id not found'],
      },
    }];
  }
  if (targetTheme.role === 'main') {
    safetyNote = 'WARNING: Targeting active (main) theme by explicit shopify_theme_id override.';
  } else {
    safetyNote = 'Targeting explicitly requested theme: ' + targetTheme.name + ' (role: ' + targetTheme.role + ')';
  }
} else if (unpublishedThemes.length > 0) {
  targetTheme = unpublishedThemes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  safetyNote = 'Auto-selected unpublished theme: ' + targetTheme.name + ' (id: ' + targetTheme.id + '). Active theme ' + (activeTheme ? activeTheme.name : 'unknown') + ' is NOT affected.';
} else {
  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_BLOCKED',
      project_id: projectId,
      shop_url: shopDomain,
      theme_id: null,
      theme_name: null,
      completed_at: new Date().toISOString(),
      sections_written: 0,
      assets_written: 0,
      templates_written: 0,
      dry_run: true,
      dry_run_plan: [],
      errors: [],
      warnings: ['No unpublished/development theme found and no shopify_theme_id specified.'],
      blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
      safety_notes: ['BLOCKED: No safe theme target. Create an unpublished theme or specify runtime_config.shopify_theme_id.'],
    },
  }];
}

const themeId = targetTheme.id;
const themeName = targetTheme.name;
const assetsUrl = shopifyBase + '/themes/' + themeId + '/assets.json';

// ── Helper: resolve CTA link to proper Shopify path ───────────────────────
function resolveCtaLink(target) {
  if (!target) return '/';
  if (target.startsWith('/') || target.startsWith('http') || target.startsWith('shopify://')) return target;
  // Bare handle → default to collection path (most common CTA target)
  // Check if it looks like a known page handle
  const pageHandles = ['about', 'contact', 'faq', 'shipping', 'returns', 'privacy-policy', 'terms-of-service'];
  if (pageHandles.includes(target.toLowerCase())) {
    return '/pages/' + target;
  }
  return '/collections/' + target;
}

// ── Helper: find media asset URL for a section/purpose ────────────────────
function findMediaAssetUrl(sectionType, purpose) {
  if (!mediaAssets || mediaAssets.length === 0) return null;
  // Look for a media asset matching the section type or purpose
  const match = mediaAssets.find(a =>
    (a.source_section && a.source_section.toLowerCase() === sectionType) ||
    (a.shot_type && a.shot_type === purpose)
  );
  if (match && match.url) return match.url;
  if (match && match.cdn_url) return match.cdn_url;
  return null;
}

// ── Generate section .liquid content ──────────────────────────────────────
function generateSectionLiquid(section, themeRulesCtx) {
  const sType = (section.section_type || 'unknown').toLowerCase().replace(/[\\/\\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
  const heading = section.heading_hint || section.section_type || 'Section';
  const content = section.content_hint || '';
  const ctaLabel = section.cta_label || '';
  const ctaTarget = resolveCtaLink(section.cta_target || '');
  const page = section.page || 'homepage';
  const rawName = heading.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const schemeName = rawName.length > 15 ? rawName.slice(0, 15).trim() : rawName;

  let template = '';
  let settings = [];

  // Common settings for all section types
  settings.push('    {\\n      "type": "text",\\n      "id": "heading",\\n      "label": "Heading",\\n      "default": ' + JSON.stringify(heading) + '\\n    }');
  settings.push('    {\\n      "type": "richtext",\\n      "id": "content",\\n      "label": "Content",\\n      "default": ' + JSON.stringify('<p>' + (content || 'Add your content here.') + '</p>') + '\\n    }');

  if (ctaLabel) {
    settings.push('    {\\n      "type": "text",\\n      "id": "cta_label",\\n      "label": "Button text",\\n      "default": ' + JSON.stringify(ctaLabel) + '\\n    }');
    settings.push('    {\\n      "type": "url",\\n      "id": "cta_link",\\n      "label": "Button link",\\n      "default": ' + JSON.stringify(ctaTarget || '/') + '\\n    }');
  }

  // Hero-specific: add image_url setting for background/hero image
  if (sType === 'hero') {
    settings.push('    {\\n      "type": "image_picker",\\n      "id": "image",\\n      "label": "Hero image"\\n    }');
    settings.push('    {\\n      "type": "url",\\n      "id": "image_url",\\n      "label": "Hero image URL (fallback)",\\n      "info": "Used when no image is picked above. Accepts any image URL."\\n    }');
    settings.push('    {\\n      "type": "range",\\n      "id": "overlay_opacity",\\n      "label": "Overlay opacity",\\n      "min": 0,\\n      "max": 100,\\n      "step": 5,\\n      "default": 30,\\n      "unit": "%"\\n    }');
  }

  // Featured-collection settings
  if (sType === 'featured-collection') {
    const productsToShow = (themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.featured_collection && themeRulesCtx.section_system.featured_collection.products_to_show) || 4;
    settings.push('    {\\n      "type": "collection",\\n      "id": "collection",\\n      "label": "Collection"\\n    }');
    settings.push('    {\\n      "type": "range",\\n      "id": "products_to_show",\\n      "label": "Products to show",\\n      "min": 2,\\n      "max": 12,\\n      "step": 1,\\n      "default": ' + productsToShow + '\\n    }');
  }

  // Value-prop settings
  if (sType === 'value-prop') {
    const columnCount = (themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.value_prop && themeRulesCtx.section_system.value_prop.column_count) || 3;
    settings.push('    {\\n      "type": "range",\\n      "id": "columns",\\n      "label": "Columns",\\n      "min": 2,\\n      "max": 4,\\n      "step": 1,\\n      "default": ' + columnCount + '\\n    }');
  }

  // Build HTML template
  if (sType === 'hero') {
    // Hero section with background image support
    template += '<section class="store-os-section store-os-hero" style="position: relative; min-height: 400px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; overflow: hidden;">\\n';
    template += '  {%- assign hero_img = section.settings.image | default: nil -%}\\n';
    template += '  {%- assign hero_url = section.settings.image_url | default: nil -%}\\n';
    template += '  {% if hero_img %}\\n';
    template += '    <img src="{{ hero_img | image_url: width: 1920 }}" alt="{{ hero_img.alt | escape }}" loading="eager" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;">\\n';
    template += '  {% elsif hero_url != blank %}\\n';
    template += '    <img src="{{ hero_url }}" alt="{{ section.settings.heading | escape }}" loading="eager" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;">\\n';
    template += '  {% else %}\\n';
    template += '    <div style="position: absolute; inset: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 0;"></div>\\n';
    template += '  {% endif %}\\n';
    template += '  <div style="position: absolute; inset: 0; background: rgba(0,0,0,{{ section.settings.overlay_opacity | divided_by: 100.0 }}); z-index: 1;"></div>\\n';
    template += '  <div style="position: relative; z-index: 2; color: #fff; max-width: 800px;">\\n';
    template += '    <h1 style="font-size: 2.5em; margin-bottom: 0.5em;">{{ section.settings.heading }}</h1>\\n';
    template += '    <div class="store-os-content" style="font-size: 1.2em; margin-bottom: 1em;">{{ section.settings.content }}</div>\\n';
    template += '    {% if section.settings.cta_label != blank %}\\n';
    template += '      <a href="{{ section.settings.cta_link }}" class="button store-os-cta" style="display: inline-block; padding: 14px 32px; background: #fff; color: #333; text-decoration: none; font-weight: bold; border-radius: 4px;">{{ section.settings.cta_label }}</a>\\n';
    template += '    {% endif %}\\n';
    template += '  </div>\\n';
    template += '</section>\\n';
  } else {
    template += '<section class="store-os-section store-os-' + sType + '" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;">\\n';
    template += '  <h2>{{ section.settings.heading }}</h2>\\n';
    template += '  <div class="store-os-content">{{ section.settings.content }}</div>\\n';

    if (sType === 'featured-collection') {
      template += '  {% if section.settings.collection %}\\n';
      template += '    <div class="store-os-grid" style="display: grid; grid-template-columns: repeat({{ section.settings.products_to_show | at_most: 4 }}, 1fr); gap: 20px; margin-top: 20px;">\\n';
      template += '      {% for product in section.settings.collection.products limit: section.settings.products_to_show %}\\n';
      template += '        <div class="store-os-product-card" style="text-align: center;">\\n';
      template += '          {% if product.featured_image %}\\n';
      template += '            <img src="{{ product.featured_image | image_url: width: 400 }}" alt="{{ product.featured_image.alt | escape }}" loading="lazy" width="400" style="max-width: 100%; border-radius: 4px;">\\n';
      template += '          {% endif %}\\n';
      template += '          <h3 style="margin-top: 10px;"><a href="{{ product.url }}" style="text-decoration: none; color: inherit;">{{ product.title }}</a></h3>\\n';
      template += '          <p>{{ product.price | money }}</p>\\n';
      template += '        </div>\\n';
      template += '      {% endfor %}\\n';
      template += '    </div>\\n';
      template += '  {% else %}\\n';
      template += '    <p style="color: #999; font-style: italic;">Select a collection in the theme editor to display products.</p>\\n';
      template += '  {% endif %}\\n';
    }

    if (sType === 'value-prop') {
      template += '  <div class="store-os-columns" style="display: grid; grid-template-columns: repeat({{ section.settings.columns }}, 1fr); gap: 30px; margin-top: 20px;">\\n';
      template += '    {% for block in section.blocks %}\\n';
      template += '      <div class="store-os-column" {{ block.shopify_attributes }} style="text-align: center; padding: 20px;">\\n';
      template += '        <h3>{{ block.settings.title }}</h3>\\n';
      template += '        <p>{{ block.settings.description }}</p>\\n';
      template += '      </div>\\n';
      template += '    {% endfor %}\\n';
      template += '  </div>\\n';
    }

    if (sType === 'trust' || sType === 'social-proof' || sType === 'trust-social-proof') {
      template += '  <div class="store-os-trust-items" style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">\\n';
      template += '    {% for block in section.blocks %}\\n';
      template += '      <div class="store-os-trust-item" {{ block.shopify_attributes }} style="text-align: center; max-width: 200px;">\\n';
      template += '        <strong>{{ block.settings.title }}</strong>\\n';
      template += '        <p>{{ block.settings.description }}</p>\\n';
      template += '      </div>\\n';
      template += '    {% endfor %}\\n';
      template += '  </div>\\n';
    }

    if (ctaLabel) {
      template += '  {% if section.settings.cta_label != blank %}\\n';
      template += '    <div style="margin-top: 20px; text-align: center;"><a href="{{ section.settings.cta_link }}" class="button store-os-cta" style="display: inline-block; padding: 12px 28px; background: #333; color: #fff; text-decoration: none; border-radius: 4px;">{{ section.settings.cta_label }}</a></div>\\n';
      template += '  {% endif %}\\n';
    }

    template += '</section>\\n';
  }

  // Build blocks for column/trust sections
  let blocks = '';
  if (sType === 'value-prop' || sType === 'trust' || sType === 'social-proof' || sType === 'trust-social-proof') {
    const maxBlocks = (themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.trust_social_proof && themeRulesCtx.section_system.trust_social_proof.block_count) || 6;
    blocks = ',\\n    "blocks": [\\n      {\\n        "type": "column",\\n        "name": "Column",\\n        "settings": [\\n          { "type": "text", "id": "title", "label": "Title", "default": "Feature" },\\n          { "type": "text", "id": "description", "label": "Description", "default": "Describe this feature." }\\n        ]\\n      }\\n    ],\\n    "max_blocks": ' + maxBlocks;
  }

  // Build schema
  const schema = '{\\n  "name": ' + JSON.stringify('store-os: ' + schemeName) + ',\\n  "tag": "section",\\n  "class": "store-os-section",\\n  "settings": [\\n' + settings.join(',\\n') + '\\n  ]' + blocks + ',\\n  "presets": [\\n    { "name": ' + JSON.stringify('store-os: ' + schemeName) + ' }\\n  ]\\n}';

  return template + '\\n{% schema %}\\n' + schema + '\\n{% endschema %}\\n';
}

// ── Generate SVG placeholder assets ───────────────────────────────────────
function generatePlaceholderSvg(asset) {
  const dims = asset.dimensions || '200x200';
  const parts = dims.split('x').map(Number);
  const w = parts[0] || 200;
  const h = parts[1] || 200;
  const purpose = asset.purpose || asset.asset_type || 'placeholder';
  const label = purpose.length > 30 ? purpose.slice(0, 30) + '...' : purpose;

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<rect width="' + w + '" height="' + h + '" fill="#e8e8e8" stroke="#ccc" stroke-width="2"/>'
    + '<text x="50%" y="40%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#666">' + dims + '</text>'
    + '<text x="50%" y="55%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#999">' + label.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</text>'
    + '<text x="50%" y="70%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#bbb">store-os placeholder</text>'
    + '</svg>';
}

// ── Generate templates/index.json — homepage assembly ─────────────────────
// This is the critical template that wires sections onto the homepage.
// Without it, section .liquid files exist but never appear on any page.
function generateIndexTemplate(sections, themeRulesCtx, mediaAssetsList, collectionsList) {
  const templateSections = {};
  const order = [];

  for (const section of sections) {
    const sType = (section.section_type || 'unknown').toLowerCase().replace(/[\\/\\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sectionId = 'store-os-' + sType;
    const sectionType = 'store-os-' + sType;

    // Build settings from theme_rules + blueprint hints
    const settings = {};
    if (section.heading_hint) settings.heading = section.heading_hint;
    if (section.content_hint) settings.content = '<p>' + section.content_hint + '</p>';
    if (section.cta_label) settings.cta_label = section.cta_label;
    if (section.cta_target) {
      settings.cta_link = resolveCtaLink(section.cta_target);
    }

    // Hero-specific: bind generated image URL if available
    if (sType === 'hero') {
      const heroUrl = findMediaAssetUrl('hero', 'hero_wide');
      if (heroUrl) settings.image_url = heroUrl;
      settings.overlay_opacity = 30;
    }

    // Featured-collection: set products_to_show and try to bind a collection
    if (sType === 'featured-collection') {
      const fcConfig = themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.featured_collection;
      settings.products_to_show = (fcConfig && fcConfig.products_to_show) || 4;
      // Try to find the primary collection handle
      if (collectionsList.length > 0) {
        const primary = collectionsList.find(c => c.role === 'primary' || c.navigation_role === 'primary');
        const firstCollection = primary || collectionsList[0];
        const handle = firstCollection.handle || firstCollection.collection_handle || null;
        if (handle) settings.collection = handle;
      }
    }

    // Value-prop: set column count
    if (sType === 'value-prop') {
      const vpConfig = themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.value_prop;
      settings.columns = (vpConfig && vpConfig.column_count) || 3;
    }

    const sectionDef = { type: sectionType, settings: settings };

    // Pre-populate blocks for column/trust sections
    if (sType === 'value-prop') {
      const colCount = settings.columns || 3;
      const blockMap = {};
      const blockOrder = [];
      for (let i = 1; i <= colCount; i++) {
        const blockId = 'col-' + i;
        blockMap[blockId] = {
          type: 'column',
          settings: { title: 'Feature ' + i, description: 'Describe this feature.' }
        };
        blockOrder.push(blockId);
      }
      sectionDef.blocks = blockMap;
      sectionDef.block_order = blockOrder;
    }

    if (sType === 'trust-social-proof' || sType === 'trust' || sType === 'social-proof') {
      const tsConfig = themeRulesCtx && themeRulesCtx.section_system && themeRulesCtx.section_system.trust_social_proof;
      const blockCount = (tsConfig && tsConfig.block_count) || 4;
      const blockMap = {};
      const blockOrder = [];
      for (let i = 1; i <= blockCount; i++) {
        const blockId = 'trust-' + i;
        blockMap[blockId] = {
          type: 'column',
          settings: { title: 'Trust Signal ' + i, description: 'Add your trust signal here.' }
        };
        blockOrder.push(blockId);
      }
      sectionDef.blocks = blockMap;
      sectionDef.block_order = blockOrder;
    }

    templateSections[sectionId] = sectionDef;
    order.push(sectionId);
  }

  return JSON.stringify({ sections: templateSections, order: order }, null, 2);
}

// ── Resolve effective section list (Phase 10 integration) ────────────────
let effectiveSections;

if (themeRules && themeRules.homepage_layout && themeRules.homepage_layout.section_stack) {
  const blueprintByType = {};
  for (const s of themeSections) {
    blueprintByType[(s.section_type || '').toLowerCase()] = s;
  }

  effectiveSections = themeRules.homepage_layout.section_stack
    .filter(s => s.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(rs => {
      const bp = blueprintByType[rs.section_type] || {};
      return {
        section_type: rs.section_type,
        order:        rs.order,
        heading_hint: rs.heading_hint || bp.heading_hint || rs.section_type,
        content_hint: rs.content_hint || bp.content_hint || '',
        cta_label:    rs.cta_label    || bp.cta_label    || '',
        cta_target:   rs.cta_target   || bp.cta_target   || '',
        page:         bp.page || 'homepage',
      };
    });

  console.log('Phase 10: using theme_rules section stack (' + themeRules.store_pattern + ') — ' + effectiveSections.length + ' sections');
} else {
  effectiveSections = themeSections;
  console.log('Phase 10: theme_rules absent — falling back to blueprint sections (' + effectiveSections.length + ')');
}

// ── Build write actions ───────────────────────────────────────────────────
const writeActions = [];

// 1. Section .liquid files
for (const section of effectiveSections) {
  const sType = (section.section_type || 'unknown').toLowerCase().replace(/[\\/\\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
  const key = 'sections/store-os-' + sType + '.liquid';
  const liquidContent = generateSectionLiquid(section, themeRules);

  writeActions.push({
    operation: 'write_section',
    key: key,
    asset_key: key,
    section_type: sType,
    page: section.page || 'homepage',
    order: section.order || null,
    url: assetsUrl,
    body: { asset: { key: key, value: liquidContent } },
    reason: themeRules
      ? 'Theme rules (' + themeRules.store_pattern + '): ' + sType
      : 'Blueprint section: ' + sType + ' on ' + (section.page || 'homepage'),
  });
}

// 2. Asset SVG placeholder files
const assetKeyMap = {
  'logo': 'assets/store-os-logo-placeholder.svg',
  'favicon': 'assets/store-os-favicon-placeholder.svg',
  'hero-image': 'assets/store-os-hero-placeholder.svg',
};

for (const asset of assets) {
  const assetType = (asset.asset_type || 'unknown').toLowerCase();
  const key = assetKeyMap[assetType] || 'assets/store-os-' + assetType + '-placeholder.svg';
  const svgContent = generatePlaceholderSvg(asset);

  writeActions.push({
    operation: 'write_asset',
    key: key,
    asset_key: key,
    asset_type: assetType,
    purpose: asset.purpose || null,
    dimensions: asset.dimensions || null,
    url: assetsUrl,
    body: { asset: { key: key, value: svgContent } },
    reason: 'Blueprint asset: ' + assetType + ' (' + (asset.dimensions || 'no dimensions') + ')',
  });
}

// 3. Homepage template: templates/index.json
// This is the critical wiring step — without it, sections exist but never appear on the homepage.
const homepageSections = effectiveSections.filter(s => (s.page || 'homepage') === 'homepage');
if (homepageSections.length > 0) {
  const indexContent = generateIndexTemplate(homepageSections, themeRules, mediaAssets, collections);
  const indexKey = 'templates/index.json';
  writeActions.push({
    operation: 'write_template',
    key: indexKey,
    asset_key: indexKey,
    url: assetsUrl,
    body: { asset: { key: indexKey, value: indexContent } },
    reason: 'Homepage template: wires ' + homepageSections.length + ' sections — ' + homepageSections.map(s => s.section_type).join(', '),
  });
  console.log('Storefront assembly: templates/index.json with ' + homepageSections.length + ' sections');
}

// ── Decide: dry run or live ───────────────────────────────────────────────
if (!allowWrites) {
  const dryPlan = writeActions.map(a => ({
    operation: a.operation,
    key: a.key,
    section_type: a.section_type || undefined,
    asset_type: a.asset_type || undefined,
    reason: a.reason,
  }));

  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_DRY_RUN',
      project_id: projectId,
      shop_url: shopDomain,
      theme_id: themeId,
      theme_name: themeName,
      completed_at: new Date().toISOString(),
      sections_written: 0,
      assets_written: 0,
      templates_written: 0,
      dry_run: true,
      dry_run_plan: dryPlan,
      errors: [],
      warnings: ['DRY RUN: allow_theme_writes not set. No writes performed.'],
      blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
      safety_notes: [
        safetyNote,
        'DRY RUN: ' + writeActions.length + ' write operations planned but not executed',
        'Target theme: ' + themeName + ' (id: ' + themeId + ', role: ' + targetTheme.role + ')',
      ],
    },
  }];
}

// LIVE — output one item per write action
const items = writeActions.map(a => ({
  json: {
    _action: 'write',
    _theme_id: themeId,
    _theme_name: themeName,
    _theme_role: targetTheme.role,
    _safety_note: safetyNote,
    _total_actions: writeActions.length,
    _sections_count: themeSections.length,
    _assets_count: assets.length,
    _project_id: projectId,
    _shop_domain: shopDomain,
    operation: a.operation,
    key: a.key,
    url: a.url,
    body: a.body,
    reason: a.reason,
  },
}));

return items;`;


// ── Patch 3: Compile Deployment Summary — add templates_written tracking ──
const summaryNode = wf.nodes.find(n => n.name === 'Compile Deployment Summary');
if (!summaryNode) throw new Error('Node "Compile Deployment Summary" not found');

summaryNode.parameters.jsCode = `// build-shopify-theme — Compile Deployment Summary
// Aggregates results from write path. Tracks sections, assets, and templates written.

const allItems = $input.all();

// Terminal item (dry-run/blocked) — pass through directly
if (allItems.length === 1 && allItems[0].json._action === 'terminal') {
  const t = allItems[0].json;
  delete t._action;
  return [{ json: t }];
}

// Aggregate write results
const planItems = $('Build Deployment Plan').all();
const first = planItems[0]?.json || {};
const projectId  = first._project_id;
const shopDomain = first._shop_domain;
const themeId    = first._theme_id;
const themeName  = first._theme_name;
const themeRole  = first._theme_role;
const safetyNote = first._safety_note;
const totalActions   = first._total_actions;
const sectionsCount  = first._sections_count;
const assetsCount    = first._assets_count;

let sectionsWritten  = 0;
let assetsWritten    = 0;
let templatesWritten = 0;
const errors   = [];
const warnings = [];
const writtenFiles = [];

for (let i = 0; i < allItems.length; i++) {
  const d = allItems[i].json;
  const plan = planItems[i]?.json || {};
  const key = plan.key || d.key || 'unknown';
  const op  = plan.operation || d.operation || 'unknown';

  const statusCode = d.statusCode || d.body?.statusCode || 0;
  const respBody   = d.body || {};

  const shopifyErrors = respBody.body?.errors || respBody.errors;
  if (shopifyErrors) {
    errors.push({ key: key, status: statusCode, message: typeof shopifyErrors === 'string' ? shopifyErrors : JSON.stringify(shopifyErrors) });
    continue;
  }

  if (statusCode >= 400) {
    errors.push({ key: key, status: statusCode, message: 'HTTP ' + statusCode + ' on PUT' });
    continue;
  }

  // Success
  writtenFiles.push(key);
  if (op === 'write_section') {
    sectionsWritten++;
  } else if (op === 'write_asset') {
    assetsWritten++;
  } else if (op === 'write_template') {
    templatesWritten++;
  }
}

const totalWritten = sectionsWritten + assetsWritten + templatesWritten;
let status;
if (errors.length === 0 && totalWritten === totalActions) {
  status = 'PHASE_7B3_COMPLETE';
} else if (totalWritten > 0) {
  status = 'PHASE_7B3_PARTIAL';
} else {
  status = 'PHASE_7B3_FAILED';
}

const safetyNotes = [
  safetyNote,
  'Target theme: ' + themeName + ' (id: ' + themeId + ', role: ' + themeRole + ')',
  'Active production theme was NOT modified',
  'No theme files were deleted',
];
if (templatesWritten > 0) {
  safetyNotes.push('templates/index.json was written — homepage now wired to ' + sectionsWritten + ' store-os sections');
} else {
  safetyNotes.push('No template files were written');
}

return [{
  json: {
    status:            status,
    project_id:        projectId,
    shop_url:          shopDomain,
    theme_id:          themeId,
    theme_name:        themeName,
    completed_at:      new Date().toISOString(),
    sections_written:  sectionsWritten,
    assets_written:    assetsWritten,
    templates_written: templatesWritten,
    written_files:     writtenFiles,
    dry_run:           false,
    errors:            errors,
    warnings:          warnings,
    blueprint_summary: {
      theme_sections_in_blueprint: sectionsCount,
      assets_in_blueprint:         assetsCount,
    },
    safety_notes: safetyNotes,
  },
}];`;


// ── Write ──────────────────────────────────────────────────────────────────
fs.writeFileSync(WF_PATH, JSON.stringify(wf, null, 2) + '\n');
console.log('✅ Patched build-shopify-theme.n8n.json');
console.log('   - Validate Theme Input: added media_assets, navigation, collections passthrough');
console.log('   - Build Deployment Plan: added templates/index.json generation, hero image, CTA path fix');
console.log('   - Compile Deployment Summary: added templates_written tracking, written_files list');
