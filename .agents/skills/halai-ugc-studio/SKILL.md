---
version: 0.2.0
name: halai-ugc-studio
description: |
  Generate UGC-style videos via Halai. A presenter character speaks a script
  you provide, optionally holding or referencing a product. Use when:
  "make a UGC video", "presenter saying", "selfie talking video",
  "creator video", "talking head", "unboxing-style clip", "TikTok creator
  video where I say", "make me a video reading this script", "spokesperson
  video", "founder talking to camera", "testimonial-style clip". Output is
  vertical 9:16 by default (1:1 and 16:9 supported), short-form, casual UGC
  vibe. Chain: feed the result URL into halai-marketing-studio as
  reference if you want a more polished ad variant.
  NOT for: cinematic film / multi-shot video (use halai-generate),
  branded marketing creative from a static product photo (use
  halai-marketing-studio), studio product photography (use
  halai-product-studio).
argument-hint: "[script] [--presenter <photo>] [--product <photo>] [--aspect 9:16|1:1|16:9]"
allowed-tools: mcp__halai__generate_ugc_video, mcp__halai__check_generation, mcp__halai__upload_reference_image, mcp__halai__get_credits, mcp__halai__list_generations
---

# Halai UGC Studio

Submit UGC-style presenter videos through Halai. Wraps the `generate_ugc_video` MCP tool. The presenter is a character based on the photo you supply; the script is what they say.

## Step 0 — Connection check

The Halai MCP server must be connected. If `generate_ugc_video` isn't available as a tool, point the user at `INSTALL.md`. Then optionally read `halai://about` for grounding.

## UX rules

1. Be concise. Print the result URL plus one line of context (aspect ratio, approx duration). No raw IDs, no JSON dumps, no model identifiers.
2. Detect language and respond in it. Halai handles bilingual scripts (English, Arabic). Argument names stay English.
3. **Do not poll.** Call `check_generation` once with `wait: true`. UGC video jobs occasionally exceed the 90s default — if `timed_out: true`, call again with the same `asset_id`.
4. Ask one thing at a time. If the user gave a script but no presenter photo, ask for the photo before submitting. Don't ask for product photo unless the script clearly references a product.
5. Never name an infrastructure provider. If the user asks "what model are you using?", answer with the creator company (e.g. "a Google video model") not the upstream platform.

## Inputs

| Param | Required | Notes |
|---|---|---|
| `script` | yes | What the presenter says. 1–1000 chars. Short, conversational sentences work best. |
| `presenter_image_url` | yes | URL of a portrait / selfie of the presenter character. `https://` only — upload local files via `upload_reference_image` first. |
| `product_image_url` | optional | URL of a product image the presenter is showing / holding / referencing. Optional even if the script mentions a product. |
| `aspect_ratio` | optional | `9:16` (default) / `1:1` / `16:9` |

## Workflow

1. **Get the script.** If missing, ask once. Cap at ~35 words for a 15-second clip (Halai paces at ~150 words/minute). If the user gives a longer script, trim or warn.
2. **Get the presenter photo.** If the user uploaded a photo, use it. If they referenced "myself" / "my face" / "the founder" without an attachment, ask for the photo. If it's a local file or data URL, upload first via `upload_reference_image`.
3. **Product photo if relevant.** Only ask if the script clearly references a product the presenter is holding / showing / talking about. Don't ask just because the user mentioned a product name — sometimes spoken reference is enough.
4. **Aspect ratio.** Default `9:16` (TikTok / Reels / Shorts). Use `1:1` for IG feed, `16:9` for landscape ad / YouTube pre-roll. Ask only if the user's intent is ambiguous.
5. **Submit.**
   ```
   generate_ugc_video(
     script: "<script>",
     presenter_image_url: "<URL>",
     product_image_url: <optional URL>,
     aspect_ratio: "<ratio>"
   )
   ```
   Returns `{ asset_id, status: "queued", cost_credits, balance_after }`.
6. **Wait.**
   ```
   check_generation(asset_id: <id>, wait: true)
   ```
   On success returns the video URL.
7. **Deliver.** URL plus a one-line summary:

   > *Done — 9:16 UGC clip, presenter delivering the script.*
   > *https://media.hallah.ai/...mp4*

## Script writing — quick rules

UGC pacing is ~150 words per minute. Plan accordingly:

| Clip length | Word budget |
|---|---|
| 8 seconds | ~20 words |
| 15 seconds | ~35 words |
| 30 seconds | ~75 words |
| 60 seconds | ~150 words |

Style notes:

- Short, declarative sentences. Avoid commas inside long subordinate clauses.
- Conversational, not corporate. Contractions are good (it's, you've, won't).
- One hook in the first ~3 words. UGC audiences scroll fast.
- Match the presenter's energy. A studio-lit, formal selfie reads as "spokesperson"; a candid mirror selfie reads as "creator". Pick the script tone to match the photo, or vice versa.

See `references/presenter-guide.md` for what photos work best as the presenter input.

## Common params cheat-sheet

| Param | Type | Default | Notes |
|---|---|---|---|
| `script` | string | required | 1–1000 chars, ~150 wpm pacing |
| `presenter_image_url` | string | required | `https://` URL |
| `product_image_url` | string | — | Optional product reference |
| `aspect_ratio` | enum | `9:16` | `9:16` / `1:1` / `16:9` |

## Errors

| Error | Meaning | What to do |
|---|---|---|
| `script required` | Empty script | Ask the user |
| `presenter_image_url required` | Missing presenter photo | Ask the user to attach one |
| `payment_required` | Out of credits / cap hit | https://hallah.ai/settings/connected-apps |
| `unauthorized` | Grant revoked | Re-approve Halai MCP |
| `timed_out: true` on check | Long job | Call `check_generation` again with same id |
| Result `status: "failed"` with safety-flagged | Script tripped a content filter | Rewrite the script |

## Reference docs

- **`../SCENARIOS.md`** — **Top-level routing playbook.** Read this when the user might want something other than a presenter clip (e.g. a marketing ad video, an animated still). Tells you which skill wins per scenario.
- `references/presenter-guide.md` — what presenter photos work best, sizing, lighting, common mistakes
