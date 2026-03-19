Schema Roadmap

Purpose

This document gives an overview of the schema system inside store-os.

It explains:
	•	which schema files exist
	•	what they are used for
	•	how they relate to each other
	•	which ones are core
	•	which ones are optional extensions for later

The goal is to keep the system modular, professional, and ready for future orchestration in n8n.

⸻

Core Principle

Do not rely on one giant schema for everything.

Instead, split the system into smaller schema layers:
	•	project layer
	•	store layer
	•	market layer
	•	positioning layer
	•	pattern layer
	•	design layer
	•	page/content layer
	•	SEO/AEO layer
	•	media/motion layer
	•	validation/governance layer

This keeps the system:
	•	easier to understand
	•	easier to validate
	•	easier to orchestrate
	•	easier to expand later

⸻

Phase 1 — Foundation

project.schema.json

Purpose:
Defines the basic project container.

store-profile.schema.json

Purpose:
Defines the store itself: market, language, currency, catalog type, positioning basics.

⸻

Phase 2 — Market and Positioning

market-intelligence.schema.json

Purpose:
Describes audiences, problems, trust factors, search behavior, content opportunities, and market conditions.

brand-positioning.schema.json

Purpose:
Defines how the store should be perceived and how it should persuade.

competitor-cluster.schema.json

Purpose:
Groups competitors into reusable clusters and records shared patterns, strengths, and weaknesses.

pattern-manifest.schema.json

Purpose:
Turns market learning into approved and forbidden patterns.

⸻

Phase 3 — Design and Experience

design-system.schema.json

Purpose:
Defines visual structure, typography, colors, spacing, component style, motion rules, and media rules.

homepage-strategy.schema.json

Purpose:
Defines homepage goal, hero strategy, section order, trust logic, media role, and CTA direction.

section-library.schema.json

Purpose:
Defines which section types are allowed in the system.

section-instance.schema.json

Purpose:
Defines how a concrete section is configured on a real page.

⸻

Phase 4 — Commerce Content

product-content.schema.json

Purpose:
Defines product page content structure.

product-seo.schema.json

Purpose:
Defines SEO and AEO structure for product pages.

product-faq.schema.json

Purpose:
Defines product-specific FAQ logic.

product-structured-data.schema.json

Purpose:
Defines product-related structured data planning.

collection-content.schema.json

Purpose:
Defines collection page content structure.

collection-seo.schema.json

Purpose:
Defines SEO and AEO structure for collection pages.

collection-navigation.schema.json

Purpose:
Defines collection placement inside the store navigation system.

⸻

Phase 5 — General Pages, SEO, and AEO

page-content.schema.json

Purpose:
Defines general store page content such as About, Trust, Guide, Shipping, Returns, and Landing pages.

page-seo.schema.json

Purpose:
Defines SEO and AEO planning for general pages.

faq-page.schema.json

Purpose:
Defines a dedicated FAQ page structure.

seo-strategy.schema.json

Purpose:
Defines the store-wide SEO strategy.

aeo-strategy.schema.json

Purpose:
Defines the store-wide Answer Engine Optimization strategy.

internal-linking.schema.json

Purpose:
Defines how pages should link to each other.

structured-data-plan.schema.json

Purpose:
Defines which structured data types should be planned across the store.

⸻

Phase 6 — Media and Motion

media-asset.schema.json

Purpose:
Defines reusable media assets in general.

video-asset.schema.json

Purpose:
Defines video-specific rules such as autoplay, fallback, poster, and performance risk.

motion-media-strategy.schema.json

Purpose:
Defines how motion, video, embeds, and performance constraints should work across the store.

⸻

Phase 7 — Validation, Quality, and Release Control

validation-report.schema.json

Purpose:
Defines detailed validation output.

quality-score.schema.json

Purpose:
Defines overall quality scoring across content, SEO, AEO, trust, UX, media, and deployment safety.

deployment-manifest.schema.json

Purpose:
Defines deployment state, artifact tracking, and validation summary.

publish-decision.schema.json

Purpose:
Defines the final publish decision and release readiness.

⸻

Already Built

The following schemas are already part of the current foundation:
	•	project.schema.json
	•	store-profile.schema.json
	•	market-intelligence.schema.json
	•	brand-positioning.schema.json
	•	competitor-cluster.schema.json
	•	pattern-manifest.schema.json
	•	design-system.schema.json
	•	homepage-strategy.schema.json
	•	section-library.schema.json
	•	section-instance.schema.json
	•	product-content.schema.json
	•	product-seo.schema.json
	•	product-faq.schema.json
	•	product-structured-data.schema.json
	•	collection-content.schema.json
	•	collection-seo.schema.json
	•	collection-navigation.schema.json
	•	page-content.schema.json
	•	page-seo.schema.json
	•	faq-page.schema.json
	•	seo-strategy.schema.json
	•	aeo-strategy.schema.json
	•	internal-linking.schema.json
	•	structured-data-plan.schema.json
	•	media-asset.schema.json
	•	video-asset.schema.json
	•	motion-media-strategy.schema.json
	•	validation-report.schema.json
	•	quality-score.schema.json
	•	deployment-manifest.schema.json
	•	publish-decision.schema.json

⸻

Optional Future Additions

These are useful later, but not required for today’s foundation:
	•	image-asset.schema.json
	•	embed-asset.schema.json
	•	guide-page.schema.json
	•	knowledge-block.schema.json
	•	article.schema.json
	•	comparison-page.schema.json
	•	theme-bundle.schema.json
	•	navigation-plan.schema.json
	•	review-policy.schema.json

⸻

Recommended Build Order
	1.	Foundation
	2.	Market and positioning
	3.	Pattern logic
	4.	Design and experience
	5.	Product and collection content
	6.	Store-level SEO and AEO
	7.	Media and motion
	8.	Validation and release control

This order protects the system from becoming design-first and ungrounded.

⸻

Why This Matters

A professional commerce system should not start with random theme generation.

It should move like this:

project
→ store profile
→ market intelligence
→ positioning
→ competitor clusters
→ pattern manifest
→ design system
→ page/content planning
→ SEO/AEO planning
→ media/motion planning
→ validation
→ deployment manifest
→ publish decision

This is what makes the system later suitable for:
	•	n8n orchestration
	•	Claude Code driven workflows
	•	multi-project scaling
	•	controlled publishing
	•	professional store execution
