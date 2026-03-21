Validation Execution Specification

Status: draft runtime architecture
Format: store-os runtime spec
Version: 1.0
Phase: Phase 11 — Runtime / Execution Layer

IMPORTANT — VALIDATION IS PLANNED LOGIC, NOT EXECUTED LOGIC:
This document converts the planned validation logic defined in workflows/subflows/run-validation.json
into a runtime-capable execution architecture. It defines HOW validation checks are executed
at runtime, not merely WHAT should be checked. No actual validation has been run against any
real artifact. No real schema validators have been executed. No production system has been
queried. All specifications here are implementation-grade planning.

IMPORTANT — VALIDATION IS CONSERVATIVE BY DESIGN:
When in doubt, flag. When a check cannot be performed due to missing dependencies, mark it as
skipped — not passed. A skipped check is not a passing check. Validation favors false positives
(over-flagging) over false negatives (under-flagging). The human reviewer resolves ambiguity.

—

Purpose

This document defines the runtime execution architecture for the run-validation workflow.
It covers:
  - AJV schema validation execution model
  - File existence check implementation
  - Dependency graph check implementation
  - Contradiction detection implementation
  - Placeholder density check implementation
  - Manifest generation
  - Check result aggregation
  - LLM synthesis boundary (LLM for narrative only, not for pass/fail logic)
  - Validation report assembly

—

Validation Architecture Overview

The run-validation workflow executes in the following stages:

Stage 1 — Artifact presence sweep
  Deterministic. Code node. No LLM.
  Enumerate all expected artifacts. Record present/absent for each.

Stage 2 — Schema conformance validation (AJV)
  Deterministic. Code node. No LLM.
  For each present artifact, run AJV validation against its schema.
  Record conformance results per artifact.

Stage 3 — Project-ID consistency check
  Deterministic. Code node. No LLM.
  Verify that project_id is consistent across all present artifacts.

Stage 4 — Dependency graph check
  Deterministic. Code node. No LLM.
  Verify that for each artifact, all of its required upstream artifacts are present.
  Cross-reference with the dependency graph in artifact-io-spec.md.

Stage 5 — Contradiction detection
  Deterministic. Code node. No LLM.
  Run specific cross-artifact field comparison checks.
  Record contradiction findings per check.

Stage 6 — Placeholder density analysis
  Deterministic. Code node. No LLM.
  Scan each artifact for unresolved placeholder tokens.
  Compute placeholder density per artifact and overall.

Stage 7 — REQUIRES-OPERATIONAL-DATA gap detection
  Deterministic. Code node. No LLM.
  Scan each artifact for REQUIRES-OPERATIONAL-DATA markers.
  Record count and location per artifact.

Stage 8 — Empty and sparse artifact detection
  Deterministic. Code node. No LLM.
  Check for artifacts that are structurally present but contain minimal content.

Stage 9 — LLM narrative synthesis
  LLM node. Uses OPENAI_CREDENTIAL.
  Synthesizes human-readable check descriptions, severity rationales, and recommended
  actions from the deterministic check results in Stages 1–8.
  The LLM does NOT make pass/fail decisions. All pass/fail is determined in Stages 1–8.
  The LLM only produces narrative descriptions of what the deterministic results mean.

Stage 10 — Validation report assembly
  Code node. No LLM.
  Assembles all check results and LLM narratives into a structured validation-report.json.
  Validates the report against schemas/validation-report.schema.json before writing.

—

Stage 1 — Artifact Presence Sweep

Implementation: n8n Code node (JavaScript)
Input: project_id, project_root (from runtime config)
Output: presence_map object

Logic:
```
const artifacts = [
  "store-profile.json",
  "market-intelligence.json",
  "brand-positioning.json",
  "competitor-cluster.json",
  "pattern-manifest.json",
  "design-system.json",
  "homepage-strategy.json",
  "section-library.json",
  "seo-strategy.json",
  "aeo-strategy.json",
  "product-content.json",
  "product-seo.json",
  "product-faq.json",
  "product-structured-data.json",
  "collection-content.json",
  "collection-seo.json",
  "collection-navigation.json",
  "page-content.json",
  "page-seo.json",
  "faq-page.json",
  "internal-linking.json",
  "structured-data-plan.json",
  "media-plan.json",
  "video-plan.json",
  "motion-media-strategy.json",
  "shopify-import.json"
];

const presence_map = {};
for (const artifact of artifacts) {
  const path = `${project_root}/${project_id}/${artifact}`;
  presence_map[artifact] = {
    expected_path: path,
    present: fs.existsSync(path),
    check_id: `PRESENCE_${artifact.replace('.json','').toUpperCase().replace(/-/g,'_')}`,
    severity: "critical"  // all presence checks are critical
  };
}
// Special: check section-instances/ directory
presence_map["section-instances/"] = {
  expected_path: `${project_root}/${project_id}/section-instances/`,
  present: fs.existsSync(...) && fs.readdirSync(...).length > 0,
  check_id: "PRESENCE_SECTION_INSTANCES",
  severity: "critical"
};
```

Check result:
  Each artifact: PASS (present) or FAIL (absent)
  Absent required artifacts are CRITICAL severity.
  Absent optional artifacts are WARNING severity.
  Required vs. optional classification per artifact:
    Required (CRITICAL if absent): store-profile, market-intelligence, brand-positioning,
      competitor-cluster, pattern-manifest, design-system, homepage-strategy, section-library,
      section-instances/, seo-strategy, aeo-strategy, product-content, product-seo,
      product-faq, product-structured-data, collection-content, collection-seo,
      collection-navigation, page-content, page-seo, faq-page, internal-linking,
      structured-data-plan, media-plan, video-plan, motion-media-strategy
    Required (HIGH if absent): shopify-import

—

Stage 2 — AJV Schema Conformance Validation

Implementation: n8n Code node (JavaScript)
Input: presence_map (from Stage 1), project_root, ajv_schema_path
Output: schema_results object

AJV version: Use AJV 6 for JSON Schema draft-07 compatibility with existing schemas.
  Confirm schema $schema declarations before finalizing version choice.

Implementation pattern:
```
const Ajv = require('ajv');  // bundled with n8n Code node environment
const ajv = new Ajv({ allErrors: true });

for (const [artifact_name, presence] of Object.entries(presence_map)) {
  if (!presence.present) {
    schema_results[artifact_name] = { status: "SKIPPED", reason: "Artifact not present" };
    continue;
  }

  const schema_name = artifact_name.replace('.json', '.schema.json');
  const schema_path = `${ajv_schema_path}/${schema_name}`;

  if (!fs.existsSync(schema_path)) {
    schema_results[artifact_name] = { status: "SKIPPED", reason: "Schema file not found" };
    continue;
  }

  const schema = JSON.parse(fs.readFileSync(schema_path, 'utf8'));
  const artifact = JSON.parse(fs.readFileSync(presence.expected_path, 'utf8'));
  const validate = ajv.compile(schema);
  const valid = validate(artifact);

  schema_results[artifact_name] = {
    status: valid ? "PASS" : "FAIL",
    errors: valid ? [] : validate.errors,
    check_id: `SCHEMA_${artifact_name.replace('.json','').toUpperCase().replace(/-/g,'_')}`,
    severity: valid ? "none" : "high"
  };
}
```

Schema not found behavior:
  If a schema file does not exist for an artifact, the check is marked SKIPPED (not PASSED).
  Schema not found is a gap in the validation system, not a pass.

Schema validation failure severity:
  CRITICAL: store-profile, design-system, validation-report (foundational artifacts)
  HIGH: all other planning artifacts
  Severity is escalated to CRITICAL if the failing artifact is a direct input to run-validation,
  build-quality-score, or build-publish-decision.

AJV error output format:
  All AJV errors are included in the check result as an array.
  Each error includes: instancePath, schemaPath, keyword, message.
  This is used by Stage 9 (LLM narrative) to produce human-readable descriptions.

—

Stage 3 — Project ID Consistency Check

Implementation: n8n Code node (JavaScript)
Input: all present artifact JSON objects, runtime project_id
Output: project_id_consistency_result

Logic:
  For each present artifact that has a project_id field at the root level:
    Compare artifact.project_id with runtime project_id.
    If they do not match: record FAIL with both values.

Check result:
  PASS: all present artifacts with project_id field match runtime project_id
  FAIL: any mismatch found
  Severity: CRITICAL (cross-project contamination is a data integrity issue)

—

Stage 4 — Dependency Graph Check

Implementation: n8n Code node (JavaScript)
Input: presence_map (from Stage 1)
Output: dependency_results object

The dependency graph is the artifact-to-artifact dependency list from artifact-io-spec.md.
This is encoded as a static data structure in the Code node.

Logic for each artifact:
  For each artifact that is present, check that all required upstream artifacts are also present.
  If a required upstream is absent: record FAIL for the dependency check.

Example check:
  brand-positioning.json requires: store-profile.json, market-intelligence.json
  If brand-positioning.json is present but market-intelligence.json is absent:
    Record DEP_FAIL: "brand-positioning.json present but market-intelligence.json (required upstream) is absent"

Check result:
  PASS: all dependencies of present artifacts are also present
  FAIL: any dependency gap found
  Severity: HIGH (dependency gaps indicate workflow execution order violations)
  Note: If an artifact is absent, its dependency check is SKIPPED (can't check deps of absent artifact).

—

Stage 5 — Contradiction Detection

Implementation: n8n Code node (JavaScript)
Input: all present artifact JSON objects
Output: contradiction_results object

Contradiction checks are specific cross-artifact field comparisons.
They are defined as a static list of check rules.

Check rules:

CONTR_BRAND_ROLE_DS_MATCH
  Compare: brand-positioning.json .brand_role vs. design-system.json .brand_role
  Rule: Design system brand_role must be consistent with brand-positioning brand_role.
    Refinements (more specific in design-system) are acceptable.
    Direct contradictions are FAIL.
  Severity: HIGH
  Skipped if: either artifact is absent.

CONTR_FORBIDDEN_IMPRESSIONS_REVERSAL
  Compare: brand-positioning.json .forbidden_impressions vs. design-system.json .forbidden_impressions
  Rule: design-system must not allow impressions that brand-positioning forbids.
    The design-system may ADD to the forbidden list but must not REMOVE from it.
  Severity: MEDIUM
  Skipped if: either artifact is absent.

CONTR_MOTION_CEILING
  Compare: design-system.json .motion_strategy ceilings vs. motion-media-strategy.json .motion_policy values
  Rule: motion-media-strategy motion_policy values must not exceed design-system.motion_strategy ceilings.
  Severity: CRITICAL (ceiling violation)
  Skipped if: either artifact is absent.

CONTR_PERFORMANCE_CEILING
  Compare: design-system.json .performance_guardrails vs. media-plan.json and video-plan.json performance fields
  Rule: media-plan and video-plan must not exceed design-system performance guardrails.
  Severity: CRITICAL
  Skipped if: any relevant artifact is absent.

CONTR_HOMEPAGE_SECTION_ALIGNMENT
  Compare: homepage-strategy.json .section_sequence vs. section-instances/ file list
  Rule: Every section type listed in homepage-strategy.section_sequence must have a corresponding
    section instance file in section-instances/.
  Severity: HIGH
  Skipped if: either homepage-strategy.json or section-instances/ is absent.

CONTR_SEO_AEO_VERTICAL_ALIGNMENT
  Compare: seo-strategy.json .target_vertical or context vs. aeo-strategy.json .target_context
  Rule: SEO strategy and AEO strategy must reference the same market vertical and target context.
  Severity: MEDIUM
  Skipped if: either artifact is absent.

CONTR_MEDIA_MOTION_SCOPE_BOUNDARY
  Compare: media-plan.json scope description vs. video-plan.json scope description
  Rule: media-plan must not include video asset slots. video-plan must not include static image slots.
    Cross-scope contamination produces a WARNING (not a blocking FAIL).
  Severity: MEDIUM
  Skipped if: either artifact is absent.

How contradiction detection works (implementation):
  Each contradiction check is a function that:
    1. Checks if required artifacts are present (if not, returns SKIPPED)
    2. Reads the relevant fields from each artifact
    3. Applies the rule logic (comparison, threshold check, set containment)
    4. Returns PASS, FAIL, WARNING, or SKIPPED with a machine-readable reason
  All check logic is deterministic. No LLM is involved in determining pass/fail.

—

Stage 6 — Placeholder Density Analysis

Implementation: n8n Code node (JavaScript)
Input: all present artifact JSON objects (as raw strings)
Output: placeholder_density_results object

Placeholder token patterns to detect:
  - "[PLACEHOLDER]" — generic placeholder
  - "[REQUIRES-REVIEW]" — content requiring human review
  - "[PLACEHOLDER-REQUIRES-REVIEW]" — content placeholder pending human authoring
  - "[REQUIRES-OPERATIONAL-DATA]" — fact that must be supplied by the store operator
  - "REQUIRES-OPERATIONAL-DATA" — text form of the same marker
  - "[TBD]" — to be determined
  - "[TODO]" — explicit TODO markers

Implementation:
```
function countPlaceholders(artifactString) {
  const patterns = [
    /\[PLACEHOLDER\]/gi,
    /\[REQUIRES-REVIEW\]/gi,
    /\[PLACEHOLDER-REQUIRES-REVIEW\]/gi,
    /\[REQUIRES-OPERATIONAL-DATA\]/gi,
    /REQUIRES-OPERATIONAL-DATA/g,
    /\[TBD\]/gi,
    /\[TODO\]/gi
  ];
  let total = 0;
  for (const pattern of patterns) {
    const matches = artifactString.match(pattern);
    if (matches) total += matches.length;
  }
  return total;
}

function computeDensity(artifactString, count) {
  // Density = placeholder count / total field count (approximated by JSON key count)
  const keyCount = (artifactString.match(/\"[^\"]+\"\s*:/g) || []).length;
  return keyCount > 0 ? count / keyCount : 0;
}
```

Thresholds:
  GREEN (informational): 0 placeholders
  YELLOW (warning): 1–5 placeholders, density < 0.10 (less than 10% of fields)
  ORANGE (high): 6–15 placeholders, density 0.10–0.25
  RED (blocking): >15 placeholders OR density > 0.25 (more than 25% of fields are placeholders)

Severity mapping:
  GREEN → PASS, no action
  YELLOW → WARNING, informational
  ORANGE → WARNING (review recommended), non-blocking
  RED → FAIL, blocking (this artifact is not considered implementation-ready)

Note: REQUIRES-OPERATIONAL-DATA placeholders are always flagged regardless of density.
They represent facts only the store operator can provide. High counts of these markers
are a signal that operator input is incomplete — not a code defect.

—

Stage 7 — REQUIRES-OPERATIONAL-DATA Gap Detection

Implementation: n8n Code node (JavaScript)
Input: all present artifact JSON objects (as raw strings)
Output: operational_data_gaps object

Logic: Same scan as Stage 6 but focused exclusively on REQUIRES-OPERATIONAL-DATA markers.
For each artifact:
  Count all REQUIRES-OPERATIONAL-DATA occurrences.
  Record the count and flag the artifact as requiring operator input.

Output format per artifact:
  {
    "artifact": "product-content.json",
    "requires_operational_data_count": 7,
    "status": "REQUIRES-OPERATOR-INPUT",
    "check_id": "OPERATIONAL_DATA_product-content",
    "severity": "medium"
  }

Threshold:
  0 markers: PASS
  1+ markers: Flag as REQUIRES-OPERATOR-INPUT (warning, not blocking unless count is high)
  >10 markers in a single artifact: escalate to HIGH severity

—

Stage 8 — Empty and Sparse Artifact Detection

Implementation: n8n Code node (JavaScript)
Input: all present artifact JSON objects
Output: sparse_artifact_results object

Checks:
  EMPTY_CHECK: Is the artifact JSON an empty object ({}) or an object with only metadata?
    If yes: CRITICAL (a present but empty artifact is worse than an absent one)

  SPARSE_CHECK: Does the artifact have fewer than the minimum expected fields for its type?
    Define minimum expected field counts per artifact type as a static data structure.
    Example: store-profile.json must have at least: project_id, store_id, vertical,
      primary_market, primary_language, primary_currency
    If any required field is null or undefined: record SPARSE failure per field.

  ARRAY_EMPTY_CHECK: For artifacts that must contain non-empty arrays (e.g., product-content
    should have at least one product, section-instances/ should have at least one instance):
    Check that the relevant arrays are non-empty.

Severity:
  Empty artifact: CRITICAL
  Missing required field: HIGH
  Empty required array: HIGH

—

Stage 9 — LLM Narrative Synthesis

Implementation: n8n OpenAI node (using OPENAI_CREDENTIAL)
Input: aggregated check results from Stages 1–8 (deterministic machine-readable results)
Output: narrative_descriptions object (check_id → human-readable description)

Purpose:
  The LLM receives the machine-readable check results and synthesizes:
    - A plain-English description of what each check found
    - A rationale for the severity classification
    - A recommended action for the human reviewer
    - An overall summary of the validation state

The LLM does NOT:
  - Override any pass/fail determination made by Stages 1–8
  - Invent check results
  - Reclassify severity levels
  - Produce new check IDs not already generated by Stages 1–8
  - Access any files, APIs, or systems

Prompt structure:
  System: "You are a store planning validation assistant. You receive the results of
    deterministic validation checks and synthesize human-readable descriptions.
    You do not override check results. You do not produce pass/fail decisions.
    You produce narrative descriptions and recommended actions only."

  User: "Here are the validation check results: {JSON results from Stages 1-8}.
    For each check, produce: (1) a plain-English description of what was found,
    (2) why this severity classification was assigned, (3) what the human reviewer
    should do to resolve this if it is a failure or warning."

Output format: JSON object mapping check_id → { description, severity_rationale, recommended_action }

Fallback: If LLM synthesis fails after 3 retries:
  Use template-based fallback descriptions (no LLM).
  Record LLM_SYNTHESIS_UNAVAILABLE in the validation report.
  The report is still produced — without LLM narratives.
  Human reviewer receives raw check results without narrative enrichment.

—

Stage 10 — Validation Report Assembly

Implementation: n8n Code node (JavaScript)
Input: all stage results, LLM narrative output
Output: validation-report.json

Assembly:
  Construct a validation report conforming to schemas/validation-report.schema.json.
  Include:
    - project_id
    - validation run timestamp
    - overall_status: determined by the presence of any CRITICAL or HIGH failures
      PASS: no CRITICAL, no HIGH failures
      WARNING: no CRITICAL failures, one or more HIGH failures
      FAIL: one or more CRITICAL failures
    - blocking_checks: list of checks that are FAIL with severity CRITICAL or HIGH
    - warning_checks: list of checks that are WARNING or FAIL with severity MEDIUM or LOW
    - skipped_checks: list of checks that could not run due to missing dependencies
    - check_results: full list of all checks with their machine-readable results
    - narrative_descriptions: LLM-produced descriptions per check (or fallback templates)
    - summary: LLM-produced overall summary (or fallback)

Write contract: The assembled report must pass AJV validation against
  schemas/validation-report.schema.json before being written to
  projects/{project_id}/validation-report.json.

If AJV validation of the report itself fails: write to quarantine, halt, require human review.

—

Validation Report Overall Status Logic

FAIL (any of):
  - PRESENCE check failed for any required artifact (CRITICAL)
  - SCHEMA check failed for any artifact at CRITICAL severity
  - CONTR_MOTION_CEILING check failed
  - CONTR_PERFORMANCE_CEILING check failed
  - Placeholder density RED threshold exceeded for any required artifact
  - Empty artifact detected (any artifact is {}  or near-empty)
  - project_id consistency failure

WARNING (none of the above, but any of):
  - PRESENCE check skipped for optional artifacts
  - SCHEMA check failed for artifacts at HIGH severity
  - Contradiction checks: CONTR_BRAND_ROLE_DS_MATCH, CONTR_FORBIDDEN_IMPRESSIONS_REVERSAL,
    CONTR_HOMEPAGE_SECTION_ALIGNMENT at FAIL
  - Placeholder density ORANGE threshold
  - REQUIRES-OPERATIONAL-DATA gaps

PASS:
  - No CRITICAL or HIGH check failures

Note: PASS does not mean the artifacts are of high quality. It means the artifacts meet the
minimum structural and consistency requirements to proceed to quality scoring and deployment
manifest generation. Quality scoring (build-quality-score) provides a richer readiness signal.

—

AJV Runtime Setup

AJV version: 6 (for JSON Schema draft-07 compatibility)
  Confirm by checking $schema declarations in existing schema files.
  If schemas use $schema: "http://json-schema.org/draft-07/schema#", use AJV 6.
  If schemas use $schema: "https://json-schema.org/draft/2020-12/schema", use AJV 8.

Schema preloading:
  Load all schema files from STORE_OS_AJV_SCHEMA_PATH at the start of the validation run.
  Cache compiled validators for the duration of the run (do not recompile per artifact).

AJV configuration:
  allErrors: true (report all errors, not just the first one)
  strict: false (allow additional properties unless schema explicitly disallows them)
  coerceTypes: false (do not coerce types — type mismatches should be explicit failures)

n8n Code node AJV availability:
  n8n Code nodes have access to a limited set of npm packages.
  AJV must either be bundled with the n8n installation or available in the Code node context.
  If AJV is not available in the Code node context:
    Alternative: Use a Function node with a bundled AJV (via n8n community node) or
    Alternative: Make an HTTP call to a local validation microservice.
    This is an open question that must be resolved during implementation.

—

Open Questions

1. Is AJV available in n8n Code nodes by default, or does it need to be installed?
   The answer determines whether validation runs natively in Code nodes or requires
   an external validation service.

2. Should the validation run be re-triggerable independently of the full chain? If a
   specific artifact is edited, the user may want to re-run validation without re-running
   all upstream workflows. This requires a standalone validation trigger.

3. Should the contradiction detection rules be externalized into a configuration file
   (contradiction-rules.json) rather than hardcoded in the Code node? This would allow
   rules to be updated without modifying the workflow definition.

4. How should the validation report handle artifacts that were intentionally skipped by
   the operator (e.g., video-plan.json is not needed for a text-only store)?
   A skip-list in the intake form would prevent false CRITICAL failures.

—

Assumptions

- AJV is available or can be made available in the n8n Code node execution context.
- Schema files in schemas/ directory are loadable from the path defined by STORE_OS_AJV_SCHEMA_PATH.
- The validation run operates only on planning artifact files in the project folder.
  It does not access Shopify APIs, does not access the internet, does not call any external service.
- LLM narrative synthesis is an enrichment layer. The validation report is valid without it.
- The overall_status field in the report is determined deterministically by the check results.
  The LLM cannot change the overall_status.
