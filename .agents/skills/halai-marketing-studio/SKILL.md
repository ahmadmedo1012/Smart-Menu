---
version: 0.2.0
name: halai-marketing-studio
description: |
  Generate branded marketing creative via Halai. Image or video built from a
  product photo plus a creative prompt. Use when: "make an ad", "marketing
  asset", "branded image with my product", "campaign creative",
  "promotional image", "banner ad", "social ad", "Meta ad creative",
  "TikTok ad", "marketing video for my product", "paid-social asset",
  "product hero with tagline", "festive product image". Default output is
  image; switch to video by setting output_type. Provide product_image_url
  plus a creative prompt that describes mood, scene, and any on-image text.
  Chain: feed halai-product-studio output URLs in as product_image_url for
  cleaner brand visuals.
  NOT for: text-to-image with no product (use halai-generate), presenter UGC
  clips with a script (use halai-ugc-studio), pure studio product photos
  with no marketing intent (use halai-product-studio), marketplace listing
  cards (out of scope for v1).
argument-hint: "[--product <photo>] [prompt] [--video|--image] [--style <hint>]"
allowed-tools: mcp__halai__generate_marketing_asset, mcp__halai__check_generation, mcp__halai__upload_reference_image, mcp__halai__get_credits, mcp__halai__list_generations
---

# Halai Marketing Studio

Submit branded marketing image and video jobs through Halai. Wraps the `generate_marketing_asset` MCP tool. Halai applies marketing-specific prompt enhancement internally — the agent supplies the brief, Halai builds the final composition.

## Step 0 — Connection check

The Halai MCP server must be connected. If `generate_marketing_asset` isn't available, point the user at `INSTALL.md`. Optionally read `halai://about` once.

## UX rules

1. Be concise. Print the result URL plus one line of context (image vs video, aspect ratio). No raw IDs, no JSON, no model identifiers.
2. Detect language and respond in it. Argument names stay English. The `prompt` itself can be Arabic or English — Halai handles both.
3. **Do not poll.** Call `check_generation` once with `wait: true`. Marketing video jobs occasionally exceed 90s — if `timed_out: true`, call again with the same `asset_id`.
4. Pick a sensible default and ask at most one thing at a time. Don't open-ended ask "what do you want?" — propose two or three styles when ambiguous.
5. Never name an infrastructure provider. Refer to creator companies (Google, OpenAI, xAI, ByteDance, Kuaishou, Alibaba, Black Forest Labs) only if asked.
6. Mind the budget. Marketing video is the most expensive tool in this skill — confirm intent before submitting one.

## Inputs

| Param | Required | Notes |
|---|---|---|
| `product_image_url` | yes | URL of the product photo. `https://` only — upload local files via `upload_reference_image` first. |
| `prompt` | yes | Creative brief. 1–2000 chars. Mood, scene, lighting, optional on-image text. |
| `output_type` | optional | `image` (default) / `video`. |
| `style` | optional | Short hint: "cinematic", "flat-lay", "minimal e-commerce", "lifestyle", "festive", "luxury", "Saudi Vision aesthetic", etc. |

## Workflow

1. **Get product photo.** If missing, ask. The cleaner the product photo, the better the final ad — recommend the user upload the photo straight from the product source. If they only have a Shopify product URL, ask them to download the hero image first.
2. **Get creative brief.** Ask for the mood, scene, or message the user wants. Two-question variants when the user says "make an ad for X":
   - "What's the offer or hook?"
   - "Where will you use it — feed image, story video, hero banner?"
3. **Pick output type.** Default `image`. Switch to `video` only when the user explicitly asks for motion (`ad video`, `clip`, `5-second motion`, `animate`).
4. **Pick style hint.** Optional. Use when the user gave aesthetic cues. Common values: `cinematic`, `flat-lay`, `lifestyle`, `minimal`, `editorial`, `festive`, `luxury`, `youth`, `Saudi heritage`, `Ramadan`.
5. **Submit.**
   ```
   generate_marketing_asset(
     product_image_url: "<URL>",
     prompt: "<creative brief>",
     output_type: "image" | "video",
     style: "<optional hint>"
   )
   ```
   Returns `{ asset_id, status: "queued", cost_credits, balance_after }`.
6. **Wait.**
   ```
   check_generation(asset_id: <id>, wait: true)
   ```
7. **Deliver.** URL plus a one-line summary:

   > *Marketing image ready — lifestyle scene, 1:1.*
   > *https://media.hallah.ai/...png*

   For a video:

   > *Marketing video ready — 9:16, ~5s, cinematic.*
   > *https://media.hallah.ai/...mp4*

## Writing good marketing briefs

The `prompt` is the most important input. Effective briefs include:

- **Scene/context** — where the product lives ("on a sunlit windowsill", "on a wooden cafe table", "floating on a rich navy backdrop").
- **Mood/lighting** — "golden-hour", "soft studio", "high-contrast editorial", "neon-night".
- **Audience cue** — "for paid social on Instagram", "for a Ramadan campaign", "for a Saudi luxury audience".
- **Any on-image text** — "tagline: Burn slow, live slower" or "headline in Arabic: عش أبطأ".

Avoid:

- Naming specific competitors or copyrighted styles.
- Contradictory adjectives ("minimal busy", "bright moody").
- Long lists of unrelated requirements — one strong scene beats five weak ones.

## Output choices

### Image output (`output_type: "image"`)

Default. Best for:

- Static social ads (IG feed 1:1, IG story 9:16, Facebook 4:5).
- Hero banners (16:9 or wider, landscape).
- Email headers.
- Marketplace listing hero shots.

### Video output (`output_type: "video"`)

Use when motion adds something the still cannot — product reveal, camera move, ambient atmosphere. Default duration is short (~5s). Best for:

- TikTok / Reels paid-social.
- YouTube pre-roll bumpers.
- Landing-page hero loops.

Video is meaningfully more expensive than image. Don't switch to video unless the user explicitly asks for motion.

## Aspect ratio

Halai picks a sensible default per output type. The MCP tool does not currently expose an `aspect_ratio` argument — for non-default ratios, generate at the default ratio and crop downstream, or use `halai-generate` directly with `reference_image_url` set to your product photo and your own `aspect_ratio`.

## Errors

| Error | Meaning | What to do |
|---|---|---|
| `product_image_url required` | Missing product photo | Ask the user to attach one |
| `prompt required` | Empty creative brief | Ask the user for a brief description |
| `payment_required` | Out of credits / cap hit | https://hallah.ai/settings/connected-apps |
| `unauthorized` | Grant revoked | Re-approve Halai MCP |
| `timed_out: true` on check | Long job | Call `check_generation` again with the same id |
| Result `status: "failed"` | Backend error or safety flag | Inspect the brand-safe `error` field. Common: rephrase the prompt, swap the product photo |

## What this skill does NOT do

- Does not call `generate_image` / `generate_video` directly — those are `halai-generate`'s job, and they don't run the marketing prompt enhancer.
- Does not handle UGC presenter clips — that's `halai-ugc-studio`.
- Does not handle clean studio product photography without marketing intent — use `halai-product-studio` for that.
- Does not write the final enhanced prompt for the user. Halai owns prompt assembly; pasting the enhanced version back to the user is anti-pattern.

## Chaining

| Scenario | Pattern |
|---|---|
| Clean product photo doesn't exist yet | Run `halai-product-studio` first to produce a hero shot, reuse its URL as `product_image_url` here |
| Need 3 variants (1:1 + 9:16 + 16:9) | Run this skill three times with different prompts emphasising the format use case, or run once and crop |
| Need a campaign with presenter UGC AND a static marketing image | Run `halai-ugc-studio` for the UGC, then this skill for the static — they use different aesthetics intentionally |

## Reference docs

- **`../SCENARIOS.md`** — **Top-level routing playbook.** Read this for any user request that touches typography (especially Arabic), branded creative, festive / cultural moments, or workflows that span multiple skills. Marketing studio is the default for **all image-with-text jobs** including Arabic.
