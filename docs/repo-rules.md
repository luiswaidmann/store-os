Repo Rules

Purpose

These rules define how store-os should be structured and maintained.

The goal is to protect the repository from:
	•	project contamination
	•	hidden legacy assumptions
	•	random file sprawl
	•	uncontrolled generated output
	•	weak migration decisions
	•	design-first chaos
	•	unsafe future automation

This repository is intended to become a professional, schema-driven, orchestration-ready commerce operating system.

⸻

Rule 1 — The generic layer must stay generic

The following areas must remain generic:
	•	docs/
	•	schemas/
	•	scripts/
	•	core/
	•	prompts/
	•	validators/
	•	shared/

These areas must not silently become specific to one project, one brand, one domain, one color system, one old store, or one niche.

This means:
	•	no SuppliedTech defaults in the generic layer
	•	no old domain assumptions in the generic layer
	•	no old project-specific design language in the generic layer
	•	no fixed competitor assumptions as defaults

⸻

Rule 2 — Project-specific material belongs only in project folders

Anything tied to one specific store or brand must live inside:

projects/<project-id>/

This includes, for example:
	•	project-specific prompts
	•	project-specific configs
	•	project-specific themes
	•	project-specific media
	•	project-specific content
	•	project-specific notes
	•	project-specific exports
	•	project-specific rollout artifacts

If something only makes sense for one project, it must not live in the generic operating layer.

⸻

Rule 3 — Archives are reference, not truth

Anything in:

archives/

is reference material only.

Archive material may be:
	•	useful historically
	•	useful for review
	•	useful for migration decisions

But archive material must not define the live operating system.

Archive is memory, not authority.

⸻

Rule 4 — Legacy material is not trusted by default

Old files must not be migrated just because they already exist.

The default stance is:
	•	do not trust by default
	•	do not bulk-copy unknown legacy material
	•	do not let old files define new structure

Every legacy file must be reviewed and assigned one of these outcomes:
	•	KEEP
	•	KEEP BUT REFACTOR
	•	ARCHIVE
	•	DO NOT MIGRATE

If a file is unclear, risky, outdated, broken, or too project-specific, it should not be promoted into the generic layer.

⸻

Rule 5 — Generated output is not the same as system truth

Generated files must not become global truth by accident.

This includes:
	•	generated prompts
	•	generated manifests
	•	generated CSS
	•	generated JS
	•	generated content
	•	generated asset bundles
	•	generated deployment outputs

Generated outputs belong either:
	•	in project-specific folders
	•	in output folders
	•	or in archives

They do not automatically become reusable core logic.

⸻

Rule 6 — Strategy comes before design

The system must follow this direction:

project
→ store profile
→ market intelligence
→ brand positioning
→ competitor clusters
→ pattern manifest
→ design system
→ content / SEO / AEO
→ media / motion
→ validation
→ deployment manifest
→ publish decision

The system must not start with:
	•	random theme generation
	•	random design choices
	•	random media generation
	•	old theme reuse by default
	•	deployment-first logic

Design should follow strategy, not replace it.

⸻

Rule 7 — Schemas are contracts

Schemas are not decoration.

Schemas define:
	•	expected structure
	•	handoff format
	•	validation contract
	•	safe boundaries for generation and automation

If a major artifact exists in the system, it should ideally be represented by a schema.

Claude Code, n8n, and other automation should work through structured artifacts whenever possible.

⸻

Rule 8 — Validation and publish gates are mandatory

No production release should happen without:
	•	validation
	•	quality scoring
	•	deployment manifest
	•	publish decision

Technical generation is not enough.

A store is not considered ready just because files exist.

It is only ready when:
	•	checks have been run
	•	blocking issues are visible
	•	quality is acceptable
	•	publish is explicitly allowed

⸻

Rule 9 — Motion and media must stay controlled

Media, embedded video, AI-generated media, and motion are allowed in the system.

But they must remain:
	•	strategy-driven
	•	performance-aware
	•	fallback-aware
	•	validation-aware

No page should become media-heavy by accident.

No motion should be treated as harmless decoration by default.

Important examples:
	•	hero video should have fallback logic
	•	mobile motion should be controlled
	•	autoplay must be intentional
	•	performance risk must be visible
	•	media should support conversion, trust, storytelling, or education — not just visual noise

⸻

Rule 10 — One project must not define future projects

A strong current project can still distort the system if it becomes the hidden model for everything.

That must not happen.

The operating system must be able to support:
	•	tech stores
	•	textile stores
	•	pet stores
	•	editorial commerce
	•	future unknown concepts

without one project silently becoming the default template for all others.

⸻

Rule 11 — Rebuild is often better than migration

If legacy material is:
	•	strategically useful
	•	but structurally weak
	•	or too contaminated by old assumptions

then the preferred move is often:

rebuild, do not migrate

This is especially true for:
	•	prompts
	•	design logic
	•	deployment logic
	•	strategy artifacts
	•	old theme logic
	•	old store DNA style files

The goal is long-term system quality, not short-term convenience.

⸻

Rule 12 — n8n is the process engine, not the memory layer

Future orchestration is expected to happen in n8n.

But n8n should not become the source of truth.

The source of truth should remain:
	•	the repository
	•	structured files
	•	schemas
	•	validation artifacts
	•	release governance artifacts

n8n coordinates steps.
It should not replace system memory or structured contracts.

⸻

Rule 13 — Claude Code / LLM logic must stay constrained

LLM-assisted logic is useful for:
	•	summarization
	•	synthesis
	•	generation
	•	transformation
	•	review support

But LLM output must not be treated as trustworthy by default.

LLM output should be:
	•	schema-shaped
	•	reviewable
	•	validated
	•	governance-aware

The system should never depend on unconstrained freeform output as its only truth.

⸻

Rule 14 — Keep the system readable

A professional system should stay understandable.

Avoid:
	•	unclear naming
	•	duplicate concepts
	•	random folders
	•	“final-final-v3” files
	•	hidden overrides
	•	unclear ownership
	•	undocumented exceptions

Prefer:
	•	clear naming
	•	modular files
	•	explicit schemas
	•	explicit project separation
	•	explicit governance
	•	explicit migration decisions

⸻

Final Principle

store-os should become:
	•	generic
	•	modular
	•	project-safe
	•	schema-driven
	•	validation-aware
	•	future-ready
	•	orchestration-friendly

It should not become:
	•	a dump of old work
	•	a hidden SuppliedTech clone
	•	a random theme folder
	•	a design-first shortcut
	•	a fragile automation maze

Protect the operating system first.
Everything else should follow from that.
