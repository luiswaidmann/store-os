#!/usr/bin/env node
/**
 * patch-orchestrator-safe-refs.js
 *
 * Fixes Phase 7B.3 Complete to safely reference nodes that may not have been
 * executed (e.g., Run build-image-grounding when bypassed).
 */

const fs = require('fs');
const path = require('path');

const ORCH_PATH = path.resolve(__dirname, '..', 'workflows', 'n8n', 'orchestrate-phase1.n8n.json');
const wf = JSON.parse(fs.readFileSync(ORCH_PATH, 'utf8'));

const terminalNode = wf.nodes.find(n => n.name === 'Phase 7B.3 Complete');
const code = terminalNode.parameters.jsCode;

// Replace the unsafe grounding reference with a safe try/catch version
const oldLine = "const groundOut   = $('Run build-image-grounding').first().json;";
const newLine = "let groundOut = null;\ntry { groundOut = $('Run build-image-grounding').first().json; } catch (_e) { /* grounding was bypassed — no images */ }";

if (code.includes(oldLine)) {
  terminalNode.parameters.jsCode = code.replace(oldLine, newLine);
  console.log('Fixed: wrapped Run build-image-grounding reference in try/catch');
} else {
  console.log('WARNING: Could not find the grounding reference line to fix');
  console.log('Searching for alternatives...');
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('groundOut') || line.includes('image-grounding')) {
      console.log(`  Line ${i}: ${line.trim()}`);
    }
  });
}

fs.writeFileSync(ORCH_PATH, JSON.stringify(wf, null, 2));
console.log('Wrote updated orchestrator');
