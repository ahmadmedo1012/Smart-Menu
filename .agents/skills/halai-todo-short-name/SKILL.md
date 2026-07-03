---
version: 0.1.0
name: halai-<TODO-short-name>
description: |
  <TODO: one-paragraph what the skill does. Be specific about inputs and
  outputs. Avoid marketing fluff.>
  Use when: <TODO: list 6–12 trigger phrases users say. Example:
  "make X", "generate Y", "do Z with my photo">.
  Chain: <TODO: which other halai-* skills this one composes with, and how>.
  NOT for: <TODO: list 3–5 adjacent things this skill does NOT do, with the
  skill that DOES do them. Example: "Not for branded ads (use
  halai-marketing-studio)">.
argument-hint: "[<TODO arg-1>] [<TODO --flag>]"
allowed-tools: mcp__halai__<TODO-tool-1>, mcp__halai__<TODO-tool-2>, mcp__halai__check_generation, mcp__halai__get_credits
---

# Halai <TODO Display Name>

<TODO: one-line summary of the skill — what tool it wraps, what category it serves.>

## Step 0 — Connection check

The Halai MCP server must be connected. If the required tool(s) aren't available, point the user at `INSTALL.md`. Optionally read `halai://about` once for grounding.

## UX rules

1. Be concise. Print the result URL plus one line of context. No raw IDs, no JSON dumps, no model identifiers.
2. Detect the user's language and reply in it. Argument names stay English.
3. **Do not poll.** Call `check_generation` once with `wait: true`. If `timed_out: true`, call again with the same `asset_id`.
4. Ask one thing at a time. Pick sensible defaults; ask only what's genuinely missing from context.
5. Never name an infrastructure provider. Refer to creator companies (Google, OpenAI, xAI, ByteDance, Kuaishou, Alibaba, Black Forest Labs) only.
6. Mind the budget. <TODO: tool-specific cost notes>.

## Inputs

| Param | Required | Notes |
|---|---|---|
| `<TODO param>` | yes | <TODO description and constraints> |
| `<TODO param>` | optional | <TODO description, default value> |

## Workflow

1. **<TODO step-1 title>.** <TODO what to do, when to ask the user>.
2. **<TODO step-2 title>.** <TODO>.
3. **Submit.**
   ```
   <tool-name>(
     <param>: <value>,
     <param>: <value>
   )
   ```
   Returns `{ asset_id, status: "queued", cost_credits, balance_after }`.
4. **Wait.**
   ```
   check_generation(asset_id: <id>, wait: true)
   ```
5. **Deliver.** URL plus a one-line summary.

## Errors

| Error | Meaning | What to do |
|---|---|---|
| `<param> required` | Missing required input | Ask the user |
| `payment_required` | Out of credits / cap hit | https://hallah.ai/settings/connected-apps |
| `unauthorized` | Grant revoked | Re-approve Halai MCP |
| `timed_out: true` on check | Long job | Call `check_generation` again with the same id |
| Result `status: "failed"` | Backend error or safety flag | Inspect the brand-safe `error` field |

## What this skill does NOT do

- <TODO: thing it doesn't do, and the skill that DOES do it>
- <TODO>
- <TODO>

## Reference docs

Load on demand:

- `references/<TODO doc>.md` — <TODO what this reference covers>
