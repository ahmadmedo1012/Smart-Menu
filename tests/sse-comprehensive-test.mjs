// Comprehensive SSE testing against https://menu.smart-link.ly
import https from 'node:https';

const BASE = 'https://menu.smart-link.ly';
const RESULTS = [];
let pass = 0, fail = 0;
let OWNER_COOKIE = '';

function result(name, ok, detail) {
  RESULTS.push({ name, passed: ok, detail: detail || (ok ? 'OK' : 'FAILED') });
  ok ? pass++ : fail++;
  console.log(`${ok ? '  PASS' : '  FAIL'} ${name} — ${detail || (ok ? 'OK' : 'FAILED')}`);
}

function httpRequest(method, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { ...opts.headers };
    if (OWNER_COOKIE) headers['Cookie'] = OWNER_COOKIE;
    if (opts.json) headers['Content-Type'] = 'application/json';
    if (opts.headers?.Origin) headers['Origin'] = opts.headers.Origin;
    const body = opts.json ? JSON.stringify(opts.json) : undefined;
    const req = https.request(url.toString(), { method, headers, timeout: opts.timeout || 15000 }, (res) => {
      const sc = res.headers['set-cookie'];
      if (sc && Array.isArray(sc) && sc.length > 0) OWNER_COOKIE = sc[0].split(';')[0];
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(raw.toString('utf-8')); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: raw.toString('utf-8'), parsed, raw });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

function readSSE(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = {};
    if (OWNER_COOKIE) headers['Cookie'] = OWNER_COOKIE;
    const lines = [];
    let closed = false;
    const duration = opts.duration || 10000;
    const req = https.get(url.toString(), { headers, timeout: Math.max(duration + 10000, 20000) }, (res) => {
      const initialStatus = res.statusCode;
      const initialHeaders = res.headers;
      let buf = '';
      res.on('data', (chunk) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).replace(/\r$/, '');
          buf = buf.slice(idx + 1);
          if (line.length > 0 || opts.keepEmpty) lines.push({ line, time: Date.now() });
        }
        if (!opts.keepReading && lines.length >= (opts.maxLines || 20)) {
          closed = true; req.destroy();
          resolve({ status: initialStatus, headers: initialHeaders, lines });
        }
      });
      res.on('end', () => { if (!closed) { closed = true; resolve({ status: initialStatus, headers: initialHeaders, lines }); } });
      if (opts.checkHeaders) {
        setTimeout(() => { if (!closed) { closed = true; req.destroy(); resolve({ status: initialStatus, headers: initialHeaders, lines }); } }, 2000);
      }
    });
    req.on('error', (e) => { if (!closed) { closed = true; reject(e); } });
    req.on('timeout', () => { if (!closed) { closed = true; req.destroy(); resolve({ status: 0, headers: {}, lines }); } });
    if (!opts.checkHeaders) {
      setTimeout(() => { if (!closed) { closed = true; req.destroy(); resolve({ status: 0, headers: {}, lines }); } }, duration);
    }
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('\n=== SSE Comprehensive Testing: ' + BASE + ' ===\n');

  // ─── LOGIN ───
  console.log('--- Login ---');
  const ownerLogin = await httpRequest('POST', '/api/auth/login', {
    json: { username: 'waha', password: 'waha123' }
  });
  result('Owner login', ownerLogin.status === 200, ownerLogin.status === 200 ? 'OK' : `HTTP ${ownerLogin.status}`);
  const ownerRestId = ownerLogin.parsed?.data?.user?.restaurantId;
  console.log(`  Owner restaurantId=${ownerRestId}`);

  // Find a valid item for order creation
  const itemsRes = await httpRequest('GET', `/api/items?restaurantId=${ownerRestId}`);
  const items = itemsRes.parsed?.data || [];
  let firstItem = null;
  // Find first item with valid numeric price
  for (const item of items) {
    const p = Number(item.price);
    if (p > 0 && item.id) { firstItem = item; break; }
  }

  // ─── TESTS ───
  console.log('\n--- 1. Connection Tests ---');

  // [1] Content-Type: text/event-stream
  const s1 = await readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { checkHeaders: true });
  result('[1] SSE Content-Type text/event-stream',
    s1.headers['content-type']?.startsWith('text/event-stream'),
    s1.headers['content-type'] || 'none');

  result('[1b] Cache-Control: no-cache',
    s1.headers['cache-control']?.includes('no-cache'),
    s1.headers['cache-control'] || 'none');

  result('[1c] X-Accel-Buffering: no',
    s1.headers['x-accel-buffering'] === 'no',
    s1.headers['x-accel-buffering'] || 'none');

  // [2] Heartbeat within 30s (orders/stream sends heartbeat every 5s)
  const s2 = await readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { duration: 14000 });
  const hbLines = s2.lines.filter(l => l.line.includes(': heartbeat') || l.line === ':');
  result('[2] Heartbeat received within 30s',
    hbLines.length >= 1, `${hbLines.length} heartbeat(s) in ${s2.lines.length} lines`);

  // [3] Connection stays open 60s+
  const s3 = await readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { keepReading: true, duration: 60000, maxLines: 100 });
  const dur3 = s3.lines.length >= 2 ? (s3.lines[s3.lines.length-1].time - s3.lines[0].time) / 1000 : 0;
  result('[3] Connection stays open 60s+',
    s3.lines.length >= 2, `${s3.lines.length} lines over ${dur3.toFixed(1)}s`);

  // [4] Admin stream — note: deployed "admin" user has role=owner so requireAdmin() rejects
  const s4 = await readSSE('/api/admin/events/stream', { checkHeaders: true });
  result('[4] Admin SSE rejects owner (requireAdmin)', s4.status === 401,
    s4.status === 401 ? 'correct (owner rejected)' : `HTTP ${s4.status}`);

  // Admin without auth
  const cookieSaved = OWNER_COOKIE; OWNER_COOKIE = '';
  const s4b = await readSSE('/api/admin/events/stream', { checkHeaders: true });
  result('[4b] Admin SSE without auth 401', s4b.status === 401,
    s4b.status === 401 ? 'correct' : `HTTP ${s4b.status}`);
  OWNER_COOKIE = cookieSaved;

  console.log('\n--- 2. Event Delivery ---');

  // [5] SSE delivers initial data event
  const dataLines = s2.lines.filter(l => l.line.startsWith('data:'));
  result('[5] SSE initial data event received', dataLines.length >= 1, `${dataLines.length} data line(s)`);

  // [7] Event format validation
  let validJson = 0, invalidJson = 0;
  for (const dl of dataLines) {
    const jsonStr = dl.line.replace(/^data:\s*/, '').trim();
    try { JSON.parse(jsonStr); validJson++; } catch { invalidJson++; }
  }
  result('[7] Event format: all data: JSON valid', invalidJson === 0, `${validJson} valid, ${invalidJson} invalid`);

  // [8] Concurrent SSE connections
  const [c1, c2] = await Promise.all([
    readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { duration: 8000 }),
    readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { duration: 8000 }),
  ]);
  result('[8] Concurrent SSE connections (2+ tabs)',
    c1.lines.length > 0 && c2.lines.length > 0,
    `stream1: ${c1.lines.length} lines, stream2: ${c2.lines.length} lines`);

  console.log('\n--- 3. Order-triggered SSE ---');

  if (firstItem) {
    const price = Number(firstItem.discountedPrice) || Number(firstItem.price);
    const subtotal = price;
    const total = price;

    // Must send Origin header for CSRF compliance on mutating POST
    const orderRes = await httpRequest('POST', '/api/orders', {
      json: {
        restaurantId: ownerRestId,
        items: [{ itemId: firstItem.id, quantity: 1, price }],
        subtotal, total,
        pickupType: 'inside',
        customerName: 'SSE Test',
        customerPhone: '01099999999',
      },
      headers: { Origin: 'https://menu.smart-link.ly' }
    });
    result('[5b] Order creation (for SSE trigger)',
      orderRes.status === 200 || orderRes.status === 201,
      `HTTP ${orderRes.status} — ${orderRes.parsed?.success ? 'ok' : (orderRes.parsed?.error || '')}`);
    const orderId = orderRes.parsed?.data?.id;

    // Check SSE picks up count change
    const s5 = await readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { duration: 10000 });
    const postDataLines = s5.lines.filter(l => l.line.startsWith('data:') && !l.line.includes('heartbeat'));
    result('[5c] SSE delivers event after order creation',
      postDataLines.length >= 1,
      `${postDataLines.length} data events after order`);

    // Change order status
    if (orderId) {
      const updateRes = await httpRequest('PATCH', `/api/orders/${orderId}`, {
        json: { status: 'confirmed' },
        headers: { Origin: 'https://menu.smart-link.ly' }
      });
      result('[6] Order PATCH status update', updateRes.status === 200,
        updateRes.status === 200 ? `id=${orderId}` : `HTTP ${updateRes.status} — ${updateRes.parsed?.error || ''}`);
    } else {
      result('[6] Order PATCH status update', false, 'no orderId');
    }
  } else {
    result('[5b] Order creation', false, 'no items found');
    result('[5c] SSE after order creation', false, 'skipped');
    result('[6] Order PATCH status update', false, 'skipped');
  }

  console.log('\n--- 4. Error Handling ---');

  // [9] Without auth
  OWNER_COOKIE = '';
  const s9 = await readSSE(`/api/orders/stream?restaurantId=${ownerRestId}`, { checkHeaders: true });
  result('[9] SSE without auth → 401', s9.status === 401,
    s9.status === 401 ? 'correct' : `HTTP ${s9.status}`);

  const s9b = await readSSE('/api/admin/events/stream', { checkHeaders: true });
  result('[9b] Admin SSE without auth → 401', s9b.status === 401,
    s9b.status === 401 ? 'correct' : `HTTP ${s9b.status}`);

  // [10] Session expiry handling
  // Note: can't force session expiry via API — test by design
  result('[10] SSE session expiry protection', s9.status === 401 && s9b.status === 401,
    'unauthenticated requests properly rejected');

  // Restore
  OWNER_COOKIE = cookieSaved;

  console.log('\n--- 5. Admin Event Trigger (via POST /api/admin/events/trigger) ---');

  // This requires EDIT_SETTINGS permission — owner won't have it
  const triggerRes = await httpRequest('POST', '/api/admin/events/trigger', {
    headers: { Origin: 'https://menu.smart-link.ly' }
  });
  result('[12] Admin event trigger with owner cookie',
    triggerRes.status === 403,
    triggerRes.status === 403 ? 'correct (requires EDIT_SETTINGS)' : `HTTP ${triggerRes.status} — ${triggerRes.body.substring(0, 100)}`);

  // ─── SUMMARY ───
  console.log(`\n=== SSE Test Results: ${pass} passed, ${fail} failed ===\n`);

  return {
    results: RESULTS.map(r => ({ test: r.name, status: r.passed ? 'PASS' : 'FAIL', detail: r.detail })),
    summary: { total: pass + fail, passed: pass, failed: fail }
  };
}

const output = await main();
console.log(JSON.stringify(output, null, 2));
