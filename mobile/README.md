# Smart Menu — Mobile (الربط الذكي)

Native companion app for the Smart-Menu platform (Libya): customers browse a
restaurant's public menu, build a cart with modifiers, and send the order
through WhatsApp; owners log in to watch live orders (5s polling), print/show
QR codes, and manage the menu. Talks to the same production API as the web app
(<https://menu.smart-link.ly>) — **Arabic-only, RTL-first UI**.

Web app + full architecture: see the repo root `README.md` / `PROJECT.md`.
Mobile engineering history: `docs/ENGINEERING_STATE.md` (r100-r119) and
`docs/mobile-*.md`.

## Stack

- **Expo SDK 53** · React Native **0.79.6** · React 19 · **Hermes** engine · new architecture (Fabric/bridgeless)
- NativeWind 4 (Tailwind for RN) · React Query · Zustand (cart/auth stores) · React Navigation 7
- `expo-secure-store` (session Bearer token) · `expo-image` / `expo-image-picker` · FlashList
- TypeScript (~5.8) · ESLint (`eslint-config-expo`, legacy eslintrc mode)

## Setup

```bash
cd mobile
pnpm install          # Node 20+ required (root web workspace needs 24 — both fine side-by-side)
npx expo start        # Metro dev server → scan the QR with Expo Go / open an emulator
```

**pnpm version note (deliberate dual-pin):** the ROOT workspace pins
`pnpm@11.9.0` (web) while `mobile/package.json` pins `pnpm@10.34.5` — pnpm's
`manage-package-manager-versions` switches automatically when you run any pnpm
command inside `mobile/` (you'll see "Using pnpm v10.34.5"). Do NOT try to
"fix" this by aligning the pins — see the `mobile` job comment in
`.github/workflows/ci.yml` for the trap (pinning both in CI makes
`pnpm/action-setup` fail with "Multiple versions of pnpm specified").

Install uses `.npmrc` `node-linker=hoisted` (RN autolinking requirement) — the
same install shape the EAS build uses.

## Environment variables

All three are **optional** — each has a production default baked in
(`mobile/src/services/api/client.ts` + screens). Create `mobile/.env`
(copy `.env.example`) only to override, e.g. to point a local build at your
machine's web dev server:

| Variable | Default | Used for |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://menu.smart-link.ly` | Base URL of every API call (menu, orders, login) |
| `EXPO_PUBLIC_DOMAIN` | `https://menu.smart-link.ly` | Public web links (share / order-confirmed / owner menu CRUD web-redirect) |
| `EXPO_PUBLIC_WHATSAPP_NUMBER` | `+218910089975` | Support WhatsApp button (login screen, floating button) |

Local web development: run the web app (`pnpm dev` at repo root) and set
`EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:3000` — a real device/emulator
cannot reach `localhost`. EAS profiles in `eas.json` bake the production URL
into every build.

## RTL design

Arabic-only product: the UI renders RTL from the **first frame** —
`plugins/with-force-rtl` (registered in `app.json` plugins) sets
`android:layoutDirection="rtl"` on the application/activity manifest and strips
English from iOS `CFBundleLocalizations` at PREBUILD time, so there is no
LTR→RTL flash or restart requirement (the runtime `I18nManager.forceRTL()` in
`App.tsx` is kept as a safety net). Fonts: Cairo + Readex Pro TTFs via
`expo-font` (same brand faces as the web app).

## Building

- **EAS** (preferred): `eas build --profile preview` (internal APK) or
  `--profile production`. Profiles live in `eas.json`; `app.json` carries the
  EAS project id, Android App Links (`menu.smart-link.ly`), and the plugin
  chain — notably `expo-build-properties` **minSdkVersion 25** (API 24 devices
  fail TLS 1.2 with our cert chain — proven on a real API 24 emulator, r114)
  and the `VIBRATE`-only permission set (unwanted template permissions are
  pruned via `blockedPermissions`).
- **Local prebuild**: `npx expo prebuild --platform android` then
  `cd android && ./gradlew assembleRelease` (the r114 local-keystore path —
  see `docs/ENGINEERING_STATE.md`).

## Gates

```bash
pnpm typecheck    # tsc --noEmit — 0 errors required
pnpm lint         # eslint . (ESLINT_USE_FLAT_CONFIG=false for eslint-config-expo)
pnpm doctor       # advisory only (registry-dependent, flaky as a gate)
```

From the repo root, `pnpm verify:mobile` runs the two blocking gates in one
command. CI mirrors this in the `mobile` job of `.github/workflows/ci.yml`
(plus a Metro/Hermes `expo export` bundle check).
