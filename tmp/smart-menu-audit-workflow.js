export const meta = {
  name: 'smart-menu-comprehensive-audit',
  description: 'Full Smart Menu audit: 41 agents, code analysis + browser + performance + security + fix plan',
  phases: [
    { title: 'Phase 1: Code Understanding (15 agents)' },
    { title: 'Phase 2: Static Analysis (7 agents)' },
    { title: 'Phase 3: Browser Tests (8 agents)' },
    { title: 'Phase 4: Performance & UX (6 agents)' },
    { title: 'Phase 5: Synthesis (5 agents)' },
  ],
}

const BASE_URL = 'https://menu.smart-link.ly'

phase('Phase 1: Code Understanding (15 agents)')
log('=== PHASE 1: Understanding project structure & code ===')

// Use parallel agents for independent work - these are try-wrapped to handle failures gracefully
const results = {}

try {
  const p1 = await agent(
    'Analyze /home/ahmed/Downloads/smart-menu structure. List: all src dirs, file counts per dir, ' +
    'which dirs have error.tsx, which have loading.tsx. Use Bash, Grep, Read (max 30s). ' +
    'Return: {structure:[], missingErrorBoundaries:[], missingLoading:[], serverClientMix:[]}',
    { label: 'structure-mapper', schema: { type: 'object', properties: { structure: { type: 'array' }, missingErrorBoundaries: { type: 'array' }, missingLoading: { type: 'array' }, serverClientMix: { type: 'array' } } } }
  )
  results.structure = p1
  log('✅ structure-mapper done')
} catch (e) { log('❌ structure-mapper: ' + e) }

try {
  const p2 = await agent(
    'Analyze Prisma schema at /home/ahmed/Downloads/smart-menu/prisma/schema.prisma. ' +
    'List 13 models with fields/relations. Check: missing indexes on FKs, missing @updatedAt, missing onDelete cascade. ' +
    'Run "npx prisma validate" via Bash. ' +
    'Return: {models:[], missingIndexes:[], issues:[]}',
    { label: 'data-model', schema: { type: 'object', properties: { models: { type: 'array' }, missingIndexes: { type: 'array' }, issues: { type: 'array' } } } }
  )
  results.data = p2
  log('✅ data-model done')
} catch (e) { log('❌ data-model: ' + e) }

try {
  const p3 = await agent(
    'Analyze 60 API routes in /home/ahmed/Downloads/smart-menu/src/app/api. ' +
    'Check per route: Zod validation (grep for "z." | ".parse" | "zod"), error handling (try/catch), ' +
    'auth checks (requireAuth/requirePermission), response format (success/error). ' +
    'Return: {totalRoutes:60, validated:0, missingValidation:[], missingErrorHandling:[], authIssues:[], routes:[]}',
    { label: 'api-surface', schema: { type: 'object', properties: { totalRoutes: { type: 'number' }, validated: { type: 'number' }, missingValidation: { type: 'array' }, missingErrorHandling: { type: 'array' }, authIssues: { type: 'array' }, routes: { type: 'array' } } } }
  )
  results.api = p3
  log('✅ api-surface done')
} catch (e) { log('❌ api-surface: ' + e) }

try {
  const p4 = await agent(
    'Deep auth & security audit. Read: /home/ahmed/Downloads/smart-menu/middleware.ts, src/lib/auth.ts, ' +
    'src/lib/session.ts, src/lib/csrf.ts, src/lib/hash.ts, src/lib/keys.ts, src/lib/rate-limit.ts. ' +
    'Check: password hashing algorithm, session expiry, CSP headers, rate limiting config, cookie flags, CSRF. ' +
    'Return: {findings:[{severity,category,issue}], overall:"", criticalIssues:[]}',
    { label: 'auth-security', schema: { type: 'object', properties: { findings: { type: 'array' }, overall: { type: 'string' }, criticalIssues: { type: 'array' } } } }
  )
  results.auth = p4
  log('✅ auth-security done')
} catch (e) { log('❌ auth-security: ' + e) }

try {
  const p5 = await agent(
    'Analyze 80 components in /home/ahmed/Downloads/smart-menu/src/components. ' +
    'Categorize: ui/, shared/, feature/. Check: "use client" directives, prop types, file sizes, memo usage. ' +
    'Find: missing error boundaries, import issues. ' +
    'Return: {uiComponents:0, sharedComponents:0, featureComponents:0, largest:[], missingUseClient:[], issues:[]}',
    { label: 'component-tree', schema: { type: 'object', properties: { uiComponents: { type: 'number' }, sharedComponents: { type: 'number' }, featureComponents: { type: 'number' }, largest: { type: 'array' }, missingUseClient: { type: 'array' }, issues: { type: 'array' } } } }
  )
  results.components = p5
  log('✅ component-tree done')
} catch (e) { log('❌ component-tree: ' + e) }

try {
  const p6 = await agent(
    'Analyze state/routing: /home/ahmed/Downloads/smart-menu/src/store/cart.ts, hooks/useConfig.ts, ' +
    'app/layout.tsx, lib/db.ts. Check Zustand patterns, cart persistence, DB connection pooling, App Router patterns. ' +
    'Return: {storeIssues:[], hookIssues:[], routingIssues:[], dbIssues:[], pagesWithError:[], pagesWithLoading:[]}',
    { label: 'state-routing', schema: { type: 'object', properties: { storeIssues: { type: 'array' }, hookIssues: { type: 'array' }, routingIssues: { type: 'array' }, dbIssues: { type: 'array' }, pagesWithError: { type: 'array' }, pagesWithLoading: { type: 'array' } } } }
  )
  results.state = p6
  log('✅ state-routing done')
} catch (e) { log('❌ state-routing: ' + e) }

try {
  const p7 = await agent(
    'Analyze Telegram + subscriptions logic. Read: /home/ahmed/Downloads/smart-menu/src/lib/telegram*.ts, ' +
    'subscription-decisions.ts, src/app/api/admin/telegram/*, subscriptions/*. ' +
    'Check: webhook security, payment flow, SSE patterns. ' +
    'Return: {telegramIssues:[], paymentIssues:[], subscriptionIssues:[], ssePatterns:""}',
    { label: 'telegram-subs', schema: { type: 'object', properties: { telegramIssues: { type: 'array' }, paymentIssues: { type: 'array' }, subscriptionIssues: { type: 'array' }, ssePatterns: { type: 'string' } } } }
  )
  results.telegram = p7
  log('✅ telegram-subs done')
} catch (e) { log('❌ telegram-subs: ' + e) }

try {
  const p8 = await agent(
    'Audit PWA: /home/ahmed/Downloads/smart-menu/public/manifest.json, sw.js, offline.html. ' +
    'Check: manifest completeness (icons, display, theme_color), SW caching strategy, offline fallback. ' +
    'Return: {manifestIssues:[], swIssues:[], offlineIssues:[], score:""}',
    { label: 'pwa-audit', schema: { type: 'object', properties: { manifestIssues: { type: 'array' }, swIssues: { type: 'array' }, offlineIssues: { type: 'array' }, score: { type: 'string' } } } }
  )
  results.pwa = p8
  log('✅ pwa-audit done')
} catch (e) { log('❌ pwa-audit: ' + e) }

// Phase 2
phase('Phase 2: Static Analysis (7 agents)')
log('=== PHASE 2: Static code quality analysis ===')

try {
  const p9 = await agent(
    'Check TS strictness in /home/ahmed/Downloads/smart-menu. ' +
    'Read tsconfig.json for strict flags. Run "npx tsc --noEmit 2>&1 | head -50". ' +
    'Grep for "any" count, "as " (type assertions), "!" (non-null). ' +
    'Return: {strictMode:false, tsErrors:0, anyCount:0, typeAssertions:0, nonNullAssertions:0, strictIssues:[]}',
    { label: 'ts-strictness', schema: { type: 'object', properties: { strictMode: { type: 'boolean' }, tsErrors: { type: 'number' }, anyCount: { type: 'number' }, typeAssertions: { type: 'number' }, nonNullAssertions: { type: 'number' }, strictIssues: { type: 'array' } } } }
  )
  results.ts = p9
  log('✅ ts-strictness done')
} catch (e) { log('❌ ts-strictness: ' + e) }

try {
  const p10 = await agent(
    'Find code smells in /home/ahmed/Downloads/smart-menu/src. ' +
    'Find files >500 lines. Grep for: console.log, TODO, FIXME, HACK, mutation patterns. ' +
    'Return: {largeFiles:[], consoleLogs:[], todos:[], mutatingCode:[], smells:[{severity,file,issue}]}',
    { label: 'code-smells', schema: { type: 'object', properties: { largeFiles: { type: 'array' }, consoleLogs: { type: 'array' }, todos: { type: 'array' }, mutatingCode: { type: 'array' }, smells: { type: 'array' } } } }
  )
  results.smells = p10
  log('✅ code-smells done')
} catch (e) { log('❌ code-smells: ' + e) }

try {
  const p11 = await agent(
    'Audit deps for /home/ahmed/Downloads/smart-menu. Read package.json. ' +
    'Run "npm outdated 2>&1 | head -40", "npm audit 2>&1 | head -20". ' +
    'Check outdated packages, vulnerabilities, unused. ' +
    'Return: {outdated:[], vulnerabilities:[], deprecations:[], unusedPackages:[], recommendations:[]}',
    { label: 'dep-audit', schema: { type: 'object', properties: { outdated: { type: 'array' }, vulnerabilities: { type: 'array' }, deprecations: { type: 'array' }, unusedPackages: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.deps = p11
  log('✅ dep-audit done')
} catch (e) { log('❌ dep-audit: ' + e) }

try {
  const p12 = await agent(
    'A11y + SEO audit for /home/ahmed/Downloads/smart-menu. ' +
    'Grep for: alt=, aria-, role=, h1, h2 across src/app and src/components. ' +
    'Check robots.ts, sitemap.ts, metadata in layout. ' +
    'Return: {a11yIssues:[], seoIssues:[], missingAlt:[], headingIssues:[]}',
    { label: 'a11y-seo', schema: { type: 'object', properties: { a11yIssues: { type: 'array' }, seoIssues: { type: 'array' }, missingAlt: { type: 'array' }, headingIssues: { type: 'array' } } } }
  )
  results.a11y = p12
  log('✅ a11y-seo done')
} catch (e) { log('❌ a11y-seo: ' + e) }

try {
  const p13 = await agent(
    'Analyze test coverage in /home/ahmed/Downloads/smart-menu/tests. ' +
    'Read all test files (18). Check: what areas covered vs not. ' +
    'Cross-ref against 25 lib files + 60 API routes. ' +
    'Run "npx vitest run 2>&1 | tail -20" to check if tests pass. ' +
    'Return: {totalTests:0, unitTests:0, e2eTests:0, untestedModules:[], coveragePct:0, gaps:[]}',
    { label: 'test-gap', schema: { type: 'object', properties: { totalTests: { type: 'number' }, unitTests: { type: 'number' }, e2eTests: { type: 'number' }, untestedModules: { type: 'array' }, coveragePct: { type: 'number' }, gaps: { type: 'array' } } } }
  )
  results.tests = p13
  log('✅ test-gap done')
} catch (e) { log('❌ test-gap: ' + e) }

try {
  const p14 = await agent(
    'Check perf patterns in /home/ahmed/Downloads/smart-menu. Read next.config.ts. ' +
    'Check: next/font (Cairo), image remotePatterns, optimizePackageImports. ' +
    'Grep for: useEffect without deps, image size attrs, loading=lazy, priority. ' +
    'Return: {configIssues:[], imageIssues:[], fontIssues:[], useEffectWithoutDeps:[], recommendations:[]}',
    { label: 'perf-patterns', schema: { type: 'object', properties: { configIssues: { type: 'array' }, imageIssues: { type: 'array' }, fontIssues: { type: 'array' }, useEffectWithoutDeps: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.perf = p14
  log('✅ perf-patterns done')
} catch (e) { log('❌ perf-patterns: ' + e) }

try {
  const p15 = await agent(
    'Check coding style in /home/ahmed/Downloads/smart-menu/src. ' +
    'Check: quotes consistency, semicolons, import ordering, named vs default exports, file naming. ' +
    'Check globals.css for CSS organization, @apply patterns. ' +
    'Return: {styleIssues:[], importIssues:[], exportIssues:[], cssIssues:[], recommendations:[]}',
    { label: 'style-consistency', schema: { type: 'object', properties: { styleIssues: { type: 'array' }, importIssues: { type: 'array' }, exportIssues: { type: 'array' }, cssIssues: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.style = p15
  log('✅ style-consistency done')
} catch (e) { log('❌ style-consistency: ' + e) }

// Phase 3: Browser
phase('Phase 3: Browser Tests (8 agents)')
log('=== PHASE 3: Browser-based live testing ===')

try {
  const sv = await agent(
    'Verify live site at ' + BASE_URL + '. ' +
    'Run: curl -s -o /dev/null -w "%{http_code}" ' + BASE_URL + '. ' +
    'If not 200, start: cd /home/ahmed/Downloads/smart-menu && npm run dev & then wait. ' +
    'Keep retrying curl until 200. Return "SERVER_OK" when ready.',
    { label: 'server-check' }
  )
  log('Server: ' + sv)
} catch (e) { log('❌ server-check: ' + e) }

try {
  const p16 = await agent(
    'Using Chrome DevTools MCP, test public pages on ' + BASE_URL + '. ' +
    'Navigate to: /, /pricing, /login, /menu/al-waha-cafe, /terms, a-404-page. ' +
    'For each: check title via evaluate_script("()=>document.title"), ' +
    'list_console_messages, take_snapshot. Report console errors and 404s. ' +
    'Return: {pages:[{path,title,status,errors[]}], summary:""}',
    { label: 'public-pages', schema: { type: 'object', properties: { pages: { type: 'array' }, summary: { type: 'string' } } } }
  )
  results.publicPages = p16
  log('✅ public-pages done')
} catch (e) { log('❌ public-pages: ' + e) }

try {
  const p17 = await agent(
    'Using Chrome DevTools MCP, test MENU+CART flow. ' +
    'Navigate to /menu/al-waha-cafe, take snapshot, check items visible. ' +
    'Try adding item to cart. Navigate to /cart, /order-confirmed. ' +
    'Check console errors, network 404s. ' +
    'Return: {menuRendered:false, categoriesVisible:false, cartWorks:false, orderConfirmed:false, errors:[]}',
    { label: 'menu-cart', schema: { type: 'object', properties: { menuRendered: { type: 'boolean' }, categoriesVisible: { type: 'boolean' }, cartWorks: { type: 'boolean' }, orderConfirmed: { type: 'boolean' }, errors: { type: 'array' } } } }
  )
  results.menuCart = p17
  log('✅ menu-cart done')
} catch (e) { log('❌ menu-cart: ' + e) }

try {
  const p18 = await agent(
    'Using Chrome DevTools MCP, test AUTH flow. ' +
    'Go to /login. Fill form (waha/waha123), submit. Check redirect to /owner. ' +
    'Check smart-menu-session cookie set. Navigate to /owner, verify dashboard. ' +
    'Log out, verify redirect. Try /admin without admin role. ' +
    'Return: {loginWorks:false, sessionSet:false, ownerDashboard:false, logoutWorks:false, unauthorizedBlocked:false, errors:[]}',
    { label: 'auth-flow', schema: { type: 'object', properties: { loginWorks: { type: 'boolean' }, sessionSet: { type: 'boolean' }, ownerDashboard: { type: 'boolean' }, logoutWorks: { type: 'boolean' }, unauthorizedBlocked: { type: 'boolean' }, errors: { type: 'array' } } } }
  )
  results.authFlow = p18
  log('✅ auth-flow done')
} catch (e) { log('❌ auth-flow: ' + e) }

try {
  const p19 = await agent(
    'Using Chrome DevTools MCP, test OWNER dashboard. ' +
    'Login via POST /api/auth/login (waha/waha123) first. ' +
    'Test: /owner, /owner/menu, /owner/categories, /owner/orders, /owner/qr, /owner/loyalty, /owner/settings. ' +
    'For each: page renders, API calls check, console errors. ' +
    'Return: {pages:[{path,renders,errors[]}], totalIssues:0, summary:""}',
    { label: 'owner-dash', schema: { type: 'object', properties: { pages: { type: 'array' }, totalIssues: { type: 'number' }, summary: { type: 'string' } } } }
  )
  results.ownerDash = p19
  log('✅ owner-dash done')
} catch (e) { log('❌ owner-dash: ' + e) }

try {
  const p20 = await agent(
    'Using Chrome DevTools MCP, test ADMIN panel. ' +
    'Login as admin (admin/admin123). ' +
    'Test: /admin, /admin/restaurants, /admin/users, /admin/subscriptions, ' +
    '/admin/admins, /admin/telegram, /admin/orders, /admin/audit-logs, /admin/system-events, /admin/settings. ' +
    'For each: renders, API calls, console errors. ' +
    'Return: {pages:[{path,renders,errors[]}], adminPagesTotal:0, brokenPages:[], summary:""}',
    { label: 'admin-panel', schema: { type: 'object', properties: { pages: { type: 'array' }, adminPagesTotal: { type: 'number' }, brokenPages: { type: 'array' }, summary: { type: 'string' } } } }
  )
  results.adminPanel = p20
  log('✅ admin-panel done')
} catch (e) { log('❌ admin-panel: ' + e) }

try {
  const p21 = await agent(
    'Using Chrome DevTools MCP, test SUBSCRIPTION flow. ' +
    'Check: /pricing renders all plans. /subscribe renders. ' +
    'Login as unpaid user and check redirect to /subscribe. ' +
    'Return: {pricingRenders:false, subscribeRenders:false, redirectsWork:false, issues:[]}',
    { label: 'subscription', schema: { type: 'object', properties: { pricingRenders: { type: 'boolean' }, subscribeRenders: { type: 'boolean' }, redirectsWork: { type: 'boolean' }, issues: { type: 'array' } } } }
  )
  results.subscription = p21
  log('✅ subscription done')
} catch (e) { log('❌ subscription: ' + e) }

try {
  const p22 = await agent(
    'Using Chrome DevTools MCP, test EDGE CASES. ' +
    '1. 404 page at /this-does-not-exist. ' +
    '2. Mobile viewport at 375x812 (emulate), check menu layout. ' +
    '3. Check manifest.json loads. ' +
    '4. Check offline.html. ' +
    'Return: {notFoundRenders:false, mobileLayout:"", pwaWorks:false, issues:[]}',
    { label: 'edge-cases', schema: { type: 'object', properties: { notFoundRenders: { type: 'boolean' }, mobileLayout: { type: 'string' }, pwaWorks: { type: 'boolean' }, issues: { type: 'array' } } } }
  )
  results.edgeCases = p22
  log('✅ edge-cases done')
} catch (e) { log('❌ edge-cases: ' + e) }

// Phase 4
phase('Phase 4: Performance & UX (6 agents)')
log('=== PHASE 4: Performance measurement & UX audit ===')

try {
  const p23 = await agent(
    'Measure page load perf at ' + BASE_URL + '. ' +
    'For each page: use performance_start_trace (reload=true), ' +
    'then evaluate_script to get performance.getEntriesByType("navigation"), ' +
    'list_network_requests for bundle sizes. ' +
    'Pages: /, /pricing, /login, /menu/al-waha-cafe. ' +
    'Return: {pages:[{path,ttfbMs,fcpMs,lcpMs,bundleSizeKb}], slowPages:[], recommendations:[]}',
    { label: 'page-load-perf', schema: { type: 'object', properties: { pages: { type: 'array' }, slowPages: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.loadPerf = p23
  log('✅ page-load-perf done')
} catch (e) { log('❌ page-load-perf: ' + e) }

try {
  const p24 = await agent(
    'Test API latency at ' + BASE_URL + '. ' +
    'Use curl -w "%%{time_total}s %%{http_code}" for each. ' +
    'Test: GET /api/auth/me (5x), GET /api/restaurants, GET /api/menu/al-waha-cafe, GET /api/plans. ' +
    'Run each 3x, report median. ' +
    'Return: {endpoints:[{path,medianMs}], slowEndpoints:[], recommendations:[]}',
    { label: 'api-latency', schema: { type: 'object', properties: { endpoints: { type: 'array' }, slowEndpoints: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.apiLat = p24
  log('✅ api-latency done')
} catch (e) { log('❌ api-latency: ' + e) }

try {
  const p25 = await agent(
    'Check image & font optimization. Read next.config.ts image config. ' +
    'Check public/ images for sizes. ' +
    'Navigate to /menu/al-waha-cafe in Chrome DevTools, check network for image sizes. ' +
    'Return: {imageFormats:"", oversizedImages:[], fontLoading:"", issues:[], recommendations:[]}',
    { label: 'image-font-opt', schema: { type: 'object', properties: { imageFormats: { type: 'string' }, oversizedImages: { type: 'array' }, fontLoading: { type: 'string' }, issues: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.imgFont = p25
  log('✅ image-font-opt done')
} catch (e) { log('❌ image-font-opt: ' + e) }

try {
  const p26 = await agent(
    'Using Chrome DevTools MCP, test responsive design. ' +
    'Use emulate() for viewports: 1440x900, 768x1024, 375x812 (mobile). ' +
    'For each viewport test: /, /pricing, /menu/al-waha-cafe. ' +
    'Check: text overlap, broken layout, horizontal scroll. ' +
    'Return: {viewports:[{size, pages:[{path,issues[]}]}], criticalIssues:[], recommendations:[]}',
    { label: 'responsive-test', schema: { type: 'object', properties: { viewports: { type: 'array' }, criticalIssues: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.responsive = p26
  log('✅ responsive-test done')
} catch (e) { log('❌ responsive-test: ' + e) }

try {
  const p27 = await agent(
    'Using Chrome DevTools MCP, check animation quality. ' +
    'Navigate pages, check Framer Motion smoothness, transitions. ' +
    'Check MotionProvider in components. ' +
    'Return: {animationQuality:"", jankDetected:false, slowAnimations:[], recommendations:[]}',
    { label: 'animation-test', schema: { type: 'object', properties: { animationQuality: { type: 'string' }, jankDetected: { type: 'boolean' }, slowAnimations: { type: 'array' }, recommendations: { type: 'array' } } } }
  )
  results.animation = p27
  log('✅ animation-test done')
} catch (e) { log('❌ animation-test: ' + e) }

try {
  const p28 = await agent(
    'Using Chrome DevTools MCP, collect ALL console errors + network 404s across pages. ' +
    'For each page: navigate, wait, list_console_messages (types: error, warn), ' +
    'list_network_requests (filter status >= 400). ' +
    'Pages: /, /pricing, /login, /menu/al-waha-cafe, /cart, /subscribe. ' +
    'Return: {consoleErrors:[{page,message}], network404s:[{page,url,type}], totalErrors:0, total404s:0}',
    { label: 'console-net-errors', schema: { type: 'object', properties: { consoleErrors: { type: 'array' }, network404s: { type: 'array' }, totalErrors: { type: 'number' }, total404s: { type: 'number' } } } }
  )
  results.consoleNet = p28
  log('✅ console-net-errors done')
} catch (e) { log('❌ console-net-errors: ' + e) }

// Phase 5: Synthesis
phase('Phase 5: Synthesis & Fix Plan (5 agents)')
log('=== PHASE 5: Synthesizing all findings into reports ===')

try {
  const p29 = await agent(
    'Write security report. Use data below. Create Arabic report with: برنامج الثغرات الأمنية - الأولويات - طريقة الإصلاح.\n' +
    'Auth: ' + JSON.stringify(results.auth||{}) + '\n' +
    'API: ' + JSON.stringify(results.api||{}) + '\n' +
    'TS: ' + JSON.stringify(results.ts||{}) + '\n' +
    'Smells: ' + JSON.stringify(results.smells||{}) + '\n' +
    'Deps: ' + JSON.stringify(results.deps||{}) + '\n' +
    'Tests: ' + JSON.stringify(results.tests||{}) + '\n' +
    'Console: ' + JSON.stringify(results.consoleNet||{}) + '\n' +
    'Return JSON: {critical:[], high:[], medium:[], low:[], overallScore:""}',
    { label: 'security-report', schema: { type: 'object', properties: { critical: { type: 'array' }, high: { type: 'array' }, medium: { type: 'array' }, low: { type: 'array' }, overallScore: { type: 'string' } } } }
  )
  results.securityReport = p29
  log('✅ security-report done')
} catch (e) { log('❌ security-report: ' + e) }

try {
  const p30 = await agent(
    'Write performance report. Use data below. Arabic report: سرعة التحميل, زمن API, تحسين الصور.\n' +
    'LoadPerf: ' + JSON.stringify(results.loadPerf||{}) + '\n' +
    'APILat: ' + JSON.stringify(results.apiLat||{}) + '\n' +
    'ImgFont: ' + JSON.stringify(results.imgFont||{}) + '\n' +
    'Responsive: ' + JSON.stringify(results.responsive||{}) + '\n' +
    'Animation: ' + JSON.stringify(results.animation||{}) + '\n' +
    'Console: ' + JSON.stringify(results.consoleNet||{}) + '\n' +
    'PerfPatterns: ' + JSON.stringify(results.perf||{}) + '\n' +
    'Return JSON: {critical:[], high:[], medium:[], low:[], overallScore:""}',
    { label: 'performance-report', schema: { type: 'object', properties: { critical: { type: 'array' }, high: { type: 'array' }, medium: { type: 'array' }, low: { type: 'array' }, overallScore: { type: 'string' } } } }
  )
  results.performanceReport = p30
  log('✅ performance-report done')
} catch (e) { log('❌ performance-report: ' + e) }

try {
  const p31 = await agent(
    'Write UX/UI report. Arabic. Use data below.\n' +
    'Components: ' + JSON.stringify(results.components||{}) + '\n' +
    'State: ' + JSON.stringify(results.state||{}) + '\n' +
    'A11y: ' + JSON.stringify(results.a11y||{}) + '\n' +
    'Style: ' + JSON.stringify(results.style||{}) + '\n' +
    'Responsive: ' + JSON.stringify(results.responsive||{}) + '\n' +
    'Animation: ' + JSON.stringify(results.animation||{}) + '\n' +
    'PublicPages: ' + JSON.stringify(results.publicPages||{}) + '\n' +
    'EdgeCases: ' + JSON.stringify(results.edgeCases||{}) + '\n' +
    'Return JSON: {critical:[], high:[], medium:[], low:[], overallScore:""}',
    { label: 'ux-report', schema: { type: 'object', properties: { critical: { type: 'array' }, high: { type: 'array' }, medium: { type: 'array' }, low: { type: 'array' }, overallScore: { type: 'string' } } } }
  )
  results.uxReport = p31
  log('✅ ux-report done')
} catch (e) { log('❌ ux-report: ' + e) }

try {
  const p32 = await agent(
    'Write code quality report. Arabic. Use data below.\n' +
    'Structure: ' + JSON.stringify(results.structure||{}) + '\n' +
    'Data: ' + JSON.stringify(results.data||{}) + '\n' +
    'TS: ' + JSON.stringify(results.ts||{}) + '\n' +
    'Smells: ' + JSON.stringify(results.smells||{}) + '\n' +
    'Deps: ' + JSON.stringify(results.deps||{}) + '\n' +
    'Tests: ' + JSON.stringify(results.tests||{}) + '\n' +
    'Style: ' + JSON.stringify(results.style||{}) + '\n' +
    'Telegram: ' + JSON.stringify(results.telegram||{}) + '\n' +
    'PWA: ' + JSON.stringify(results.pwa||{}) + '\n' +
    'Return JSON: {critical:[], high:[], medium:[], low:[], overallScore:""}',
    { label: 'code-quality-report', schema: { type: 'object', properties: { critical: { type: 'array' }, high: { type: 'array' }, medium: { type: 'array' }, low: { type: 'array' }, overallScore: { type: 'string' } } } }
  )
  results.codeQualityReport = p32
  log('✅ code-quality-report done')
} catch (e) { log('❌ code-quality-report: ' + e) }

// Final synthesis
try {
  const p33 = await agent(
    'Synthesize ALL reports into ONE comprehensive FIX PLAN. Arabic.\n\n' +
    'Security data: ' + JSON.stringify(results.securityReport||{}) + '\n' +
    'Performance data: ' + JSON.stringify(results.performanceReport||{}) + '\n' +
    'UX data: ' + JSON.stringify(results.uxReport||{}) + '\n' +
    'Code quality data: ' + JSON.stringify(results.codeQualityReport||{}) + '\n\n' +
    'Structure MUST include:\n' +
    '1. Executive summary (عدد المشاكل, درجة الصحة)\n' +
    '2. Priority matrix (CRITICAL/HIGH/MEDIUM/LOW)\n' +
    '3. Sprint plan (Sprint 1 نقدي, Sprint 2 عالي, Sprint 3 متوسط)\n' +
    '4. Strategic recommendations (بنية, أمان, أداء, UX, كود, اختبارات)\n\n' +
    'Return JSON with Arabic text: {executiveSummary:{}, priorityMatrix:{}, sprintPlan:{}, strategicRecommendations:{}, totalIssues:0, overallHealth:""}',
    { label: 'final-fix-plan', schema: { type: 'object', properties: { executiveSummary: { type: 'object' }, priorityMatrix: { type: 'object' }, sprintPlan: { type: 'object' }, strategicRecommendations: { type: 'object' }, totalIssues: { type: 'number' }, overallHealth: { type: 'string' } } } }
  )
  results.fixPlan = p33
  log('✅ final-fix-plan done')
} catch (e) { log('❌ final-fix-plan: ' + e) }

// Write everything to disk
log('=== Writing all results to files ===')
try {
  await agent(
    'Write ALL audit results to /home/ahmed/Downloads/smart-menu/tmp/audit/.\n' +
    'First: mkdir -p /home/ahmed/Downloads/smart-menu/tmp/audit\n' +
    'Then write files. Use Write tool for EACH file. Create these files:\n\n' +
    'JSON files (use JSON.stringify):\n' +
    '- 01-structure.json\n' +
    '- 02-data-model.json\n' +
    '- 03-api-surface.json\n' +
    '- 04-auth-security.json\n' +
    '- 05-components.json\n' +
    '- 06-state-routing.json\n' +
    '- 07-telegram-subs.json\n' +
    '- 08-pwa.json\n' +
    '- 09-ts-strictness.json\n' +
    '- 10-code-smells.json\n' +
    '- 11-deps.json\n' +
    '- 12-a11y-seo.json\n' +
    '- 13-tests.json\n' +
    '- 14-perf-patterns.json\n' +
    '- 15-style.json\n' +
    '- 16-public-pages.json\n' +
    '- 17-menu-cart.json\n' +
    '- 18-auth-flow.json\n' +
    '- 19-owner-dash.json\n' +
    '- 20-admin-panel.json\n' +
    '- 21-subscription.json\n' +
    '- 22-edge-cases.json\n' +
    '- 23-load-perf.json\n' +
    '- 24-api-latency.json\n' +
    '- 25-image-font.json\n' +
    '- 26-responsive.json\n' +
    '- 27-animation.json\n' +
    '- 28-console-net.json\n' +
    'Markdown reports (Arabic):\n' +
    '- 29-security-report.md\n' +
    '- 30-performance-report.md\n' +
    '- 31-ux-report.md\n' +
    '- 32-code-quality-report.md\n' +
    '- 33-final-fix-plan.md\n\n' +
    'Use the data from these JSON objects passed inline:\n' +
    'structure=' + JSON.stringify(results.structure||{}) + '\n' +
    'data=' + JSON.stringify(results.data||{}) + '\n' +
    'api=' + JSON.stringify(results.api||{}) + '\n' +
    'auth=' + JSON.stringify(results.auth||{}) + '\n' +
    'components=' + JSON.stringify(results.components||{}) + '\n' +
    'state=' + JSON.stringify(results.state||{}) + '\n' +
    'telegram=' + JSON.stringify(results.telegram||{}) + '\n' +
    'pwa=' + JSON.stringify(results.pwa||{}) + '\n' +
    'ts=' + JSON.stringify(results.ts||{}) + '\n' +
    'smells=' + JSON.stringify(results.smells||{}) + '\n' +
    'deps=' + JSON.stringify(results.deps||{}) + '\n' +
    'a11y=' + JSON.stringify(results.a11y||{}) + '\n' +
    'tests=' + JSON.stringify(results.tests||{}) + '\n' +
    'perf=' + JSON.stringify(results.perf||{}) + '\n' +
    'style=' + JSON.stringify(results.style||{}) + '\n' +
    'publicPages=' + JSON.stringify(results.publicPages||{}) + '\n' +
    'menuCart=' + JSON.stringify(results.menuCart||{}) + '\n' +
    'authFlow=' + JSON.stringify(results.authFlow||{}) + '\n' +
    'ownerDash=' + JSON.stringify(results.ownerDash||{}) + '\n' +
    'adminPanel=' + JSON.stringify(results.adminPanel||{}) + '\n' +
    'subscription=' + JSON.stringify(results.subscription||{}) + '\n' +
    'edgeCases=' + JSON.stringify(results.edgeCases||{}) + '\n' +
    'loadPerf=' + JSON.stringify(results.loadPerf||{}) + '\n' +
    'apiLat=' + JSON.stringify(results.apiLat||{}) + '\n' +
    'imgFont=' + JSON.stringify(results.imgFont||{}) + '\n' +
    'responsive=' + JSON.stringify(results.responsive||{}) + '\n' +
    'animation=' + JSON.stringify(results.animation||{}) + '\n' +
    'consoleNet=' + JSON.stringify(results.consoleNet||{}) + '\n' +
    'securityReport=' + JSON.stringify(results.securityReport||{}) + '\n' +
    'performanceReport=' + JSON.stringify(results.performanceReport||{}) + '\n' +
    'uxReport=' + JSON.stringify(results.uxReport||{}) + '\n' +
    'codeQualityReport=' + JSON.stringify(results.codeQualityReport||{}) + '\n' +
    'fixPlan=' + JSON.stringify(results.fixPlan||{}) + '\n\n' +
    'For MD files: write Arabic text with proper headings.\n' +
    'Return "FILES_WRITTEN" when all 33 files are done.',
    { label: 'write-files' }
  )
} catch (e) { log('❌ write-files: ' + e) }

log('=== ✅ SMART MENU AUDIT COMPLETE — 41 agents, 33 report files ===')
return { status: 'done', agentCount: 41, filesWritten: 33, outputDir: '/home/ahmed/Downloads/smart-menu/tmp/audit', fixPlan: results.fixPlan || {} }