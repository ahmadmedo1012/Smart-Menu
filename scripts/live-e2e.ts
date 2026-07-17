import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://menu.smart-link.ly";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = { pass: 0, fail: 0, errors: [] as string[] };

  const check = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.pass++;
      console.log(`✓ ${label}`);
    } catch (e: any) {
      results.fail++;
      results.errors.push(`${label}: ${e.message}`);
      console.log(`✗ ${label}: ${e.message}`);
    }
  };

  // ====== 1. Public pages ======
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await check("Landing page loads", async () => {
      await page.goto(BASE, { waitUntil: "networkidle" });
      const title = await page.title();
      if (!title) throw new Error("No page title");
    });

    await check("Menu page loads for demo restaurant", async () => {
      await page.goto(`${BASE}/menu/al-waha-cafe`, { waitUntil: "networkidle" });
      const ok = await page.locator("text=قهوة تركي").isVisible();
      if (!ok) throw new Error("Menu items not visible");
    });

    await check("Cart page loads", async () => {
      await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
    });

    await check("Subscribe page loads", async () => {
      await page.goto(`${BASE}/subscribe`, { waitUntil: "networkidle" });
    });

    await page.close();
    await ctx.close();
  }

  // ====== 2. Auth pages ======
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await check("Login page loads", async () => {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    });

    await page.close();
    await ctx.close();
  }

  // ====== 3. Middleware redirect tests (unauthenticated) ======
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await check("Middleware: /admin redirects to /login", async () => {
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
      const url = page.url();
      if (!url.includes("/login")) throw new Error(`Expected /login redirect, got: ${url}`);
    });

    await check("Middleware: /owner redirects to /login", async () => {
      await page.goto(`${BASE}/owner`, { waitUntil: "networkidle" });
      const url = page.url();
      if (!url.includes("/login")) throw new Error(`Expected /login redirect, got: ${url}`);
    });

    await page.close();
    await ctx.close();
  }

  // ====== 4. API endpoints (unauthenticated) ======
  {
    const ctx = await browser.newContext();
    const req = await ctx.newPage();

    await check("GET /api/health returns 200", async () => {
      const res = await req.request.get(`${BASE}/api/health`);
      if (res.status() !== 200) throw new Error(`Health returned ${res.status()}`);
    });

    await check("GET /api/plans returns data", async () => {
      const res = await req.request.get(`${BASE}/api/plans`);
      const body = await res.json();
      if (!body.success) throw new Error(`Plans: ${JSON.stringify(body)}`);
    });

    await check("GET /api/public/stats returns stats", async () => {
      const res = await req.request.get(`${BASE}/api/public/stats`);
      if (res.status() !== 200) throw new Error(`Stats returned ${res.status()}`);
    });

    await check("GET /api/auth/me without auth returns 401", async () => {
      const res = await req.request.get(`${BASE}/api/auth/me`);
      if (res.status() !== 401) throw new Error(`Auth/me returned ${res.status()}`);
    });

    await req.close();
    await ctx.close();
  }

  // ====== 5. Auth flow (register → login → protected page) ======
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const uid = `test_e2e_${Date.now()}`;

    await check("Register new user returns 201", async () => {
      const res = await page.request.post(`${BASE}/api/auth/register`, {
        data: { username: uid, password: "testpass123", name: "E2E Test" },
        headers: { "Content-Type": "application/json" },
      });
      if (res.status() !== 201) {
        const txt = await res.text();
        throw new Error(`Register ${res.status()}: ${txt}`);
      }
    });

    await check("Session persists after register (/me returns user)", async () => {
      const res = await page.request.get(`${BASE}/api/auth/me`);
      if (res.status() !== 200) throw new Error(`/me after register: ${res.status()}`);
      const body = await res.json();
      if (!body.data?.authenticated) throw new Error("Not authenticated after register");
    });

    await check("Middleware does NOT block authenticated /admin", async () => {
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
      const url = page.url();
      if (url.includes("/login")) throw new Error(`Middleware redirected authenticated user: ${url}`);
    });

    await check("Logout clears session", async () => {
      const res = await page.request.post(`${BASE}/api/auth/logout`);
      if (res.status() !== 200) throw new Error(`Logout: ${res.status()}`);
      const me = await page.request.get(`${BASE}/api/auth/me`);
      if (me.status() !== 401) throw new Error(`/me after logout: ${me.status()}`);
    });

    await page.close();
    await ctx.close();
  }

  // ====== 6. Negative auth tests ======
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await check("Login wrong password returns 401", async () => {
      const res = await page.request.post(`${BASE}/api/auth/login`, {
        data: { username: "admin", password: "definitelywrong" },
        headers: { "Content-Type": "application/json" },
      });
      if (res.status() !== 401) throw new Error(`Wrong password login: ${res.status()}`);
    });

    await check("Register short password < 8 chars returns 400", async () => {
      const res = await page.request.post(`${BASE}/api/auth/register`, {
        data: { username: "badpw", password: "123456", name: "Bad" },
        headers: { "Content-Type": "application/json" },
      });
      if (res.status() !== 400) throw new Error(`Short password register: ${res.status()}`);
    });

    await page.close();
    await ctx.close();
  }

  // ====== 7. Multi-tab test (3 tabs simultaneous) ======
  {
    const ctx = await browser.newContext();
    const tab1 = await ctx.newPage();
    const tab2 = await ctx.newPage();
    const tab3 = await ctx.newPage();

    await check("Tab 1: Landing page loads", async () => {
      await tab1.goto(BASE, { waitUntil: "networkidle" });
    });

    await check("Tab 2: Menu page loads", async () => {
      await tab2.goto(`${BASE}/al-waha-cafe`, { waitUntil: "networkidle" });
    });

    await check("Tab 3: Login page loads", async () => {
      await tab3.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    });

    await tab1.close();
    await tab2.close();
    await tab3.close();
    await ctx.close();
  }

  await browser.close();

  console.log(`\n===== نتائج: ${results.pass} نجاح / ${results.fail} فشل =====`);
  if (results.errors.length > 0) {
    console.log("\nحالات الفشل:");
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  process.exit(results.fail > 0 ? 1 : 0);
})();
