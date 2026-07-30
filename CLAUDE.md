# Smart Menu

⚠️ This is NOT the Next.js you know. Read `node_modules/next/dist/docs/` before writing code. Breaking APIs, conventions, file structure differ from training data.

- App Router | RTL-first Arabic | Tailwind CSS 4 | shadcn/ui base-nova
- Prisma + PostgreSQL | JWT httpOnly cookies | PWA + SSE orders
- See `PROJECT.md` for full structure, architecture, API reference, conventions, and env vars

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
