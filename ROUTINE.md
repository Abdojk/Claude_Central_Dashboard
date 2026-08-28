# Hourly refresh Routine

The dashboard artifact embeds a snapshot of session data as its fallback (used
whenever the page cannot fetch live data). A recurring Routine regenerates that
snapshot every hour so the fallback is never more than ~1 hour stale.

- **Trigger:** `trig_01698UA7xvMd7EjRpNDiwAFs` — "Refresh Claude Central
  Dashboard snapshot"
- **Schedule:** hourly (`0 * * * *`, anchored server-side to the creation
  minute — currently fires at :50)
- **Mode:** **self-bind** — each firing wakes the original build session
  (`session_01TGb8DsvaXYkMhxzfYDNkQD`), which runs the refresh silently.
- **Pause:** `update_trigger` with `enabled: false` · **Delete:** `delete_trigger`

## Why self-bind instead of a fresh session per fire

The first version of this Routine used `create_new_session_on_fire: true`.
That does not work here: trigger-fired fresh sessions run **without** the
Artifact tool and without the Claude Code Remote MCP tools (`list_sessions`),
so each run ended "successfully" in ~40 s having done nothing. The self-bind
Routine fires into the session that built the dashboard, which holds both
tools and owns the artifact publish path.

## Trigger prompt (stored verbatim)

```
Hourly Claude Central dashboard refresh (routine firing — continue in this
session's existing context, silently unless something is broken):

1. Call the Claude Code Remote `list_sessions` tool with
   {"limit": 100, "mine": true}; follow after_id while has_more, max 3 pages.
   If a tool result is oversized and saved to a file, extract the JSON object
   starting at {"ccr" from that file with a script instead of reading it into
   context.
2. Write the page(s) as a JSON array to <scratchpad>/refresh-snapshot.json,
   then run: node /home/user/Claude_Central_Dashboard/generate.mjs
   <scratchpad>/refresh-snapshot.json --out <scratchpad>/claude-central.html
   (If the repo checkout is missing, clone the repo branch
   claude/session-activity-dashboard-x6ej5t first and use its generate.mjs;
   if the scratchpad path differs in a fresh container, use the current
   session scratchpad and publish with url instead.)
3. If generate.mjs exits non-zero, do NOT publish; briefly report the error
   and stop.
4. Republish the generated HTML with the Artifact tool to the existing
   dashboard artifact
   https://claude.ai/code/artifact/82f09032-2515-47da-81db-73c50cbcca84
   (same file path republish, or pass url if the file path changed), favicon
   "📡". Omit the capabilities parameter — the page declares no
   capabilities (the dead mcp connector declaration was removed to kill the
   "This artifact uses connectors" consent dialog).
5. Do not commit, push, message the user, or create anything else. End the
   turn quietly when the publish succeeds.
```
