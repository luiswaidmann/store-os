#!/usr/bin/env node
/**
 * patch-theme-editor-compatibility.js
 *
 * Fixes Shopify theme editor compatibility issues in build-shopify-theme.n8n.json:
 *
 * ROOT CAUSES FIXED:
 * 1. collection type settings pre-populated with handle string — NOT SUPPORTED by Shopify.
 *    Collection settings in JSON templates must be empty. Shopify stores them as GIDs
 *    after editor selection. A string handle causes silent resolution failure in editor.
 * 2. Missing `disabled_on` in section schemas — sections appear in header/footer
 *    section groups where they can't render → "not compatible with your theme" error.
 * 3. DALL-E image_url bound in template JSON — those CDN URLs expire in ~4 hours.
 *    The editor renders the hero with an expired URL → broken image state.
 * 4. Hero Liquid uses `| default: nil` pattern — unusual, replaced with direct if checks.
 * 5. `inset: 0` CSS — replaced with `top:0; left:0; right:0; bottom:0` for broader
 *    compatibility in Shopify's editor preview renderer.
 *
 * TEMPLATE COVERAGE:
 * - templates/index.json: custom (our sections in order)
 * - templates/collection.json: Dawn default (left intact — main-collection-banner + grid)
 * - templates/product.json: Dawn default (left intact — main-product)
 * - templates/page.json: Dawn default (left intact — main-page)
 * - templates/404.json: Dawn default (left intact)
 *
 * One-time use. Run: node scripts/patch-theme-editor-compatibility.js
 */

const fs = require('fs');
const path = require('path');

const WF_PATH = path.join(__dirname, '..', 'workflows', 'n8n', 'build-shopify-theme.n8n.json');
const wf = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));

const buildNode = wf.nodes.find(n => n.name === 'Build Deployment Plan');
if (!buildNode) throw new Error('Build Deployment Plan node not found');

// ── Replace the full Build Deployment Plan code ──────────────────────────
buildNode.parameters.jsCode = `// build-shopify-theme — Resolve Target Theme + Build Deployment Plan
// Selects safe target theme, generates section .liquid content, homepage template JSON,
// and outputs write actions.
//
// SAFETY RULES:
// 1. NEVER target the active (role: main) theme unless explicitly overridden
// 2. Prefer unpublished/development themes
// 3. PHASE_7B3_BLOCKED if no safe target
// 4. DRY_RUN if allow_theme_writes is false
//
// STOREFRONT ASSEMBLY:
// - Section .liquid files with inline {% schema %} and disabled_on header/footer
// - templates/index.json wires sections onto the homepage in section_stack order
// - Collection type settings left EMPTY (Shopify OS 2.0 requirement — no handle seeding)
// - Hero image_url NOT pre-populated (DALL-E CDN URLs expire; editor user sets this)
//
// TEMPLATE COVERAGE:
// - index (homepage): custom (our sections)
// - collection / product / page / 404: Dawn defaults (not overwritten)

const validated = $('Validate Theme Input').first().json;
const themesResponse = $input.first().json;

const projectId        = validated.project_id;
const shopDomain       = validated.shop_domain;
const shopifyBase      = validated.shopify_base;
const allowWrites      = validated.allow_theme_writes;
const requestedThemeId = validated.target_theme_id;
const themeSections    = validated.theme_sections;
const assets           = validated.assets;
const themeRules       = validated.theme_rules || null;
const mediaAssets      = validated.media_assets || [];
const collections      = validated.collections || [];

// ── Parse themes response ──────────────────────────────────────────────────
const body = themesResponse.body || themesResponse;
const themes = (body.themes || body.data?.themes || []);

if (themes.length === 0) {
  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_BLOCKED',
      project_id: projectId, shop_url: shopDomain,
      theme_id: null, theme_name: null,
      completed_at: new Date().toISOString(),
      sections_written: 0, assets_written: 0, templates_written: 0,
      dry_run: true, dry_run_plan: [],
      errors: [{ key: 'themes', status: 0, message: 'Failed to fetch themes or no themes found' }],
      warnings: [],
      blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
      safety_notes: ['BLOCKED: Could not retrieve themes from Shopify'],
    },
  }];
}

// ── Select target theme ────────────────────────────────────────────────────
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
        project_id: projectId, shop_url: shopDomain,
        theme_id: null, theme_name: null,
        completed_at: new Date().toISOString(),
        sections_written: 0, assets_written: 0, templates_written: 0,
        dry_run: true, dry_run_plan: [],
        errors: [{ key: 'theme_id', status: 404, message: 'Requested theme ID ' + requestedThemeId + ' not found. Available: ' + themes.map(t => t.id + ' (' + t.role + ')').join(', ') }],
        warnings: [],
        blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
        safety_notes: ['BLOCKED: Requested shopify_theme_id not found'],
      },
    }];
  }
  safetyNote = targetTheme.role === 'main'
    ? 'WARNING: Targeting active (main) theme by explicit shopify_theme_id override.'
    : 'Targeting explicitly requested theme: ' + targetTheme.name + ' (role: ' + targetTheme.role + ')';
} else if (unpublishedThemes.length > 0) {
  targetTheme = unpublishedThemes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
  safetyNote = 'Auto-selected unpublished theme: ' + targetTheme.name + ' (id: ' + targetTheme.id + '). Active theme ' + (activeTheme ? activeTheme.name : 'unknown') + ' is NOT affected.';
} else {
  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_BLOCKED',
      project_id: projectId, shop_url: shopDomain,
      theme_id: null, theme_name: null,
      completed_at: new Date().toISOString(),
      sections_written: 0, assets_written: 0, templates_written: 0,
      dry_run: true, dry_run_plan: [],
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

// ── Helper: resolve CTA link to valid Shopify storefront path ─────────────
// Rules:
// - Already-prefixed paths (/collections/..., /products/..., /pages/..., http...) → pass through
// - Known page handles (about, faq, contact, etc.) → /pages/{handle}
// - Bare handles → /collections/{handle} (most common CTA target)
function resolveCtaLink(target) {
  if (!target) return '/';
  if (target.startsWith('/') || target.startsWith('http') || target.startsWith('shopify://')) return target;
  const pageHandles = ['about', 'contact', 'faq', 'shipping', 'returns', 'privacy-policy', 'terms-of-service', 'impressum', 'datenschutz'];
  if (pageHandles.includes(target.toLowerCase())) return '/pages/' + target;
  return '/collections/' + target;
}

// ── Generate section .liquid content ──────────────────────────────────────
// Each section is a standalone Shopify OS 2.0 section with:
// - HTML template using section.settings variables
// - Schema block with configurable settings pre-populated from blueprint hints
// - disabled_on: { groups: ["header","footer"] } — prevents editor incompatibility
//   when sections appear in section groups that can't render them
// - Presets for theme editor discovery (add sections via editor)
function generateSectionLiquid(section, themeRulesCtx) {
  const sType = (section.section_type || 'unknown').toLowerCase().replace(/[\\/\\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
  const heading = section.heading_hint || section.section_type || 'Section';
  const content = section.content_hint || '';
  const ctaLabel = section.cta_label || '';
  const ctaTarget = resolveCtaLink(section.cta_target || '');
  const rawName = heading.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const schemeName = rawName.slice(0, 25).trim();

  let settings = [];

  // Common settings
  settings.push('    {\\n      "type": "text",\\n      "id": "heading",\\n      "label": "Heading",\\n      "default": ' + JSON.stringify(heading) + '\\n    }');
  settings.push('    {\\n      "type": "richtext",\\n      "id": "content",\\n      "label": "Content",\\n      "default": ' + JSON.stringify('<p>' + (content || 'Add your content here.') + '</p>') + '\\n    }');

  if (ctaLabel) {
    settings.push('    {\\n      "type": "text",\\n      "id": "cta_label",\\n      "label": "Button text",\\n      "default": ' + JSON.stringify(ctaLabel) + '\\n    }');
    settings.push('    {\\n      "type": "text",\\n      "id": "cta_link",\\n      "label": "Button link",\\n      "default": ' + JSON.stringify(ctaTarget || '/') + '\\n    }');
  }

  // Hero: image_picker + overlay (no default URL — DALL-E CDN URLs expire)
  if (sType === 'hero') {
    settings.push('    {\\n      "type": "image_picker",\\n      "id": "image",\\n      "label": "Hero image"\\n    }');
    settings.push('    {\\n      "type": "range",\\n      "id": "overlay_opacity",\\n      "label": "Overlay opacity",\\n      "min": 0,\\n      "max": 100,\\n      "step": 5,\\n      "default": 30,\\n      "unit": "%"\\n    }');
  }

  // Featured-collection: collection picker (left empty — cannot be seeded with handle)
  // and products_to_show range
  if (sType === 'featured-collection') {
    const productsToShow = (themeRulesCtx?.section_system?.featured_collection?.products_to_show) || 4;
    settings.push('    {\\n      "type": "collection",\\n      "id": "collection",\\n      "label": "Collection"\\n    }');
    settings.push('    {\\n      "type": "range",\\n      "id": "products_to_show",\\n      "label": "Products to show",\\n      "min": 2,\\n      "max": 12,\\n      "step": 1,\\n      "default": ' + productsToShow + '\\n    }');
  }

  // Value-prop: column count
  if (sType === 'value-prop') {
    const columnCount = (themeRulesCtx?.section_system?.value_prop?.column_count) || 3;
    settings.push('    {\\n      "type": "range",\\n      "id": "columns",\\n      "label": "Columns",\\n      "min": 2,\\n      "max": 4,\\n      "step": 1,\\n      "default": ' + columnCount + '\\n    }');
  }

  // ── Build HTML template ──────────────────────────────────────────────────
  let template = '';

  if (sType === 'hero') {
    // Hero with background image support. Uses image_picker setting (Shopify CDN-safe).
    // Falls back to CSS gradient when no image is selected.
    // Note: top/left/right/bottom used instead of CSS inset shorthand for editor compat
    // for maximum editor preview compatibility.
    template += '<section class="store-os-section store-os-hero" style="position: relative; min-height: 400px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; overflow: hidden;">\\n';
    template += '  {%- if section.settings.image -%}\\n';
    template += '    <img src="{{ section.settings.image | image_url: width: 1920 }}"\\n';
    template += '         alt="{{ section.settings.image.alt | escape }}"\\n';
    template += '         loading="eager"\\n';
    template += '         style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;">\\n';
    template += '  {%- else -%}\\n';
    template += '    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 0;"></div>\\n';
    template += '  {%- endif -%}\\n';
    template += '  {%- assign overlay = section.settings.overlay_opacity | divided_by: 100.0 -%}\\n';
    template += '  <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,{{ overlay }}); z-index: 1;"></div>\\n';
    template += '  <div style="position: relative; z-index: 2; color: #fff; max-width: 800px;">\\n';
    template += '    <h1 style="font-size: 2.5em; margin-bottom: 0.5em; line-height: 1.2;">{{ section.settings.heading | escape }}</h1>\\n';
    template += '    <div class="store-os-content" style="font-size: 1.1em; margin-bottom: 1.5em;">{{ section.settings.content }}</div>\\n';
    template += '    {%- if section.settings.cta_label != blank -%}\\n';
    template += '      <a href="{{ section.settings.cta_link | escape }}"\\n';
    template += '         class="button store-os-cta"\\n';
    template += '         style="display: inline-block; padding: 14px 32px; background: #ffffff; color: #333333; text-decoration: none; font-weight: 600; border-radius: 4px; font-size: 1em;">\\n';
    template += '        {{ section.settings.cta_label | escape }}\\n';
    template += '      </a>\\n';
    template += '    {%- endif -%}\\n';
    template += '  </div>\\n';
    template += '</section>\\n';

  } else if (sType === 'featured-collection') {
    template += '<section class="store-os-section store-os-featured-collection" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;">\\n';
    template += '  {%- if section.settings.heading != blank -%}<h2 style="margin-bottom: 20px;">{{ section.settings.heading | escape }}</h2>{%- endif -%}\\n';
    template += '  {%- if section.settings.content != blank -%}<div class="store-os-content" style="margin-bottom: 20px;">{{ section.settings.content }}</div>{%- endif -%}\\n';
    template += '  {%- assign fc = section.settings.collection -%}\\n';
    template += '  {%- if fc != blank and fc.products_count > 0 -%}\\n';
    template += '    {%- assign cols = section.settings.products_to_show | at_most: 4 -%}\\n';
    template += '    <div class="store-os-grid" style="display: grid; grid-template-columns: repeat({{ cols }}, 1fr); gap: 20px; margin-top: 20px;">\\n';
    template += '      {%- for product in fc.products limit: section.settings.products_to_show -%}\\n';
    template += '        <div class="store-os-product-card" style="text-align: center;">\\n';
    template += '          {%- if product.featured_image -%}\\n';
    template += '            <a href="{{ product.url }}" style="display: block; margin-bottom: 10px;">\\n';
    template += '              <img src="{{ product.featured_image | image_url: width: 400 }}"\\n';
    template += '                   alt="{{ product.featured_image.alt | default: product.title | escape }}"\\n';
    template += '                   loading="lazy"\\n';
    template += '                   style="max-width: 100%; height: auto; border-radius: 4px;">\\n';
    template += '            </a>\\n';
    template += '          {%- endif -%}\\n';
    template += '          <h3 style="margin: 8px 0; font-size: 0.95em;"><a href="{{ product.url }}" style="text-decoration: none; color: inherit;">{{ product.title | escape }}</a></h3>\\n';
    template += '          <p style="margin: 4px 0; font-weight: 600;">{{ product.price | money }}</p>\\n';
    template += '        </div>\\n';
    template += '      {%- endfor -%}\\n';
    template += '    </div>\\n';
    template += '    {%- if section.settings.cta_label != blank -%}\\n';
    template += '      <div style="margin-top: 24px; text-align: center;">\\n';
    template += '        <a href="{{ section.settings.cta_link | default: fc.url | escape }}" class="button store-os-cta" style="display: inline-block; padding: 12px 28px; background: #333; color: #fff; text-decoration: none; border-radius: 4px;">{{ section.settings.cta_label | escape }}</a>\\n';
    template += '      </div>\\n';
    template += '    {%- endif -%}\\n';
    template += '  {%- elsif fc != blank -%}\\n';
    template += '    <p style="color: #999; font-style: italic;">This collection has no products yet.</p>\\n';
    template += '  {%- else -%}\\n';
    template += '    <p style="color: #999; font-style: italic; padding: 20px; border: 1px dashed #ccc; text-align: center;">Select a collection in the theme editor to display products here.</p>\\n';
    template += '  {%- endif -%}\\n';
    template += '</section>\\n';

  } else if (sType === 'value-prop') {
    template += '<section class="store-os-section store-os-value-prop" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;">\\n';
    template += '  {%- if section.settings.heading != blank -%}<h2 style="text-align: center; margin-bottom: 10px;">{{ section.settings.heading | escape }}</h2>{%- endif -%}\\n';
    template += '  {%- if section.settings.content != blank -%}<div class="store-os-content" style="text-align: center; margin-bottom: 24px;">{{ section.settings.content }}</div>{%- endif -%}\\n';
    template += '  {%- assign col_count = section.settings.columns | default: 3 -%}\\n';
    template += '  {%- if section.blocks.size > 0 -%}\\n';
    template += '    <div class="store-os-columns" style="display: grid; grid-template-columns: repeat({{ col_count }}, 1fr); gap: 30px; margin-top: 20px;">\\n';
    template += '      {%- for block in section.blocks -%}\\n';
    template += '        <div class="store-os-column" {{ block.shopify_attributes }} style="text-align: center; padding: 20px;">\\n';
    template += '          <h3 style="margin-bottom: 8px;">{{ block.settings.title | escape }}</h3>\\n';
    template += '          <p style="margin: 0; color: #555;">{{ block.settings.description | escape }}</p>\\n';
    template += '        </div>\\n';
    template += '      {%- endfor -%}\\n';
    template += '    </div>\\n';
    template += '  {%- else -%}\\n';
    template += '    <p style="color: #999; font-style: italic; text-align: center; padding: 20px; border: 1px dashed #ccc;">Add column blocks in the theme editor to display your value propositions.</p>\\n';
    template += '  {%- endif -%}\\n';
    template += '</section>\\n';

  } else if (sType === 'trust-social-proof' || sType === 'trust' || sType === 'social-proof') {
    template += '<section class="store-os-section store-os-trust" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto; text-align: center;">\\n';
    template += '  {%- if section.settings.heading != blank -%}<h2 style="margin-bottom: 10px;">{{ section.settings.heading | escape }}</h2>{%- endif -%}\\n';
    template += '  {%- if section.settings.content != blank -%}<div class="store-os-content" style="margin-bottom: 24px;">{{ section.settings.content }}</div>{%- endif -%}\\n';
    template += '  {%- if section.blocks.size > 0 -%}\\n';
    template += '    <div class="store-os-trust-items" style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">\\n';
    template += '      {%- for block in section.blocks -%}\\n';
    template += '        <div class="store-os-trust-item" {{ block.shopify_attributes }} style="text-align: center; max-width: 180px; flex: 1 1 140px;">\\n';
    template += '          <strong style="display: block; margin-bottom: 6px; font-size: 1.05em;">{{ block.settings.title | escape }}</strong>\\n';
    template += '          <p style="margin: 0; font-size: 0.9em; color: #555;">{{ block.settings.description | escape }}</p>\\n';
    template += '        </div>\\n';
    template += '      {%- endfor -%}\\n';
    template += '    </div>\\n';
    template += '  {%- else -%}\\n';
    template += '    <p style="color: #999; font-style: italic; padding: 20px; border: 1px dashed #ccc;">Add trust signal blocks in the theme editor.</p>\\n';
    template += '  {%- endif -%}\\n';
    template += '</section>\\n';

  } else {
    // Generic section fallback
    template += '<section class="store-os-section store-os-' + sType + '" style="padding: 40px 20px; max-width: 1200px; margin: 0 auto;">\\n';
    template += '  {%- if section.settings.heading != blank -%}<h2>{{ section.settings.heading | escape }}</h2>{%- endif -%}\\n';
    template += '  <div class="store-os-content">{{ section.settings.content }}</div>\\n';
    if (ctaLabel) {
      template += '  {%- if section.settings.cta_label != blank -%}\\n';
      template += '    <div style="margin-top: 20px; text-align: center;"><a href="{{ section.settings.cta_link | escape }}" class="button store-os-cta" style="display: inline-block; padding: 12px 28px; background: #333; color: #fff; text-decoration: none; border-radius: 4px;">{{ section.settings.cta_label | escape }}</a></div>\\n';
      template += '  {%- endif -%}\\n';
    }
    template += '</section>\\n';
  }

  // ── Build blocks schema ──────────────────────────────────────────────────
  let blocks = '';
  if (sType === 'value-prop') {
    const maxBlocks = (themeRulesCtx?.section_system?.value_prop?.column_count) || 4;
    blocks = ',\\n    "blocks": [\\n      {\\n        "type": "column",\\n        "name": "Column",\\n        "settings": [\\n          { "type": "text", "id": "title", "label": "Title", "default": "Feature" },\\n          { "type": "text", "id": "description", "label": "Description", "default": "Describe this feature." }\\n        ]\\n      }\\n    ],\\n    "max_blocks": ' + maxBlocks;
  }
  if (sType === 'trust-social-proof' || sType === 'trust' || sType === 'social-proof') {
    const maxBlocks = (themeRulesCtx?.section_system?.trust_social_proof?.block_count) || 6;
    blocks = ',\\n    "blocks": [\\n      {\\n        "type": "column",\\n        "name": "Trust signal",\\n        "settings": [\\n          { "type": "text", "id": "title", "label": "Title", "default": "Trust Signal" },\\n          { "type": "text", "id": "description", "label": "Description", "default": "Why customers trust us." }\\n        ]\\n      }\\n    ],\\n    "max_blocks": ' + maxBlocks;
  }

  // ── Build schema JSON ────────────────────────────────────────────────────
  // disabled_on: prevents sections from appearing in header/footer section groups
  // where they cannot render and produce editor "not compatible" errors.
  const schemaName = JSON.stringify('store-os: ' + schemeName);
  const schema = '{\\n  "name": ' + schemaName + ',\\n  "tag": "section",\\n  "class": "store-os-section",\\n  "disabled_on": {\\n    "groups": ["header", "footer"]\\n  },\\n  "settings": [\\n' + settings.join(',\\n') + '\\n  ]' + blocks + ',\\n  "presets": [\\n    { "name": ' + schemaName + ' }\\n  ]\\n}';

  return template + '\\n{% schema %}\\n' + schema + '\\n{% endschema %}\\n';
}

// ── Generate SVG placeholder assets ───────────────────────────────────────
function generatePlaceholderSvg(asset) {
  const dims = asset.dimensions || '200x200';
  const parts = dims.split('x').map(Number);
  const w = parts[0] || 200;
  const h = parts[1] || 200;
  const purpose = (asset.purpose || asset.asset_type || 'placeholder').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const label = purpose.length > 30 ? purpose.slice(0, 30) + '...' : purpose;

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<rect width="' + w + '" height="' + h + '" fill="#e8e8e8" stroke="#ccc" stroke-width="2"/>'
    + '<text x="50%" y="40%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#666">' + dims + '</text>'
    + '<text x="50%" y="55%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#999">' + label + '</text>'
    + '<text x="50%" y="70%" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#bbb">store-os placeholder</text>'
    + '</svg>';
}

// ── Generate templates/index.json — homepage assembly ─────────────────────
// CRITICAL: Collection type settings CANNOT be pre-populated in JSON templates.
// Shopify OS 2.0 resource settings (collection, product, page) are stored as
// GIDs after editor selection. Seeding a handle string is NOT supported and
// causes editor resolution failures. Leave collection setting empty.
//
// DALL-E image URLs are NOT written to the template. CDN URLs from DALL-E expire
// in ~4 hours. The hero image must be set via the theme editor's image picker.
// Keeping image empty avoids broken-image state in editor.
function generateIndexTemplate(sections, themeRulesCtx) {
  const templateSections = {};
  const order = [];

  for (const section of sections) {
    const sType = (section.section_type || 'unknown').toLowerCase().replace(/[\\/\\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sectionId = 'store-os-' + sType;
    const sectionType = 'store-os-' + sType;

    const settings = {};

    // Text/richtext settings — safe to pre-populate
    if (section.heading_hint) settings.heading = section.heading_hint;
    if (section.content_hint) settings.content = '<p>' + section.content_hint + '</p>';
    if (section.cta_label) settings.cta_label = section.cta_label;
    if (section.cta_target) settings.cta_link = resolveCtaLink(section.cta_target);

    // Hero: overlay opacity pre-set; image NOT pre-set (CDN URLs expire)
    if (sType === 'hero') {
      settings.overlay_opacity = 30;
    }

    // Featured-collection: products_to_show pre-set; collection NOT pre-set
    // (Shopify does not support collection handle seeding in JSON templates)
    if (sType === 'featured-collection') {
      settings.products_to_show = (themeRulesCtx?.section_system?.featured_collection?.products_to_show) || 4;
    }

    // Value-prop: column count pre-set
    if (sType === 'value-prop') {
      settings.columns = (themeRulesCtx?.section_system?.value_prop?.column_count) || 3;
    }

    const sectionDef = { type: sectionType, settings: settings };

    // Pre-populate blocks for value-prop sections
    if (sType === 'value-prop') {
      const colCount = settings.columns || 3;
      const blockMap = {};
      const blockOrder = [];
      for (let i = 1; i <= colCount; i++) {
        const blockId = 'col-' + i;
        blockMap[blockId] = { type: 'column', settings: { title: 'Feature ' + i, description: 'Describe this feature.' } };
        blockOrder.push(blockId);
      }
      sectionDef.blocks = blockMap;
      sectionDef.block_order = blockOrder;
    }

    // Pre-populate blocks for trust sections
    if (sType === 'trust-social-proof' || sType === 'trust' || sType === 'social-proof') {
      const blockCount = (themeRulesCtx?.section_system?.trust_social_proof?.block_count) || 4;
      const blockMap = {};
      const blockOrder = [];
      for (let i = 1; i <= blockCount; i++) {
        const blockId = 'trust-' + i;
        blockMap[blockId] = { type: 'column', settings: { title: 'Trust Signal ' + i, description: 'Add your trust signal here.' } };
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

// ── Resolve effective section list ────────────────────────────────────────
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
        section_type: rs.section_type, order: rs.order,
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
    key: key, asset_key: key,
    section_type: sType, page: section.page || 'homepage', order: section.order || null,
    url: assetsUrl,
    body: { asset: { key: key, value: liquidContent } },
    reason: themeRules
      ? 'Theme rules (' + themeRules.store_pattern + '): ' + sType
      : 'Blueprint section: ' + sType,
  });
}

// 2. Asset SVG placeholders
const assetKeyMap = {
  'logo':       'assets/store-os-logo-placeholder.svg',
  'favicon':    'assets/store-os-favicon-placeholder.svg',
  'hero-image': 'assets/store-os-hero-placeholder.svg',
};
for (const asset of assets) {
  const assetType = (asset.asset_type || 'unknown').toLowerCase();
  const key = assetKeyMap[assetType] || 'assets/store-os-' + assetType + '-placeholder.svg';
  writeActions.push({
    operation: 'write_asset',
    key: key, asset_key: key,
    asset_type: assetType, purpose: asset.purpose || null, dimensions: asset.dimensions || null,
    url: assetsUrl,
    body: { asset: { key: key, value: generatePlaceholderSvg(asset) } },
    reason: 'Blueprint asset: ' + assetType,
  });
}

// 3. Homepage template: templates/index.json
// TEMPLATE COVERAGE:
// - index: custom (our store-os sections)
// - collection: Dawn default (main-collection-banner + main-collection-product-grid)
// - product: Dawn default (main-product)
// - page: Dawn default (main-page)
// - 404: Dawn default
// The Dawn defaults are left intact — NOT overwritten — as they are complete
// Shopify OS 2.0 templates. We only manage the homepage.
const homepageSections = effectiveSections.filter(s => (s.page || 'homepage') === 'homepage');
if (homepageSections.length > 0) {
  const indexContent = generateIndexTemplate(homepageSections, themeRules);
  const indexKey = 'templates/index.json';
  writeActions.push({
    operation: 'write_template',
    key: indexKey, asset_key: indexKey,
    url: assetsUrl,
    body: { asset: { key: indexKey, value: indexContent } },
    reason: 'Homepage template: wires ' + homepageSections.length + ' sections — ' + homepageSections.map(s => s.section_type).join(', '),
  });
  console.log('Storefront assembly: templates/index.json with ' + homepageSections.length + ' sections');
}

// ── Dry run or live ───────────────────────────────────────────────────────
if (!allowWrites) {
  const dryPlan = writeActions.map(a => ({ operation: a.operation, key: a.key, reason: a.reason }));
  return [{
    json: {
      _action: 'terminal',
      status: 'PHASE_7B3_DRY_RUN',
      project_id: projectId, shop_url: shopDomain,
      theme_id: themeId, theme_name: themeName,
      completed_at: new Date().toISOString(),
      sections_written: 0, assets_written: 0, templates_written: 0,
      dry_run: true, dry_run_plan: dryPlan,
      errors: [],
      warnings: ['DRY RUN: allow_theme_writes not set. No writes performed.'],
      blueprint_summary: { theme_sections_in_blueprint: themeSections.length, assets_in_blueprint: assets.length },
      safety_notes: [safetyNote, 'DRY RUN: ' + writeActions.length + ' operations planned', 'Target theme: ' + themeName + ' (id: ' + themeId + ')'],
    },
  }];
}

// LIVE: one item per write action
return writeActions.map(a => ({
  json: {
    _action: 'write',
    _theme_id: themeId, _theme_name: themeName, _theme_role: targetTheme.role,
    _safety_note: safetyNote,
    _total_actions: writeActions.length,
    _sections_count: themeSections.length, _assets_count: assets.length,
    _project_id: projectId, _shop_domain: shopDomain,
    operation: a.operation, key: a.key, url: a.url, body: a.body, reason: a.reason,
  },
}));`;

fs.writeFileSync(WF_PATH, JSON.stringify(wf, null, 2) + '\n');
console.log('✅ Patched build-shopify-theme.n8n.json for editor compatibility');
console.log('');
console.log('Fixes applied:');
console.log('  1. Removed collection handle pre-population (Shopify does not support handle seeding in JSON templates)');
console.log('  2. Removed DALL-E image_url from template JSON (CDN URLs expire ~4h)');
console.log('  3. Added disabled_on: { groups: ["header","footer"] } to all section schemas');
console.log('  4. Fixed hero: removed | default: nil pattern, use direct if checks');
console.log('  5. Fixed CSS: replaced "inset: 0" with explicit top/left/right/bottom for editor compat');
console.log('  6. Added empty-state fallbacks to all sections for clean editor rendering');
console.log('  7. Added | escape to all user-facing text outputs');
console.log('');
console.log('Template coverage:');
console.log('  - templates/index.json: custom (our store-os sections in section_stack order)');
console.log('  - templates/collection.json: Dawn default (not overwritten)');
console.log('  - templates/product.json: Dawn default (not overwritten)');
console.log('  - templates/page.json: Dawn default (not overwritten)');
console.log('  - templates/404.json: Dawn default (not overwritten)');
