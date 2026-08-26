#!/usr/bin/env node
// Inject a fresh sessions snapshot into dashboard.template.html.
//
// Usage: node generate.mjs <snapshot.json> [--out <path>]
//   <snapshot.json> may be: a raw list_sessions result ({ccr:{data:[...]}} or
//   {data:[...]}), an array of such page envelopes, or a bare array of sessions.
//   Output goes to --out, or stdout when omitted.
// Exits non-zero when the template markers are missing or the snapshot is
// not valid JSON — callers (the refresh Routine) must not publish on failure.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = /\/\*SNAPSHOT_START\*\/[\s\S]*?\/\*SNAPSHOT_END\*\//;

function fail(msg) {
  console.error("generate.mjs: " + msg);
  process.exit(1);
}

function flattenSessions(payload) {
  if (payload == null) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((item) =>
      item && (item.ccr || item.data) ? flattenSessions(item) : item ? [item] : []
    );
  }
  if (payload.ccr && Array.isArray(payload.ccr.data)) return payload.ccr.data;
  if (Array.isArray(payload.data)) return payload.data;
  fail("unrecognized snapshot shape: expected {ccr:{data:[...]}}, {data:[...]}, or an array");
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? args[outIdx + 1] : null;
if (outIdx !== -1) args.splice(outIdx, 2);
const inPath = args[0];
if (!inPath) fail("usage: node generate.mjs <snapshot.json> [--out <path>]");

let parsed;
try {
  parsed = JSON.parse(readFileSync(inPath, "utf8"));
} catch (e) {
  fail("cannot read/parse " + inPath + ": " + e.message);
}

const sessions = flattenSessions(parsed);
// Dedupe by id, newest updated_at wins.
const byId = new Map();
for (const s of sessions) {
  if (!s || !s.id) continue;
  const prev = byId.get(s.id);
  if (!prev || Date.parse(s.updated_at || 0) >= Date.parse(prev.updated_at || 0)) {
    byId.set(s.id, s);
  }
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  sessions: [...byId.values()],
};
// <-escape so "</script" can never terminate the inline JSON block.
const json = JSON.stringify(snapshot).replace(/</g, "\\u003c");

const templatePath = join(dirname(fileURLToPath(import.meta.url)), "dashboard.template.html");
const template = readFileSync(templatePath, "utf8");
if (!MARKER.test(template)) fail("SNAPSHOT_START/END markers not found in " + templatePath);

const html = template.replace(MARKER, "/*SNAPSHOT_START*/" + json + "/*SNAPSHOT_END*/");
try {
  JSON.parse(html.match(MARKER)[0].slice("/*SNAPSHOT_START*/".length, -"/*SNAPSHOT_END*/".length));
} catch (e) {
  fail("post-injection validation failed: " + e.message);
}

if (outPath) {
  writeFileSync(outPath, html);
  console.error(`generate.mjs: wrote ${outPath} (${byId.size} sessions, generatedAt ${snapshot.generatedAt})`);
} else {
  process.stdout.write(html);
}
