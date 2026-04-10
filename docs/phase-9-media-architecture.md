# Phase 9 — Visual System & Media Runtime

## Status

**Phase 9 EXECUTABLE.** `build-media-assets` workflow is implemented and ready for deployment.

| Sub-phase | Status | Description |
|---|---|---|
| 9A | COMPLETE | Visual System (art direction engine) |
| 9B | COMPLETE | Shot Taxonomy (deterministic output set) |
| 9C | COMPLETE | Prompt Templating System |
| 9D | COMPLETE | Media Generation Workflow |
| 9E | COMPLETE | Local Storage Layer |
| 9F | COMPLETE | Quality Gate (stub — ready for implementation) |
| 9G | COMPLETE | Shopify Preparation Mapping |

---

## Core Principle

The media system is **visual-system-first, deterministic, and template-driven**.

- Same product class → visually consistent outputs
- No style drift between products
- No randomness in any generation step
- All prompts are pure functions of inputs
- Reproducible: same inputs always produce same outputs

---

## Phase 9A: Visual System (Art Direction Engine)

The visual system is a structured artifact derived deterministically from `brand_positioning` and `store_profile`. It governs all visual output consistency.

### Derivation Rules

Every visual system property is a **pure function** of upstream artifacts:

| Property | Derived From | Logic |
|---|---|---|
| `style.background` | `store_profile.price_positioning` | luxury/premium → soft-gradient; mass-premium → neutral-studio; mass-market/budget → clean-white |
| `style.lighting` | `brand_positioning.tone_of_voice.style` | technical-trustworthy → soft-studio; premium-confident → dramatic-directional; warm-helpful → warm-golden |
| `style.color_logic` | `brand_positioning.brand_role` | specialist → neutral-dominant; curator → warm-accent; premium-innovator → cool-accent |
| `style.contrast_profile` | `store_profile.price_positioning` | luxury → soft-editorial; premium → balanced-natural; mass-premium → high-clarity |
| `composition.framing` | `brand_positioning.brand_role` | specialist/value-leader → centered; curator/editorial → rule-of-thirds; premium-innovator → asymmetric |
| `composition.spacing` | `store_profile.price_positioning` | luxury/premium → generous; mass-premium → balanced; mass-market/budget → tight |
| `product_representation.shadow_style` | `store_profile.price_positioning` | luxury → reflection; premium/mass-premium → soft-drop; budget → none |
| `style.mood` | `brand_positioning.brand_traits` | First 3 brand traits joined |

### Schema

`schemas/phase-9/visual-system.schema.json`

### Consistency Rules (enforced)

- `no_random_backgrounds: true` — all backgrounds match `style.background`
- `no_random_camera_angles: true` — angles are fixed per shot_type
- `no_mixed_lighting: true` — all shots use the same lighting
- `color_temperature_locked: true` — no color temp variance

---

## Phase 9B: Shot Taxonomy (Deterministic Output Set)

Every product receives the **same fixed set of shots**. No product gets special treatment.

| Shot Type | Camera | Composition | Background | Purpose | Ratio | Priority | Required |
|---|---|---|---|---|---|---|---|
| `studio_packshot` | front-center | centered | pure-white | conversion | 1:1 | 1 | YES |
| `clean_feature` | three-quarter-left | rule-of-thirds-left | studio-gradient | clarity | 4:5 | 2 | YES |
| `lifestyle_context` | eye-level | rule-of-thirds-right | contextual | aspiration | 4:5 | 3 | YES |
| `hero_wide` | eye-level | negative-space-right | brand-color | hero-impact | 16:9 | 4 | NO |
| `detail_closeup` | macro-detail | full-frame | surface-only | verification | 1:1 | 5 | NO |

### Schema

`schemas/phase-9/shot-taxonomy.schema.json`

---

## Phase 9C: Prompt Templating System

Prompts are assembled from **structured template segments**, not free-form text:

```
[Subject] + [Features] + [Camera Angle] + [Composition] + 
[Background] + [Lighting] + [Shadow] + [Emphasis] + 
[Mood] + [Technical Requirements]
```

Each segment is a **pure function**:
- Subject → `product.product_type` + `product.title`
- Features → `product.description_hint`
- Camera Angle → `shot_type.camera_angle` (lookup table)
- Background → `shot_type.background_type` (lookup table, parameterized by visual_system)
- Lighting → `visual_system.style.lighting` (lookup table)
- Shadow → `visual_system.product_representation.shadow_style` (lookup table)
- Mood → `visual_system.style.mood`

**No randomness. No temperature-based variation. No LLM-generated prompts.**

---

## Phase 9D: Media Generation Workflow

### Node Contract

```
Pattern: 8-node (Trigger → Validate → Derive Visual System → Build Shot Plan + Prompts → IF generate → [Batch → Generate Image] → Compile Manifest)
Trigger: n8n-nodes-base.executeWorkflowTrigger
Input:   store_profile + brand_positioning + store_blueprint + runtime_config
Output:  media_generation artifact (inline)
Auth:    openAiApi (for DALL-E image generation)
Cloud:   fully compatible
```

### Data Flow

```
Subworkflow Trigger
    │
    └── Validate Inputs
        └── Derive Visual System (9A)
            └── Build Shot Plan + Prompts (9B + 9C)
                └── Generation Enabled? (IF allow_media_generation)
                    ├── [true]  Prepare Generation Batch
                    │               └── Generate Image (DALL-E API)
                    │                   └── Compile Media Manifest
                    └── [false] Compile Media Manifest (prompts_only)
```

### Two Execution Modes

| Mode | Trigger | API Calls | Output Status |
|---|---|---|---|
| `prompts_only` | `allow_media_generation` not set (default) | 0 | `PHASE_9_PROMPTS_ONLY` |
| `full_generation` | `allow_media_generation: true` | 1 per required shot × product | `PHASE_9_COMPLETE` / `PHASE_9_PARTIAL` |

### Cost Control

- Default mode: **zero API cost** (prompts only)
- Generation mode: only required shots (priority 1-3) → 3 images per product
- Optional shots (hero_wide, detail_closeup) remain prompt_only
- DALL-E 3 standard quality (not HD)

---

## Phase 9E: Local Storage Layer

### Directory Structure

```
/assets/media/
  /{project_id}/
    /{product_handle}/
      /studio-packshot/
        {product_handle}-studio_packshot.png
      /clean-feature/
        {product_handle}-clean_feature.png
      /lifestyle-context/
        {product_handle}-lifestyle_context.png
      /hero-wide/
        {product_handle}-hero_wide.png
      /detail-closeup/
        {product_handle}-detail_closeup.png
```

### Requirements

- Deterministic folder structure (product_handle + shot_type)
- Reproducible paths (same inputs → same paths)
- No overwriting: asset_id is unique per (product_handle, shot_type)
- Cloud mode: `local_path` is null, images returned as URLs

---

## Phase 9F: Quality Gate

Currently a **stub** — all generated images receive `quality_score: 1.0`.

Future implementation will validate:
- Image clarity (blur detection)
- Composition match (aspect ratio compliance)
- No obvious defects (artifact detection)
- Color consistency (matches visual_system color_logic)

The quality gate is **not the driver** — it's a validation layer only.

---

## Phase 9G: Shopify Preparation Mapping

Pre-computed mapping from shot types to Shopify destinations:

| Shot Type | Shopify Target | Position | Notes |
|---|---|---|---|
| `studio_packshot` | `product_image` | 1 (primary) | Main product gallery image |
| `clean_feature` | `product_image` | 2 | Second gallery image |
| `lifestyle_context` | `product_image` | 3 | Third gallery image |
| `hero_wide` | `collection_image` | — | Collection header image |
| `detail_closeup` | — | — | Not mapped (optional, for future use) |

**No Shopify writes in this phase.** Mapping is computed and stored in the artifact for Phase 9+ delivery.

---

## Integration with Existing Phases

### Input Dependencies

| Input | Source Phase | Required |
|---|---|---|
| `store_profile` | Phase 1 (build-store-profile) | YES |
| `brand_positioning` | Phase 3 (build-brand-positioning) | YES |
| `store_blueprint` (products) | Phase 7A (build-store-blueprint) | YES |
| `content_strategy` | Phase 6b (build-content-strategy) | optional |
| `runtime_config` | resolve-runtime-config | YES |

### Runtime Config Fields

| Field | Env Var | Default | Purpose |
|---|---|---|---|
| `allow_media_generation` | `STORE_OS_ALLOW_MEDIA_GENERATION` | `false` | Enable image API calls |
| `media_generation_model` | `STORE_OS_MEDIA_GENERATION_MODEL` | `dall-e-3` | Image model selection |

### No Breaking Changes

- Does NOT modify any Phase 7B workflows or artifacts
- Does NOT modify the orchestrator (standalone sub-workflow)
- Does NOT modify existing schemas
- Can be integrated into orchestrator chain in a future phase

---

## Output Schema

`schemas/phase-9/media-generation.schema.json`

### Key Output Fields

| Field | Type | Description |
|---|---|---|
| `status` | enum | `PHASE_9_COMPLETE`, `PHASE_9_PARTIAL`, `PHASE_9_PROMPTS_ONLY`, `PHASE_9_FAILED` |
| `visual_system` | object | The derived visual system used for this run |
| `shot_taxonomy` | object | The fixed shot taxonomy applied |
| `media_assets[]` | array | Per-product, per-shot assets with prompts, status, URLs, and metadata |
| `generation_summary` | object | Counts: products, shots, prompts, images generated/failed/skipped |
| `storage` | object | Storage mode, base path, file counts |
| `errors[]` | array | Per-asset errors |
| `warnings[]` | array | Non-fatal warnings |

---

## CLI Support

```bash
# Once integrated into orchestrator:
node scripts/run-orchestrator.js --input test-data/golden-input.json

# Standalone execution (future):
# Requires passing upstream artifacts directly
```

### Golden Input Config (when integrated)

```json
{
  "STORE_OS_ALLOW_MEDIA_GENERATION": "true",
  "STORE_OS_MEDIA_GENERATION_MODEL": "dall-e-3"
}
```

Omit `STORE_OS_ALLOW_MEDIA_GENERATION` for prompts-only mode (default, zero cost).

---

## Implementation Checklist

### Phase 9A ✓ Visual System

- [x] `schemas/phase-9/visual-system.schema.json`
- [x] Derivation rules in `Derive Visual System` node
- [x] All properties are pure functions of inputs

### Phase 9B ✓ Shot Taxonomy

- [x] `schemas/phase-9/shot-taxonomy.schema.json`
- [x] 5 fixed shot types defined
- [x] Camera angle, composition, background, purpose per shot
- [x] Priority-based generation control

### Phase 9C ✓ Prompt Templates

- [x] Template system in `Build Shot Plan and Prompts` node
- [x] Structured segments: subject, features, angle, composition, background, lighting, shadow, mood
- [x] Pure function: no randomness, no LLM involvement in prompt generation

### Phase 9D ✓ Workflow

- [x] `workflows/n8n/build-media-assets.n8n.json` — 8-node executable workflow
- [x] `workflows/contracts/build-media-assets.contract.json`
- [x] Two execution modes: prompts_only (default) and full_generation

### Phase 9E ✓ Storage Layer

- [x] Deterministic directory structure defined
- [x] Cloud mode: inline URLs, no filesystem
- [x] Local mode: structured paths

### Phase 9F ✓ Quality Gate (stub)

- [x] `quality_score` field in metadata
- [x] Placeholder scoring (1.0 for all generated)
- [x] Ready for real implementation

### Phase 9G ✓ Shopify Mapping

- [x] `shopify_mapping` in each media asset
- [x] Shot type → Shopify target mapping
- [x] No breaking changes to Phase 7B
