# Skill template

Copy this directory to add a new skill. The leading underscore on `_template/` keeps CI globs (`halai-*/SKILL.md`) from picking it up; it's documentation only.

## How to add a new skill

1. **Copy this directory** to a sibling named after your new skill, prefixed with `halai-`:

   ```bash
   cp -R _template halai-<new-skill-name>
   ```

   Examples of good names: `halai-influencer-studio`, `halai-cinema`, `halai-shots`, `halai-templates`.

2. **Edit `SKILL.md`** — fill in every field marked `<TODO>`:

   - Frontmatter: `name`, `description`, `argument-hint`, `allowed-tools`
   - Sections: Step 0, UX rules, Inputs, Workflow, Errors, Reference docs

   Keep the file under 300 lines. Anything that doesn't drive the agent's next-turn decision belongs in `references/`.

3. **Register the skill** in three places:

   **`.claude-plugin/marketplace.json`** — append to `plugins[0].skills`:
   ```json
   {
     "name": "<new-skill-short-name>",
     "path": "halai-<new-skill-name>",
     "invoke": "/halai:<new-skill-short-name>"
   }
   ```

   **`README.md`** — add a row to the **Skills** table and the **Quick reference** table.

   **`setup` script** — append your new directory to the `SKILLS=(…)` array.

4. **Bump the version** consistently across all 8 manifest files. Run the local check:

   ```bash
   bash scripts/update-check.sh
   ```

   It fails loudly on drift, listing exactly which file to fix.

5. **Run the CI checks locally before opening the PR**:

   ```bash
   # All four checks from .github/workflows/validate-skills.yml
   bash scripts/update-check.sh
   wc -l halai-*/SKILL.md   # all under 300
   grep -iEn '\b(fal\.ai|fal-ai|replicate|q_(img|vid)_[a-z]+|worker-[a-z0-9-]+)\b' halai-*/SKILL.md halai-*/references/*.md && echo "FAIL: forbidden tokens" || echo "ok"
   ```

6. **Open a PR** against `main`. CI runs the same checks plus frontmatter validation. Done.

## Rules to follow in `SKILL.md`

- **Never name an infrastructure provider.** Speak about Halai's capabilities and the integrated creator companies (Google, OpenAI, xAI, ByteDance, Kuaishou, Alibaba, Black Forest Labs).
- **Recommend wait-once.** For any tool that returns an `asset_id`, instruct the agent to call `check_generation` once with `wait: true`. Never describe a polling loop.
- **One question at a time.** Do not batch-ask the user for product + style + count + aspect ratio upfront. Pick sensible defaults and ask only what's genuinely missing.
- **Brand name is "Halai"** (one L) in all user-facing prose. The lowercase `hallai` only appears in legacy internal identifiers.
- **No raw IDs or JSON in agent output examples.** Show the agent how to deliver the URL plus a one-line summary.

## What the scaffold gives you

| File | Purpose |
|---|---|
| `SKILL.md` | Frontmatter + sections to fill in. Mirrors the existing four skills so the structure is consistent. |
| `references/template-reference.md` | Stub for one reference doc. Delete if your skill doesn't need any. |
| `README.md` (this file) | Step-by-step instructions. Don't ship this with your new skill — delete it after copying. |
