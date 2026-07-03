---
version: 0.2.0
name: halai-product-studio
description: |
  Generate studio-quality product photography via Halai. Place a product in
  a described scene with professional lighting and composition. Use when:
  "product photo", "studio shot", "product photography", "shot of my product
  on [surface]", "catalog image", "Shopify product image", "clean white
  background", "product on wood / marble / concrete", "lifestyle shot with
  the product", "hero product image", "professional product picture", "make
  it look like an ad-quality photo of my product". Returns multiple variants
  in one call. Chain: reuse the output URLs as product_image_url for
  halai-marketing-studio campaigns, or as reference_image_url in
  halai-generate.
  NOT for: branded marketing ads with a creative brief (use
  halai-marketing-studio), text-to-image without a product (use
  halai-generate), presenter UGC clips (use halai-ugc-studio).
argument-hint: "[--product <photo>] [scene description] [--count N]"
allowed-tools: mcp__halai__generate_product_shot, mcp__halai__check_generation, mcp__halai__upload_reference_image, mcp__halai__get_credits, mcp__halai__list_generations
---

# Halai Product Studio

Submit studio-quality product photo jobs through Halai. Wraps the `generate_product_shot` MCP tool. Halai applies product-photography-specific prompt enhancement internally — the agent supplies the product photo and the scene brief, Halai produces the polished result.

## Step 0 — Connection check

The Halai MCP server must be connected. If `generate_product_shot` isn't available, point the user at `INSTALL.md`. Optionally read `halai://about` once.

## UX rules

1. Be concise. Print result URLs as a short bulleted list, plus one line of context (count, scene type). No raw IDs, no JSON, no model identifiers.
2. Detect language and respond in it. Argument names stay English. Scene briefs work in either English or Arabic.
3. **Do not poll.** Call `check_generation` once with `wait: true`. If `timed_out: true`, call again with the same `asset_id`.
4. Pick a sensible default and ask at most one thing at a time. For product shots, the most important question is the scene; everything else has a good default.
5. Never name an infrastructure provider. The Halai MCP server strips infrastructure names from any error message before returning.
6. Mind the budget. Product Studio is moderately priced; a `count: 4` call costs four times the base price.

## Inputs

| Param | Required | Notes |
|---|---|---|
| `product_image_url` | yes | URL of the product photo. `https://` only — upload local files via `upload_reference_image` first. |
| `scene_prompt` | yes | Description of the desired scene. 1–2000 chars. Surface, lighting, environment, props. |
| `count` | optional | 1–4 variants per call. Default 1. Variants vary lighting, angle, and palette. |

## Workflow

1. **Get product photo.** If missing, ask. The product photo is the source of truth for the product's appearance — Halai keeps the product visually consistent, only changing the scene around it.
2. **Get the scene brief.** If the user said "make product shots" with no detail, propose 2–3 directions:
   - **Clean studio** — "on a neutral seamless background, soft front light"
   - **Lifestyle** — "on a wooden kitchen counter beside a steaming cup, morning window light"
   - **Conceptual** — "floating against a deep navy gradient with a single shaft of light"
   Let the user pick or improvise.
3. **Pick count.** Default 1. Offer `count: 3` when the user wants to compare directions or build a small catalog set.
4. **Submit.**
   ```
   generate_product_shot(
     product_image_url: "<URL>",
     scene_prompt: "<scene brief>",
     count: <1-4>
   )
   ```
   Returns `{ asset_id, status: "queued", cost_credits, balance_after }`.
5. **Wait.**
   ```
   check_generation(asset_id: <id>, wait: true)
   ```
6. **Deliver.** URLs as a labeled bulleted list:

   ```
   3 product shots ready (wooden counter, morning light):

   - https://media.hallah.ai/a/...png
   - https://media.hallah.ai/b/...png
   - https://media.hallah.ai/c/...png
   ```

## Scene types — quick palette

| User says | Suggest scene_prompt direction |
|---|---|
| "white background", "catalog", "Shopify", "clean", "studio" | Seamless neutral background, soft directional light, slight shadow under product |
| "lifestyle", "in use", "real scene", "context" | Surface + environment + ambient props, daylight or warm interior light |
| "Pinterest pin", "aesthetic", "moodboard" | Vertical 2:3 framing intent, cohesive palette, lifestyle prop arrangement |
| "hero banner", "landing page", "website header" | Wide landscape framing, more negative space, focal product offset to one side |
| "conceptual", "surreal", "CGI", "floating", "splash" | Studio backdrop, dramatic side light, product suspended or in motion |
| "luxury", "high-end", "premium" | Dark velvet / marble surfaces, low warm key light, soft falloff |
| "Saudi heritage", "MENA aesthetic" | Warm earth tones, oud / coffee accents, traditional surfaces like aged wood or carved stone |
| "festive", "Ramadan", "Eid" | Warm lanterns, dates / coffee props, soft amber light, optional crescent / geometric motifs |

These are starting points — the user's specific brief overrides any of them.

## Multi-variant calls

`count: 3` or `count: 4` returns multiple distinct variants in one call. Halai varies lighting, angle, and palette across them — they will not be paraphrased copies of one another. Ideal for:

- Building a catalog (3 angles × 1 surface).
- A/B testing for paid social (3 scene moods, same product).
- Generating supporting images for a marketplace listing.

For more than 4 variants, run the tool twice with slightly different scene briefs.

## Aspect ratio

The MCP tool does not currently expose `aspect_ratio` — Halai picks a sensible default per scene type (square for studio, portrait for moodboard, landscape for hero). If you need a specific aspect ratio, generate at the default and crop downstream, or switch to `halai-generate` with the product photo passed as `reference_image_url`.

## Resolution

Halai delivers a high-resolution image suitable for print and large-format display. No size selector exposed in v1.

## Errors

| Error | Meaning | What to do |
|---|---|---|
| `product_image_url required` | Missing product photo | Ask the user to attach one |
| `scene_prompt required` | Empty scene description | Propose 2–3 directions and let the user pick |
| `payment_required` | Out of credits / cap hit | https://hallah.ai/settings/connected-apps |
| `unauthorized` | Grant revoked | Re-approve Halai MCP |
| `timed_out: true` on check | Long job (more common with `count: 4`) | Call `check_generation` again with the same id |
| Result `status: "failed"` | Backend error or safety flag | Inspect the brand-safe `error` field. Common: re-upload the product photo if it's low-res |

## What this skill does NOT do

- Does not write the final enhanced photography prompt. Halai owns prompt assembly; pasting it back to the user is anti-pattern.
- Does not apply marketing-specific composition (taglines, CTAs, on-image text). For that, use `halai-marketing-studio`.
- Does not animate the product. For motion, generate the still here, then animate via `halai-generate` (image-to-video).
- Does not produce text-to-image without a product photo. Use `halai-generate` for that.

## Chaining

| Scenario | Pattern |
|---|---|
| Build a campaign | Run this skill for hero shots → reuse the best URL as `product_image_url` for `halai-marketing-studio` |
| Need motion on the hero shot | Run this skill → pass the URL into `halai-generate` `generate_video` as `reference_image_url` |
| Need 6 catalog variants | Two `count: 3` calls with different scene briefs |
| Need a marketplace listing | Run a clean-studio variant here, then a lifestyle variant, deliver both |

## Common mistakes to avoid

- Submitting without a product photo. Halai needs the source to lock the product's appearance.
- Asking the user to "describe the product" when they already uploaded a photo. The photo is enough.
- Pasting the assembled prompt back to the user — they want the URL.
- Using this skill for a presenter / UGC video — that's `halai-ugc-studio`'s job.
- Using this skill for branded marketing creative with on-image text — that's `halai-marketing-studio`'s job.

## Reference docs

- **`../SCENARIOS.md`** — **Top-level routing playbook.** Read this when the user request could plausibly fit marketing studio (branded ads), UGC studio (presenter clip), or generic generate (no product context). Tells you which skill wins per scenario.
