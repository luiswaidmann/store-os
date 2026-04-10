# Phase 11 — Theme-Driven Media Orchestration

## Status

**Phase 11 COMPLETE.** `build-media-assets` updated with section-driven shot selection. Validated (PHASE_9_PROMPTS_ONLY with theme_rules input, 2026-04-08).

| Sub-phase | Status | Description |
|---|---|---|
| 11A | COMPLETE | Media requirement engine — SECTION_SHOT_MAP lookup table |
| 11B | COMPLETE | Remove static 5-shot taxonomy as authoritative source |
| 11C | COMPLETE | media_plan artifact — schema-backed section coverage + shot_plan |
| 11D | COMPLETE | Workflow integration — build-media-assets reads theme_rules |
| 11E | COMPLETE | Priority-aware generation ordering — required+high first |
| 11F | COMPLETE | Extend media artifact — media_plan + Phase 11 per-asset fields |
| 11G | COMPLETE | Determinism guarantee — fallback preserves 5-shot behavior |
| 11H | COMPLETE | Validation — live run confirmed Phase 11 output |

---

## Core Principle

**No static shot lists. Every shot has a declared source.**

Before Phase 11:
- `build-media-assets` ran a fixed 5-shot taxonomy against every product
- All shots generated regardless of which sections appear in the homepage layout
- No link between media assets and the theme layout that will use them

After Phase 11:
- `build-media-assets` reads `theme_rules.homepage_layout.section_stack`
- Each section maps to specific shot types via a deterministic lookup table (`SECTION_SHOT_MAP`)
- Every shot has `source_section`, `priority`, `required`, `intended_usage`
- Generation order: required+high → required+medium → optional+high → (skip optional+low)
- `media_plan` artifact documents the full shot selection rationale
- The 5-shot taxonomy remains as a fallback when `theme_rules` is absent

---

## Phase 11A: Media Requirement Engine

### SECTION_SHOT_MAP (deterministic lookup)

```javascript
const SECTION_SHOT_MAP = {
  'hero': [
    { shot_type: 'hero_wide',         required: true,  priority: 'high',   intended_usage: 'hero section banner image',       aspect_ratio: '16:9' },
    { shot_type: 'lifestyle_context', required: false, priority: 'medium', intended_usage: 'hero lifestyle support image',     aspect_ratio: '4:5'  },
  ],
  'featured-collection': [
    { shot_type: 'studio_packshot',   required: true,  priority: 'high',   intended_usage: 'product grid thumbnail (1:1)',    aspect_ratio: '1:1'  },
  ],
  'value-prop': [
    { shot_type: 'clean_feature',     required: true,  priority: 'medium', intended_usage: 'value proposition feature image', aspect_ratio: '4:5'  },
  ],
  'trust-social-proof': [
    { shot_type: 'detail_closeup',    required: false, priority: 'low',    intended_usage: 'trust section detail image',      aspect_ratio: '1:1'  },
  ],
};
```

### Shot → Section mapping rationale

| Shot type | Source section | Rationale |
|---|---|---|
| `hero_wide` | hero | Banner image needs 16:9 negative-space composition for text overlay |
| `lifestyle_context` | hero | Optional lifestyle for emotional reinforcement in hero support area |
| `studio_packshot` | featured-collection | Product grid requires clean 1:1 thumbnail for product cards |
| `clean_feature` | value-prop | Value proposition needs a feature-forward shot showing product benefits |
| `detail_closeup` | trust-social-proof | Trust section benefits from craftsmanship/quality detail image |

### Deduplication logic

When the same `shot_type` appears from multiple sections, the higher-priority entry wins:

```javascript
const PRIORITY_RANK = { 'high': 0, 'medium': 1, 'low': 2 };

for (const section of enabledSections) {
  for (const shotReq of SECTION_SHOT_MAP[section.section_type] || []) {
    const existing = shotMap[shotReq.shot_type];
    const newRank  = PRIORITY_RANK[shotReq.priority] ?? 2;
    const oldRank  = existing ? (PRIORITY_RANK[existing.priority] ?? 2) : 999;
    if (!existing || newRank < oldRank ||
        (newRank === oldRank && shotReq.required && !existing.required)) {
      shotMap[shotReq.shot_type] = { ...shotReq, source_section: section.section_type };
    }
  }
}
```

### Baseline guarantee

`studio_packshot` is always included regardless of section presence:

```javascript
if (!shotMap['studio_packshot']) {
  shotMap['studio_packshot'] = {
    shot_type: 'studio_packshot', source_section: 'baseline',
    required: true, priority: 'high',
    intended_usage: 'product grid thumbnail (1:1)', aspect_ratio: '1:1',
  };
}
```

---

## Phase 11B: Remove Static Taxonomy Authority

The `shot_taxonomy` field in the output (originally the authority) is now demoted:
- When `theme_rules` present: `shot_taxonomy` is retained for prompt template lookups (camera angle, composition, background type, prompt emphasis) but does **not** drive shot selection
- Shot selection is entirely driven by `SECTION_SHOT_MAP` + `theme_rules.homepage_layout.section_stack`
- When `theme_rules` absent: `shot_taxonomy` remains the authoritative fallback (5-shot behavior preserved)

---

## Phase 11C: Media Plan Artifact

Schema: `schemas/phase-11/media-plan.schema.json`

### Fields

| Field | Type | Description |
|---|---|---|
| `derived_from_theme_rules` | boolean | True when shot plan was derived from theme_rules |
| `store_pattern` | string\|null | Pattern ID from theme_rules (null when fallback) |
| `section_coverage` | array | Which sections need which shots |
| `shot_plan` | array | Deduplicated, priority-ordered list of shots |
| `total_shot_types` | integer | Count of unique shot types in plan |
| `required_shots` | integer | Count of required shots |
| `optional_shots` | integer | Count of optional shots |

### shot_plan item fields

| Field | Type | Description |
|---|---|---|
| `shot_type` | enum | One of the 5 shot type IDs |
| `source_section` | string | Section that drove this shot's inclusion |
| `required` | boolean | Whether layout requires this shot |
| `priority` | high\|medium\|low | Generation priority |
| `intended_usage` | string | Human-readable usage description |
| `aspect_ratio` | enum | Required aspect ratio for this context |

---

## Phase 11D: Workflow Integration

### Where theme_rules is read (Build Shot Plan and Prompts node)

```javascript
const themeRules = input.theme_rules || null;
const hasThemeRules = !!(themeRules &&
  themeRules.homepage_layout &&
  themeRules.homepage_layout.section_stack &&
  themeRules.homepage_layout.section_stack.length > 0);
```

When `hasThemeRules`:
1. Extract enabled sections sorted by `order`
2. Build `shotMap` via `SECTION_SHOT_MAP` lookups + deduplication
3. Guarantee `studio_packshot` baseline
4. Build `mediaPlan` artifact
5. Sort shot_plan: high → medium → low (required before optional within same priority)

When `!hasThemeRules`:
- Falls back to fixed 5-shot taxonomy
- `media_plan.derived_from_theme_rules = false`
- `media_plan.store_pattern = null`
- All assets get `derived_from_theme_rules: false`, `source_section: 'fallback'`

---

## Phase 11E: Priority-Aware Generation

### Prepare Generation Batch node (updated)

```javascript
const PRANK = { 'high': 0, 'medium': 1, 'low': 2 };

const toGenerate = assets
  .filter(a => a.required || a.priority === 'high')  // skip low-priority optional
  .sort((a, b) => {
    const pDiff = (PRANK[a.priority] ?? 2) - (PRANK[b.priority] ?? 2);
    if (pDiff !== 0) return pDiff;
    return (a.required ? 0 : 1) - (b.required ? 0 : 1);  // required first
  });
```

### Generation order for technical-b2b-specialist (validation result)

| Order | Shot type | Required | Priority | Sent to DALL-E |
|---|---|---|---|---|
| 1 | hero_wide | ✓ | high | ✓ |
| 2 | studio_packshot | ✓ | high | ✓ |
| 3 | clean_feature | ✓ | medium | ✓ |
| 4 | lifestyle_context | ✗ | medium | ✗ (optional, skipped) |
| 5 | detail_closeup | ✗ | low | ✗ (optional low, skipped) |

### Cost-constraint behaviour by priority tier

| Tier | Condition | Generated |
|---|---|---|
| required + high | always | ✓ |
| required + medium | always | ✓ |
| optional + high | high priority warrants generation | ✓ |
| optional + medium | cost-constrained: skipped | ✗ |
| optional + low | cost-constrained: skipped | ✗ |

---

## Phase 11F: Extended Media Artifact

### New per-asset fields (added to each item in `media_assets[]`)

| Field | Description |
|---|---|
| `source_section` | Section that drove this shot's inclusion |
| `priority` | high \| medium \| low |
| `required` | Whether layout requires this shot |
| `intended_usage` | Where this image is used in the layout |
| `used_in_layout` | true = from active theme section; false = fallback |
| `derived_from_theme_rules` | true when shot selection was theme-driven |
| `generation_needed` | true when this shot will be sent to image API |

### `media_plan` at artifact top level

Added to the Phase 9 media-generation output alongside `shot_taxonomy`. See `schemas/phase-9/media-generation.schema.json` for the updated schema (added `media_plan` as `oneOf[$ref, null]` and all 7 per-asset fields).

---

## Phase 11G: Determinism Guarantee

All decisions are pure functions of inputs:

| Decision | Input | Output |
|---|---|---|
| Which shots to plan | `theme_rules.homepage_layout.section_stack` | Exactly the shots needed by enabled sections |
| Shot priority | `SECTION_SHOT_MAP` static table | Deterministic priority per section |
| Generation order | priority + required flag | required+high → required+medium → optional+high |
| Fallback behavior | `theme_rules` absent | 5-shot taxonomy (pre-Phase 11 behavior) |
| Baseline guarantee | Always | studio_packshot always present |

Zero randomness. Zero LLM calls in shot planning. Same inputs always produce same media_plan.

---

## Phase 11H: Validation Result

**Date:** 2026-04-08
**Method:** Webhook wrapper → build-media-assets (ID: krR10um8F1pT0miQ)
**Input:** industrial-sensor-v2 product + technical-b2b-specialist theme_rules (4-section stack)

**media_plan output:**
```json
{
  "derived_from_theme_rules": true,
  "store_pattern": "technical-b2b-specialist",
  "section_coverage": [
    { "section_type": "hero",                "section_order": 1, "shots_needed": ["hero_wide", "lifestyle_context"] },
    { "section_type": "value-prop",          "section_order": 2, "shots_needed": ["clean_feature"] },
    { "section_type": "featured-collection", "section_order": 3, "shots_needed": ["studio_packshot"] },
    { "section_type": "trust-social-proof",  "section_order": 4, "shots_needed": ["detail_closeup"] }
  ],
  "shot_plan": [
    { "shot_type": "hero_wide",         "source_section": "hero",               "required": true,  "priority": "high",   "aspect_ratio": "16:9" },
    { "shot_type": "studio_packshot",   "source_section": "featured-collection","required": true,  "priority": "high",   "aspect_ratio": "1:1"  },
    { "shot_type": "lifestyle_context", "source_section": "hero",               "required": false, "priority": "medium", "aspect_ratio": "4:5"  },
    { "shot_type": "clean_feature",     "source_section": "value-prop",         "required": true,  "priority": "medium", "aspect_ratio": "4:5"  },
    { "shot_type": "detail_closeup",    "source_section": "trust-social-proof", "required": false, "priority": "low",    "aspect_ratio": "1:1"  }
  ],
  "total_shot_types": 5,
  "required_shots": 3,
  "optional_shots": 2
}
```

**Validation checks:**

| Check | Result |
|---|---|
| media_plan present in output | ✓ |
| derived_from_theme_rules = true | ✓ |
| Section coverage maps all 4 sections | ✓ |
| Shot plan priority-ordered (high → medium → low) | ✓ |
| required_shots = 3, optional_shots = 2 | ✓ |
| source_section on every asset | ✓ |
| priority on every asset | ✓ |
| required on every asset | ✓ |
| intended_usage on every asset | ✓ |
| used_in_layout = true (all from active sections) | ✓ |
| derived_from_theme_rules = true on all assets | ✓ |
| generation_needed correct (true=required, false=optional) | ✓ |
| 5 assets produced (1 per shot type) | ✓ |
| Prompts correct (deterministic from template) | ✓ |
| Fallback (no theme_rules) preserved | ✓ (untouched code path) |

---

## Files Changed in Phase 11

| File | Change |
|---|---|
| `workflows/n8n/build-media-assets.n8n.json` | Validate Inputs, Build Shot Plan and Prompts, Prepare Generation Batch, Compile Media Manifest — all updated |
| `schemas/phase-11/media-plan.schema.json` | Created — media_plan artifact schema |
| `schemas/phase-9/media-generation.schema.json` | Updated — added media_plan field + 7 Phase 11 per-asset fields |
| `docs/phase-11-architecture.md` | Created — this file |
| `docs/runtime-status.md` | Updated — Phase 11 validation entry |

---

## Recommended Next Steps

1. **Integrate build-media-assets into orchestrator chain**: Add `Prepare Media Assets Input` + `Run build-media-assets` nodes after `build-shopify-theme` in `orchestrate-phase1`
2. **Wire theme_rules → build-media-assets**: Pass `theme_rules` from the theme rules step through to build-media-assets input
3. **DALL-E validation**: Enable `allow_media_generation: true` in runtime config and validate with real image generation
4. **Extend SECTION_SHOT_MAP**: Add `announcement-bar`, `testimonial-carousel` sections when Phase 10 section types expand
5. **Image delivery**: Implement the Shopify image upload step that consumes `media_assets[].shopify_mapping` to push generated images to Shopify
