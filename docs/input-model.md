Input Model

Purpose

This document defines the input model for the future store-os workflow system.

Its purpose is to clearly separate:
	•	user-provided inputs
	•	automatically imported Shopify data
	•	derived intelligence artifacts
	•	generated planning and content artifacts
	•	validation and release artifacts

This separation is critical for future n8n orchestration and Claude Code assisted workflow building.

⸻

Core Principle

The user should only be asked for information that:
	•	is strategically important
	•	cannot be reliably pulled from Shopify
	•	cannot be safely inferred
	•	should remain under explicit user control

The workflow should automatically fetch everything else whenever possible.

This reduces:
	•	duplicated truth
	•	manual errors
	•	unnecessary input burden
	•	inconsistent project setup

⸻

Data Source Layers

1. User Input

This includes strategic decisions and preferences.

Examples:
	•	project identity
	•	primary market
	•	primary language
	•	primary currency
	•	vertical
	•	price positioning
	•	brand role
	•	trust style
	•	motion preference
	•	publish mode

This is the smallest but most important input layer.

⸻

2. Shopify Import

This includes operational store data fetched automatically through the Shopify connection.

Examples:
	•	shop domain
	•	store name
	•	product titles
	•	product handles
	•	product descriptions
	•	variants
	•	images
	•	collections
	•	tags
	•	vendor
	•	existing SEO fields
	•	existing media references

This data should not be manually re-entered if it already exists in Shopify.

⸻

3. Derived Intelligence

This includes structured artifacts that are created from:
	•	user input
	•	Shopify import
	•	research
	•	LLM-assisted analysis
	•	schema-constrained synthesis

Examples:
	•	market intelligence
	•	brand positioning refinement
	•	competitor clusters
	•	pattern manifest
	•	SEO strategy
	•	AEO strategy
	•	design system
	•	homepage strategy

These are not raw user inputs.
They are derived planning artifacts.

⸻

4. Generated Artifacts

These are downstream outputs created by the workflow.

Examples:
	•	product content
	•	product SEO
	•	product FAQ
	•	collection content
	•	collection SEO
	•	page content
	•	media plans
	•	section plans

These are generated based on the earlier layers.

⸻

5. Governance Artifacts

These are the release control layer.

Examples:
	•	validation report
	•	quality score
	•	deployment manifest
	•	publish decision

These should never be confused with intake data.

⸻

Minimum Required User Inputs

These are the recommended minimum required fields for the future n8n intake form.

project_id

Type:
	•	text

Why required:
	•	internal project key
	•	used for paths and structured artifacts

Rules:
	•	lowercase
	•	numbers allowed
	•	hyphens allowed
	•	no spaces

Example:
	•	suppliedtech
	•	textile-dropshipping

⸻

project_name

Type:
	•	text

Why required:
	•	human-readable project label

Example:
	•	SuppliedTech
	•	Textile Dropshipping EU

⸻

shopify_store_selector

Type:
	•	dropdown / connection selector

Why required:
	•	selects the actual Shopify store connection
	•	avoids manually typing domains that can already be fetched

Important:
The user should select the store, not manually enter the domain.

⸻

primary_market

Type:
	•	dropdown

Why required:
	•	drives strategy, language assumptions, content framing, and SEO context

Recommended values:
	•	DE
	•	DACH
	•	EU
	•	US
	•	UK
	•	Global

⸻

primary_language

Type:
	•	dropdown

Why required:
	•	affects content generation and store planning

Recommended values:
	•	de
	•	en
	•	fr
	•	it
	•	es

⸻

primary_currency

Type:
	•	dropdown

Why required:
	•	affects offer and structured data planning

Recommended values:
	•	EUR
	•	USD
	•	GBP
	•	CHF

⸻

vertical

Type:
	•	dropdown

Why required:
	•	gives the workflow category context

Recommended values:
	•	consumer-tech-accessories
	•	fashion-textiles
	•	pet-products
	•	home-living
	•	fitness-accessories
	•	beauty
	•	general-commerce
	•	other

⸻

price_positioning

Type:
	•	dropdown

Why required:
	•	affects positioning, trust style, design, and conversion behavior

Recommended values:
	•	budget
	•	mass-market
	•	mass-premium
	•	premium
	•	luxury
	•	to-be-defined

⸻

manual_review_required

Type:
	•	boolean

Why required:
	•	governance control
	•	prevents accidental blind release behavior

Recommended default:
	•	true

⸻

publish_mode

Type:
	•	dropdown

Why required:
	•	defines release behavior

Recommended values:
	•	no-publish
	•	draft-only
	•	draft-and-review

Recommended default:
	•	draft-only

⸻

Recommended Optional User Inputs

These fields are not strictly required, but they significantly improve output quality.

Brand and positioning options
	•	store_type
	•	business_model
	•	brand_role
	•	tone_of_voice
	•	trust_style
	•	conversion_style
	•	objection_handling_style

⸻

Market expansion options
	•	target_markets
	•	languages
	•	currencies

⸻

Competitor and style options
	•	competitor_urls
	•	desired_style_hints
	•	forbidden_styles
	•	must_not_feel_like
	•	must_feel_like

⸻

SEO and AEO options
	•	seo_goal
	•	aeo_goal
	•	faq_intensity
	•	knowledge_content_priority

⸻

Media and motion options
	•	motion_level_preference
	•	scroll_animation_preference
	•	hero_video_allowed
	•	video_usage_preference
	•	performance_priority

⸻

Additional notes
	•	special_notes

⸻

Fields That Should Be Pulled Automatically From Shopify

The future system should fetch these automatically where possible:
	•	shop_domain
	•	shop_name
	•	products
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

These should not become required user inputs.

⸻

Mapping: Inputs to Artifacts

Directly created from user input

These artifacts are created directly or almost directly from the user intake:
	•	project.json
	•	store-profile.json

Some fields may also seed:
	•	brand-positioning.json
	•	seo-strategy.json
	•	aeo-strategy.json
	•	motion-media-strategy.json

⸻

Created from Shopify import

These are imported or normalized from store data:
	•	raw product dataset
	•	raw collection dataset
	•	raw media dataset
	•	raw existing store metadata

These should remain separate from strategic user input.

⸻

Derived intelligence artifacts

These are created through analysis and synthesis:
	•	market-intelligence.json
	•	brand-positioning.json
	•	competitor-cluster.json
	•	pattern-manifest.json
	•	design-system.json
	•	homepage-strategy.json
	•	seo-strategy.json
	•	aeo-strategy.json
	•	internal-linking.json
	•	structured-data-plan.json

⸻

Generated downstream artifacts

These are later workflow outputs:
	•	product-content.json
	•	product-seo.json
	•	product-faq.json
	•	product-structured-data.json
	•	collection-content.json
	•	collection-seo.json
	•	collection-navigation.json
	•	page-content.json
	•	page-seo.json
	•	faq-page.json
	•	media-asset.json
	•	video-asset.json
	•	section instance sets

⸻

Governance artifacts

These are built at the end of the workflow chain:
	•	validation-report.json
	•	quality-score.json
	•	deployment-manifest.json
	•	publish-decision.json

⸻

Why Domain Should Not Be a Required Manual Input

The domain is a good example of what should not be manually entered.

Why:
	•	the workflow already knows which Shopify store connection is being used
	•	the API can retrieve the store domain
	•	manual domain entry introduces unnecessary duplication and possible mismatch

Therefore:
	•	use a store selector
	•	fetch the domain automatically

The same logic applies to many product and collection properties.

⸻

Intake Philosophy

The future intake form should be:
	•	small enough to complete quickly
	•	strong enough to guide professional output
	•	constrained enough to reduce ambiguity
	•	flexible enough to support different store types

The form should ask for strategic truth, not operational facts that can already be imported.

⸻

Recommended Form Logic

Layer 1 — Required foundation

Collect only the mandatory strategic minimum.

Layer 2 — Recommended strategic preferences

Collect additional brand, style, SEO, AEO, media, and competitor inputs.

Layer 3 — Optional advanced controls

Collect advanced preferences only when the user wants tighter control.

This allows the workflow to stay usable without becoming bloated.

⸻

Final Principle

The future system should ask the user for:
	•	what the workflow cannot know
	•	what the workflow should not assume
	•	what the workflow must treat as strategic intent

And it should automatically fetch:
	•	what Shopify already knows
	•	what the store already contains
	•	what can be normalized safely
