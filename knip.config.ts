/**
 * knip.config.ts (round90-F6) — dead-code detector configuration.
 *
 * المنهجية (الموثقة من docs/round90/diagnosis/health-devex.md §1):
 * knip الساذج يغرق المشروع بإيجابيات كاذبة لأن ملفات كثيرة موصولة عبر
 * أدوات CLI (Playwright / Vitest / Prisma CLI / Next conventions) لا عبر
 * imports يمكن تتبعها. هذا الكونفق يعلم knip نقاط الدخول الحقيقية
 * فيبقى الناتج ~الصمامات الميتة الفعلية فقط.
 *
 * - pinned knip@5.46.4 في devDependencies: الإصدار v6 (oxc-parser) ينهار
 *   في هذه البيئة بـ RangeError: Array buffer allocation failed (موثق
 *   في health-devex.md) — لا ترفعه حتى يُحل ذلك.
 * - «الإيجابيات الكاذبة» التي يبتلعها هذا الكونفق (كل واحدة موثقة):
 *   1. tests/unit/**: موصولة عبر `vitest run` (vitest.config.ts include).
 *   2. tests/e2e/** + tests/security/**: موصولة عبر playwright CLI glob
 *      (package.json test:e2e + مشاريع playwright.config.ts).
 *   3. prisma.config.ts: يُحمَّل تلقائيًا من Prisma CLI.
 *   4. postcss.config.mjs / next.config.ts / eslint.config.mjs / vitest.config.ts
 *      / playwright.config.ts / components.json: تُقرأ من أدواتها، لا تُستورد.
 *   5. سكربتات scripts/* المستعملة فعليًا عبر npm scripts أو ci.yml
 *      (db-unstick · ci-seed · register-webhook · check-secrets ·
 *      round83-seed · qa-seed · check-api-auth) — knip لا يقرأ ci.yml.
 *   6. src/generated/** و مجلدات المخرجات (coverage · test-results ·
 *      playwright-report · .next): مولّدة/مستهلكة خارجيًا.
 * - ما يبقى في التقرير هو إشارة حقيقية مقصودة (سكربتات الجولات لمرة
 *   واحدة، رموز غير مستوردة...) — health-devex توصية #3: advisory،
 *   ليست بوابة CI.
 */
const config = {
        $schema: 'https://unpkg.com/knip@5.46.4/schema.json',
        entry: [
                // Next.js App Router conventions — pages/routes/layouts هي نقاط دخول
                // بالاتفاقية، لا عبر imports
                'src/app/**/{page,layout,route,default,error,global-error,not-found,loading,template,icon,apple-icon,opengraph-image,twitter-image,robots,sitemap,manifest,favicon}.{ts,tsx}',
                // Next 16: middleware اسمه proxy.ts — يُحمَّل من الإطار بالاسم المتفق
                'src/proxy.ts',
                // Vercel/Next instrumentation hook — يُحمَّل بالاسم المتفق
                'src/instrumentation.ts',
                // أدوات الإنتاج: تُقرأ من أدواتها (Next/PostCSS/ESLint/Vitest/
                // Playwright/Prisma/shadcn)، لا تُستورد من الكود
                'next.config.ts',
                'postcss.config.mjs',
                'eslint.config.mjs',
                'vitest.config.ts',
                'playwright.config.ts',
                'prisma.config.ts',
                'components.json',
                // اختبارات CLI: vitest (tests/unit) + playwright (e2e/security)
                'tests/unit/**/*.test.ts',
                'tests/e2e/**/*.{test,spec}.ts',
                'tests/security/*.test.ts',
                // سكربتات موصولة عبر npm scripts أو .github/workflows/ci.yml
                // (knip لا يقرأ الـ workflows — موثقة هنا يدويًا)
                'scripts/db-unstick.mjs',
                'scripts/ci-seed.mjs',
                'scripts/register-webhook.mjs',
                'scripts/check-secrets.mjs',
                'scripts/round83-seed.mjs',
                'scripts/qa-seed.mjs',
                'scripts/check-api-auth.mjs',
                // round97-X5: أدوات حية تُشغّل يدويًا محليًا (لا تظهر في npm scripts
                // ولا ci.yml فيلتقطها knip كملفات غير مستعملة) — موثّقة بالأغراض
                // في PROJECT.md § Live Scripts:
                'scripts/bundle-report.mjs',
                'scripts/image-health.mjs',
                'scripts/qa-cleanup-check.mjs',
                'scripts/r92-compress-og.mjs',
                'scripts/render-og.mjs',
                'scripts/r94-db-reset.mjs',
                'scripts/r96-convert-demo-images.mjs',
                'scripts/r97-db-check.mjs',
                'scripts/r97-admin-pass.mjs',
                // r121-R-1: the two r96 one-off migration harnesses moved to
                // scripts/archive/ (git mv) — entries kept with the new paths so knip
                // still recognizes them as intentional audit-trail entry points.
                'scripts/archive/r96-test-migration.mjs',
                'scripts/archive/r96-test-migration-prod-sim.mjs',
        ],
        project: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.{mjs,ts}'],
        ignore: [
                // كود مولّد من Prisma ( يُحلل كاستهلاك فقط)
                'src/generated/**',
                // مخرجات أدوات لا كود مصدر
                'coverage/**',
                'test-results/**',
                'playwright-report/**',
                '.next/**',
        ],
        ignoreDependencies: [
                // استهلاك runtime/CSS/peer لا يظهر في imports (موثق health-devex §1):
                // Prisma client runtime تستهلكه شيفرة src/generated المولّدة،
                // sharp تستهلكها تحسينات صور Next، tw-animate-css/tailwindcss
                // تُستورد من CSS/PostCSS، axe-core تُحمَّل داخل اختبارات Playwright.
                '@prisma/client',
                'sharp',
                'tw-animate-css',
                'tailwindcss',
                'axe-core',
        ],
};

export default config;
