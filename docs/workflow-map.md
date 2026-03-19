Workflow Map

Purpose

This document describes the intended end-to-end operating flow for store-os.

It is designed for a future system where:
	•	n8n acts as the orchestration layer
	•	structured schemas act as input and output contracts
	•	Claude Code or other LLM-assisted logic performs analysis, planning, generation, transformation, and review
	•	deployment remains controlled, validated, and review-aware

This is a system map, not a runtime log.

⸻

High-Level Workflow
	1.	Project setup
	2.	Store profiling
	3.	Market intelligence
	4.	Brand positioning
	5.	Competitor clustering
	6.	Pattern extraction and approval
	7.	Design system planning
	8.	Homepage strategy planning
	9.	Section system planning
	10.	Product content and SEO planning
	11.	Collection content and SEO planning
	12.	Store-level SEO and AEO strategy
	13.	Media and video planning
	14.	Internal linking and structured data planning
	15.	Validation and quality scoring
	16.	Deployment manifest creation
	17.	Publish decision

⸻

Phase 1 — Project Foundation

Step 1: Create project

Purpose:
Create a clean new project container.

Primary input:
	•	project id

Primary outputs:
	•	projects/<project-id>/
	•	project.json

Related files:
	•	scripts/create-project.sh
	•	schemas/project.schema.json

Expected future n8n role:
	•	optional bootstrap step
	•	can be triggered manually or via admin flow

⸻

Step 2: Define store profile

Purpose:
Describe the business and store basics.

Primary inputs:
	•	project information
	•	business model
	•	platform
	•	markets
	•	languages
	•	currencies
	•	vertical

Primary output:
	•	store-profile.json

Related schema:
	•	schemas/store-profile.schema.json

Expected future n8n role:
	•	structured intake
	•	may be manual, form-based, or LLM-assisted normalization

⸻

Phase 2 — Market and Positioning Intelligence

Step 3: Build market intelligence

Purpose:
Describe the market, audiences, core problems, trust factors, search behavior, and content/media opportunities.

Primary inputs:
	•	store profile
	•	category context
	•	market research
	•	search observations
	•	competitor observations

Primary output:
	•	market-intelligence.json

Related schema:
	•	schemas/market-intelligence.schema.json

Expected future n8n role:
	•	research aggregation
	•	LLM-assisted structuring
	•	optional external research enrichment

⸻

Step 4: Define brand positioning

Purpose:
Describe how the store should be perceived and how it should persuade.

Primary inputs:
	•	store profile
	•	market intelligence

Primary output:
	•	brand-positioning.json

Related schema:
	•	schemas/brand-positioning.schema.json

Expected future n8n role:
	•	LLM-assisted positioning synthesis
	•	review gate before downstream use

⸻

Step 5: Build competitor clusters

Purpose:
Group comparable competitors and extract shared strengths, weaknesses, and reusable pattern categories.

Primary inputs:
	•	market intelligence
	•	competitor list
	•	page-level observations

Primary output:
	•	competitor-cluster.json or cluster set

Related schema:
	•	schemas/competitor-cluster.schema.json

Expected future n8n role:
	•	research parser
	•	clustering logic
	•	LLM-assisted pattern grouping

⸻

Step 6: Build pattern manifest

Purpose:
Convert market and competitor learning into approved and forbidden patterns.

Primary inputs:
	•	market intelligence
	•	brand positioning
	•	competitor clusters

Primary output:
	•	pattern-manifest.json

Related schema:
	•	schemas/pattern-manifest.schema.json

Expected future n8n role:
	•	decision synthesis layer
	•	approval checkpoint before design generation

⸻

Phase 3 — Experience and Design Planning

Step 7: Build design system

Purpose:
Define the visual system, media intensity, motion rules, trust visibility, and performance guardrails.

Primary inputs:
	•	brand positioning
	•	pattern manifest

Primary output:
	•	design-system.json

Related schema:
	•	schemas/design-system.schema.json

Expected future n8n role:
	•	LLM-assisted rule generation
	•	output feeds later theme planning and media constraints

⸻

Step 8: Build homepage strategy

Purpose:
Define homepage role, hero logic, section order, trust placement, media role, and CTA logic.

Primary inputs:
	•	pattern manifest
	•	design system
	•	store profile
	•	market intelligence

Primary output:
	•	homepage-strategy.json

Related schema:
	•	schemas/homepage-strategy.schema.json

Expected future n8n role:
	•	page strategy planner
	•	may later generate homepage section plan for theme deployment

⸻

Step 9: Build section library and section instances

Purpose:
Define which section types are allowed and how concrete sections are configured per page.

Primary inputs:
	•	homepage strategy
	•	design system
	•	pattern manifest

Primary outputs:
	•	section-library.json
	•	section-instance.json sets

Related schemas:
	•	schemas/section-library.schema.json
	•	schemas/section-instance.schema.json

Expected future n8n role:
	•	reusable storefront block planning
	•	important bridge between strategy and theme generation

⸻

Phase 4 — Commerce Content Planning

Step 10: Build product content

Purpose:
Create strong PDP content structure.

Primary inputs:
	•	store profile
	•	market intelligence
	•	brand positioning
	•	design and section constraints

Primary output:
	•	product-content.json

Related schema:
	•	schemas/product-content.schema.json

Expected future n8n role:
	•	LLM-assisted content planning and generation
	•	review and validation stage expected

⸻

Step 11: Build product SEO

Purpose:
Define keyword, metadata, answer targets, and entity clarity for product pages.

Primary inputs:
	•	product content
	•	SEO strategy
	•	AEO strategy

Primary output:
	•	product-seo.json

Related schema:
	•	schemas/product-seo.schema.json

Expected future n8n role:
	•	search planning layer
	•	metadata and answer target generator

⸻

Step 12: Build collection content

Purpose:
Create strong category and collection page content.

Primary inputs:
	•	market intelligence
	•	store profile
	•	category logic
	•	brand positioning

Primary output:
	•	collection-content.json

Related schema:
	•	schemas/collection-content.schema.json

Expected future n8n role:
	•	category page content planner
	•	conversion + SEO support layer

⸻

Step 13: Build collection SEO

Purpose:
Define collection-level keyword, search role, and answer targets.

Primary inputs:
	•	collection content
	•	SEO strategy
	•	AEO strategy

Primary output:
	•	collection-seo.json

Related schema:
	•	schemas/collection-seo.schema.json

Expected future n8n role:
	•	category SEO planner
	•	landing page search support layer

⸻

Phase 5 — Store-Level Search, Answer, and Knowledge Planning

Step 14: Build SEO strategy

Purpose:
Define the store-wide SEO plan.

Primary inputs:
	•	store profile
	•	market intelligence
	•	brand positioning

Primary output:
	•	seo-strategy.json

Related schema:
	•	schemas/seo-strategy.schema.json

Expected future n8n role:
	•	strategy synthesis
	•	upstream input for product and collection SEO planning

⸻

Step 15: Build AEO strategy

Purpose:
Define how the store should support answer engines.

Primary inputs:
	•	market intelligence
	•	brand positioning
	•	SEO strategy

Primary output:
	•	aeo-strategy.json

Related schema:
	•	schemas/aeo-strategy.schema.json

Expected future n8n role:
	•	answer structure planner
	•	FAQ and semantic answer planning layer

⸻

Step 16: Build internal linking strategy

Purpose:
Define how pages connect to each other across the store.

Primary inputs:
	•	SEO strategy
	•	AEO strategy
	•	homepage strategy
	•	collection and product logic

Primary output:
	•	internal-linking.json

Related schema:
	•	schemas/internal-linking.schema.json

Expected future n8n role:
	•	navigation and contextual linking planner
	•	may later inform content inserts and page templates

⸻

Step 17: Build structured data plan

Purpose:
Define schema markup and entity clarity planning across the store.

Primary inputs:
	•	SEO strategy
	•	AEO strategy
	•	product and collection planning

Primary output:
	•	structured-data-plan.json

Related schema:
	•	schemas/structured-data-plan.schema.json

Expected future n8n role:
	•	structured data planner
	•	later informs template rendering and validation

⸻

Phase 6 — Media and Motion Planning

Step 18: Build media asset plans

Purpose:
Track reusable media assets, their role, fallback needs, SEO role, and performance risk.

Primary inputs:
	•	design system
	•	homepage strategy
	•	section instances
	•	product and collection content

Primary outputs:
	•	media-asset.json
	•	video-asset.json

Related schemas:
	•	schemas/media-asset.schema.json
	•	schemas/video-asset.schema.json

Expected future n8n role:
	•	media registry
	•	asset generation handoff
	•	external AI media workflow coordination

Important:
This is where future AI-generated videos, embedded videos, hero media, and motion-friendly assets become manageable.

⸻

Phase 7 — Validation, Governance, and Release Control

Step 19: Build validation report

Purpose:
Record pass/fail states, warnings, blocking signals, and required actions.

Primary inputs:
	•	all generated artifacts
	•	technical checks
	•	content checks
	•	SEO/AEO checks
	•	media and performance checks

Primary output:
	•	validation-report.json

Related schema:
	•	schemas/validation-report.schema.json

Expected future n8n role:
	•	final validation aggregator
	•	critical gate before publish decision

⸻

Step 20: Build quality score

Purpose:
Score the output quality across multiple dimensions.

Primary inputs:
	•	validation report
	•	content artifacts
	•	media artifacts
	•	deployment state

Primary output:
	•	quality-score.json

Related schema:
	•	schemas/quality-score.schema.json

Expected future n8n role:
	•	scoring layer
	•	decision support for release readiness

⸻

Step 21: Build deployment manifest

Purpose:
Track what was generated, what passed, and what is deployment-ready.

Primary inputs:
	•	validated artifacts
	•	workflow versioning
	•	environment state

Primary output:
	•	deployment-manifest.json

Related schema:
	•	schemas/deployment-manifest.schema.json

Expected future n8n role:
	•	deployment record
	•	environment-aware artifact registry

⸻

Step 22: Build publish decision

Purpose:
Create the final go / no-go decision.

Primary inputs:
	•	validation report
	•	quality score
	•	deployment manifest

Primary output:
	•	publish-decision.json

Related schema:
	•	schemas/publish-decision.schema.json

Expected future n8n role:
	•	final human-aware release gate
	•	may require manual approval before production release

⸻

Claude Code / LLM Role in the Future System

Claude Code or equivalent LLM-assisted logic is expected to support:
	•	market summarization
	•	audience synthesis
	•	positioning generation
	•	competitor clustering
	•	pattern extraction
	•	design rule generation
	•	section planning
	•	content planning and generation
	•	SEO and AEO planning
	•	media planning support
	•	quality review support

LLM outputs should always be constrained by schemas and validated before downstream use.

⸻

n8n Role in the Future System

n8n is expected to orchestrate:
	•	project setup flows
	•	structured data intake
	•	external research enrichment
	•	LLM execution chains
	•	schema validation
	•	asset coordination
	•	deployment preparation
	•	publish gating
	•	backup and audit processes

n8n should act as the process engine, not the source of truth.

The repository and structured artifacts remain the system memory and contract layer.

⸻

Important Operating Principle

The system should move in this direction:

raw idea
→ project
→ store profile
→ market intelligence
→ positioning
→ competitor clustering
→ pattern manifest
→ design and page strategy
→ content and SEO/AEO planning
→ media planning
→ validation
→ deployment manifest
→ publish decision

Not the other way around.

This protects the system from design-first chaos and keeps it strategically grounded.
