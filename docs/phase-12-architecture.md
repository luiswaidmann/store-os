# Phase 12 — Image Grounding Layer

## Purpose

Phase 12 adds visual product understanding to the media generation pipeline. Instead of generating images from text descriptions alone ("product photograph of BassWave Kabellose Kopfhorer"), the system first analyzes existing Shopify product images using Gemini Vision, then uses the resulting physical descriptions to ground generation prompts in reality ("mint green over-ear wireless headphones with circular earcups, cushioned adjustable headband, soft foam ear padding with fabric mesh covering, matte plastic construction...").

## Architecture

```
Shopify Product Images
        │
        ▼
┌─────────────────────────┐
│ build-image-grounding   │  ← Phase 12 (new workflow)
│ (Gemini 2.0 Flash)      │
│                         │
│ 1. Download image       │
│ 2. Convert to base64    │
│ 3. Gemini Vision call   │
│ 4. Parse JSON response  │
│ 5. Compile artifact     │
└────────┬────────────────┘
         │ image_grounding artifact
         ▼
┌─────────────────────────┐
│ build-media-assets      │  ← Phase 9 (modified)
│                         │
│ Validate Inputs:        │
│   accepts image_grounding│
│                         │
│ Build Shot Plan:        │
│   grounded prompts      │
│   generation_mode       │
│   per-asset metadata    │
│                         │
│ Compile Manifest:       │
│   Phase 12 field        │
│   passthrough           │
└─────────────────────────┘
```

## Workflow: build-image-grounding

**n8n ID:** `s5aWmVZcerBgc6kM`
**Trigger:** executeWorkflowTrigger (subworkflow)
**Credential:** Google Gemini (PaLM) API — `ISGPBEdBrApjlhNC`

### Nodes

1. **Subworkflow Trigger** — receives input with `store_blueprint.products` containing image URLs
2. **Validate Inputs** — extracts products, validates at least one product has images
3. **Prepare Vision Requests** — downloads each product's primary image from Shopify CDN (`?width=800`), converts to base64
4. **Has Image?** — routes products with/without images
5. **Analyze Product Image** — sends base64 image to Gemini 2.0 Flash with structured extraction prompt
6. **Compile Grounding Artifact** — assembles per-product visual analysis into final artifact

### Gemini Vision Prompt

The prompt extracts structured JSON with:
- `visual_analysis`: category, form_factor, materials, primary_colors, distinctive_features, surface_finish, ecommerce_suitability
- `grounding_prompt_additions`: product_description_grounded, material_keywords, shape_keywords, detail_focus_areas
- `source_image_assessment`: quality_score (0-1), usable_as (product_image, hero_banner, etc.), reuse_recommendation (keep/enhance/replace)

### Output Schema

`schemas/phase-12/image-grounding.schema.json`

Status enum: `PHASE_12_COMPLETE | PHASE_12_PARTIAL | PHASE_12_FAILED`

## Integration with build-media-assets

### Modified Nodes

**Validate Inputs** — accepts optional `image_grounding` input. Validates `status === 'PHASE_12_COMPLETE'` and `products.length > 0`.

**Build Shot Plan and Prompts** — three changes:
1. Builds `groundingByHandle` lookup from grounding artifact
2. `buildPrompt()` accepts grounding parameter; when grounded, uses `product_description_grounded` instead of product title, injects material/shape keywords, adds detail_focus_areas for closeup shots
3. Determines `generation_mode` per asset: `reuse` (source image good enough), `grounded_generate` (generate with visual grounding), `generate` (text-only, no grounding)

**Compile Media Manifest** — `enrichAssetFields()` helper ensures all Phase 12 fields are present on both prompt-only and generation paths.

### Per-Asset Phase 12 Fields

| Field | Type | Description |
|-------|------|-------------|
| `generation_mode` | `reuse\|grounded_generate\|generate\|null` | How this asset should be produced |
| `grounding_source_type` | `string\|null` | Source of grounding data (e.g. `shopify_product_image`) |
| `grounded_from_image` | `string\|null` | URL of the source image used for visual grounding |
| `grounding_confidence` | `number\|null` | Quality score of the source image (0-1) |
| `product_faithfulness_required` | `boolean` | Whether this asset must faithfully represent the actual product |

### Generation Mode Decision Logic

```
if no grounding exists:
  generation_mode = "generate"          # text-only prompt
elif source image is "keep" + matching shot type:
  generation_mode = "reuse"             # use source image as-is
else:
  generation_mode = "grounded_generate" # generate new, grounded in visual analysis
```

## Grounded vs Ungrounded Prompts

**Ungrounded** (no image_grounding):
> Professional ecommerce product photograph of a headphones: "BassWave Kabellose Kopfhorer".

**Grounded** (with image_grounding):
> Professional ecommerce product photograph of: mint green over-ear wireless headphones with circular earcups, cushioned adjustable headband, soft foam ear padding with fabric mesh covering, matte plastic construction, minimalist Scandinavian-inspired design with clean lines, visible retractable microphone boom on left earcup. Materials: matte plastic, foam padding, fabric mesh, cushioned leatherette. Form: over-ear, circular earcups, adjustable headband, compact fold.

## Validation

**Phase 12G confirmed 2026-04-09:**
- 1 product (basswave-kabellose-kopfhorer) with real Shopify image
- 5 grounded prompts generated (all contain Gemini-derived physical descriptions)
- All Phase 12 per-asset fields present and correct
- `generation_mode: grounded_generate` on all assets (source image "enhance" recommendation)
- `grounding_confidence: 0.82` from Gemini quality assessment
- Detail closeup includes focus areas (earcup padding, headband mechanism, microphone boom, color finish)
