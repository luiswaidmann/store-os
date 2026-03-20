Workflow Input Output Map

Purpose

This document defines the expected input and output logic for the future workflow system inside store-os.

It connects:
	•	intake fields
	•	Shopify-imported data
	•	schema-based planning artifacts
	•	generated downstream artifacts
	•	validation and governance outputs

This file should help future Claude Code and n8n implementation stay consistent.

⸻

Core Principle

Each workflow should have:
	•	a clear purpose
	•	explicit upstream inputs
	•	an explicit primary output
	•	a clear downstream consumer

This prevents:
	•	hidden dependencies
	•	random workflow order
	•	duplicated logic
	•	unclear artifact ownership

⸻

Workflow Chain Overview

The intended chain is:
	1.	intake-store-input
	2.	import-shopify-data
	3.	build-store-profile
	4.	build-market-intelligence
	5.	build-brand-positioning
	6.	build-competitor-clusters
	7.	build-pattern-manifest
	8.	build-design-system
	9.	build-homepage-strategy
	10.	build-section-plan
	11.	build-seo-strategy
	12.	build-aeo-strategy
	13.	build-product-content
	14.	build-product-seo
	15.	build-product-faq
	16.	build-product-structured-data
	17.	build-collection-content
	18.	build-collection-seo
	19.	build-collection-navigation
	20.	build-page-content
	21.	build-page-seo
	22.	build-faq-page
	23.	build-internal-linking
	24.	build-structured-data-plan
	25.	build-media-plan
	26.	build-video-plan
	27.	build-motion-media-strategy
	28.	run-validation
	29.	build-quality-score
	30.	build-deployment-manifest
	31.	build-publish-decision
	32.	backup-project

⸻

Detailed Workflow Mapping

1. intake-store-input

Purpose:
Collect strategic user input from the future n8n intake form.

Primary inputs:
	•	user form fields

Primary outputs:
	•	normalized intake payload
	•	project setup payload

Main downstream consumers:
	•	import-shopify-data
	•	build-store-profile

Related docs:
	•	docs/input-model.md
	•	docs/n8n-intake-spec.md

⸻

2. import-shopify-data

Purpose:
Pull operational store data from Shopify.

Primary inputs:
	•	shopify_store_selector
	•	valid Shopify credentials in n8n

Primary outputs:
	•	raw shop data
	•	raw product dataset
	•	raw collection dataset
	•	raw media dataset

Main downstream consumers:
	•	build-store-profile
	•	build-product-content
	•	build-product-seo
	•	build-collection-content
	•	build-collection-seo
	•	build-media-plan

⸻

3. build-store-profile

Purpose:
Create store-level structured profile from intake + Shopify basics.

Primary inputs:
	•	normalized intake payload
	•	imported shop basics

Primary output:
	•	store-profile.json

Primary schema:
	•	schemas/store-profile.schema.json

Main downstream consumers:
	•	all strategic planning workflows

⸻

4. build-market-intelligence

Purpose:
Create market analysis artifact.

Primary inputs:
	•	store-profile.json
	•	competitor hints
	•	imported store context
	•	optional research inputs

Primary output:
	•	market-intelligence.json

Primary schema:
	•	schemas/market-intelligence.schema.json

Main downstream consumers:
	•	build-brand-positioning
	•	build-competitor-clusters
	•	build-seo-strategy
	•	build-aeo-strategy

⸻

5. build-brand-positioning

Purpose:
Define store positioning and persuasion logic.

Primary inputs:
	•	store-profile.json
	•	market-intelligence.json
	•	relevant intake preferences

Primary output:
	•	brand-positioning.json

Primary schema:
	•	schemas/brand-positioning.schema.json

Main downstream consumers:
	•	build-pattern-manifest
	•	build-design-system
	•	build-product-content
	•	build-collection-content

⸻

6. build-competitor-clusters

Purpose:
Group competitors into pattern-relevant clusters.

Primary inputs:
	•	market-intelligence.json
	•	competitor URLs
	•	optional imported/observed competitor notes

Primary output:
	•	competitor-cluster.json

Primary schema:
	•	schemas/competitor-cluster.schema.json

Main downstream consumers:
	•	build-pattern-manifest

⸻

7. build-pattern-manifest

Purpose:
Decide which patterns are approved and forbidden.

Primary inputs:
	•	market-intelligence.json
	•	brand-positioning.json
	•	competitor-cluster.json
	•	store-profile.json

Primary output:
	•	pattern-manifest.json

Primary schema:
	•	schemas/pattern-manifest.schema.json

Main downstream consumers:
	•	build-design-system
	•	build-homepage-strategy
	•	build-section-plan

⸻

8. build-design-system

Purpose:
Define visual, media, motion, and performance rules.

Primary inputs:
	•	brand-positioning.json
	•	pattern-manifest.json
	•	store-profile.json

Primary output:
	•	design-system.json

Primary schema:
	•	schemas/design-system.schema.json

Main downstream consumers:
	•	build-homepage-strategy
	•	build-section-plan
	•	build-media-plan
	•	build-motion-media-strategy

⸻

9. build-homepage-strategy

Purpose:
Define homepage role, hero logic, section flow, trust, and CTA logic.

Primary inputs:
	•	store-profile.json
	•	market-intelligence.json
	•	brand-positioning.json
	•	pattern-manifest.json
	•	design-system.json

Primary output:
	•	homepage-strategy.json

Primary schema:
	•	schemas/homepage-strategy.schema.json

Main downstream consumers:
	•	build-section-plan
	•	build-media-plan
	•	build-motion-media-strategy

⸻

10. build-section-plan

Purpose:
Define allowed sections and configured section instances.

Primary inputs:
	•	homepage-strategy.json
	•	design-system.json
	•	pattern-manifest.json

Primary outputs:
	•	section library decisions
	•	section instance sets

Primary schemas:
	•	schemas/section-library.schema.json
	•	schemas/section-instance.schema.json

Main downstream consumers:
	•	theme planning later
	•	build-media-plan
	•	run-validation

⸻

11. build-seo-strategy

Purpose:
Define store-wide SEO direction.

Primary inputs:
	•	store-profile.json
	•	market-intelligence.json
	•	brand-positioning.json
	•	intake SEO preferences

Primary output:
	•	seo-strategy.json

Primary schema:
	•	schemas/seo-strategy.schema.json

Main downstream consumers:
	•	product, collection, and page SEO workflows
	•	build-structured-data-plan
	•	build-internal-linking

⸻

12. build-aeo-strategy

Purpose:
Define store-wide AEO direction.

Primary inputs:
	•	market-intelligence.json
	•	brand-positioning.json
	•	seo-strategy.json
	•	intake AEO preferences

Primary output:
	•	aeo-strategy.json

Primary schema:
	•	schemas/aeo-strategy.schema.json

Main downstream consumers:
	•	product, collection, and page SEO/content workflows
	•	build-faq-page
	•	build-structured-data-plan

⸻

13. build-product-content

Purpose:
Create structured product page content plans.

Primary inputs:
	•	imported raw product data
	•	store-profile.json
	•	market-intelligence.json
	•	brand-positioning.json
	•	design-system.json

Primary output:
	•	product-content.json

Primary schema:
	•	schemas/product-content.schema.json

Main downstream consumers:
	•	build-product-seo
	•	build-product-faq
	•	build-product-structured-data
	•	build-media-plan

⸻

14. build-product-seo

Purpose:
Create product SEO and answer-target planning.

Primary inputs:
	•	product-content.json
	•	seo-strategy.json
	•	aeo-strategy.json
	•	imported product basics

Primary output:
	•	product-seo.json

Primary schema:
	•	schemas/product-seo.schema.json

Main downstream consumers:
	•	build-product-structured-data
	•	run-validation

⸻

15. build-product-faq

Purpose:
Create product FAQ artifact.

Primary inputs:
	•	product-content.json
	•	aeo-strategy.json
	•	intake FAQ preferences

Primary output:
	•	product-faq.json

Primary schema:
	•	schemas/product-faq.schema.json

Main downstream consumers:
	•	build-product-structured-data
	•	run-validation

⸻

16. build-product-structured-data

Purpose:
Plan structured product markup needs.

Primary inputs:
	•	imported product data
	•	product-seo.json
	•	product-faq.json
	•	structured-data-plan.json when available

Primary output:
	•	product-structured-data.json

Primary schema:
	•	schemas/product-structured-data.schema.json

Main downstream consumers:
	•	template/render planning later
	•	run-validation

⸻

17. build-collection-content

Purpose:
Create collection page content plan.

Primary inputs:
	•	imported collections
	•	store-profile.json
	•	market-intelligence.json
	•	brand-positioning.json

Primary output:
	•	collection-content.json

Primary schema:
	•	schemas/collection-content.schema.json

Main downstream consumers:
	•	build-collection-seo
	•	build-collection-navigation
	•	build-media-plan

⸻

18. build-collection-seo

Purpose:
Create collection SEO and answer-target planning.

Primary inputs:
	•	collection-content.json
	•	seo-strategy.json
	•	aeo-strategy.json

Primary output:
	•	collection-seo.json

Primary schema:
	•	schemas/collection-seo.schema.json

Main downstream consumers:
	•	build-collection-navigation
	•	run-validation

⸻

19. build-collection-navigation

Purpose:
Define collection visibility and placement in navigation logic.

Primary inputs:
	•	imported collections
	•	collection-content.json
	•	collection-seo.json
	•	homepage-strategy.json

Primary output:
	•	collection-navigation.json

Primary schema:
	•	schemas/collection-navigation.schema.json

Main downstream consumers:
	•	later navigation generation
	•	run-validation

⸻

20. build-page-content

Purpose:
Create general page content structures.

Primary inputs:
	•	brand-positioning.json
	•	market-intelligence.json
	•	design-system.json
	•	intake preferences

Primary output:
	•	page-content.json

Primary schema:
	•	schemas/page-content.schema.json

Main downstream consumers:
	•	build-page-seo
	•	build-faq-page
	•	build-media-plan

⸻

21. build-page-seo

Purpose:
Create SEO and AEO logic for general pages.

Primary inputs:
	•	page-content.json
	•	seo-strategy.json
	•	aeo-strategy.json

Primary output:
	•	page-seo.json

Primary schema:
	•	schemas/page-seo.schema.json

Main downstream consumers:
	•	run-validation

⸻

22. build-faq-page

Purpose:
Create dedicated FAQ page artifact.

Primary inputs:
	•	aeo-strategy.json
	•	page-content.json
	•	intake FAQ preferences

Primary output:
	•	faq-page.json

Primary schema:
	•	schemas/faq-page.schema.json

Main downstream consumers:
	•	build-structured-data-plan
	•	run-validation

⸻

23. build-internal-linking

Purpose:
Define internal linking strategy.

Primary inputs:
	•	seo-strategy.json
	•	aeo-strategy.json
	•	homepage-strategy.json
	•	product/collection/page planning artifacts

Primary output:
	•	internal-linking.json

Primary schema:
	•	schemas/internal-linking.schema.json

Main downstream consumers:
	•	content insertions later
	•	run-validation

⸻

24. build-structured-data-plan

Purpose:
Define store-wide structured data planning.

Primary inputs:
	•	seo-strategy.json
	•	aeo-strategy.json
	•	product, collection, and FAQ planning artifacts

Primary output:
	•	structured-data-plan.json

Primary schema:
	•	schemas/structured-data-plan.schema.json

Main downstream consumers:
	•	build-product-structured-data
	•	template/render planning later
	•	run-validation

⸻

25. build-media-plan

Purpose:
Plan general media asset needs.

Primary inputs:
	•	imported media
	•	design-system.json
	•	homepage-strategy.json
	•	section plans
	•	product/collection/page content

Primary output:
	•	media-asset.json

Primary schema:
	•	schemas/media-asset.schema.json

Main downstream consumers:
	•	build-video-plan
	•	build-motion-media-strategy
	•	run-validation

⸻

26. build-video-plan

Purpose:
Plan video-specific asset usage.

Primary inputs:
	•	media-asset.json
	•	intake media preferences
	•	homepage-strategy.json
	•	product content/use case relevance

Primary output:
	•	video-asset.json

Primary schema:
	•	schemas/video-asset.schema.json

Main downstream consumers:
	•	build-motion-media-strategy
	•	run-validation

⸻

27. build-motion-media-strategy

Purpose:
Define store-wide motion/video/embed usage constraints.

Primary inputs:
	•	design-system.json
	•	homepage-strategy.json
	•	media-asset.json
	•	video-asset.json
	•	intake motion/media preferences

Primary output:
	•	motion-media-strategy.json

Primary schema:
	•	schemas/motion-media-strategy.schema.json

Main downstream consumers:
	•	theme/section behavior later
	•	run-validation

⸻

28. run-validation

Purpose:
Validate all major artifacts before release decision.

Primary inputs:
	•	all generated planning artifacts
	•	imported context
	•	section plans
	•	media/motion plans

Primary output:
	•	validation-report.json

Primary schema:
	•	schemas/validation-report.schema.json

Main downstream consumers:
	•	build-quality-score
	•	build-deployment-manifest
	•	build-publish-decision

⸻

29. build-quality-score

Purpose:
Create summarized quality scoring.

Primary inputs:
	•	validation-report.json
	•	major planning artifacts
	•	media and governance context

Primary output:
	•	quality-score.json

Primary schema:
	•	schemas/quality-score.schema.json

Main downstream consumers:
	•	build-publish-decision

⸻

30. build-deployment-manifest

Purpose:
Track generated artifacts and deployment state.

Primary inputs:
	•	validated artifacts
	•	environment context
	•	workflow version context

Primary output:
	•	deployment-manifest.json

Primary schema:
	•	schemas/deployment-manifest.schema.json

Main downstream consumers:
	•	build-publish-decision

⸻

31. build-publish-decision

Purpose:
Create final publish recommendation or block.

Primary inputs:
	•	validation-report.json
	•	quality-score.json
	•	deployment-manifest.json
	•	governance preferences from intake

Primary output:
	•	publish-decision.json

Primary schema:
	•	schemas/publish-decision.schema.json

Main downstream consumers:
	•	release logic later
	•	manual review process later

⸻

32. backup-project

Purpose:
Create backup snapshot after important steps or final state.

Primary inputs:
	•	project path
	•	backup rules

Primary outputs:
	•	latest backup copy
	•	timestamped snapshot zip

Related script:
	•	scripts/backup-to-icloud.sh

⸻

Important Ordering Rule

The workflow should move from:

user intent
→ imported shop reality
→ derived strategic intelligence
→ generated planning artifacts
→ validation
→ deployment and publish decision

Not:
	•	theme first
	•	media first
	•	deployment first

This ordering is intentional and should remain stable.

⸻

Important Implementation Note for Claude Code

When implementing workflows:
	•	do not bypass schema contracts
	•	do not rely on secrets stored in Git
	•	do not treat Shopify import as strategic truth
	•	do not treat freeform LLM output as final truth without validation
	•	do not skip validation and publish gates

The map defines the intended contract chain.
