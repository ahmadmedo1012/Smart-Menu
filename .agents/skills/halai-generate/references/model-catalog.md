# Halai model catalog

This is the agent's reference for **which AI model creator is doing what** behind Halai's tools, plus capability hints. It is brand-safe — it lists only creator companies and their public model brand names, never the infrastructure platforms Halai uses to host the models.

For the **live** catalog (what's enabled right now, current cost, current capabilities), call the `list_models` MCP tool. This document is the durable intent → capability map; `list_models` is the source of truth for cost and availability.

## Creators integrated into Halai

| Creator | Models on Halai | Specialty |
|---|---|---|
| **Google** | Nano Banana, Nano Banana 2, Nano Banana Pro, Gemini 2.5 Flash Image, Veo 3, Veo 3 Fast, Veo 3.1, Veo 3.1 Fast, Veo 3.1 Lite | High-fidelity general image, on-image text, cinematic video, image-to-video |
| **OpenAI** | GPT Image 2 | Graphic design, UI mockups, banners, typography, on-image text |
| **xAI** | Grok Imagine | Image and video with bold creative bias |
| **ByteDance** | Seedance 2.0, Seedance 2.0 Fast, Seedance 1.5 Pro, Seedream 5 Lite | Default video model — multi-shot, cinematic, image-to-video; also image |
| **Kuaishou** | Kling 3, Kling 3 Omni, Kling 3.0 Motion, Kling 2.6, Kling 2.5 Turbo | Single-plane and cinematic video; image-to-video transitions |
| **Alibaba** | Wan 2.6 i2v, Wan 2.6 t2v, Wan 2.5 i2v Fast, Wan 2.2 Animate | Animation, image-to-video, fast iteration |
| **Black Forest Labs** | Flux | Image — illustration, character work, fast iteration |

You do **not** pick a model when calling Halai's tools. Halai selects the right model internally based on the tool you call (`generate_image`, `generate_video`, etc.) and the parameters (presence of `reference_image_url`, `duration_seconds`, `with_audio`, etc.). The catalog above is for answering user questions like "which models do you support?" and "which company's video model is this?".

## Intent → tool → expected creator

When a user asks for one of these, this is who is behind the result:

### Image intents

| User asks for | Tool to call | Halai typically routes to |
|---|---|---|
| General high-fidelity image | `generate_image` | **Google** (Nano Banana 2 / Pro) or **OpenAI** (GPT Image 2) |
| On-image text, headlines, banners, typography | `generate_image` | **OpenAI** (GPT Image 2) — strongest at on-image text |
| Stylized / illustrated / character | `generate_image` | **Google** (Nano Banana variants) or **Black Forest Labs** (Flux) |
| Fast cheap iteration / sketch quality | `generate_image` | **Black Forest Labs** (Flux variants) |
| Bold creative concept art | `generate_image` | **xAI** (Grok Imagine) |
| Brand product visual (catalog / lifestyle / hero) | → use `halai-product-studio` | **OpenAI** (GPT Image 2) via product enhancer |
| Branded marketing image with product | → use `halai-marketing-studio` | **OpenAI** (GPT Image 2) via marketing enhancer |

### Video intents

| User asks for | Tool to call | Halai typically routes to |
|---|---|---|
| Default cinematic video, multi-shot | `generate_video` | **ByteDance** (Seedance 2.0) |
| Fast / cheaper short clip | `generate_video` | **ByteDance** (Seedance 2.0 Fast) or **Kuaishou** (Kling 2.5 Turbo) |
| Image-to-video with strong continuity | `generate_video` with `reference_image_url` | **ByteDance** (Seedance 2.0) or **Kuaishou** (Kling 3 Omni) |
| Single-plane scene, cleaner motion | `generate_video` | **Kuaishou** (Kling 3) |
| Native audio video | `generate_video` with `with_audio: true` | **Google** (Veo 3.1) |
| Animation / character motion / lip-sync | `generate_video` | **Alibaba** (Wan 2.2 Animate) |
| Fast batch volume | `generate_video` | **Google** (Veo 3.1 Lite) |
| UGC presenter video reading a script | → use `halai-ugc-studio` | Halai composes the presenter internally |
| Branded ad video from a product image | → use `halai-marketing-studio` | **ByteDance** (Seedance 2.0 Marketing) |

## Answering "which model is being used?"

If the user asks during or after a generation, answer with the **creator company** — not the upstream platform, not the Halai internal model id. Examples:

- ✅ "A Google video model."
- ✅ "An OpenAI image model with on-image text strengths."
- ✅ "A ByteDance video model — Halai's default for cinematic motion."
- ✅ "Halai chose a Kuaishou model for this clip."
- ❌ Naming a hosting platform Halai uses internally to serve the model.
- ❌ Quoting a routing identifier with a slash (e.g. `provider/model-id` strings).

If the user wants more detail than that, refer them to the table above. Halai intentionally abstracts model routing so users don't have to manage a model picker.

## Capability reference

| Capability | Tools that expose it | Notes |
|---|---|---|
| Reference image | `generate_image` (`reference_image_url`), `generate_video` (`reference_image_url`), `generate_product_shot` (`product_image_url`), `generate_marketing_asset` (`product_image_url`), `generate_ugc_video` (`presenter_image_url`, `product_image_url`) | Halai's MCP server auto-routes to a creator that accepts this role |
| Image-to-video | `generate_video` with `reference_image_url` | Best continuity from start frame |
| Aspect ratio control | `generate_image`: `1:1` / `3:4` / `4:5` / `9:16` / `16:9` / `4:3` ; `generate_video`: `1:1` / `9:16` / `16:9` ; UGC: same as video | Marketing and product studios use sensible per-mode defaults |
| Audio on video | `generate_video` with `with_audio: true` | Halai routes audio-capable requests to a creator that supports it (typically Google Veo 3.1) |
| Duration control | `generate_video` (`duration_seconds`: 4–10) | Longer durations may auto-fallback if the picked creator's max is 10s |
| Negative prompt | `generate_video` (`negative_prompt`) | Useful for "no text", "no logos", "no people" |
| Batch count | `generate_image` (`count`: 1–4), `generate_product_shot` (`count`: 1–4) | Each variant is a fresh generation; cost scales linearly |

## What this catalog is NOT

- **Not** a model-picker UI for the agent. Tools don't take a `model` parameter — Halai picks.
- **Not** the live catalog. Cost and availability change; always call `list_models` for the current numbers.
- **Not** infrastructure documentation. Halai's choice of provider platforms is intentionally hidden.
- **Not** a full table of every Halai model. Templates, pipelines, and composite studios are out of scope for this skill — see the dedicated studio skills (`halai-marketing-studio`, `halai-product-studio`, `halai-ugc-studio`).

## Updating this file

The catalog only needs an update when Halai adds or removes a creator company integration, or when a creator ships a meaningfully new generation. Per-model version churn (Nano Banana 2 → Nano Banana 3) is handled automatically by `list_models` and Halai's internal routing — you don't need to bump this file for every release.
