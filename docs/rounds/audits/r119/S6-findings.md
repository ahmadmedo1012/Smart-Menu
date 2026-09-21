# S6 — Mobile deep audit r2 (r119, round S6)
Scope: `/home/z/my-project/repos/Smart-Menu/mobile` (Expo SDK 53 / RN 0.79.6 / React 19 / Hermes, newArch). READ-ONLY. All file:line verified 2026-09-21. Roadmap gaps (owner-menu CRUD stub, admin placeholders, no signup funnel, no reviews UI, loyalty/referral, first-launch RTL) deepened — not re-reported as new.

---

## 1. First-launch RTL restart — ROOT CAUSE (roadmap gap DEEPENED → P1)

**Verdict: `forceRTL` is called in the JS bundle, not at native build time — one launch too late by design.**

- `mobile/src/app/App.tsx:26-29` — `if (!I18nManager.isRTL) { I18nManager.forceRTL(true); … }` runs at module scope of the JS entry. `forceRTL` writes a **persisted native preference** (Android SharedPreferences / iOS NSUserDefaults) that is only **read at native process start**. On a first-ever launch the native window, splash (expo-splash-screen native view), Yoga layout direction and initial render are already LTR — the pref takes effect from launch #2. This is the entire "first-launch RTL needs restart" bug. It is NOT in a useEffect (that would be worse); module scope is still after the native frame exists.
- Missing build-time RTL config:
  - `mobile/app.json:83-87` — `extra` contains only `eas.projectId`; no `supportsRTL` flag. No `expo-localization` dependency either (`package.json:16-53`).
  - Prebuilt `mobile/android/app/src/main/AndroidManifest.xml:15` — `android:supportsRtl="true"` is present (prebuild default) but **only allows** RTL for RTL-locale devices; it does not *force* it. English-locale phones (common in LY) still launch LTR natively.
  - `mobile/app.json:15-18` — iOS `CFBundleLocalizations: ["ar","en"]`: on an English-locale iPhone iOS resolves "en" → first frame LTR.
- Note: `android/` is gitignored (`mobile/.gitignore` → `android/`), so EAS regenerates it from app.json — **app.json/plugins is the single source of truth**; hand-editing the manifest alone would be wiped by the next prebuild.

**Concrete fix (no restart, first frame RTL, survives prebuild):**
1. Android: force layout direction at build time via a config plugin. Create `mobile/plugins/withForceRTL.js` using `withAndroidManifest` (`@expo/config-plugins`) to set `application[0].$["android:layoutDirection"] = "rtl"` (keep `supportsRtl="true"`), register it in `mobile/app.json:55-79` `plugins` array. Equivalent local check: same attribute on `AndroidManifest.xml:15`.
2. iOS: drop `"en"` from `CFBundleLocalizations` (app.json:15-18) → Arabic-only app always resolves `ar` (dev region already `ar`, app.json:19) → RTL first frame on any device language.
3. Keep `forceRTL(true)` in App.tsx:27 as an idempotent safety net (Expo Go / dev-client without the plugin); optionally add `"supportsRTL": true` to `extra` (app.json:83) per Expo localization guide.
4. `expo-updates` is NOT installed and updates are disabled (`AndroidManifest.xml:17` `expo.modules.updates.ENABLED=false`) — so the common `Updates.reloadAsync()` workaround is NOT available here; the config-plugin route is the only clean one.

---

## 2. react-query hygiene (mandate #2) — **ZERO queries exist** (P2, audit-integrity)

- `grep useQuery|useMutation|useInfiniteQuery` over `mobile/src` → **no matches**. `@tanstack/react-query` is imported exactly once: `mobile/src/app/providers.tsx:2` to construct the `QueryClient`.
- Therefore the r118-B3 "react-query retry" fix (`providers.tsx:8-20`: `retry: failureCount < 2`, `staleTime: 30_000`, `gcTime: 5min`) configures a client that **nothing consumes** — it has no runtime effect on any screen. The ledger entry describes capability that does not exist in practice.
- Consequences: no request dedup, no cache, no `persistQueryClient` (→ **no offline menu cache**, see §4), no invalidation story to audit. All data fetching is hand-rolled `useEffect` + `useState` (e.g. `MenuScreen.tsx:78-131`, `OwnerScreens.tsx:35-48,158-172`).
- Fix (pick one): (a) actually adopt react-query for the fetch-heavy screens (menu, orders, plans, stats) and enable `persistQueryClient` + `createAsyncStoragePersister` for offline menus, or (b) remove the dep + provider to cut bundle weight. Given the roadmap, (a) is recommended — the retry/staleTime config is already correct.

### r118 poll-merge race review (mandate #2b) — implementation solid, 2 residual races (P3)
`OwnerScreens.tsx:180-197` (poll) + `:201-220` (loadMore):
- Correct: both-direction id-dedupe (`:186-188`, `:211-212`), `pageRef` preserved by poll (`:190`), poll silent-fails by design (`:191-194`), in-flight guard via `usePollWhenVisible` (`usePollWhenVisible.ts:26-30`) which is also AppState-aware (`:44-50`).
- **Race A (P3)**: pull-to-refresh `load` (`:158-170`) has no guard against an in-flight `loadMore` (`loadMore` guards `loading||loadingMore` at `:202`, but not vice versa). If `load` resolves after `loadMore`, `setOrders(page1)` truncates the list and `setPagination(1,…)` resets — user's loaded pages silently vanish mid-scroll. Fix: mutual exclusion ref, or make `load` merge-preserving.
- **Race B (P3)**: poll prepends new orders at the head (`:188`) with no `maintainVisibleContentPosition` on the FlatList (`:266-288`) → visible content jumps every 15s while the owner reads older pages. Fix: add `maintainVisibleContentPosition={{minIndexForVis: 0}}` (Android; iOS via `invertStickyHeaders`-safe default).

---

## 3. Auth/token lifecycle (mandate #3)

- **Storage: SecureStore ✔** — `mobile/src/services/api/client.ts:28-38` (`expo-secure-store`, `keychainAccessible: WHEN_UNLOCKED`). Key name duplicated between `client.ts:16` and `constants/index.ts:17` (dead constant — see P4).
- **401 handling ✔** — `client.ts:97-100` clears the token exactly once per dead-token 401 and fires `registerUnauthorizedHandler` → `store/auth.ts:85-87` resets the store → `RootNavigator.tsx:162-171` lands on the public stack. Bootstrap keeps the token on network/5xx (only a definitive 401 or `authenticated:false` wipes it) — `auth.ts:44-60` (r103-N1, good).
- **No refresh mechanism** — server-side sessions; acceptable, nothing to fix client-side.
- **Token in query keys** — moot (zero queries, §2).
- **P2 — offline logout is broken + unhandled rejection**: `store/auth.ts:75-78` `logout: async () => { await logoutRequest(); set(…) }` has **no try/catch**. If the device is offline / server unreachable, `logoutRequest()` rejects → `set()` never runs → user stays logged in, and the rejection is unhandled (both call sites pass the raw thunk to `onPress`: `OwnerScreens.tsx:97` and `:511`, `AdminScreens.tsx:26`). Fix: clear local state first (`setStoredToken(null)` + reset), then best-effort `logoutRequest().catch(() => {})`.

---

## 4. Offline / airplane mode (mandate #4)

- Crash containment ✔ (r118 ErrorBoundary, `App.tsx:74`, `components/ErrorBoundary.tsx`).
- List failure states ✔ with working retry (the r103-N2 hoisted-`load` pattern): Menu `MenuScreen.tsx:160-166`, Orders `OwnerScreens.tsx:257-263`, Plans `SubscribeScreens.tsx:50-56`, QR `OwnerScreens.tsx:453-454`, Dashboard inline `:64`. `ErrorState` renders Arabic message + retry button.
- **No offline cache (P2, folded into §2)** — no `persistQueryClient`/async-storage persister anywhere; airplane mode = full error screens for everything except the cart (cart persists via zustand `persist` + AsyncStorage, `store/cart.ts:61-127`). For a QR-menu app whose primary use is in-restaurant (patchy LTE), caching the last menu per slug would remove the most common dead-end. Suggest §2 option (a) + persister.
- **ConnectivityBanner missing on owner/admin screens (P3)** — banner mounted only on Menu/Landing/Pricing (`MenuScreen.tsx:173`, `LandingScreen.tsx:39`, `PricingScreen.tsx:64`). Owner orders/dashboard poll silently-fail offline (`OwnerScreens.tsx:191-194`) with no offline indicator; a first-time owner thinks the app is broken. Fix: hoist `ConnectivityBanner` to `App.tsx` above `RootNavigator`.

---

## 5. Deep links (mandate #5)

- Scheme `smartmenu` + App Links `https://menu.smart-link.ly` — `app.json:8,33-48`, manifest intent filters `AndroidManifest.xml:16-32` (`autoVerify=true`, `launchMode="singleTask"` ✔). `assetlinks.json` has both EAS + local fingerprints — `public/.well-known/assetlinks.json:10-11` (matches r114 local keystore `a1f3c22f…f30b8`).
- Route handling: `navigation/linking.ts:3-16` maps public screens only (incl. the r103-N11 `order-confirmed?orderNo=` query-param fix). Authed-user handling (r102-M6 overlay + r103-N7 one-shot consume) at `RootNavigator.tsx:47-72,118-148` — warm (`url` event) and cold (`getInitialURL`) both covered; the module-level `publicStackRendered` flag prevents double-consumption. Good engineering.
- Bad links: unknown paths → `publicRouteForUrl` returns null (`RootNavigator.tsx:47-72`) → ignored (warm) / initial route Landing (cold). Safe.
- P4 noise: the authed container also mounts `linking={linking}` (`RootNavigator.tsx:184`) whose config contains only public screen names → React Navigation logs "not handled" warnings for every cold-start deep link while signed in. Fix: pass a `screen`-less/empty config (or `enabled:false`) on the authed branch.
- P4 dead type: `Login: { redirect?: string }` (`PublicStack.tsx:13`) — no caller sets it, no screen reads it.
- Web-only paths (`/dashboard`, `/admin…`, subscription emails links) open the app → Landing. Acceptable; note as future owner-route mapping.

---

## 6. Navigation & a11y (mandate #6)

- Stack/tab structure: `PublicStack.tsx`, `OwnerStack.tsx` (bottom tabs + detail stack), `AuthStack.tsx`, `AdminStack.tsx`. All screens carry Arabic `title`s (e.g. `PublicStack.tsx:29-34`, `OwnerStack.tsx:31-52`) ✔; tab labels present ✔.
- **P3 — `Button` lacks a11y semantics**: `components/ui/Button.tsx:40-46` — no `accessibilityRole="button"`, no `accessibilityState={{ disabled, busy: loading }}`; loading state renders "…" replacing the title (screen-reader user loses context). Most custom Pressables DO carry Arabic `accessibilityLabel` (e.g. `MenuScreen.tsx:183,267`, `RootNavigator.tsx:105`) — Button is the outlier.
- Back behavior: native-stack default; `OrderConfirmed` hides back (`PublicStack.tsx:32`) — correct post-checkout. iOS edge-swipe is direction-aware under RTL; Android hardware back standard. No drawer anywhere (so no RTL drawer-swipe conflict) — but see P4 dead `@react-navigation/drawer` dep.
- `KeyboardShouldPersistTaps` present on Login (`LoginScreen.tsx:51`) ✔.

## 7. Lists & perf (mandate #7)

- Menu list: **FlashList** with `estimatedItemSize={120}` — `MenuScreen.tsx:219-232` ✔ (r118). Orders: FlatList + `keyExtractor` + `onEndReachedThreshold` — `OwnerScreens.tsx:266-288` ✔. Landing featured: horizontal ScrollView map (`LandingScreen.tsx:68-80`) — small N, fine. Images: `expo-image` `cachePolicy="memory-disk"` + blurhash placeholder — `components/shared/OptimizedImage.tsx:13-21` ✔.
- **P3 — no memoization on the hot path**: `filteredItems` recomputed on every render incl. every search keystroke (`MenuScreen.tsx:134-150`, no `useMemo`), and `MenuItemCard` is a plain function component (`:260-295`, no `React.memo`) → each keystroke re-renders every visible card. For a 100+ item menu this is visible jank on low-end Android. Fix: `useMemo` the filter (deps: items, activeCategory, debounced search) + `memo(MenuItemCard)`.
- **P3 — unguarded API payload**: `OwnerScreens.tsx:81,84` — `stats.recentOrders.length` / `.slice(0,5)` without `?.` — a malformed `/api/stats` payload throws inside render → whole-app ErrorBoundary fallback (r118 boundary catches it, but the blast radius is a full app remount instead of one panel). Fix: `stats.recentOrders ?? []`.
- Cart items rendered via ScrollView map (`MenuScreen.tsx:509-530`) — bounded by cart size, acceptable; clamp at MAX_ITEM_QUANTITY=99 per line (`store/cart.ts:91,101`).

## 8. Forms & keyboards (mandate #8)

- Login: `KeyboardAvoidingView` `padding`(iOS)/`height`(Android) + `keyboardShouldPersistTaps="handled"` — `LoginScreen.tsx:50-51` ✔ (standard-correct).
- **P3 — subscribe wizard has no keyboard avoidance on iOS**: `SubscribeScreens.tsx:111-123, 189-211` — ScrollView + **absolute bottom CTA** (`:120`, `:208`). Android is saved by `windowSoftInputMode="adjustResize"` (`AndroidManifest.xml:16`), but on iOS the keyboard will cover the sticky "التالي"/"إرسال طلب الدفع" button. Fix: wrap in KAV (padding) or use `keyboardLayout="animated"` positioning for the CTA.
- Multiline notes input: `textAlignVertical: "top"` + `multiline` ✔ (`MenuScreen.tsx:420-427`). Arabic alignment relies on process RTL; **after the §1 fix first launch is RTL so alignment is correct** — today first launch shows LTR-aligned Arabic (same root cause). Phone/numeric inputs (`MenuScreen.tsx:534`, `SubscribeScreens.tsx:200-201`) hold LTR digits — verify on device; consider `textAlign` for numeric fields.
- No order-level notes input exists in CartSheet although `notes` is read and sent (`MenuScreen.tsx:453,470,475`; setter `setOrderNotes` exists `store/cart.ts:106` with zero callers) — **P3**: field is wired end-to-end but unreachable by users (web parity gap).

## 9. Subscription payment flow lifecycle (mandate #9)

- Happy path: Plans (`SubscribeScreens.tsx:27-40`, retry ✔) → validate + persist pending payload to AsyncStorage (`:98-109`) → POST `/api/subscriptions` with planId (r102-M3 ✔) → **in-screen success state** (r118-B3 fix, `:165-187`) → `popToTop` (`:179`).
- **No status polling (P3)**: `meRequest` runs ONLY at cold bootstrap (`store/auth.ts:25`). After admin approval/rejection the in-session `user.subscriptionStatus` never refreshes — the success copy admits it ("عند إعادة فتح التطبيق", `:176`). Owner must kill & relaunch to see the dashboard. Fix: poll `/api/me` (reuse `usePollWhenVisible`) on the success screen, or refresh on AppState→active.
- **REJECTED path (P3)**: rejected owners land back in the wizard (`RootNavigator.tsx:177-178`) with **no rejection reason/banner** and no hint they should re-upload a receipt. Server-side resubmission handling is out of mobile scope (web r110 has the retry path).
- **Receipt upload promised but absent (P2)**: `SubscribeScreens.tsx:204` tells users "ارفع صورة الإيصال من شاشة الإعدادات لاحقًا" — `OwnerSettingsScreen` is logout-only (`OwnerScreens.tsx:505-517`), and there is **zero `expo-image-picker` usage in the whole src/** (grep: no matches). The only upload path is the web app. Deepens the documented gap with a concrete broken promise; either ship the upload sheet or change the copy to point at the web URL.
- Deep-link return: N/A — payment is manual transfer (no external gateway jump), no return URL needed. ✔ verified no `Linking.openURL` in the subscribe flow.
- **Idempotency key regenerated per attempt (P2)**: `MenuScreen.tsx:467` — a fresh `idempotencyKey` is minted on every `onCheckout`. The r103-N4 dedupe covers the WhatsApp-open failure (same attempt), but a **network timeout after the server processed the order** (15s AbortController, `client.ts:48,81`) followed by user retry mints a NEW key → duplicate order + duplicate WhatsApp invoice. Fix: generate the key once per cart session (ref/persisted) and only rotate after confirmed success/failure.

## 10. Build config (mandate #10)

- **Android permissions over-provisioned (P2 — Play policy risk)**: `AndroidManifest.xml:3-7` — `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (deprecated, no-op on targetSdk 33+), `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW` + `VIBRATE`, none justified by code (no image-picker, no audio, no overlay, no vibration API anywhere in `src/`). Since `android/` is gitignored and EAS regenerates from app.json, fix at the source: add `"android": { "permissions": [] }` in `app.json:27-49` (Expo always includes INTERNET; the `queries` block for https links is auto-generated and stays). Also drop `expo-image-picker` from `app.json:69` + `package.json:32` until the receipt-upload UI ships (its iOS strings `app.json:20-21` are then dead too).
- **minSdk (r114 ledger decision pending)**: current value = **Expo SDK 53 default (24)** — no override anywhere: `android/app/build.gradle:93` uses `rootProject.ext.minSdkVersion`, which the `expo-root-project` gradle plugin injects (24); `app.json` has **no `expo-build-properties` plugin** (`app.json:55-79`). r114 proved API 24 (Android 7.0) fails TLS to Let's Encrypt (ISRG Root X1 absent from the 2016 trust store) — installs run but every API call dies (`docs/ENGINEERING_STATE.md:165,234`). **Exact change location**: add to `app.json` plugins — `["expo-build-properties", { "android": { "minSdkVersion": 25 } }]` (EAS-managed, survives prebuild). Local-build-only alternative: `android/app/build.gradle:93` `minSdkVersion 25` (wiped on next prebuild). Severity P2: narrow device slice (~Android 7.0), but the failure mode is "app installs, then appears broken".
- `keystore.properties` on disk (android/:15) holds store/key passwords but **android/ is gitignored → not in VCS** — no leak. `debug.keystore` is the standard public debug key. Release signing reads the local props (`app/build.gradle:100-108`) ✔.
- **P4 — malformed gradle.properties line**: `android/gradle.properties:61` — `expo.edgeToEdgeEnabled=falseorg.gradle.caching=true` — two properties fused (no newline): gradle caching is silently lost and edge-to-edge gets a garbage value. Split into two lines (local-build artifact only; EAS regenerates a clean file).
- `eas.json:7,12,16` — dev/preview profiles point `EXPO_PUBLIC_API_BASE_URL` at production (single-env project; acceptable, noted).

---

## P4 dead code / hygiene (mobile)
- `@react-navigation/drawer` dep — never imported (`package.json:21`).
- `@gorhom/bottom-sheet` — imported only to mount an unused `BottomSheetModalProvider` (`providers.tsx:4,54`); no sheet anywhere. Pulls in **react-native-reanimated** (native lib in the release binary + `babel.config.js:12` plugin) for nothing — largest avoidable bundle item.
- `useAccessGate` hook + exported gates — zero usages (`hooks/useAccessGate.ts`).
- `SECURE_STORE_USER_KEY` constant — zero usages (`constants/index.ts:20`); token key duplicated between `client.ts:16` and `constants/index.ts:17`.
- `Login: { redirect?: string }` param — dead type (`PublicStack.tsx:13`).
- Copy nit: "العودة للمنيو" on OrderConfirmed navigates to **Landing** (`OrderConfirmedScreen.tsx:52`).

## Untested critical mobile paths (tests/)
- Mobile has **zero tests**: no jest-expo config, no test script (`mobile/package.json:7-14`); root `vitest.config.ts:6` covers `tests/unit/**` against **web** `src/lib/**`. Even `tests/unit/arabic-plural.test.ts:6` imports `@/lib/arabic-plural` — the **web copy**, not `mobile/src/lib/arabic-plural.ts`; the r118 claim that mobile `normalizeArabic` is "byte-identical" has no enforcing test.
- Highest-value untested paths: cart merge/signature logic (`store/cart.ts:74-93`), orders poll-merge dedupe (`OwnerScreens.tsx:180-220`), deep-link parser `publicRouteForUrl` (`RootNavigator.tsx:47-72`), `normalizeArabic`/`toArabicNumber`/`arabic-plural` mobile copies, 401→reset flow (`client.ts:97-100` + `auth.ts:85-87`), receipt builder (`lib/receipt.ts`), checkout idempotency key, modifier engine `menu-types.ts` (shared logic with web — port web's tests).
