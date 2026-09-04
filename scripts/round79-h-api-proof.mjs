/**
 * Round79 Stage H — owner API persistence proof (real HTTP, real session):
 * login as waha_owner → GET /api/items (fields present) → PUT toggle
 * isFeatured + rank + tag → verify DB → restore.
 */
import { Client } from 'pg';

const BASE = 'http://localhost:3000';
const DB = 'postgresql://postgres:postgres@localhost:5432/smartmenu';

async function main() {
	// 1) login (session cookie)
	const login = await fetch(`${BASE}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username: 'waha_owner', password: 'owner123456' }),
	});
	if (!login.ok) throw new Error(`login failed: ${login.status}`);
	const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
	console.log('login: OK');

	// 2) CSRF token
	const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } });
	const meBody = await me.json();
	const csrfToken = meBody?.data?.csrfToken ?? meBody?.csrfToken;
	const csrfCookie = me.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.toLowerCase().includes('csrf'));
	const fullCookie = csrfCookie ? `${cookie}; ${csrfCookie}` : cookie;
	console.log('csrf token:', csrfToken ? 'present' : 'MISSING');

	const headers = { cookie: fullCookie, 'Content-Type': 'application/json', 'x-csrf-token': csrfToken || '' };

	// 3) GET items — featured fields flow to owner UI
	const itemsRes = await fetch(`${BASE}/api/items?restaurantId=1&pageSize=100`, { headers: { cookie: fullCookie } });
	const itemsBody = await itemsRes.json();
	const items = itemsBody?.data ?? [];
	const withFields = items.filter((i) => 'isFeatured' in i && 'featuredRank' in i && 'showcaseTag' in i);
	console.log(`GET /api/items: ${itemsRes.status}, items=${items.length}, with featured fields=${withFields.length}`);

	// 4) PUT — update rank+tag of item 1
	const put = await fetch(`${BASE}/api/items/1`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ isFeatured: true, featuredRank: 2, showcaseTag: 'محمّص طازة' }),
	});
	console.log(`PUT /api/items/1: ${put.status}`);
	if (!put.ok) throw new Error(await put.text());

	// 5) verify in DB
	const db = new Client({ connectionString: DB });
	await db.connect();
	const { rows } = await db.query(`SELECT "isFeatured", "featuredRank", "showcaseTag" FROM "MenuItem" WHERE id = 1`);
	console.log('DB after PUT:', JSON.stringify(rows[0]));

	// 6) PUT with isFeatured=false — un-feature clears rank+tag (API contract)
	const put2 = await fetch(`${BASE}/api/items/1`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ isFeatured: false, featuredRank: null, showcaseTag: null }),
	});
	console.log(`PUT (un-feature): ${put2.status}`);
	const { rows: rows2 } = await db.query(`SELECT "isFeatured", "featuredRank", "showcaseTag" FROM "MenuItem" WHERE id = 1`);
	console.log('DB after un-feature:', JSON.stringify(rows2[0]));

	// 7) restore original values
	await fetch(`${BASE}/api/items/1`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ isFeatured: true, featuredRank: 1, showcaseTag: 'مقرمش' }),
	});
	const { rows: rows3 } = await db.query(`SELECT "isFeatured", "featuredRank", "showcaseTag" FROM "MenuItem" WHERE id = 1`);
	console.log('DB restored:', JSON.stringify(rows3[0]));

	// 8) rejection path: rank out of bounds → 400 with Arabic message
	const bad = await fetch(`${BASE}/api/items/1`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ isFeatured: true, featuredRank: 9 }),
	});
	const badBody = await bad.json().catch(() => ({}));
	console.log(`PUT invalid rank=9: ${bad.status} — ${JSON.stringify(badBody?.error ?? badBody).slice(0, 120)}`);

	await db.end();
}

main().catch((e) => {
	console.error('FAIL:', e.message);
	process.exit(1);
});
