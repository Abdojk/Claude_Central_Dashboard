# Hourly refresh Routine

The dashboard artifact embeds a snapshot of session data as its fallback (used
whenever the page cannot fetch live data). A recurring Routine regenerates that
snapshot every hour so the fallback is never more than ~1 hour stale.

- **Schedule:** hourly (`0 * * * *`, anchored server-side to the creation minute)
- **Mode:** fresh session per fire, no completion notifications
- **Pause:** `update_trigger` with `enabled: false` · **Delete:** `delete_trigger`

## Trigger prompt (stored verbatim)

```
Refresh the Claude Central dashboard artifact. Steps, in order:

1. Clone https://github.com/Abdojk/Claude_Central_Dashboard and check out the
   branch claude/session-activity-dashboard-x6ej5t.
2. Call the Claude Code Remote MCP tool `list_sessions` with
   {"limit": 100, "mine": true}. While the response reports has_more and you
   have fetched fewer than 3 pages total, call it again adding
   "after_id": <last_id from the previous response>. Save the raw page
   responses concatenated as a JSON array to a file snapshot.json in the
   scratchpad directory.
3. Run: node generate.mjs <scratchpad>/snapshot.json --out <scratchpad>/index.html
   (generate.mjs is in the repo root). If it exits non-zero, STOP — do not
   publish anything, and end the session reporting the error.
4. Sanity-check <scratchpad>/index.html: it must contain id="snapshot" and a
   generatedAt timestamp from today. A session count of zero is acceptable
   only if the list_sessions calls themselves succeeded.
5. Publish <scratchpad>/index.html with the Artifact tool as an UPDATE to the
   existing artifact at this URL (do not create a new artifact):
   <ARTIFACT_URL>
   Use favicon "📡" and capabilities:
   {"mcp": {"servers": [{"server": "Claude Code Remote", "tools": ["list_sessions"]}]}}
6. Do not commit or push anything, do not create other artifacts, files
   outside the scratchpad, or triggers. Do not send notifications.
```

Replace `<ARTIFACT_URL>` with the dashboard's published artifact URL (recorded
in README.md) before creating the trigger.
