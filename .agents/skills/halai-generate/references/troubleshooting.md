# Troubleshooting — halai-generate

## `prompt required`

The `prompt` argument was empty or whitespace. Ask the user for a one-line description; Halai requires at least one character.

## `payment_required`

Three sub-cases:

1. **Out of credits.** The user's Halai balance is at or below the cost of this generation. Tell them:

   > You're out of Halai credits. Top up at https://hallah.ai/subscription.

2. **Daily cap hit on this connection.** The user (or you, via repeated runs) burned through the daily cap set on this MCP grant. The cap resets at 00:00 UTC. Tell them:

   > Daily cap reached for this connection. Raise it at https://hallah.ai/settings/connected-apps, or wait until the next UTC day.

3. **Monthly cap hit.** Same shape but monthly. Same fix.

`get_credits` returns the live numbers — call it to confirm which sub-case applies before guessing.

## `rate_limited`

The token bucket for this MCP grant is empty — typically 30 calls per minute sustained on this connection. Wait ~5–10s and retry. If the user is in a tight loop, switch to batching (`count: 4` on image, or chain via `halai-product-studio` which produces multiple variants in one call).

## `unauthorized`

The MCP grant was revoked or the token expired beyond the refresh window. Possible reasons:

- The user clicked **Revoke** on https://hallah.ai/settings/connected-apps.
- The user changed their Halai password (auto-revokes all grants).
- Token sat unused past the 90-day refresh expiry.

Fix: ask the user to re-approve the Halai MCP connection. Same OAuth flow as initial install.

## `not_found` on `check_generation`

The `asset_id` doesn't match any asset the connected user owns. Most likely causes:

- Typo when copying the id between turns. Re-read the original `generate_*` response.
- The id was generated against a different Halai account (rare — only happens if the user switched accounts mid-session).

## `check_generation` returns `timed_out: true`

The generation took longer than the 90s server-side wait. **This is normal for longer videos.** Just call `check_generation` again with the same `asset_id` — it will wait another 90s. Do not switch to a polling loop; that defeats the purpose.

## Result `status: "failed"`

The generation went through Halai's queue but the underlying job failed. The `error` field contains a brand-safe failure summary (Halai's MCP server strips infrastructure provider names before returning). Common patterns:

| Error contains | Likely cause | Fix |
|---|---|---|
| `safety` / `policy` | Content was filtered for safety | Rewrite the prompt; remove explicit content |
| `quota` / `capacity` | Backend was temporarily overloaded | Retry after ~60s |
| `invalid prompt` | Prompt length exceeded or characters rejected | Shorten / sanitize |
| `network` / `timeout` | Transient backend hiccup | Retry once |

If the error keeps repeating with the same prompt, suggest the user paraphrase. Halai's underlying models occasionally trip on specific phrasings even when content is fine.

## "It's not generating anything"

Order of checks:

1. Is the MCP connection still authorized? Ask the user to call `get_credits` first — if that fails with `unauthorized`, the connection is gone. Re-approve.
2. Is the agent actually calling the MCP tool, or is it hallucinating output? Inspect the tool-call trace.
3. Did `check_generation` time out without you noticing? Call it again — generations sometimes take 60–120s.
4. Is the user on the free plan and out of credits? `get_credits` will show `balance: 0`.

## "The output isn't what I asked for"

Halai's models are deterministic-on-prompt — same prompt + same seed gives close results. To improve:

- Add more specificity (lighting, time of day, camera move, mood, reference style).
- Pass a `reference_image_url` for composition / character continuity.
- Try image-to-video instead of pure text-to-video when motion matters less than the starting frame.
- Avoid contradictory adjectives ("bright moody scene", "minimal busy composition").

If the user is unsatisfied after 2–3 attempts, suggest one of the studio-specific skills (`halai-product-studio` for product imagery, `halai-marketing-studio` for ads). They use mode-specific prompt enhancement and produce noticeably better output in their domain.
