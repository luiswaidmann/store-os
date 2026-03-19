store-os

A generic operating system for building and managing multiple commerce projects in a structured way.

This repository is designed to stay generic.

It is not a SuppliedTech-only repository.
SuppliedTech is only one project inside the projects/ folder.
Other projects such as textile dropshipping, pet stores, gadget stores, or future Shopify concepts can live next to it.

⸻

Purpose

The goal of store-os is to provide a reusable structure for:
	•	market analysis
	•	competitor research
	•	pattern extraction
	•	design system planning
	•	content generation
	•	collection logic
	•	media workflows
	•	deployment preparation
	•	validation
	•	project isolation

This repository should make it easy to run multiple store or brand projects without mixing them together.

⸻

Core Principle

Global folders must remain generic.

Anything that belongs only to one store, brand, market, niche, or visual direction must go into:

projects/<project-id>/

That means:
	•	no SuppliedTech defaults in global core logic
	•	no hardcoded brand assumptions in shared prompts
	•	no project-specific colors, themes, or market logic in generic folders

Repository Structure
store-os/
├── docs/
├── core/
├── schemas/
├── prompts/
├── workflows/
├── validators/
├── shared/
├── templates/
├── projects/
├── outputs/
├── archives/
└── scripts/

Folder Overview

docs/

Documentation, architecture notes, migration notes, and repo rules.

core/

Generic logic and reusable system building blocks.

schemas/

JSON schemas and validation structures.

prompts/

Generic prompts only. No project-specific assumptions.

workflows/

Workflow definitions and automation blueprints.

validators/

Validation logic for themes, content, SEO, assets, and project isolation.

shared/

Reusable utilities, snippets, scripts, and base assets.

templates/

Base project templates for new projects.

projects/

All project-specific work lives here.

Examples:
	•	projects/suppliedtech/
	•	projects/textile-dropshipping/

outputs/

Generated reports, previews, and snapshots.

archives/

Legacy material and migration leftovers that should not define the new system.

scripts/

Helper scripts for project creation, validation, backup, and migration.

⸻

Project Structure

Each project should live inside its own folder:

projects/<project-id>/

A project can contain:
	•	input data
	•	research
	•	manifests
	•	theme files
	•	content files
	•	assets
	•	exports
	•	notes

Example:

projects/suppliedtech/
├── project.json
├── input/
├── research/
├── manifests/
├── theme/
├── content/
├── assets/
├── exports/
└── notes/

Rules
	1.	Global logic stays generic.
	2.	Project-specific logic stays inside projects/<project-id>/.
	3.	Existing themes are references, not default truth.
	4.	Market analysis should happen before design decisions.
	5.	Competitor patterns may inspire direction, but direct copying is forbidden.
	6.	Live publishing should only happen after validation and review.

For more details, see:

docs/repo-rules.md

Current Projects

At the moment, the repository includes:
	•	suppliedtech
	•	textile-dropshipping

More projects can be added later.

⸻

Status

This repository is currently a clean generic base structure.

It is intended to grow into a reusable multi-project system for commerce and storefront operations.
