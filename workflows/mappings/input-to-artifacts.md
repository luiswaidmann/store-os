Input to Artifacts Map

Purpose

This document maps future intake form fields to the artifacts they influence inside store-os.

It helps answer:
	•	which fields are direct structured inputs
	•	which fields are strategic hints
	•	which fields are only governance controls
	•	which fields should never be treated as imported Shopify data
	•	which artifacts should consume which intake values

This file is intended to support future Claude Code implementation and n8n orchestration design.

⸻

Core Principle

Not every intake field should be copied directly into one artifact.

Some fields are:
	•	direct values
	•	strategic hints
	•	default-setting signals
	•	governance controls
	•	workflow-routing controls

This distinction matters.

⸻

Mapping Categories

Direct field mapping

The field should appear directly in the target artifact.

Hint-based mapping

The field should influence the target artifact, but not necessarily appear literally.

Governance mapping

The field controls validation, deployment, publish, or review behavior.

Runtime-only mapping

The field controls workflow behavior, but should not necessarily be written into business artifacts.

⸻

Intake Field Mapping

project_id

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	project.json
	•	runtime project path creation
	•	project folder naming

Notes:
	•	canonical internal project key

⸻

project_name

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	project.json

Secondary influence:
	•	documentation and display labeling

⸻

shopify_store_selector

Source:
	•	user input

Type:
	•	runtime-only mapping

Primary targets:
	•	Shopify import workflow
	•	runtime store connection resolution

Notes:
	•	should not become a manual domain value in store artifacts
	•	should select connection, not duplicate imported shop truth

⸻

primary_market

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	market-intelligence.json
	•	seo-strategy.json
	•	aeo-strategy.json
	•	brand-positioning.json

⸻

target_markets

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	market-intelligence.json
	•	seo-strategy.json
	•	international page/content planning later

⸻

primary_language

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	product/content generation defaults
	•	SEO/AEO language defaults

⸻

languages

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	multilingual planning later
	•	content generation variants later

⸻

primary_currency

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	product-structured-data.json
	•	offer and deployment logic later

⸻

currencies

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	international offer planning later

⸻

vertical

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	market-intelligence.json
	•	brand-positioning.json
	•	seo-strategy.json
	•	content planning defaults later

⸻

store_type

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	homepage-strategy.json
	•	design-system.json

⸻

business_model

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	product/collection planning assumptions later

⸻

price_positioning

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	store-profile.json

Secondary influence:
	•	brand-positioning.json
	•	design-system.json
	•	pattern-manifest.json
	•	conversion logic later

⸻

brand_role

Source:
	•	user input

Type:
	•	direct field mapping or direct enum mapping

Primary targets:
	•	brand-positioning.json

Secondary influence:
	•	homepage-strategy.json
	•	design-system.json

⸻

tone_of_voice

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	brand-positioning.json

Secondary influence:
	•	content and SEO/AEO text generation later

⸻

trust_style

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	brand-positioning.json

Secondary influence:
	•	homepage-strategy.json
	•	product-content.json
	•	faq-page.json

⸻

conversion_style

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	brand-positioning.json

Secondary influence:
	•	product-content.json
	•	homepage-strategy.json

⸻

objection_handling_style

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	brand-positioning.json

Secondary influence:
	•	product-content.json
	•	product-faq.json

⸻

competitor_urls

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	competitor research input layer
	•	competitor-cluster.json

Secondary influence:
	•	pattern-manifest.json

Notes:
	•	input for clustering, not a final brand truth artifact

⸻

desired_style_hints

Source:
	•	user input

Type:
	•	hint-based mapping

Primary targets:
	•	pattern-manifest.json
	•	design-system.json

Secondary influence:
	•	homepage-strategy.json

Notes:
	•	should influence, not dominate, final decisions

⸻

forbidden_styles

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	pattern-manifest.json

Secondary influence:
	•	design-system.json
	•	homepage-strategy.json

⸻

must_not_feel_like

Source:
	•	user input

Type:
	•	hint-based mapping

Primary targets:
	•	brand-positioning.json
	•	pattern-manifest.json

Secondary influence:
	•	design-system.json

⸻

must_feel_like

Source:
	•	user input

Type:
	•	hint-based mapping

Primary targets:
	•	brand-positioning.json
	•	pattern-manifest.json

Secondary influence:
	•	design-system.json
	•	homepage-strategy.json

⸻

seo_goal

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	seo-strategy.json

Secondary influence:
	•	product-seo.json
	•	collection-seo.json
	•	page-seo.json

⸻

aeo_goal

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	aeo-strategy.json

Secondary influence:
	•	product-seo.json
	•	collection-seo.json
	•	page-seo.json
	•	faq-page.json

⸻

faq_intensity

Source:
	•	user input

Type:
	•	hint-based mapping

Primary targets:
	•	aeo-strategy.json

Secondary influence:
	•	product-faq.json
	•	faq-page.json
	•	page-content.json

⸻

knowledge_content_priority

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	seo-strategy.json
	•	aeo-strategy.json

Secondary influence:
	•	guide/content planning later
	•	page content depth later

⸻

motion_level_preference

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	motion-media-strategy.json

Secondary influence:
	•	design-system.json
	•	homepage-strategy.json

⸻

scroll_animation_preference

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	motion-media-strategy.json

Secondary influence:
	•	section planning later

⸻

hero_video_allowed

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	motion-media-strategy.json

Secondary influence:
	•	homepage-strategy.json
	•	video-asset.json

⸻

video_usage_preference

Source:
	•	user input

Type:
	•	direct field mapping

Primary targets:
	•	motion-media-strategy.json

Secondary influence:
	•	design-system.json
	•	video-asset.json
	•	homepage-strategy.json

⸻

performance_priority

Source:
	•	user input

Type:
	•	direct field mapping + hint-based mapping

Primary targets:
	•	motion-media-strategy.json

Secondary influence:
	•	design-system.json
	•	seo-strategy.json
	•	validation policies later

⸻

manual_review_required

Source:
	•	user input

Type:
	•	governance mapping

Primary targets:
	•	governance logic
	•	publish-decision.json

Secondary influence:
	•	validation and deployment workflow routing

Notes:
	•	should not be confused with brand or store truth

⸻

publish_mode

Source:
	•	user input

Type:
	•	governance mapping + runtime-only mapping

Primary targets:
	•	runtime deployment behavior
	•	publish-decision.json

Secondary influence:
	•	deployment-manifest.json

Notes:
	•	controls what the workflow is allowed to do

⸻

special_notes

Source:
	•	user input

Type:
	•	hint-based mapping

Primary targets:
	•	optional enrichment across multiple artifacts

Possible influenced artifacts:
	•	brand-positioning.json
	•	market-intelligence.json
	•	design-system.json
	•	homepage-strategy.json
	•	content artifacts later

Notes:
	•	should not override structured inputs unless explicitly intended

⸻

Shopify Imported Data Mapping

The following values should normally come from Shopify, not from manual intake:
	•	shop_domain
	•	shop_name
	•	product_titles
	•	product_handles
	•	product_descriptions
	•	product_variants
	•	product_images
	•	collections
	•	collection_handles
	•	vendors
	•	tags
	•	existing_seo_fields
	•	existing_metafields
	•	existing_store_media

Primary consumers:
	•	build-store-profile
	•	build-product-content
	•	build-product-seo
	•	build-collection-content
	•	build-collection-seo
	•	build-media-plan

These values should be treated as operational truth from Shopify unless intentionally overridden later.

⸻

Important Rule About Strategic vs Operational Truth

Strategic truth

Comes from:
	•	intake fields
	•	explicit user preferences
	•	governance controls

Operational truth

Comes from:
	•	Shopify import
	•	existing store data

Derived truth

Comes from:
	•	market analysis
	•	positioning synthesis
	•	competitor clustering
	•	pattern extraction
	•	strategy generation

The workflow should never mix these categories carelessly.

⸻

Final Principle

User intake should define intent.

Shopify import should define current store reality.

Derived artifacts should define planning intelligence.

Generated artifacts should define execution-ready outputs.

Governance artifacts should define release control.

This separation is essential for a stable future n8n + Claude Code workflow system.
