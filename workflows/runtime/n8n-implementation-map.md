n8n Implementation Map

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — DRAFT IMPLEMENTATION MAP:
This document maps the Git-first workflow draft definitions (Phases 1–10) to concrete n8n
node types, execution patterns, and implementation strategies. No n8n workflows have been
built from this map yet. This is implementation-grade planning — the next step after this
document is the actual n8n build.

—

Purpose

This document defines:
  - How Git-first workflow draft JSON files map to real n8n workflows
  - Which n8n node type is appropriate for each workflow function category
  - Subflow boundary decisions (which workflows become n8n subworkflows)
  - Orchestration patterns (how the master orchestrator chains subworkflows)
  - n8n-specific implementation notes for each major workflow category
  - A node-type reference with usage guidance

—

Git-First Draft to n8n Workflow Mapping

Each Git-first workflow draft in workflows/subflows/ maps to one n8n workflow.
The n8n workflow name should match the Git draft workflow id (e.g., "run-validation",
"build-market-intelligence").

The mapping is 1:1 for Phase 1–10 workflows.
Phase 11 adds 2 additional n8n workflows (resolve-runtime-config, orchestrate-runtime-execution).

Total n8n workflows in the system: 34

  Git draft file                          → n8n workflow name
  ─────────────────────────────────────────────────────────────────────────────
  (new in Phase 11)                       → resolve-runtime-config
  (new in Phase 11)                       → orchestrate-runtime-execution
  subflows/intake-store-input.json        → intake-store-input
  subflows/import-shopify-data.json       → import-shopify-data
  subflows/build-store-profile.json       → build-store-profile
  subflows/build-market-intelligence.json → build-market-intelligence
  subflows/build-brand-positioning.json   → build-brand-positioning
  subflows/build-competitor-clusters.json → build-competitor-clusters
  subflows/build-pattern-manifest.json    → build-pattern-manifest
  subflows/build-design-system.json       → build-design-system
  subflows/build-homepage-strategy.json   → build-homepage-strategy
  subflows/build-section-plan.json        → build-section-plan
  subflows/build-seo-strategy.json        → build-seo-strategy
  subflows/build-aeo-strategy.json        → build-aeo-strategy
  subflows/build-product-content.json     → build-product-content
  subflows/build-product-seo.json         → build-product-seo
  subflows/build-product-faq.json         → build-product-faq
  subflows/build-product-structured-data.json → build-product-structured-data
  subflows/build-collection-content.json  → build-collection-content
  subflows/build-collection-seo.json      → build-collection-seo
  subflows/build-collection-navigation.json → build-collection-navigation
  subflows/build-page-content.json        → build-page-content
  subflows/build-page-seo.json            → build-page-seo
  subflows/build-faq-page.json            → build-faq-page
  subflows/build-internal-linking.json    → build-internal-linking
  subflows/build-structured-data-plan.json → build-structured-data-plan
  subflows/build-media-plan.json          → build-media-plan
  subflows/build-video-plan.json          → build-video-plan
  subflows/build-motion-media-strategy.json → build-motion-media-strategy
  subflows/run-validation.json            → run-validation
  subflows/build-quality-score.json       → build-quality-score
  subflows/build-deployment-manifest.json → build-deployment-manifest
  subflows/build-publish-decision.json    → build-publish-decision
  (scripts/backup-to-icloud.sh)           → backup-project

—

n8n Node Type Reference

The following n8n node types are used in the implementation:

Node Type: Workflow Trigger (Manual)
  n8n node: Manual Trigger
  Used for: resolve-runtime-config (development/testing trigger)
  Notes: Replaces the Form trigger in dev mode for quick testing without UI.

Node Type: Form Trigger
  n8n node: n8n Form Trigger (or Webhook with form UI)
  Used for: intake-store-input
  Notes: Renders the intake form defined in docs/n8n-intake-spec.md.
    All 35 intake fields must be mapped to form fields.
    Required fields must be marked required in the form.
    Form submission triggers the full chain.

Node Type: Webhook
  n8n node: Webhook
  Used for: Manual review gate callbacks, resume triggers
  Notes: Used as the "continue after review" mechanism when manual_review_required is true.
    The human reviewer sends a POST to the webhook URL to approve continuation.

Node Type: Execute Workflow
  n8n node: Execute Workflow
  Used for: orchestrate-runtime-execution calling each subworkflow
  Notes: This is the primary orchestration mechanism.
    The orchestrator calls each subworkflow via Execute Workflow in sequence.
    Each Execute Workflow call passes the runtime config as parameters.
    Error output from Execute Workflow is checked before proceeding to the next step.
    If an Execute Workflow call returns an error: orchestrator stops the chain.

Node Type: HTTP Request
  n8n node: HTTP Request
  Used for: import-shopify-data (Shopify Admin API calls)
  Notes: Uses the SHOPIFY_CREDENTIAL (resolved from n8n credential store).
    Must set the API version header: X-Shopify-Access-Token (or OAuth).
    Must handle pagination for large product and collection datasets.
    Shopify Admin API URL pattern: https://{shop}.myshopify.com/admin/api/{version}/{resource}.json
    DO NOT hardcode the shop domain — it must come from the intake shopify_store_selector field.

Node Type: OpenAI Chat Message (or AI node)
  n8n node: OpenAI → Chat Message (or n8n's AI node with OpenAI provider)
  Used for: All LLM synthesis steps in build-* workflows
  Notes: Uses the OPENAI_CREDENTIAL (resolved from n8n credential store).
    Model is set from STORE_OS_LLM_MODEL — never hardcoded.
    Response format should be JSON mode where the model supports it.
    System prompt defines the planning artifact role and constraints.
    User prompt includes the upstream artifact context and output schema shape.
    Output is parsed and schema-validated before writing to disk.

Node Type: Code (JavaScript)
  n8n node: Code (JavaScript mode)
  Used for:
    - Artifact existence checks (fs.existsSync)
    - JSON parsing and validation
    - AJV schema validation
    - Path construction and resolution
    - Contradiction detection logic
    - Placeholder density counting
    - Artifact assembly (combining multiple inputs into one output JSON)
    - Checkpoint reading and writing
    - Execution log appending
    - JSON diffing for contradiction checks
  Notes: n8n Code nodes have access to Node.js built-in modules (fs, path, etc.).
    External npm packages must be pre-installed in the n8n environment.
    AJV must be available in the Code node execution context.
    File system operations must use paths constructed from STORE_OS_PROJECT_ROOT.
    Never hardcode file paths.

Node Type: Read Binary File
  n8n node: Read/Write Files from Disk (n8n native node)
  Used for: Reading artifact JSON files
  Alternative: n8n Code node with fs.readFileSync (simpler for conditional reads)
  Notes: The n8n native file node is simpler for straightforward reads.
    For conditional reads (check existence first), a Code node is more flexible.

Node Type: Write Binary File
  n8n node: Read/Write Files from Disk (n8n native node)
  Used for: Writing artifact JSON files
  Alternative: n8n Code node with fs.writeFileSync + atomic rename
  Notes: The atomic write contract (tmp-then-rename) requires the Code node approach.
    The native Write File node does not support atomic writes directly.

Node Type: Set
  n8n node: Set
  Used for: Data mapping, field extraction, payload shaping
  Notes: Used to extract specific fields from LLM responses before schema validation.
    Used to inject project_id, timestamps, and metadata into artifact payloads.
    Keep Set nodes focused — one transformation per node.

Node Type: If
  n8n node: If
  Used for:
    - Checking if a required artifact is present (route to halt vs. continue)
    - Checking if validation passed (route to proceed vs. flag)
    - Checking if env is production vs. dev (route to strict vs. relaxed behavior)
  Notes: Boolean branching only. Complex multi-path logic should use Switch or Code.

Node Type: Switch
  n8n node: Switch
  Used for:
    - Routing on STORE_OS_ENV (dev, staging, production)
    - Routing on validation overall_status (PASS, WARNING, FAIL)
    - Routing on publish decision outcome
  Notes: Multi-path routing for more than 2 outcomes.

Node Type: Wait
  n8n node: Wait
  Used for: Manual review gate (pause chain until human approves)
  Notes: Configured to wait for a webhook callback.
    The webhook URL is included in the review notification.
    Timeout: configurable, default 7 days (must be confirmed against n8n Wait node limits).

Node Type: Error Trigger
  n8n node: Error Trigger
  Used for: Catching errors from subworkflows and writing to execution log
  Notes: A separate error handling workflow catches uncaught errors and:
    - Writes error details to .runtime/execution-log.json
    - Updates checkpoint with HALTED status
    - Sends notification (if configured)

Node Type: Merge
  n8n node: Merge
  Used for: Combining parallel workflow outputs before a sequential step
  Notes: Required if parallel workflow branches (product chain and collection chain)
    are implemented. The Merge node waits for both branches to complete.

—

Workflow Node Structure Patterns

Pattern A — Standard LLM Synthesis Workflow
  Used by: all build-* workflows that use LLM
  Node sequence:
    1. Workflow Trigger (called by Execute Workflow from orchestrator)
    2. Code node: Read runtime config parameters
    3. Code node: Check existence of required upstream artifacts
    4. Code node: Read upstream artifact files (fs.readFileSync)
    5. Code node: Assemble LLM prompt (inject upstream artifact data + output schema shape)
    6. OpenAI node: Send prompt, receive structured JSON response
    7. Code node: Parse LLM response as JSON
    8. Code node: AJV validate response against output schema
    9. If node: Schema valid?
       YES → Step 10
       NO  → Code node: Write to quarantine, return error to orchestrator
    10. Code node: Atomic write artifact to project folder
    11. Code node: Append to execution log
    12. Code node: Update checkpoint
    13. Return success to orchestrator

  Total nodes: 13 (approximately)

Pattern B — Deterministic-Only Workflow (no LLM)
  Used by: build-deployment-manifest, resolve-runtime-config, backup-project
  Node sequence:
    1. Workflow Trigger
    2. Code node: Read runtime config parameters
    3. Code node: Read required artifact files
    4. Code node: Execute deterministic logic (artifact inventory, manifest assembly)
    5. Code node: AJV validate output
    6. If node: Valid?
       YES → Step 7
       NO  → quarantine + error
    7. Code node: Atomic write artifact
    8. Code node: Log + checkpoint
    9. Return success

  Total nodes: 9 (approximately)

Pattern C — Governance Check Workflow
  Used by: run-validation
  Node sequence:
    1. Workflow Trigger
    2. Code node: Read runtime config
    3. Code node: Presence sweep (all artifacts)
    4. Code node: AJV schema validation (all present artifacts)
    5. Code node: Project ID consistency check
    6. Code node: Dependency graph check
    7. Code node: Contradiction detection
    8. Code node: Placeholder density analysis
    9. Code node: REQUIRES-OPERATIONAL-DATA gap detection
    10. Code node: Empty/sparse artifact detection
    11. Code node: Aggregate all check results
    12. OpenAI node: Narrative synthesis (from aggregated results)
    13. If node: LLM success?
        YES → Step 14
        NO  → Code node: Apply template fallback narratives → Step 14
    14. Code node: Assemble validation-report.json
    15. Code node: AJV validate report
    16. Code node: Write report
    17. Code node: Log + checkpoint
    18. Return success

  Total nodes: 18 (approximately)

Pattern D — Import Workflow (external API)
  Used by: import-shopify-data
  Node sequence:
    1. Workflow Trigger
    2. Code node: Read runtime config (shopify credential name, API version)
    3. HTTP Request: GET /shop.json (shop info)
    4. HTTP Request: GET /products.json?limit=250 (paginated)
    5. Code node: Handle Shopify pagination (loop until no next_page_info)
    6. HTTP Request: GET /collections.json?limit=250 (paginated, smart + custom)
    7. Code node: Handle Shopify pagination
    8. HTTP Request: GET /collects.json?limit=250 (product-collection associations)
    9. Code node: Assemble shopify-import.json from all responses
    10. Code node: Atomic write shopify-import.json
    11. Code node: Log + checkpoint
    12. Return success

  Total nodes: 12 (approximately, varies with pagination handling)
  Notes: Steps 4–5 may need to loop. n8n's Split In Batches node or a Code loop handles this.

Pattern E — Form Intake Workflow
  Used by: intake-store-input
  Node sequence:
    1. Form Trigger (35 intake fields)
    2. Code node: Validate required fields are present and non-empty
    3. If node: Validation passed?
       YES → Step 4
       NO  → Return validation error to form (re-display with errors)
    4. Code node: Normalize intake payload (lowercase, trim, type-cast)
    5. Code node: Create project folder at {STORE_OS_PROJECT_ROOT}/{project_id}/
    6. Code node: Create .runtime/ subdirectory
    7. Code node: Write initial checkpoint (chain started, intake complete)
    8. Code node: Append to execution log
    9. Return normalized intake payload to orchestrator

  Total nodes: 9

—

Orchestrator Implementation

orchestrate-runtime-execution is the n8n master orchestration workflow.
It calls each subworkflow using Execute Workflow nodes in sequence.

Orchestrator structure:
  1. Workflow Trigger (called by resolve-runtime-config on success)
  2. Set node: Store runtime config in workflow context
  3. Execute Workflow: intake-store-input → check result
  4. If: success? YES → continue, NO → log halt + stop
  5. Execute Workflow: import-shopify-data → check result
  6. If: success? YES → continue, NO → log halt + stop
  7. Execute Workflow: build-store-profile → check result
  8. If: success? YES → continue, NO → log halt + stop
  ... (repeat for each workflow in the chain) ...
  32. Execute Workflow: backup-project → check result
  33. Code node: Write final execution summary to execution log
  34. Return overall execution result

The If-then-continue pattern after each Execute Workflow node is the fundamental safety
mechanism. It prevents downstream workflows from running after any upstream failure.

Orchestrator error output:
  If the chain halts at any step, the orchestrator returns a structured halt record:
  {
    "status": "HALTED",
    "halted_at": "workflow_id",
    "error_code": "...",
    "message": "...",
    "last_successful_step": "workflow_id",
    "checkpoint_path": "..."
  }

—

n8n Workflow Organization

In the n8n interface, workflows should be organized into folders:

store-os/
├── _orchestration/
│   ├── resolve-runtime-config
│   └── orchestrate-runtime-execution
├── phase-01-intake/
│   ├── intake-store-input
│   ├── import-shopify-data
│   └── build-store-profile
├── phase-02-market/
│   ├── build-market-intelligence
│   ├── build-brand-positioning
│   └── build-competitor-clusters
├── phase-03-design/
│   ├── build-pattern-manifest
│   ├── build-design-system
│   └── build-homepage-strategy
├── phase-04-section-product/
│   ├── build-section-plan
│   ├── build-seo-strategy
│   └── build-product-content
├── phase-05-product-faq/
│   ├── build-product-seo
│   ├── build-product-faq
│   └── build-product-structured-data
├── phase-06-collection/
│   ├── build-collection-content
│   ├── build-collection-seo
│   ├── build-collection-navigation
│   └── build-page-content
├── phase-07-seo/
│   ├── build-page-seo
│   ├── build-faq-page
│   └── (build-seo-strategy is in phase-04 above)
├── phase-08-aeo/
│   ├── build-aeo-strategy
│   ├── build-internal-linking
│   └── build-structured-data-plan
├── phase-09-media/
│   ├── build-media-plan
│   ├── build-video-plan
│   └── build-motion-media-strategy
├── phase-10-governance/
│   ├── run-validation
│   ├── build-quality-score
│   ├── build-deployment-manifest
│   └── build-publish-decision
└── _utilities/
    └── backup-project

Note: n8n may not support nested folders depending on the version. Flat organization with
  a naming prefix (e.g., "phase-01: intake-store-input") is an acceptable alternative.

—

Credential References in n8n

In n8n workflow definitions, credential references appear as:
  { "id": "credential-id", "name": "credential-name" }

For store-os, the credential names are resolved from environment variables
(STORE_OS_OPENAI_CREDENTIAL_NAME, STORE_OS_SHOPIFY_CREDENTIAL_NAME).

In n8n's HTTP Request node using Shopify credential:
  Authentication: Header Auth
  Header Name: X-Shopify-Access-Token
  Header Value: {{ $env.STORE_OS_SHOPIFY_CREDENTIAL_VALUE }} (if using env)
  OR: Predefined Credential (n8n Shopify credential type)

In n8n's OpenAI node:
  Credential: Selected from n8n credential store by name
  Model: {{ $env.STORE_OS_LLM_MODEL }} (expression, not hardcoded)

—

Prompting Architecture for LLM Nodes

Each LLM synthesis workflow uses a consistent prompting structure.

System prompt template:
  "You are a commerce store planning assistant for store-os.
   Your role is to synthesize a structured planning artifact based on the provided inputs.
   You must:
   - Output only valid JSON that conforms to the provided schema shape.
   - Not invent facts, data, competitor names, URLs, or product details that are not in the inputs.
   - Mark any field where the correct value is unknown as '[REQUIRES-OPERATIONAL-DATA]'.
   - Mark any field requiring human authoring as '[PLACEHOLDER-REQUIRES-REVIEW]'.
   - Follow all constraints from the design system and brand positioning where applicable.
   - Stay within planning scope. Do not make publish decisions. Do not claim production readiness.
   You are generating a planning artifact, not a final production document."

User prompt structure:
  "Here are the upstream artifacts for this planning step:
   [upstream artifact 1 name]: [artifact JSON or summary]
   [upstream artifact 2 name]: [artifact JSON or summary]
   ...
   Here is the output schema shape you must conform to:
   [output schema or key fields list]
   Generate the [artifact name] planning artifact."

Context window management:
  Large upstream artifacts (e.g., shopify-import.json with many products) must be
  summarized or truncated before inclusion in the prompt.
  The Code node that assembles the prompt is responsible for this truncation.
  Truncation rules: include the first N products/collections, note the total count.
  N should be configurable per workflow (default: 10 for products, 5 for collections).

JSON mode:
  Use OpenAI's response_format: { "type": "json_object" } where supported.
  This reduces parsing failures.
  Fallback: if JSON mode is not available, parse the response and handle markdown code blocks.

—

Environment-Specific n8n Configuration

Dev environment:
  - Use sandbox Shopify store for import-shopify-data
  - Use cheaper model (STORE_OS_LLM_MODEL=gpt-4o-mini) for faster, lower-cost testing
  - Disable Wait node for manual review (or set very short timeout)
  - publish-decision.json always blocked (STORE_OS_ENV=dev enforcement)
  - Backup: optional

Staging environment:
  - Use staging Shopify store
  - Use production model
  - Enable Wait node for manual review
  - Backup: required

Production environment:
  - Use production Shopify store credentials
  - Use production model
  - Enable Wait node with 7-day timeout
  - Backup: required after every run
  - All safety checks at maximum strictness

—

Open Questions

1. Does the target n8n instance support the Execute Workflow node for subworkflow chaining?
   This is the core orchestration mechanism. Confirm it is available.

2. What version of n8n is the target? Node type availability varies by version.

3. Are there n8n execution timeout limits? Long chains (32 workflows) may approach timeout
   limits on some n8n configurations.

4. Does n8n's Code node have access to the Node.js fs module? This is required for artifact
   read/write. If not available, an alternative file access mechanism must be used.

5. How are n8n workflow IDs managed? When importing Git-defined workflows into n8n, n8n
   assigns its own internal IDs. The Execute Workflow nodes must reference these IDs.
   A workflow ID registry may be needed.

6. Should workflow imports from Git be automated (e.g., via n8n's API on each Git push)?
   Or manual? The Git-first convention (docs/n8n-conventions.md Rule 3) recommends
   controlled imports.

—

Assumptions

- n8n Execute Workflow node is available and supports passing parameters to subworkflows.
- n8n Code nodes have access to Node.js fs, path, and the ability to require AJV.
- n8n Form Trigger supports custom field types (text, select, checkbox) sufficient for
  all 35 intake fields defined in docs/n8n-intake-spec.md.
- n8n Wait node supports webhook-based resume (not just time-based wait).
- The orchestrator and all subworkflows run in the same n8n instance (not distributed).
- n8n credential store provides secure access to credential values from Code nodes
  (if needed for HTTP Request calls that don't use n8n's built-in credential node).
