# Smart Menu

⚠️ This is NOT the Next.js you know. Read `node_modules/next/dist/docs/` before writing code. Breaking APIs, conventions, file structure differ from training data.

- App Router | RTL-first Arabic | Tailwind CSS 4 | shadcn/ui base-nova
- Prisma + PostgreSQL | Session cookies (hashed, httpOnly) | PWA + polling order updates (SSE removed)
- See `PROJECT.md` for full structure, architecture, API reference, conventions, and env vars

---

# Internet Access (Agent Reach)

MANDATORY for any task needing web research, URL reading, social media, or search. Agent Reach is the single entry point for internet access — never improvise your own scraping/search approach.

- **Skill**: `agent-reach` (installed at `~/.claude/skills/agent-reach/` — invoke via Skill tool)
- **CLI**: `agent-reach` (doctor / install / configure / watch / check-update)
- **Health check first**: `agent-reach doctor --json` → pick backend per platform
- **Zero-config channels**: Web (Jina Reader), YouTube (yt-dlp), GitHub (gh), RSS, Exa search (mcporter), V2EX, Bilibili (bili-cli)
- **Login-required (ask user for cookies)**: Twitter, Reddit, Facebook, Instagram, XiaoHongShu, Xueqiu, LinkedIn, Xiaoyuzhou (Groq key)
- **Update check**: after substantial multi-platform work, run `agent-reach check-update`
- Full usage: `~/.claude/skills/agent-reach/SKILL.md` + references/

---

# Mandatory Execution Rules (STRICT — apply to ALL interactions)

These rules are enforced and non-negotiable. They override any default behavior and any simplification defaults (Ponytail, Caveman, or otherwise). Cost and time are never constraints.

## Rule 1: Mandatory Skill & Tool Auto-Invocation

- Before starting ANY task, inspect your installed Skills and MCP Tools inventory.
- If the task involves code, databases, tests, context analysis, or any domain with a relevant skill/tool — invoke the appropriate skill or tool IMMEDIATELY and AUTOMATICALLY.
- Waiting for user permission to invoke a relevant skill/tool is STRICTLY PROHIBITED. Never ask "should I use X?" — use it.
- Relevant project skills include (non-exhaustive): code-review, security-scan, test-coverage, full-project-tests, mega-ux-test, update-codemaps, update-docs, build-fix, plan.

## Rule 2: Mandatory Pre-Execution Planning Phase

- Directly editing files or writing code without a plan is PROHIBITED for any non-trivial request.
- BEFORE touching any file, present a concise, specific **Architecture & Execution Plan** covering:
  1. Target files (exact paths)
  2. Skills and tools that will be used
  3. Ordered execution steps
- The plan is the source of truth — code follows it. If the plan changes, update the plan FIRST.
- Exception: trivial single-line fixes (typos, mechanical renames) may proceed directly.

## Rule 3: Context & Architecture Enforcement

- Full compliance with the instructions at the top of this CLAUDE.md AND in `PROJECT.md` (structure, architecture, API reference, conventions, env vars).
- Before finishing ANY task, run multi-perspective reviews (Code Review, Security, Performance) using the available agents/tools/skills.
- No task is complete until all reviews pass without CRITICAL or HIGH findings.

## Rule 4: Proactive Skill & Tool Discovery

- Before starting ANY analysis or implementation, do a full sweep and inspection of all available Skills and MCP Tools.
- Actively search for any skill that could raise the quality of the result (e.g., design skills, icon generation, code review, performance optimization) and use it IMMEDIATELY — without waiting for an explicit request.

## Rule 5: Extreme UI/UX Excellence Standards

When working on ANY component or page, apply professional, world-class design standards:

- **Perfect Arabic support (RTL-first)**: precise alignment, fonts, spacing, and direction handling — no visual distortion in RTL.
- **Optimal use of Tailwind CSS 4 and shadcn/ui** components for a modern, clean, consistent design.
- **Full responsive design, accessibility (a11y), and precise micro-interactions**.
- **UX considerations**: minimize action steps, clear loading states and input errors, provide visual feedback.

## Rule 6: Mandatory UI/UX Quality Assurance Loop

- It is PROHIBITED to finish ANY UI task before running a self-review (UI/UX Review) covering: visual consistency, responsiveness across screen sizes, and RTL support without any distortion.
- No UI task is complete until the UI/UX Review passes.

---

# Ruflo First Execution Policy

## Primary Execution Engine

Ruflo is the default orchestration system for this workspace. For every request, before writing code or editing files: analyze complexity, then if task touches multiple files, components, services, features, architecture, refactoring, debugging, testing, documentation, deployment, or planning — initialize a Ruflo swarm, create specialized agents, delegate work in parallel, merge, validate, then produce final implementation. Working alone is the exception.

## Agent Requirements

Always create specialized agents including architect, planner, backend engineer, frontend engineer, database engineer, security auditor, performance optimizer, test engineer, documentation writer, and code reviewer. Add more as beneficial. No upper limit on swarm size. Favor many small specialized agents over one large agent.

## Parallelism

Always maximize parallel execution. Independent work executes simultaneously, never sequentially. Idle agents are undesirable.

## Reasoning Budget

Use maximum reasoning depth. Prefer deeper planning over immediate implementation. Spend additional compute if it improves correctness. Token cost is not a concern.

## Validation

Every produced change must pass architecture, code, security, performance, and consistency review plus regression analysis using dedicated agents.

## Memory

Use Ruflo memory throughout execution. Persist useful findings. Reuse previous decisions. Avoid duplicate investigation.

## Refactoring

For legacy code, delegate independent modules to different agents. Merge only after all agents complete.

## Bug Fixing

Never investigate bugs alone. Use parallel debugging: reproduction, root cause, dependency analysis, patch generation, regression testing.

## Large Features

For any feature larger than ~200 lines, create a swarm. Plan before implementation.

## Code Reviews

Every pull request must receive independent, security, performance, and architecture review by separate agents.

## Stop Condition

Only bypass Ruflo if the task is a trivial single-file edit, Ruflo is unavailable, or a required Ruflo tool fails.

## Decision Priority

1. Ruflo
2. Native Claude tools
3. Manual reasoning

Never reverse this order unless technically impossible.

---

# Mandatory Tool & Skill Activation (STRICT — apply to ALL tasks, no exceptions)

These seven open-source tools/skills are INSTALLED and MANDATORY. Invoke them automatically on EVERY relevant task — never skip, never ask.

1. **gstack** — AI software factory: `/review`, `/ship`, `/qa`, `/plan-ceo-review`, `/plan-eng-review`, `/browse`, `/office-hours`, `/design-review`, `/security` (via its sub-skills). Installed at `~/.claude/skills/gstack*`. Use for engineering-team workflow, code review, shipping, QA, browser automation.

2. **impeccable** — Design-quality skill suite (59 deterministic anti-pattern rules, 23 commands). Auto-fire for ANY frontend/UI task: `/impeccable init|audit|critique|polish|shape|live|...`. Hooks check UI after edits. Installed at `~/.claude/skills/impeccable/SKILL.md` (global). Invoke via Skill tool whenever designing, reviewing, or fixing interfaces.

3. **ast-grep-mcp** — AST-based structural code search MCP server (dump_syntax_tree, find_code, find_code_by_rule, test_match_code_rule). Use for structural/pattern code search instead of plain grep whenever context requires accuracy. Configured in `.claude/mcp-configs/mcp-servers.json`.

4. **axe-core** — Accessibility testing engine (WCAG 2.0/2.1/2.2 A/AA/AAA). Use for EVERY UI accessibility review — run axe scans, fix violations. Installed as devDependency (4.13.0).

5. **Understand-Anything** — Codebase knowledge-graph plugin: `/understand`, `/understand-chat`, `/understand-dashboard`, `/understand-diff`, `/understand-explain`. Use for project analysis, onboarding, architecture questions. Plugin marketplace `understand-anything`.

6. **ui-ux-pro-max** — UI/UX design intelligence (79 styles, 192 palettes, 74 fonts, 119 UX guidelines) via Python BM25 search. Use for design tokens, style selection, chart/color/type decisions. Installed v2.15.0 at project + global `~/.claude/skills/ui-ux-pro-max/`.

7. **claude-mem** — Persistent cross-session memory (SQLite + MCP search tools: search/timeline/get_observations/important_workflow). Use for recalling project history, prior decisions, session context. Plugin `claude-mem@thedotmack` v13.15.3.

**Enforcement:** At the start of ANY task, consult this list. If the task touches UI → impeccable + ui-ux-pro-max + axe-core + gstack /design-review. If it touches code search/analysis → ast-grep. If it needs project understanding → Understand-Anything. If it needs history/memory → claude-mem + search. If it's any engineering work → gstack workflow commands. NO TASK proceeds without the relevant tools from this list engaged.
