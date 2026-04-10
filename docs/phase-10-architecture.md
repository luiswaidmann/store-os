# Phase 10 — Theme Rules Engine

## Status

**Phase 10 COMPLETE.** `build-theme-rules` workflow deployed and validated (execution 14747, PHASE_10_COMPLETE inside PHASE_7B3_COMPLETE full chain run).

| Sub-phase | Status | Description |
|---|---|---|
| 10A | COMPLETE | Rule input audit — identifies upstream fields driving theme decisions |
| 10B | COMPLETE | Winning store pattern model — 7 deterministic patterns |
| 10C | COMPLETE | Theme rules artifact — schema-backed, `schemas/phase-10/theme-rules.schema.json` |
| 10D | COMPLETE | Rules engine workflow — `build-theme-rules` (6 nodes) |
| 10E | COMPLETE | Integration with existing theme writer — `build-shopify-theme` consumes theme_rules |
| 10F | COMPLETE | Section systemization — section stack, variant, config derived from pattern |
| 10G | COMPLETE | Documentation (this file) |
| 10H | COMPLETE | Validation — live run confirmed PHASE_10_COMPLETE |
| 10I | COMPLETE | Consistency check — repo == deployed, docs aligned |
| 10J | COMPLETE | Commit + push |

---

## Core Principle

**Build-shopify-theme is now a downstream executor, not the decision-maker.**

Before Phase 10:
- `build-shopify-theme` read `store_blueprint.theme_sections[]` and decided how to render sections
- Section order and configuration were implicit in blueprint structure

After Phase 10:
- `build-theme-rules` classifies the store against 7 patterns and produces an explicit `theme_rules` artifact
- `build-shopify-theme` consumes `theme_rules` to determine section stack, grid size, column count, block count
- Blueprint sections provide content hints (heading, CTA) but do not drive layout decisions
- If `theme_rules` is absent, build-shopify-theme falls back to blueprint (backward compatible)

---

## Phase 10A: Rule Input Audit

### Fields that drive theme decisions

**Classification inputs (primary — used for pattern selection):**

| Field | Source | Purpose |
|---|---|---|
| `brand_role` | brand_positioning | Primary archetype signal |
| `tone_of_voice.style` | brand_positioning | Voice drives section density and CTA style |
| `tone_of_voice.emotional_intensity` | brand_positioning | High intensity → lifestyle pattern |
| `price_positioning` | store_profile | Luxury/premium → minimalist; budget → value-led |
| `catalog_type` | store_profile | single-product → dedicated pattern; broad → catalog-first |
| `assortment_shape` | store_profile | single-hero-product → single-product-focused |
| `store_type` | store_profile | category-specialist + broad catalog → catalog-first |

**Content enrichment inputs (secondary — populate section hints):**

| Field | Source | Applied to |
|---|---|---|
| `messaging_hierarchy.primary_message` | content_strategy | Hero heading |
| `brand_traits` | brand_positioning | Value-prop content hints |
| `trust_style.proof_mode` | brand_positioning | Trust section content and proof mode |
| `theme_sections[].heading_hint` | store_blueprint | Section heading fallbacks |
| `theme_sections[].cta_label/target` | store_blueprint | CTA label/link fallbacks |

---

## Phase 10B: Winning Store Pattern Model

Seven deterministic patterns, selected by priority-ordered classification:

### 1. `technical-b2b-specialist`
**Trigger**: brand_role=specialist + tone=technical-trustworthy  
**Section stack**: hero → value-prop → featured-collection → trust-social-proof  
**Grid**: 3 columns | **Value-prop**: 4 columns | **Trust**: evidence-led, 4 blocks  
**Visual**: medium density, balanced whitespace, high-clarity contrast  
**CTA**: balanced (prominent, not assertive) | **Urgency**: none  
**Rationale**: Professional B2B buyers need clear product access and evidence-backed trust. Value-prop leads conversion flow before the product grid.

### 2. `premium-minimalist`
**Trigger**: price_positioning in [luxury, premium] + tone in [premium-confident, editorial-smart]  
**Section stack**: hero → featured-collection → value-prop [trust disabled]  
**Grid**: 2 columns | **Value-prop**: 3 columns | **Trust**: disabled  
**Visual**: low density, generous whitespace, soft-editorial contrast  
**CTA**: subtle | **Urgency**: none  
**Rationale**: Brand is the trust signal. Whitespace and editorial presentation do the selling. Trust blocks would undermine brand confidence.

### 3. `lifestyle-emotional-dr`
**Trigger**: emotional_intensity=high OR tone=warm-helpful  
**Section stack**: hero → trust-social-proof → featured-collection → value-prop  
**Grid**: 4 columns | **Value-prop**: 3 columns | **Trust**: social-proof-led, 6 blocks, after-hero  
**Visual**: high density, tight whitespace, punchy-commercial contrast  
**CTA**: assertive | **Urgency**: medium | **Bundle promo**: true  
**Rationale**: Emotional hook first, then social proof validates the feeling. Dense product grid converts the impulse.

### 4. `value-led-general`
**Trigger**: price_positioning in [budget, mass-market] OR brand_role=value-leader  
**Section stack**: hero → featured-collection → value-prop → trust-social-proof  
**Grid**: 4 columns | **Value-prop**: 3 columns | **Trust**: guarantee-led, 4 blocks  
**Visual**: high density, tight whitespace, punchy-commercial contrast  
**CTA**: assertive | **Urgency**: high | **Bundle promo**: true  
**Rationale**: Price-led hero, immediate product access, value explanation, guarantee reassurance at end.

### 5. `catalog-first-specialist`
**Trigger**: catalog_type in [broad-catalog, mixed-catalog] + store_type=category-specialist  
**Section stack**: hero → featured-collection → trust-social-proof → value-prop  
**Grid**: 4 columns | **Value-prop**: 3 columns | **Trust**: evidence-led, 4 blocks, before-collection  
**Visual**: high density, tight whitespace, high-clarity contrast  
**CTA**: balanced | **Urgency**: low  
**Rationale**: Category specialists need immediate catalog access. Trust signals before the large product grid validate the range.

### 6. `editorial-curator`
**Trigger**: brand_role=editorial-guide OR tone=editorial-smart  
**Section stack**: hero → value-prop → featured-collection [trust disabled]  
**Grid**: 2 columns | **Value-prop**: 2 columns | **Trust**: disabled  
**Visual**: low density, generous whitespace, soft-editorial contrast  
**CTA**: subtle | **Urgency**: none  
**Rationale**: Taste and curation build trust. Content-first structure, editorial 2-column grid, no social proof blocks needed.

### 7. `single-product-focused`
**Trigger**: catalog_type=single-product OR assortment_shape=single-hero-product  
**Section stack**: hero → value-prop → trust-social-proof → featured-collection  
**Grid**: 3 columns | **Value-prop**: 3 columns | **Trust**: guarantee-led, 4 blocks, before-collection  
**Visual**: medium density, balanced whitespace, high-clarity contrast  
**CTA**: assertive | **Urgency**: medium  
**Rationale**: Full-product hero, benefit stack to justify purchase, guarantee to remove risk, then accessories/cross-sells.

---

## Phase 10C: Theme Rules Artifact

Schema: `schemas/phase-10/theme-rules.schema.json`

### Required output fields

| Field | Description |
|---|---|
| `status` | `PHASE_10_COMPLETE` or `PHASE_10_FAILED` |
| `store_pattern` | One of 7 pattern IDs |
| `pattern_rationale` | Human-readable explanation citing input values |
| `homepage_layout.section_stack` | Ordered list of enabled sections with content hints |
| `homepage_layout.visual_density` | `low`, `medium`, or `high` |
| `homepage_layout.whitespace_level` | `generous`, `balanced`, or `tight` |
| `section_system.hero` | Variant, CTA prominence, copy density, media type |
| `section_system.featured_collection` | Grid columns, products to show, show_vendor |
| `section_system.value_prop` | Column count, style |
| `section_system.trust_social_proof` | Enabled, proof_mode, block_count, placement |
| `trust_model` | Primary proof, prominence, placement |
| `conversion_model` | CTA style, urgency level, bundle promo flag |
| `merchandising_model` | Primary pattern, grid columns, collection prominence |
| `visual_system` | Density, whitespace, contrast |
| `page_template_rules` | Product page, collection page, about page variants |
| `media_placement_rules` | Hero media type, product image priority, lifestyle prominence |
| `derived_from` | Provenance fields (which inputs drove the decision) |

---

## Phase 10D: Rules Engine Workflow

### Architecture

```
Subworkflow Trigger
    │
    └── Validate Inputs
        └── Classify Store Pattern (10B — priority-ordered classifier)
            └── Map Pattern to Rules (10B — lookup table)
                └── Enrich Rules with Content Strategy (10F — content hints)
                    └── Compile Theme Rules Artifact
```

**Node count**: 6  
**Execution time**: ~180ms (no LLM calls, no external APIs)  
**Input**: All upstream artifacts from Phase 7B.2 output  
**Output**: `theme_rules` artifact + artifact passthrough

### Classification algorithm

Priority-ordered rule matching. First match wins:

1. `catalog_type === single-product OR assortment_shape === single-hero-product` → single-product-focused
2. `price_positioning in [luxury, premium] AND tone in [premium-confident, editorial-smart]` → premium-minimalist
3. `brand_role === editorial-guide OR tone === editorial-smart` → editorial-curator
4. `brand_role === specialist AND tone === technical-trustworthy` → technical-b2b-specialist
5. `price_positioning in [budget, mass-market] OR brand_role === value-leader` → value-led-general
6. `catalog_type in [broad-catalog, mixed-catalog] AND store_type === category-specialist` → catalog-first-specialist
7. `emotional_intensity === high OR tone === warm-helpful` → lifestyle-emotional-dr
8. Default fallback → technical-b2b-specialist

---

## Phase 10E: Integration with Existing Theme Writer

### Integration point

The orchestrator inserts `build-theme-rules` between `Phase 7B.2 Complete` and `build-shopify-theme`:

```
Phase 7B.2 Complete
    │
    └── Prepare Theme Rules Input   ← NEW (10E): packages full artifact set
        └── Run build-theme-rules   ← NEW (10E): produces theme_rules
            └── Prepare Theme Input ← UPDATED (10E): reads Phase7B2 + theme_rules
                └── Run build-shopify-theme ← UPDATED (10E): consumes theme_rules
```

### How build-shopify-theme uses theme_rules

When `theme_rules` is present:
- **Section stack**: Uses `theme_rules.homepage_layout.section_stack` (only enabled sections, sorted by order)
- **Section content**: Merges `heading_hint`, `content_hint`, `cta_label`, `cta_target` from theme_rules (with blueprint as fallback)
- **Grid columns**: `section_system.featured_collection.grid_columns` → `products_to_show` schema default
- **Value-prop columns**: `section_system.value_prop.column_count` → Liquid `columns` setting default
- **Trust blocks**: `section_system.trust_social_proof.block_count` → `max_blocks` in schema
- **Deployment reason**: logged as "Theme rules (pattern): section_type"

When `theme_rules` is absent (fallback):
- Falls back to `store_blueprint.theme_sections[]` (pre-Phase 10 behavior, fully backward compatible)
- `continueOnFail: true` on the Execute Workflow node ensures no chain breakage

---

## Phase 10F: Section Systemization

### Homepage section order (by pattern)

| Pattern | Order |
|---|---|
| technical-b2b-specialist | hero → value-prop → featured-collection → trust-social-proof |
| premium-minimalist | hero → featured-collection → value-prop [trust disabled] |
| lifestyle-emotional-dr | hero → trust-social-proof → featured-collection → value-prop |
| value-led-general | hero → featured-collection → value-prop → trust-social-proof |
| catalog-first-specialist | hero → featured-collection → trust-social-proof → value-prop |
| editorial-curator | hero → value-prop → featured-collection [trust disabled] |
| single-product-focused | hero → value-prop → trust-social-proof → featured-collection |

### Why sections appear in this order

- **Hero always first**: Every store needs immediate brand identification and primary CTA
- **Value-prop before collection** (technical, single-product): B2B and considered-purchase buyers need context before product browsing
- **Social proof before collection** (lifestyle): Emotional validation precedes purchase commitment
- **Collection before explanation** (value-led, catalog-first): Price-sensitive and breadth-seeking buyers want products immediately
- **Trust at end** (standard): Objection handling for buyers who browsed but hesitated
- **Trust after hero** (lifestyle): Social validation while emotional engagement is highest

### What differs by store type

| Decision | Driver | Example |
|---|---|---|
| Section order | brand_role + tone_of_voice | specialist → value-prop early; curator → editorial content early |
| Grid columns | price_positioning | luxury → 2 cols; value-led → 4 cols |
| Trust prominence | trust_style.reassurance_level | evidence-led → strong/end-page; social-proof-led → high/after-hero |
| CTA style | conversion_style.cta_style | subtle → premium; assertive → value-led |
| Trust section enabled | price_positioning + brand_role | premium-minimalist → disabled; all others → enabled |
| Max blocks | pattern trust config | lifestyle → 6; B2B → 4; single-product → 4 |

---

## Validation Result (Phase 10H)

**Execution**: 14747  
**Date**: 2026-04-08  
**Method**: Full orchestrator chain (golden-input.json)  
**Chain result**: PHASE_7B3_COMPLETE — no regressions  
**Phase 10 result**: PHASE_10_COMPLETE inside chain  

**Classified pattern**: `technical-b2b-specialist`  
**Classification rationale**: `brand_role=specialist + tone=technical-trustworthy → B2B: hero → value-prop → collection → evidence trust`

**Generated theme_rules excerpt:**
```json
{
  "status": "PHASE_10_COMPLETE",
  "store_pattern": "technical-b2b-specialist",
  "homepage_layout": {
    "section_stack": [
      { "section_type": "hero",                "order": 1, "enabled": true, "variant": "standard" },
      { "section_type": "value-prop",          "order": 2, "enabled": true, "variant": "icon-led" },
      { "section_type": "featured-collection", "order": 3, "enabled": true, "variant": "grid-3" },
      { "section_type": "trust-social-proof",  "order": 4, "enabled": true, "variant": "evidence-led" }
    ],
    "visual_density": "medium",
    "whitespace_level": "balanced"
  },
  "section_system": {
    "featured_collection": { "enabled": true, "grid_columns": 3, "products_to_show": 6 },
    "value_prop":          { "enabled": true, "column_count": 4, "style": "icon-led" },
    "trust_social_proof":  { "enabled": true, "proof_mode": "evidence-led", "block_count": 4 }
  }
}
```

**Downstream effect (build-shopify-theme)**:
- Used `theme_rules.homepage_layout.section_stack` as authoritative section list
- Applied `grid_columns: 3` → featured-collection Liquid `products_to_show` default: 6
- Applied `column_count: 4` → value-prop Liquid `columns` default: 4
- Applied `block_count: 4` → `max_blocks: 4` in trust section schema
- 4 sections written, 3 assets written — exactly as specified by rules

---

## Phase 10I: Consistency Check

| Check | Result |
|---|---|
| repo == n8n deployed | ✓ All 3 modified workflows deployed |
| active n8n versions match repo | ✓ build-theme-rules activated |
| orchestrator includes build-theme-rules | ✓ `Run build-theme-rules` node + connections verified in execution |
| theme_rules passed to build-shopify-theme | ✓ Confirmed in execution data |
| docs match implementation | ✓ This file |
| theme_rules is explicit artifact | ✓ Schema-backed, not implicit in workflow code |
| backward compatible | ✓ `continueOnFail: true` + blueprint fallback preserves pre-Phase 10 behavior |

---

## What Now Determines the Theme

**Before Phase 10:**
```
store_blueprint.theme_sections[] → build-shopify-theme → Liquid files
                   ↑
       (blueprint author decides sections)
```

**After Phase 10:**
```
store_profile + brand_positioning + content_strategy
                 ↓
         build-theme-rules (pattern classifier → rule lookup)
                 ↓
         theme_rules artifact (explicit, schema-backed)
                 ↓
         build-shopify-theme (executor — applies rules)
                 ↓
         Liquid section files
```

The rules engine is the decision layer. The theme writer is the execution layer.

---

## Recommended Next Steps

1. **Extend section types**: Add `announcement-bar`, `testimonial-carousel`, `comparison-table` to the section system for patterns that need them
2. **Integrate trust block content**: Pass `reason_to_believe[]` from brand_positioning into trust section block content hints
3. **Integrate media placement rules**: Connect `media_placement_rules` from theme_rules to Phase 9 media asset generation
4. **Collection template rules**: Implement `page_template_rules.collection_page` guidance in a dedicated collection template workflow
5. **Orchestrator terminal status**: Add `PHASE_10_COMPLETE` as an intermediate status in the orchestrator if Phase 10 needs to be a stopping point
