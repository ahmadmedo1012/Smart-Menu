# Phase 9 (P9-3-b) — landing stage evidence

Captured against the production build (`next build` + `next start -p 3117`)
at HEAD of this commit, Playwright chromium-1248, `localStorage.theme`
pre-seeded per shot:

- `landing-light-1440.png` / `landing-light-390.png` — the cream paper
  stage (default): `.landing` bg `#F7F1E3`, toggle aria «الوضع الليلي».
- `landing-dark-1440.png` / `landing-dark-390.png` — the §19 warm night
  stage (html.dark): `.landing` bg `#241811`, toggle aria «الوضع النهاري».
- `landing-{light,dark}-1440-full.png` — full-page passes (all chapters:
  marquee, المنيو الحي board, journey, ambience, owner, الختام back-cover
  pinned espresso `#190F0A`, FAQ, footer).

Live-computed during capture: toggle 44×44 at every viewport, click flips
`html.light ↔ html.dark` at 1440 and 390, zero horizontal overflow at 390,
zero page errors. Full computed-style ledger in the P9-3-b worklog entry.
