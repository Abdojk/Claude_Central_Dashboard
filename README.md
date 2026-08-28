# Claude Central Dashboard

A single dashboard page showing all of your Claude agentic sessions — Claude
Code launched from claude.ai web, the desktop app, or the CLI, plus Claude
Cowork sessions — grouped by what matters:

1. **Needs your input** — sessions blocked on a question, shown with the exact
   thing they are waiting on
2. **Working now** — sessions actively running
3. **Review ready** — finished work waiting for your review
4. **Recent history** — completed/idle sessions from the last 30 days
   (collapsed; archived sessions behind a further toggle)

**Scope:** the dashboard covers *agentic* sessions returned by the Claude Code
Remote `list_sessions` API. Regular claude.ai chat conversations have no
session API and are not shown.

**Dashboard URL:** https://claude.ai/code/artifact/82f09032-2515-47da-81db-73c50cbcca84

## How it works

- `dashboard.template.html` is the entire page (inline CSS + JS). It renders
  from a snapshot embedded between `/*SNAPSHOT_START*/ … /*SNAPSHOT_END*/`
  markers in the `<script type="application/json" id="snapshot">` block, with
  an honest "snapshot · <timestamp>" freshness chip. The hourly Routine keeps
  that snapshot at most ~1 hour stale. (An earlier version also declared an
  `mcp` connector capability for live in-page refresh, but "Claude Code
  Remote" is not a claude.ai connector, so live mode could never activate —
  it only produced a needless "This artifact uses connectors" consent dialog
  and was removed.)
- `generate.mjs` injects a fresh snapshot into the template
  (`node generate.mjs snapshot.json --out index.html`). It exits non-zero on
  any problem so automation never publishes a broken page.
- `snapshot.sample.json` is invented fixture data covering every status branch
  (needs-input override, running, review-ready, idle, archived, Cowork tags,
  disconnected-while-running, out-of-window). Use it for local testing:
  `node generate.mjs snapshot.sample.json --out /tmp/index.html`. Append
  `?selftest=1` when opening the page to run the built-in classification
  self-test.
- `ROUTINE.md` holds the verbatim prompt of the hourly refresh Routine that
  regenerates the snapshot and republishes the artifact at the same URL.

## Status classification

First match wins:

0. `session_status` ARCHIVED → **History** (an archived session can't be waiting on you)
1. `post_turn_summary.status_category == "need_input"` → **Needs your input**
   (overrides everything — a session can be bucketed "working" yet blocked on you)
2. `status_bucket` WORKING or `session_status` RUNNING → **Working**
3. `status_bucket` REVIEW_READY or category `review_ready` → **Review ready**
4. everything else (idle / completed / archived) → **History**

Needs-input and working sessions always show regardless of age; review-ready
and history are windowed to the last 30 days so stale sessions don't swamp
the page.

Cowork sessions are detected client-side by their `cowork-*` / `product:cowork`
tags (the server-side tags filter is not available to all callers). Session
links use `https://claude.ai/code/<session_id>` — best effort; Cowork-tagged
sessions may open in a different surface.
