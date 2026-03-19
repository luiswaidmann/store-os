n8n Conventions

Purpose

This document defines how store-os, n8n, and Claude Code should work together.

The goal is to keep the future system:
	•	version-controlled
	•	understandable
	•	recoverable
	•	safe to evolve
	•	safe to automate

The system should never depend on hidden workflow logic that exists only inside n8n.

⸻

Core Principle

Git is the source of truth for workflow structure.

n8n is the execution environment.

Claude Code is the builder and refactorer that works inside clear boundaries.

⸻

Rule 1 — Workflow definitions belong in Git

All important workflow logic must be represented in the repository.

This includes:
	•	master workflows
	•	subworkflows
	•	orchestration flow definitions
	•	mapping logic
	•	supporting workflow documentation
	•	example input/output contracts
	•	workflow naming and responsibility rules

Suggested location:
workflows/
workflows/subflows/
docs/

The repository must remain the readable memory of the system.

⸻

Rule 2 — Credentials never belong in Git

The following must remain only in n8n credentials or secret handling:
	•	Shopify credentials
	•	OpenAI credentials
	•	GitHub credentials
	•	webhook secrets
	•	API keys
	•	tokens of any kind

Credentials must never be stored in:
	•	workflow JSON committed to Git
	•	documentation
	•	prompts
	•	scripts
	•	project files

⸻

Rule 3 — Git first, n8n second

Preferred direction:

Git
→ n8n

Not:

n8n
→ forgotten manual edits
→ unclear runtime truth

This means:
	•	Claude Code should first update workflow structure in Git
	•	then the workflow can be imported or synchronized into n8n
	•	if a workflow is edited in n8n, that change must be reflected back into Git

The system must avoid drift.

⸻

Rule 4 — Draft and production must stay separated

No workflow should be treated as production-ready just because it exists.

At minimum, the future system should distinguish between:
	•	draft / dev workflows
	•	production workflows

If a separate staging layer becomes available later, it should be added.

Production workflows must not be silently overwritten by experimental logic.

⸻

Rule 5 — Claude Code may build, but not publish blindly

Claude Code is allowed to:
	•	create workflow JSON files
	•	refactor workflow structures
	•	create new draft workflows
	•	update documentation
	•	update schema references
	•	improve subworkflow organization

Claude Code is not allowed to:
	•	store secrets in Git
	•	silently replace production workflows
	•	enable unsafe live publishing behavior
	•	bypass validation gates
	•	treat runtime execution as the source of truth
	•	promote project-specific logic into the generic layer without review

⸻

Rule 6 — Every workflow should have a clear role

Each workflow should have one clear purpose.

Recommended categories:
	•	intake
	•	import
	•	planning
	•	generation
	•	validation
	•	deployment
	•	publish gate
	•	backup
	•	audit

Avoid workflows that mix too many responsibilities without clear reason.

⸻

Rule 7 — Use consistent workflow naming

Recommended naming approach:

Master workflow
	•	master-orchestrator

Subworkflows

Use action-oriented names such as:
	•	intake-store-input
	•	import-shopify-data
	•	build-market-intelligence
	•	build-brand-positioning
	•	build-competitor-clusters
	•	build-pattern-manifest
	•	build-design-system
	•	build-homepage-strategy
	•	build-product-content
	•	build-product-seo
	•	build-collection-content
	•	build-collection-seo
	•	build-media-plan
	•	run-validation
	•	build-deployment-manifest
	•	build-publish-decision

Naming should stay readable and specific.

⸻

Rule 8 — Use one workflow file per important unit

Do not hide major workflow logic in one giant file if it can be split cleanly.

Preferred structure:

workflows/
├── master-orchestrator.json
├── subflows/
│   ├── intake-store-input.json
│   ├── import-shopify-data.json
│   ├── build-market-intelligence.json
│   ├── build-brand-positioning.json
│   ├── build-competitor-clusters.json
│   ├── build-pattern-manifest.json
│   ├── build-design-system.json
│   ├── build-homepage-strategy.json
│   ├── build-product-content.json
│   ├── build-product-seo.json
│   ├── build-collection-content.json
│   ├── build-collection-seo.json
│   ├── build-media-plan.json
│   ├── run-validation.json
│   ├── build-deployment-manifest.json
│   └── build-publish-decision.json

This improves:
	•	version control
	•	readability
	•	rollback safety
	•	debugging
	•	reuse

⸻

Rule 9 — Workflow inputs and outputs should be schema-aware

Each major workflow should know:
	•	what it expects as input
	•	what schema it writes as output
	•	what other workflow depends on that output

Workflows should not rely on vague freeform payloads when structured artifacts are possible.

Examples:
	•	store profile input
	•	market intelligence output
	•	pattern manifest output
	•	deployment manifest output
	•	publish decision output

Schemas are the contract layer.

⸻

Rule 10 — Runtime n8n state is not long-term memory

n8n execution logs are useful, but they are not the long-term memory of the system.

Long-term memory should remain in:
	•	Git
	•	structured artifact files
	•	versioned workflow definitions
	•	documentation
	•	validation artifacts
	•	deployment and publish artifacts

This prevents future confusion.

⸻

Rule 11 — Publish must always stay gated

No workflow should directly enable uncontrolled production publishing.

The system should require:
	•	validation report
	•	quality score
	•	deployment manifest
	•	publish decision
	•	optional manual approval

before a production release is allowed.

This rule must remain stronger than convenience.

⸻

Rule 12 — Motion, media, and AI assets require extra caution

If workflows later generate or deploy:
	•	hero video
	•	embedded media
	•	AI-generated video
	•	scroll animation logic
	•	motion-heavy sections

then those workflows must remain:
	•	performance-aware
	•	fallback-aware
	•	review-aware
	•	validation-aware

Media and motion should never be deployed blindly.

⸻

Rule 13 — Document workflow changes

Important workflow changes should be visible in Git history and preferably reflected in docs.

At minimum, major changes should update:
	•	workflow JSON
	•	relevant docs
	•	schema references if needed

This keeps the system understandable over time.

⸻

Rule 14 — Prefer controlled imports over hidden manual edits

If possible, workflow changes should move from:
	•	Git definition
	•	to controlled import
	•	to runtime validation

Manual in-n8n edits are allowed when necessary, but they should not become invisible permanent truth.

⸻

Rule 15 — Protect the generic operating system

Workflow logic that is specific to one project should not silently become generic default workflow behavior.

If a flow is project-specific, it should either:
	•	live in the project scope
	•	be configurable through inputs
	•	or remain clearly separated from the generic layer

The operating system must stay reusable across multiple future stores.

⸻

Final Principle

The future system should work like this:

Git defines
n8n executes
Claude Code builds
schemas constrain
validation governs
publish remains controlled

This is how store-os stays professional, scalable, and safe.
