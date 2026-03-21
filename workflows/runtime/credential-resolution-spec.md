Credential Resolution Specification

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — CREDENTIAL SAFETY NOTE:
This document defines HOW credentials are resolved at runtime. It does NOT contain any
credential values, API keys, tokens, secrets, passwords, or shop URLs. No actual credentials
exist in this document or anywhere in Git. Any implementation of this specification must
ensure that real credentials remain only in the n8n credential store — never in Git-tracked
files, workflow JSON definitions, documentation, scripts, or prompts.

—

Purpose

This document defines the safe runtime handling of credentials and environment configuration
for store-os. It covers:
  - Credential architecture principles
  - Named credential resolution (n8n credential store → workflow execution context)
  - Model selection (LLM model is a config value, not a hardcoded constant)
  - Environment profile definitions (dev, staging, production)
  - Credential validation at chain start (resolve-runtime-config workflow)
  - What happens when credential resolution fails

—

Credential Architecture Principles

Principle 1 — No credentials in Git
  Credentials never belong in any Git-tracked file. This includes:
  workflow JSON definitions, documentation, schemas, prompts, scripts, environment
  files committed to Git, project-specific config files, or CLAUDE.md.
  This is an absolute rule. There are no exceptions.

Principle 2 — Named credentials in n8n only
  All credentials are stored as named credentials in the n8n credential store.
  Named credentials are referenced by their n8n credential name in workflow definitions.
  The actual credential values (API keys, tokens, secrets) are managed by n8n and are
  never exposed to Git or to workflow output artifacts.

Principle 3 — Credential names are config, not constants
  The n8n credential name (e.g., "OpenAI Production", "Shopify SuppliedTech") is a
  runtime configuration value resolved at chain start by resolve-runtime-config.
  Workflow draft files reference placeholder names (OPENAI_CREDENTIAL_PLACEHOLDER,
  SHOPIFY_CREDENTIAL_PLACEHOLDER) — the actual n8n credential name is injected at runtime.

Principle 4 — Model selection is config, not hardcode
  The LLM model identifier (e.g., "gpt-4o") is a runtime configuration value stored in
  the STORE_OS_LLM_MODEL environment variable. It is never hardcoded in workflow definitions.
  This allows model upgrades without modifying workflow files.

Principle 5 — Credential validation before chain start
  All required credentials must be validated at the beginning of each execution chain run.
  If any required credential is missing or invalid, the chain halts immediately.
  Individual workflows do not validate credentials — that is the responsibility of
  resolve-runtime-config (the first workflow in every chain).

Principle 6 — Least privilege
  Each workflow should request only the credentials it needs for its specific operation.
  The Shopify credential is only needed for import-shopify-data and any other workflow
  that makes Shopify API calls. It is not passed to pure LLM synthesis workflows.

—

Required Credentials

The following named credentials must exist in the n8n credential store:

Credential 1 — OpenAI API credential
  Purpose: LLM synthesis for all build-* and run-* workflows
  n8n credential type: OpenAI API
  Referenced in workflows as: OPENAI_CREDENTIAL_PLACEHOLDER
  Actual n8n credential name: resolved at runtime via STORE_OS_OPENAI_CREDENTIAL_NAME
  Environment variable: STORE_OS_OPENAI_CREDENTIAL_NAME
  Required by: all synthesis workflows (build-market-intelligence through build-publish-decision)
  Not required by: intake-store-input, build-deployment-manifest (deterministic only),
    backup-project

Credential 2 — Shopify Admin API credential
  Purpose: Pulling store data in import-shopify-data
  n8n credential type: Shopify API (or HTTP Request with custom auth header)
  Referenced in workflows as: SHOPIFY_CREDENTIAL_PLACEHOLDER
  Actual n8n credential name: resolved at runtime via STORE_OS_SHOPIFY_CREDENTIAL_NAME
  Environment variable: STORE_OS_SHOPIFY_CREDENTIAL_NAME
  Required by: import-shopify-data
  Not required by: all other workflows (Shopify data is consumed from shopify-import.json only)

—

Environment Variables for Credential Resolution

The following environment variables must be set in the n8n instance or n8n process environment:

  STORE_OS_OPENAI_CREDENTIAL_NAME
    The exact name of the OpenAI credential as it appears in the n8n credential store.
    This name must match the credential name exactly (case-sensitive).
    Example: "OpenAI store-os"
    Must not contain the actual API key value.
    Must not be committed to Git.

  STORE_OS_SHOPIFY_CREDENTIAL_NAME
    The exact name of the Shopify credential as it appears in the n8n credential store.
    This name must match the credential name exactly (case-sensitive).
    Example: "Shopify SuppliedTech Admin"
    Must not contain the actual API key, access token, or store URL.
    Must not be committed to Git.

  STORE_OS_LLM_MODEL
    The OpenAI model identifier for LLM synthesis nodes.
    Must be a model available through the configured OpenAI credential.
    Example: gpt-4o
    This is not a secret. It is a configuration value. It may be committed to Git if
    included in a non-sensitive .env.example file for documentation purposes.

  STORE_OS_SHOPIFY_API_VERSION
    The Shopify Admin API version to use for all API calls.
    Must be pinned to a specific version (never "latest" or "unstable").
    Example: 2025-01
    Should be updated deliberately when a Shopify API version is deprecated.

—

Model Selection Policy

The LLM model used for synthesis is controlled by STORE_OS_LLM_MODEL.

Rules:
  - Default model must be capable of structured output (JSON mode or function calling).
  - The model choice affects cost, latency, and output quality. Choose deliberately.
  - The same model should be used across all synthesis workflows in a single run for
    consistency. Per-workflow model overrides are not supported in Phase 11 architecture.
  - Model must support the OpenAI chat completions API format.
  - If STORE_OS_LLM_MODEL is not set, the workflow halts — there is no default fallback model.

Rationale for no hardcoded default:
  Model capabilities change over time. A hardcoded default model in a workflow definition
  creates a silent dependency that may break or degrade without warning when model names
  change. Explicit configuration at the environment level keeps model selection visible
  and deliberate.

—

Environment Profiles

store-os defines three environment profiles. The active profile is controlled by STORE_OS_ENV.

Profile: dev
  Purpose: Local development and workflow testing
  Credential requirement: required (dev credentials may point to test/sandbox accounts)
  Schema validation: enforced
  Placeholder policy: relaxed (higher placeholder density allowed for testing)
  Publish decision: always blocked (publish is never actionable in dev)
  Backup: optional
  Checkpoint: enabled (for resume testing)
  Human review gate: skippable for isolated testing (but review boundary is still generated)

Profile: staging
  Purpose: Pre-production validation and review
  Credential requirement: required (staging credentials may point to staging Shopify stores)
  Schema validation: enforced
  Placeholder policy: strict (same thresholds as production)
  Publish decision: produced but not actionable
  Backup: required
  Checkpoint: enabled
  Human review gate: required

Profile: production
  Purpose: Real store execution
  Credential requirement: required (production credentials)
  Schema validation: enforced
  Placeholder policy: strict
  Publish decision: produced and actionable (human must explicitly act on it)
  Backup: required
  Checkpoint: enabled
  Human review gate: required
  Safety note: No workflow in the chain should automatically trigger any Shopify write
    operation. Shopify writes (theme publish, metafield update, redirect creation) are
    out of scope for Phase 11 and require separate explicit implementation.

—

Credential Resolution Workflow (resolve-runtime-config)

The resolve-runtime-config workflow is always the first workflow executed in the chain.
It performs the following steps:

Step 1 — Read environment variables
  Read: STORE_OS_OPENAI_CREDENTIAL_NAME, STORE_OS_SHOPIFY_CREDENTIAL_NAME,
    STORE_OS_LLM_MODEL, STORE_OS_ENV, STORE_OS_PROJECT_ROOT,
    STORE_OS_SHOPIFY_API_VERSION, STORE_OS_AJV_SCHEMA_PATH, STORE_OS_BACKUP_ROOT

Step 2 — Validate environment variables
  For each required variable: verify it is set and non-empty.
  For STORE_OS_ENV: verify value is one of (dev, staging, production).
  For STORE_OS_PROJECT_ROOT: verify the path exists and is writable.
  For STORE_OS_AJV_SCHEMA_PATH: verify the path exists and contains schema files.
  If any required variable is missing: halt with CONFIG_MISSING error.

Step 3 — Validate OpenAI credential exists in n8n
  Use the n8n credential validation mechanism to confirm the credential named by
  STORE_OS_OPENAI_CREDENTIAL_NAME exists in the credential store.
  Do NOT make a live API call to OpenAI at this step (avoid unnecessary cost).
  If the credential is not found: halt with CREDENTIAL_NOT_FOUND error.

Step 4 — Validate Shopify credential exists in n8n
  Use the n8n credential validation mechanism to confirm the credential named by
  STORE_OS_SHOPIFY_CREDENTIAL_NAME exists in the credential store.
  If the credential is not found: halt with CREDENTIAL_NOT_FOUND error.

Step 5 — Assemble runtime config payload
  Produce an in-memory runtime config payload containing:
    {
      "project_id": "(set by intake-store-input after this step)",
      "env": "{STORE_OS_ENV}",
      "project_root": "{STORE_OS_PROJECT_ROOT}",
      "openai_credential_name": "{STORE_OS_OPENAI_CREDENTIAL_NAME}",
      "shopify_credential_name": "{STORE_OS_SHOPIFY_CREDENTIAL_NAME}",
      "llm_model": "{STORE_OS_LLM_MODEL}",
      "shopify_api_version": "{STORE_OS_SHOPIFY_API_VERSION}",
      "ajv_schema_path": "{STORE_OS_AJV_SCHEMA_PATH}",
      "backup_root": "{STORE_OS_BACKUP_ROOT}",
      "resolved_at": "{ISO timestamp}"
    }

Step 6 — Pass runtime config to orchestrator
  The runtime config payload is passed as an in-memory object to orchestrate-runtime-execution.
  It is NOT written to disk (it contains the credential name, which though not a secret,
  should not be unnecessarily persisted in plain text alongside artifacts).

—

Credential Failure Handling

If credential resolution fails at any point:

For CONFIG_MISSING (environment variable not set):
  Action: Halt immediately
  Error code: CONFIG_MISSING
  Message: "Required environment variable {VAR_NAME} is not set. Check n8n process environment."
  No retry. This is a configuration error that requires human intervention.

For CREDENTIAL_NOT_FOUND (credential name not in n8n):
  Action: Halt immediately
  Error code: CREDENTIAL_NOT_FOUND
  Message: "Credential '{CREDENTIAL_NAME}' not found in n8n credential store.
    Verify that the credential exists and the name matches exactly."
  No retry. This is a configuration error that requires human intervention.

For CREDENTIAL_AUTH_FAILURE (credential exists but API call fails):
  Context: This error occurs at import-shopify-data or at the first OpenAI API call.
  Action: Halt the affected workflow
  Error code: CREDENTIAL_AUTH_FAILURE
  Message: "Credential '{CREDENTIAL_NAME}' authentication failed. Verify the credential
    values are current and the API access has not been revoked."
  Retry: 1 retry (in case of transient auth issue), then halt.

—

Shopify API Version Pinning

Shopify deprecates API versions on a rolling schedule.
STORE_OS_SHOPIFY_API_VERSION must be set to a specific, currently-supported version.

Rules:
  - Never use "unstable" or "latest" as the API version.
  - When Shopify announces deprecation of a version, update STORE_OS_SHOPIFY_API_VERSION
    before the deprecation date and test the import-shopify-data workflow with the new version.
  - The API version should be updated explicitly and documented in Git commit messages.
  - A mismatched or deprecated API version will cause import-shopify-data to fail.
    This is a breaking change that requires human intervention.

—

What Credentials Are NOT Needed

The following credentials or secrets are explicitly NOT part of the Phase 11 architecture:

  - GitHub credentials: Git operations are performed outside n8n (manual or CI/CD).
  - Shopify write credentials: No workflow writes to Shopify in Phase 11.
  - Shopify theme API access: Theme deployment is out of scope.
  - Email or notification credentials: No automated notifications in Phase 11.
  - Cloud storage credentials: Backup uses local filesystem in Phase 11.

Future phases that add Shopify write operations or cloud backup will require expanding
this credential spec.

—

Open Questions

1. Does n8n's credential validation mechanism support checking if a credential exists
   without making an API call? If not, a lightweight API call (e.g., OpenAI models list)
   may be needed to verify connectivity. This should be tested before implementing
   resolve-runtime-config.

2. Should the Shopify credential include the shop domain as part of the credential, or
   should the shop domain be a separate environment variable? Different n8n Shopify
   credential configurations handle this differently.

3. Is there a need for per-project credential isolation (i.e., different Shopify stores
   have different credentials per project)? If so, the runtime config must support
   per-project credential name overrides.

4. Should STORE_OS_LLM_MODEL support a fallback chain (e.g., try gpt-4o, fall back to
   gpt-4o-mini if the primary model is unavailable)? This adds resilience but also
   changes output quality unpredictably.

—

Assumptions

- n8n's credential store provides secure encrypted storage for API keys and tokens.
- n8n exposes a mechanism to reference credentials by name in Code nodes and HTTP Request nodes.
- The n8n instance is not shared between projects that have different Shopify store credentials
  (or credential name overrides are implemented per the open question above).
- STORE_OS_OPENAI_CREDENTIAL_NAME and STORE_OS_SHOPIFY_CREDENTIAL_NAME are readable from the
  n8n process environment or from n8n's built-in environment variable settings.
- No credential value (not even a partial token) is ever written to execution logs,
  artifact files, or the .runtime/ directory.
