# Smart-Menu Mobile — Deployment Status Report

> **Date:** 2026-09-11 (round r101 refresh — post successful EAS build)
> **Scope:** Current verified state of the mobile app + backend contract

---

## Deployment Status

| Item | Status | Evidence |
|---|---|---|
| GitHub repository | ✅ PASS | `main` @ `e4c6ccb8` → r101 quality pass pushed after this report |
| Vercel project | ✅ PASS | Project `prj_h9LlzVPyGFxZpjffb4pLNCdsbzhG`, framework=nextjs |
| Backend API | ✅ PASS | `https://menu.smart-link.ly/api/health` → `{"status":"ok","db":"connected","commitSha":"e4c6ccb8"}` |
| Authentication (Bearer) | ✅ PASS | `/api/auth/me` with Bearer → token lookup runs (Arabic 401 for invalid) |
| Authentication (X-Client-Type: mobile) | ✅ PASS | `/api/auth/login` with header → CSRF bypass + Zod reached (Arabic error) |
| CSRF protection (web) | ✅ PASS | POST `/api/orders` without Bearer → `CSRF validation failed` |
| CSRF bypass (mobile) | ✅ PASS | POST `/api/orders` with Bearer → Zod validation reached |
| Public menu API | ✅ PASS | `GET /api/public/menu/[slug]` → restaurant + categories + items, one round-trip |
| Expo project | ✅ PASS | `4a2678f7-1871-4049-8962-06367cd5c1a9` (@rh2011/smart-menu) |
| EAS CLI | ✅ Authenticated | Account `rh2011` (Admin) via `EXPO_TOKEN` |
| Android Build | ✅ **FINISHED** | Build `7f74ae0a-ea6e-472b-b65c-8a66eb438ba0` (preview profile, APK) — artifact verified downloadable; r101 rebuild in flight with quality fixes |
| iOS Build | ⏸ BLOCKED | Requires Apple Developer Program membership ($99/year) |
| expo-doctor | ✅ PASS | 18/18 checks passed (r101) |
| Security | ✅ PASS | Only `EXPO_PUBLIC_*` vars in mobile bundle; no secrets in any file |
| Web regression | ✅ PASS | r101 touches `mobile/` only (`.vercelignore`d — web deployment unaffected) |

## r101 Quality Pass (2026-09-11)

| Gate | Before | After |
|---|---|---|
| `tsc --noEmit` (mobile) | 0 errors | **0 errors** |
| `eslint .` (mobile) | 0 errors / 37 warnings | **0 errors / 0 warnings** |
| `expo-doctor` | not runnable (old env) | **18/18 passed** |

Fixes shipped:
- All 37 lint warnings eliminated: `any` types → proper types (`RootNavigation`, `getErrorMessage`, `ToastConfig`), unused imports removed, hook deps corrected (`usePollWhenVisible`, MenuScreen cart via `useCart.getState()`).
- Arabic UX parity: order statuses now render Arabic labels from `getOrderStatusMeta` (جديد/قيد التحضير/جاهز/مكتمل/ملغى) instead of raw English keys; pickup types via `getPickupTypeMeta` (داخل المكان/سفري/توصيل); timestamps via `formatRelativeTimeAr` (قبل 5 دقائق) — same presentation lib the web app uses.
- OwnerOrderDetail: failed loads now show `ErrorState` with retry instead of a perpetual spinner.
- Toast accent moved to the RTL start edge (right side) to match the forced-RTL layout.

## Production/Testing URLs

| Service | URL | Status |
|---|---|---|
| Web app (Vercel) | `https://menu.smart-link.ly` | ✅ Live |
| Health check | `https://menu.smart-link.ly/api/health` | ✅ 200 OK |
| Public stats | `https://menu.smart-link.ly/api/public/stats` | ✅ 200 OK (254 restaurants / 680 users) |
| Public menu | `https://menu.smart-link.ly/api/public/menu/al-aseel` | ✅ 200 OK |
| Plans list | `https://menu.smart-link.ly/api/plans` | ✅ 200 OK |
| APK artifact (r100) | `https://expo.dev/artifacts/eas/jSnx07aa67EySe3roDJAAJOkzFOwcnOfsyhNlmP6cgA.apk` | ✅ Live (~86 MB) |

## Remaining Issues

1. **iOS build** — blocked on Apple Developer Program membership (external).
2. **Real-device QA** — APK installs on any Android 8+ device; pixel fidelity, keyboard behavior, and WhatsApp deep-link return behavior need on-device verification (no physical device in CI environment).
3. **Owner menu editor** — mobile intentionally defers full CRUD to the web app (v1 scope); screen states this clearly.
4. **Push notifications** — deferred to v2; owner screens poll every 15s while foregrounded.

## Security Note

Tokens used this session were process-env only — never committed, never written to files. Rotate any credential that has ever appeared in chat history.
