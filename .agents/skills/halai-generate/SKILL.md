---
version: 0.2.0
name: halai-generate
description: |
  Generate images and videos via Halai. Use when: "generate an image",
  "make a video", "create a photo of", "animate this photo", "image-to-video",
  "edit/stylize/remix this image", "produce a clip", "make an illustration",
  "design a hero image", "concept art", "visualize this idea". Supports
  text-to-image, image-to-image (with reference), text-to-video, image-to-video,
  multiple aspect ratios, optional audio for video, and batch counts. Chain
  with halai-product-studio when the subject is a product; chain with
  halai-marketing-studio when the goal is branded marketing creative; chain
  with halai-ugc-studio when a presenter speaks a script.
  NOT for: branded product photoshoots (use halai-product-studio), marketing
  ads with a product image (use halai-marketing-studio), presenter UGC clips
  (use halai-ugc-studio), text/chat tasks.
argument-hint: "[prompt] [--reference <url>] [--aspect <ratio>] [--video] [--duration <s>]"
allowed-tools: mcp__halai__generate_image, mcp__halai__generate_video, mcp__halai__check_generation, mcp__halai__list_models, mcp__halai__get_credits, mcp__halai__upload_reference_image, mcp__halai__list_generations
---

# Halai Generate

Submit image and video jobs to Halai through the connected MCP server. Covers general-purpose text-to-image, image-to-image, text-to-video, and image-to-video. Halai picks the right model — the agent does not pass a model id.

## Step 0 — Connection check

Before any other call, make sure the Halai MCP server is connected.

1. The agent should already have `generate_image`, `generate_video`, `check_generation`, `list_models`, and `get_credits` available as MCP tools.
2. If not, point the user at `INSTALL.md` — they need to add `https://mcp.hallah.ai/mcp` to their agent's MCP settings and approve the OAuth flow.

On first turn of a Halai conversation, optionally read the `halai://about` resource once for grounding — it lists capabilities and the integrated AI model creators.

## UX rules

1. Be concise. Print the result URL plus one line of context (kind, aspect ratio, duration). No raw IDs, no JSON dumps, no model identifiers.
2. Detect the user's language from the first message and reply in it. Tool argument names (`prompt`, `aspect_ratio`) stay English.
3. **Do not poll.** Call `check_generation` once with `wait: true` (the default). That single request blocks server-side until the asset is ready or the 90s timeout fires. If `timed_out: true`, call it again — that's the only correct retry pattern.
4. Pick a sensible default. Don't batch-ask. Aspect ratio, count, duration — choose conventionally unless the user is explicit.
5. Never name an infrastructure provider. If the user asks "what model are you using?", answer with the creator company (e.g. "a Google video model", "an OpenAI image model"). See `references/model-catalog.md` for the intent → capability mapping.
6. Mind the budget. Generation tools deduct credits. If a `payment_required` error comes back, surface it clearly — Halai may have hit a cap on this connection. Point the user at https://hallah.ai/settings/connected-apps.

## Workflow — image

1. **Get the prompt.** If missing, ask once. Short scene description, intent, style notes.
2. **Pick the aspect ratio.** Defaults:
   - Square (1:1) for social profile-style assets.
   - 16:9 for hero images, landing pages, video frames, slideshow.
   - 9:16 for vertical / mobile / Stories / Reels stills.
   - 4:5 for IG feed portrait.
   - 3:4 or 4:3 if the user calls for portrait or landscape book-cover-like framing.
3. **Reference image?** If the user uploaded a photo or asked for "in this style" / "of this character / scene", upload it via `upload_reference_image` (if it's a local file or data URL) or pass the existing `https://` URL straight through as `reference_image_url`.
4. **Submit.**
   ```
   generate_image(
     prompt: "<prompt>",
     aspect_ratio: "<ratio>",
     count: <1-4, default 1>,
     reference_image_url: <optional URL>
   )
   ```
   Returns `{ asset_id, status: "queued", cost_credits, balance_after }`.
5. **Wait.**
   ```
   check_generation(asset_id: <id>, wait: true)
   ```
   Returns terminal state with the `url` field populated on success.
6. **Deliver.** URL + one-line summary. e.g. `"Done — square hero image, 1024×1024. https://media.hallah.ai/..."`

## Workflow — video

1. **Get the prompt.** If missing, ask.
2. **Image-to-video?** If the user wants to animate a specific frame, pass that frame as `reference_image_url`. This dramatically improves continuity vs text-only video.
3. **Aspect ratio defaults:** 9:16 for social / TikTok / Reels, 16:9 for landscape / YouTube / pre-roll, 1:1 for IG feed.
4. **Duration.** Halai accepts 4–10 seconds. Default 6. Longer requests (12–15s) — fall back to 10 and tell the user.
5. **Audio.** `with_audio: true` by default. For silent ambient clips (pure b-roll), pass `false`.
6. **Submit.**
   ```
   generate_video(
     prompt: "<prompt>",
     aspect_ratio: "<ratio>",
     duration_seconds: <4-10>,
     with_audio: <bool>,
     reference_image_url: <optional URL>
   )
   ```
7. **Wait + deliver.** Same pattern as image.

## Listing what Halai supports today

If the user asks "what models do you have?" or "what can you generate?", call `list_models` for the live catalog. It returns a brand-safe list with `id`, `name`, `kind`, `base_cost`, and capabilities (aspect ratios, max duration, audio support, reference-image support). Do not pass any `id` from this list back into `generate_image` / `generate_video` — Halai selects the model internally. The list is for capability discovery only.

For "what is Halai?" questions, read the `halai://about` resource once.

## Common params cheat-sheet

| Param | Type | Default | Notes |
|---|---|---|---|
| `prompt` | string | required | 1–4000 chars |
| `aspect_ratio` | enum | `1:1` image / `9:16` video | See model-catalog.md for allowed values |
| `count` | int | `1` | Image only, 1–4 |
| `duration_seconds` | int | `6` | Video only, 4–10 |
| `with_audio` | bool | `true` | Video only |
| `reference_image_url` | string | — | `https://` URL or upload first via `upload_reference_image` |
| `negative_prompt` | string | — | Video only, 1000 chars max |

## Errors

| Error | Meaning | What to do |
|---|---|---|
| `prompt required` | Empty / missing prompt | Ask the user for one |
| `payment_required` | Credit balance hit or cap exceeded | Surface clearly. Link: https://hallah.ai/settings/connected-apps |
| `rate_limited` | Too many calls this minute on this connection | Pause briefly, then retry |
| `unauthorized` | Grant revoked or token expired | Ask user to re-approve the Halai MCP connection |
| `not_found` (asset) | Asset id is invalid or belongs to another user | Re-check the asset_id printed by the earlier generate call |
| `timed_out: true` on check_generation | Generation didn't finish within 90s | Call `check_generation` again with the same id — it'll wait another 90s |

See `references/troubleshooting.md` for more.

## Reference docs

Load on demand:

- **`../SCENARIOS.md`** — **Top-level routing playbook.** Read this when the user request could plausibly fit another skill (e.g. typography work, branded ads, presenter UGC). Tells you which skill wins per scenario.
- `references/model-catalog.md` — intent → capability mapping (no provider names)
- `references/troubleshooting.md` — common errors and fixes
