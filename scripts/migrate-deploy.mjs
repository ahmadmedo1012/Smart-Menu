#!/usr/bin/env node
/**
 * r98-deploy-fix: غلاف `prisma migrate deploy` بإعادة المحاولة للأخطاء العابرة فقط.
 *
 * لماذا وُجد هذا الملف؟
 *   عمليات نشر Vercel الست للجولة 97 فشلت كلها؛ الخمس الأولى فورًا
 *   (overrides مكررة في package.json — أُصلحت بإزالتها، pnpm-workspace.yaml
 *   هو المصدر الوحيد)، والسادسة (9f42b5e2) فشلت بعد 1m16s — أي أن التثبيت
 *   نجح والبناء وصل نهايته وفشل في `prisma migrate deploy` تحديدًا: نافذة
 *   8 ساعات بلا أي ping (keep_alive تحوّل من كل-12-دقيقة إلى ساعي في r97-X4،
 *   والصفحة الرئيسية أصلاً static فلا تلمس قاعدة البيانات) => Neon compute
 *   نائم => P1001 «Can't reach database server» مع prisma migrate —
 *   نمط معروف وموثّق مع Neon cold-start.
 *
 * التصميم (فاشل-مغلق ضد الانجراف):
 *   - نعيد المحاولة فقط على الأخطاء العابرة: P1001/P1002/P1003/P1004/P1008
 *     وأكواد الشبكة (ECONNREFUSED/ETIMEDOUT/…) — كلها أعراض cold-start أو
 *     تنازع قفل عابر.
 *   - أي خطأ آخر (انجراف مخطط P3001، هجرة فاشلة سابقًا P3007، خطأ SQL)
 *     يُجهض فورًا بلا إعادة — هذه أخطاء حقيقية تتطلب تدخلًا يدويًا،
 *     وإخفاؤها بإعادة المحاولة سيؤجّل انفجارًا أسوأ.
 *   - 3 محاولات كحد أقصى، بانتظار 10s ثم 20s (كل محاولة بحد ذاتها توقظ
 *     Neon أكثر — الاتصال نفسه هو التسخين).
 *   - stdio يُمرَّر مباشرة (live) ويُجمع لفحص النمط — سلوك السجل كما هو
 *     تمامًا في عيون Vercel.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// prisma CLI: غلاف .bin أولًا (Linux/Vercel/CI)، ثم مدخل الحزمة مباشرة
// (استخدام node صريح — يعمل حيث لا يكون shim قابلًا للتنفيذ).
const PRISMA_BIN = existsSync(join(ROOT, 'node_modules/.bin/prisma'))
  ? join(ROOT, 'node_modules/.bin/prisma')
  : null;
const PRISMA_ENTRY = join(ROOT, 'node_modules/prisma/build/index.js');

// أخطاء قابلة لإعادة المحاولة فقط — عابرة بطبيعتها (اتصال/قفل/إيقاظ).
const TRANSIENT = new RegExp(
  [
    'P1001', // Can't reach database server (Neon cold start)
    'P1002', // Timed out (advisory-lock contention / slow wake)
    'P1003', // Database does not exist (Neon endpoint still provisioning)
    'P1004', // Database is being accessed by other users (exclusive ops)
    'P1008', // Operations timed out after
    'ECONNREFUSED',
    'ECONNRESET',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    "Can't reach database server",
    'server closed the connection unexpectedly',
    'terminating connection due to administrator command',
    'SSL connection has been closed unexpectedly',
  ].join('|'),
  'i',
);

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 10_000, 20_000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runMigrate() {
  return new Promise((resolve) => {
    // shim الـ .bin قابل للتنفيذ مباشرة على Linux/Vercel/CI؛ على أي بيئة
    // أخرى نستدعي مدخل الحزمة بـ node صريحًا (spawn بلا shell — لا interpolation).
    const child = PRISMA_BIN
      ? spawn(PRISMA_BIN, ['migrate', 'deploy'], { cwd: ROOT, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] })
      : spawn(process.execPath, [PRISMA_ENTRY, 'migrate', 'deploy'], { cwd: ROOT, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });

    let output = '';
    child.stdout.on('data', (d) => { output += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => { output += d; process.stderr.write(d); });
    child.on('error', (e) => resolve({ code: 127, output: String((e && e.message) || e) }));
    child.on('close', (code) => resolve({ code: code ?? 127, output }));
  });
}

(async () => {
  let last = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1] > 0) {
      console.log(`[migrate-deploy] محاولة ${attempt}/${MAX_ATTEMPTS} بعد انتظار ${BACKOFF_MS[attempt - 1] / 1000}s…`);
      await sleep(BACKOFF_MS[attempt - 1]);
    } else {
      console.log(`[migrate-deploy] محاولة ${attempt}/${MAX_ATTEMPTS}…`);
    }
    last = await runMigrate();
    if (last.code === 0) {
      console.log('[migrate-deploy] ✓ الهجرات طُبّقت بنجاح');
      process.exit(0);
    }
    if (!TRANSIENT.test(last.output)) {
      console.error(`[migrate-deploy] ✗ فشل غير عابر (خروج ${last.code}) — لا إعادة محاولة، يتطلب تدخلًا يدويًا`);
      process.exit(last.code || 1);
    }
    console.warn(`[migrate-deploy] ⚠ خطأ اتصال/قفل عابر (خروج ${last.code}) — إيقاظ Neon أو تنازع قفل؛ سيُعاد…`);
  }
  console.error(`[migrate-deploy] ✗ فشلت كل المحاولات (${MAX_ATTEMPTS})`);
  process.exit(last?.code || 1);
})();
