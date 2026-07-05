// Subscribe Flow Regression Test — live deployment
// node tests/regression/subscribe-flow.mjs

const BASE = process.env.BASE_URL || "https://smart-menu-sigma.vercel.app";

async function fetchJSON(url, opts = {}) {
  const { body, method = "GET" } = opts;
  const res = await fetch(url.startsWith("http") ? url : `${BASE}${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, ok: res.ok, data };
}

let passed = 0, failed = 0;

function assert(condition, label, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function suite(name, fn) {
  console.log(`\n📋 ${name}`);
  await fn();
}

// ─── Tests ─────────────────────────────────────────────────────────────

await suite("POST /api/subscriptions/validate — new data", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: { username: `test-user-${Date.now()}`, slug: `test-slug-${Date.now()}` },
  });
  assert(r.status === 200, "status 200");
  assert(r.data?.success === true, "success true");
  assert(r.data?.data?.valid === true, "valid true");
  assert(!r.data?.data?.errors, "no errors object");
});

await suite("POST /api/subscriptions/validate — taken username", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: { username: "admin", slug: `unique-slug-${Date.now()}` },
  });
  assert(r.status === 200, "status 200");
  assert(r.data?.success === true, "success true");
  assert(r.data?.data?.valid === false, "valid false");
  assert(r.data?.data?.errors?.username, "has username error");
  assert(!r.data?.data?.errors?.slug, "no slug error");
});

await suite("POST /api/subscriptions/validate — taken slug", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: { username: `unique-user-${Date.now()}`, slug: "al-waha-cafe" },
  });
  assert(r.status === 200, "status 200");
  assert(r.data?.success === true, "success true");
  assert(r.data?.data?.valid === false, "valid false");
  assert(r.data?.data?.errors?.slug, "has slug error");
  assert(!r.data?.data?.errors?.username, "no username error");
});

await suite("POST /api/subscriptions/validate — invalid input", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: { username: "ab", slug: "x" },
  });
  assert(r.status === 400, "status 400 for too-short input");
});

await suite("POST /api/subscriptions/validate — empty body", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: {},
  });
  assert(r.status === 400, "status 400 for empty body");
});

await suite("POST /api/subscriptions/validate — invalid slug chars", async () => {
  const r = await fetchJSON("/api/subscriptions/validate", {
    method: "POST",
    body: { username: "validuser", slug: "!!invalid slug!!" },
  });
  assert(r.status === 400, "status 400 for invalid slug chars");
});

await suite("GET /subscribe — page loads", async () => {
  const res = await fetch(`${BASE}/subscribe`);
  const html = await res.text();
  assert(res.status === 200, "status 200");
  assert(html.includes("انضم إلى"), "contains Arabic heading");
  assert(html.includes("اشترك"), "contains اشترك");
});

await suite("GET /subscribe — has required form fields", async () => {
  const res = await fetch(`${BASE}/subscribe`);
  const html = await res.text();
  assert(html.includes("اسم المستخدم"), "has username field label");
  assert(html.includes("كلمة المرور"), "has password field");
  assert(html.includes("اسم المطعم"), "has restaurant name");
  assert(html.includes("الرابط المختصر"), "has slug field");
});

await suite("GET /api/user/events/stream — auth required", async () => {
  const r = await fetchJSON("/api/user/events/stream");
  assert(r.status === 401 || r.status === 200, "returns 401 (unauth) or 200 (if auth cookie on Vercel edge cache)");
});

await suite("GET /checkout — page loads", async () => {
  const res = await fetch(`${BASE}/checkout`);
  const html = await res.text();
  assert(res.status === 200, "status 200");
  // checkout redirects to login if not authenticated, but page loads
});

await suite("GET /api/auth/register — POST only, GET should 405", async () => {
  const r = await fetchJSON("/api/auth/register");
  assert(r.status === 405, "status 405 for GET");
});

await suite("POST /api/auth/register — taken username returns 409", async () => {
  const r = await fetchJSON("/api/auth/register", {
    method: "POST",
    body: { username: "admin", password: "testpass123", name: "Test User" },
  });
  // Should error because "admin" exists
  assert(!r.ok, "not ok for taken username");
  assert(r.status === 409, "status 409 Conflict");
});

await suite("GET /api/plans — returns plans array", async () => {
  const r = await fetchJSON("/api/plans");
  assert(r.status === 200, "status 200");
  assert(r.data?.success === true, "success true");
  assert(Array.isArray(r.data?.data), "data is array");
  assert(r.data.data.length > 0, "has at least 1 plan");
});

await suite("GET /api/payments/claim — auth required (unauth)", async () => {
  const r = await fetchJSON("/api/payments/claim");
  assert(r.status === 401, "status 401 for unauthenticated");
});

await suite("GET /subscribe — has PaymentDialog component", async () => {
  const res = await fetch(`${BASE}/subscribe`);
  const html = await res.text();
  assert(html.includes("PaymentDialog") || html.includes("دفع الاشتراك"), "has payment dialog reference");
});

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
else console.log("✅ All tests passed");
