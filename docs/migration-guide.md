Migration Guide

Purpose

This document explains how legacy material should be evaluated before being moved into store-os.

The goal is not to preserve old structure by default.

The goal is to build a professional, clean, generic, multi-project operating system.

Legacy material is allowed only if it clearly improves the new system.

⸻

Core Rule

Do not migrate old files just because they already exist.

A file should only be migrated if it earns its place in the new system.

If a file is unclear, outdated, risky, too project-specific, or poorly structured, it should not be promoted into the new operating layer.

When in doubt:
	•	archive it
	•	or rebuild it from scratch

⸻

Four Migration Outcomes

Every legacy file should end up in one of these categories:

1. KEEP

Use when:
	•	the file is clearly useful
	•	the file is generic
	•	the file is structurally sound
	•	the file has little or no project contamination

Meaning:
The file may be reused with minimal or no changes.

⸻

2. KEEP BUT REFACTOR

Use when:
	•	the idea is useful
	•	but the file is too specific
	•	or the naming is weak
	•	or the structure is not clean enough
	•	or parts of it are contaminated by old assumptions

Meaning:
The file may inspire the new system, but must be rewritten, split, renamed, or cleaned.

⸻

3. ARCHIVE

Use when:
	•	the file may still be historically useful
	•	the file shows earlier decisions or experiments
	•	the file should be kept for reference
	•	but it should not drive the new system

Meaning:
Store it in archive or legacy space, but do not treat it as active truth.

⸻

4. DO NOT MIGRATE

Use when:
	•	the file is broken
	•	the file is risky
	•	the file is outdated
	•	the file is too tightly bound to an old store or old deployment logic
	•	the file would weaken the new system

Meaning:
Do not move it into the active system.

⸻

Default Migration Mindset

The default assumption is:
	•	do not migrate
	•	do not trust by default
	•	do not let old structure define new structure

This is especially important for:
	•	theme files
	•	generated CSS
	•	generated JS
	•	old prompts
	•	old configs
	•	hardcoded brand defaults
	•	old deployment patches
	•	mixed strategy/design artifacts

⸻

Migration Priority Order

Phase 1 — Lowest Risk

Start with:
	•	schemas
	•	architecture notes
	•	validator concepts
	•	workflow concepts
	•	generic utility scripts
	•	professional checklists

These are the safest things to evaluate first.

⸻

Phase 2 — Medium Risk

Then evaluate:
	•	prompts
	•	configs
	•	generated manifests
	•	store logic files
	•	strategy notes
	•	old store DNA style artifacts

These often contain useful thinking, but also hidden project-specific assumptions.

⸻

Phase 3 — Highest Risk

Only evaluate these last:
	•	theme.liquid
	•	templates
	•	sections
	•	snippets
	•	global CSS
	•	global JS
	•	generated theme bundles
	•	deploy patches
	•	old fixes and overrides

These files can silently contaminate the new system and should never be trusted by default.

⸻

Files That Must Not Become Global Defaults

The following types of legacy material must not be promoted into the generic operating layer without strong review:
	•	project-specific prompts
	•	project-specific store configs
	•	project-specific design tokens
	•	project-specific competitor references
	•	project-specific themes
	•	generated output files
	•	“final”, “fix”, “override”, “backup”, or “v2/v3” files with unclear origin

If they are useful at all, they belong either in:
	•	projects/<project-id>/
	•	or archives/

but not in the generic core.

⸻

Questions To Ask For Every File

When reviewing a legacy file, ask:
	1.	Is it broken?
	2.	Is it outdated?
	3.	Is it too specific to one old project?
	4.	Would we design it this way today from scratch?
	5.	Does it improve the new system?
	6.	Can it serve more than one future project?
	7.	Does it carry hidden risk?
	8.	Would it contaminate the generic layer?

If the answers are unclear, do not migrate it into the active system.

⸻

Special Warning: Theme and Design Files

Theme and design files are especially dangerous to migrate blindly.

Examples:
	•	theme.liquid
	•	global CSS
	•	old design system outputs
	•	old animation files
	•	old snippets
	•	old section files

Why?
Because these files often contain:
	•	hidden assumptions
	•	old branding
	•	old performance tradeoffs
	•	route-specific hacks
	•	rendering risks
	•	fallback problems
	•	technical debt

These files should almost never be treated as ready-to-keep assets.

At best:
	•	archive them
	•	inspect them later
	•	reuse only small proven ideas

⸻

Preferred Rule for Professional Rebuild

If a legacy file is:
	•	strategically important
	•	but structurally weak
	•	or too tied to old logic

then the correct move is often:

rebuild, do not migrate

This is especially true for:
	•	strategy artifacts
	•	brand logic
	•	design logic
	•	prompts
	•	deployment logic

⸻

Legacy Material and Project Contamination

If a file contains old project defaults such as:
	•	old brand names
	•	old domains
	•	old color systems
	•	old store assumptions
	•	fixed competitor references
	•	old tone of voice defaults

then it must not enter the generic layer unchanged.

It may only be:
	•	refactored into generic form
	•	placed inside the relevant project folder
	•	or archived

⸻

Migration Flow

Recommended review flow:
	1.	collect legacy material
	2.	review files in small batches
	3.	assign one of the four outcomes
	4.	only then move or rebuild
	5.	never bulk-copy unknown legacy folders into active core paths

The safe sequence is:

legacy file
→ review
→ decision
→ rebuild or place
→ validate

Not:

legacy folder
→ bulk copy
→ hope it works

⸻

Success Criteria

Migration is successful only if:
	•	the generic layer stays generic
	•	project-specific logic stays inside project folders
	•	legacy debt does not become new debt
	•	the system becomes more professional, not just bigger
	•	rebuild is chosen whenever that creates a cleaner future

⸻

Final Principle

store-os is not a museum for old work.

It is a clean operating system for future professional commerce execution.

Legacy material may support it.

Legacy material must not control it.

