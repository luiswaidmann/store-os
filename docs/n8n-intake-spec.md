n8n Intake Specification

Purpose

This document defines the future n8n intake form for store-os.

It specifies:
	•	field names
	•	required vs optional fields
	•	field types
	•	recommended defaults
	•	suggested selectable values
	•	source responsibility
	•	target artifact mapping

This intake form should only ask for strategic user input.

Operational store data should be pulled automatically from Shopify whenever possible.

⸻

Core Principle

The intake form should collect:
	•	strategic intent
	•	explicit preferences
	•	governance choices
	•	non-inferable brand direction

The intake form should not collect by hand what Shopify can already provide.

Examples of fields that should be imported automatically instead of typed manually:
	•	shop domain
	•	store name
	•	product titles
	•	collections
	•	variants
	•	images
	•	existing SEO data

⸻

Field Groups

Group 1 — Project Setup

1. project_id
	•	Required: yes
	•	Type: text
	•	Source: user
	•	Rules:
	•	lowercase only
	•	numbers allowed
	•	hyphens allowed
	•	no spaces
	•	Example:
	•	suppliedtech
	•	textile-dropshipping
	•	Target artifacts:
	•	project.json

2. project_name
	•	Required: yes
	•	Type: text
	•	Source: user
	•	Example:
	•	SuppliedTech
	•	Textile Dropshipping EU
	•	Target artifacts:
	•	project.json

3. shopify_store_selector
	•	Required: yes
	•	Type: dropdown / store connection selector
	•	Source: user selects available Shopify connection
	•	Notes:
	•	do not use manual domain entry as primary workflow trigger
	•	this should identify the actual Shopify source
	•	Target artifacts:
	•	intake runtime context
	•	later used for Shopify import

⸻

Group 2 — Market and Language

4. primary_market
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	DE
	•	Suggested values:
	•	DE
	•	DACH
	•	EU
	•	US
	•	UK
	•	Global
	•	Target artifacts:
	•	store-profile.json
	•	market-intelligence.json

5. target_markets
	•	Required: no
	•	Type: multi-select
	•	Source: user
	•	Suggested values:
	•	DE
	•	AT
	•	CH
	•	DACH
	•	EU
	•	US
	•	UK
	•	Global
	•	Target artifacts:
	•	store-profile.json
	•	market-intelligence.json

6. primary_language
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	de
	•	Suggested values:
	•	de
	•	en
	•	fr
	•	it
	•	es
	•	Target artifacts:
	•	store-profile.json

7. languages
	•	Required: no
	•	Type: multi-select
	•	Source: user
	•	Suggested values:
	•	de
	•	en
	•	fr
	•	it
	•	es
	•	Target artifacts:
	•	store-profile.json

8. primary_currency
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	EUR
	•	Suggested values:
	•	EUR
	•	USD
	•	GBP
	•	CHF
	•	Target artifacts:
	•	store-profile.json

9. currencies
	•	Required: no
	•	Type: multi-select
	•	Source: user
	•	Suggested values:
	•	EUR
	•	USD
	•	GBP
	•	CHF
	•	Target artifacts:
	•	store-profile.json

⸻

Group 3 — Store and Business Context

10. vertical
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	general-commerce
	•	Suggested values:
	•	consumer-tech-accessories
	•	fashion-textiles
	•	pet-products
	•	home-living
	•	fitness-accessories
	•	beauty
	•	general-commerce
	•	other
	•	Target artifacts:
	•	store-profile.json
	•	market-intelligence.json

11. store_type
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	multi-product-store
	•	Suggested values:
	•	single-brand-store
	•	multi-product-store
	•	category-specialist
	•	editorial-commerce-store
	•	general-commerce-store
	•	Target artifacts:
	•	store-profile.json

12. business_model
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	ecommerce
	•	Suggested values:
	•	ecommerce
	•	dropshipping
	•	hybrid
	•	Target artifacts:
	•	store-profile.json

13. price_positioning
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	mass-premium
	•	Suggested values:
	•	budget
	•	mass-market
	•	mass-premium
	•	premium
	•	luxury
	•	to-be-defined
	•	Target artifacts:
	•	store-profile.json
	•	brand-positioning.json

⸻

Group 4 — Brand and Positioning

14. brand_role
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	specialist
	•	Suggested values:
	•	specialist
	•	curator
	•	problem-solver
	•	premium-innovator
	•	editorial-guide
	•	value-leader
	•	Target artifacts:
	•	brand-positioning.json

15. tone_of_voice
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	clear-direct
	•	Suggested values:
	•	clear-direct
	•	premium-confident
	•	warm-helpful
	•	editorial-smart
	•	playful-bold
	•	technical-trustworthy
	•	Target artifacts:
	•	brand-positioning.json

16. trust_style
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	mixed
	•	Suggested values:
	•	evidence-led
	•	social-proof-led
	•	authority-led
	•	guarantee-led
	•	mixed
	•	Target artifacts:
	•	brand-positioning.json

17. conversion_style
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	balanced
	•	Suggested values:
	•	subtle
	•	balanced
	•	assertive
	•	Target artifacts:
	•	brand-positioning.json

18. objection_handling_style
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	balanced
	•	Suggested values:
	•	minimal
	•	balanced
	•	detailed
	•	Target artifacts:
	•	brand-positioning.json

⸻

Group 5 — Competitors and Style Direction

19. competitor_urls
	•	Required: no
	•	Type: repeatable text list
	•	Source: user
	•	Example:
	•	https://nomadgoods.com
	•	https://dbrand.com
	•	Target artifacts:
	•	competitor-cluster.json

20. desired_style_hints
	•	Required: no
	•	Type: multi-select
	•	Source: user
	•	Suggested values:
	•	minimal-modern
	•	premium-clean
	•	editorial-rich
	•	technical-structured
	•	playful-bold
	•	conversion-focused
	•	Target artifacts:
	•	pattern-manifest.json
	•	design-system.json

21. forbidden_styles
	•	Required: no
	•	Type: multi-select
	•	Source: user
	•	Suggested values:
	•	too-generic-dropshipping
	•	too-dark-aggressive
	•	too-playful
	•	too-editorial
	•	too-luxury
	•	too-corporate
	•	too-cluttered
	•	too-minimal-empty
	•	Target artifacts:
	•	pattern-manifest.json

22. must_not_feel_like
	•	Required: no
	•	Type: long text
	•	Source: user
	•	Target artifacts:
	•	brand-positioning.json
	•	pattern-manifest.json

23. must_feel_like
	•	Required: no
	•	Type: long text
	•	Source: user
	•	Target artifacts:
	•	brand-positioning.json
	•	pattern-manifest.json

⸻

Group 6 — SEO and AEO Preferences

24. seo_goal
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	hybrid
	•	Suggested values:
	•	transactional-growth
	•	category-discovery
	•	brand-plus-category-growth
	•	knowledge-plus-commerce
	•	hybrid
	•	Target artifacts:
	•	seo-strategy.json

25. aeo_goal
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	hybrid
	•	Suggested values:
	•	product-understanding
	•	category-understanding
	•	comparison-readiness
	•	trust-and-reassurance
	•	hybrid
	•	Target artifacts:
	•	aeo-strategy.json

26. faq_intensity
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	balanced
	•	Suggested values:
	•	light
	•	balanced
	•	strong
	•	Target artifacts:
	•	aeo-strategy.json
	•	faq-page.json
	•	product-faq.json

27. knowledge_content_priority
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	supporting
	•	Suggested values:
	•	none
	•	supporting
	•	balanced
	•	major
	•	Target artifacts:
	•	seo-strategy.json
	•	aeo-strategy.json
	•	later guide/content planning

⸻

Group 7 — Media, Motion, and Governance

28. motion_level_preference
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	subtle
	•	Suggested values:
	•	none
	•	subtle
	•	balanced
	•	strong
	•	cinematic
	•	Target artifacts:
	•	motion-media-strategy.json
	•	design-system.json

29. scroll_animation_preference
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	light
	•	Suggested values:
	•	none
	•	light
	•	balanced
	•	strong
	•	Target artifacts:
	•	motion-media-strategy.json

30. hero_video_allowed
	•	Required: no
	•	Type: boolean
	•	Source: user
	•	Default:
	•	false
	•	Target artifacts:
	•	motion-media-strategy.json
	•	homepage-strategy.json

31. video_usage_preference
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	supporting-only
	•	Suggested values:
	•	none
	•	supporting-only
	•	balanced
	•	hero-driven
	•	Target artifacts:
	•	motion-media-strategy.json
	•	design-system.json

32. performance_priority
	•	Required: no
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	balanced
	•	Suggested values:
	•	maximum
	•	balanced
	•	experience-led
	•	Target artifacts:
	•	motion-media-strategy.json
	•	design-system.json
	•	seo-strategy.json

33. manual_review_required
	•	Required: yes
	•	Type: boolean
	•	Source: user
	•	Default:
	•	true
	•	Target artifacts:
	•	governance logic
	•	publish-decision.json

34. publish_mode
	•	Required: yes
	•	Type: dropdown
	•	Source: user
	•	Default:
	•	draft-only
	•	Suggested values:
	•	no-publish
	•	draft-only
	•	draft-and-review
	•	Target artifacts:
	•	deployment logic
	•	publish-decision.json

35. special_notes
	•	Required: no
	•	Type: long text
	•	Source: user
	•	Target artifacts:
	•	optional enrichment across multiple planning artifacts

⸻

Fields That Should Not Be Required Manual Inputs

These should be pulled automatically from Shopify where possible:
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

The intake form should avoid asking the user for these unless the Shopify import is unavailable.

⸻

Minimal Required Field Set

The recommended minimum required fields are:
	•	project_id
	•	project_name
	•	shopify_store_selector
	•	primary_market
	•	primary_language
	•	primary_currency
	•	vertical
	•	price_positioning
	•	manual_review_required
	•	publish_mode

This is the smallest practical form that still supports strong downstream planning.

⸻

Recommended Defaults Philosophy

Defaults should:
	•	reduce friction
	•	keep the workflow usable
	•	avoid aggressive assumptions
	•	stay easy to override

Recommended mindset:
	•	draft-first
	•	manual-review-first
	•	balanced over extreme
	•	subtle over cinematic by default
	•	hybrid SEO/AEO goals unless clearly specified otherwise

⸻

Final Principle

The intake form should collect strategic truth.

Shopify should provide operational truth.

The workflow should derive planning truth.

And governance artifacts should control release truth.
