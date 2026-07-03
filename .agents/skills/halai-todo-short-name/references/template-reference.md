# <TODO Reference title>

This is a stub reference doc. Replace this whole file with the real content for your skill, or delete it if your skill doesn't need any references.

## What goes here

References are loaded on demand by the agent — only when the skill needs the detail. Use this file for:

- Full argument tables and edge cases.
- Style preset libraries / prompt galleries.
- Troubleshooting trees.
- Anything an agent only needs once, after deciding the path.

What does NOT go here:

- Anything that drives the agent's next-turn decision (mode selection, scope detection). That belongs in `SKILL.md`.
- Static rules that apply on every turn. Those belong in `SKILL.md` too.

## Length budget

References do not have a hard line limit, but keep them tight. The agent reads them via `Read` when it needs them, so paging through 1500 lines just to find one cell of a table is bad UX.

If a reference grows past ~400 lines, split it into two or three smaller files.
