const CACHE_NAME = 'smart-menu-v5';
// REMINDER: bump CACHE_VERSION whenever this file changes
const STATIC_ASSETS = ['/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Public, read-only, session-free endpoints safe for stale-while-revalidate.
// EVERYTHING else under /api/ is network-only (see fetch handler comment).
const API_CACHEABLE = [/^\/api\/public\//];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(STATIC_ASSETS);
		})()
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (request.method !== 'GET') return;
	if (url.origin !== self.location.origin) return;

	// Static assets: cache-first
	if (
		url.pathname.match(/\.(css|js|woff2?|ttf|otf|svg|ico|png|jpg|jpeg|webp)$/) ||
		url.pathname === '/manifest.json'
	) {
		event.respondWith(cacheFirst(request));
		return;
	}

	// round86-B11: optimized images are content-addressed (?url=&w=&q=) — safe
	// to cache-first so offline/weak-signal QR re-visits don't re-fetch item
	// images (previously fell through to network-first because /_next/image
	// URLs carry no file extension)
	if (url.pathname.startsWith('/_next/image')) {
		event.respondWith(cacheFirst(request));
		return;
	}

	// API: stale-while-revalidate ONLY for the public read-only allowlist
	// (/api/public/* — landing featured/stats). Everything else is
	// network-only. round79 Stage C caught the previous behavior caching
	// authenticated endpoints too: after creating a category (POST 201 +
	// "تمت الإضافة" toast) the list GET was served the PRE-POST cached
	// response, so the new category stayed invisible until a later
	// navigation. Same staleness risk applies to /api/auth/* (session),
	// payment status polls, and all owner/admin management data — none of
	// them may ever be served stale.
	if (url.pathname.startsWith('/api/')) {
		const cacheable =
			request.method === 'GET' && API_CACHEABLE.some((re) => re.test(url.pathname));
		if (cacheable) {
			event.respondWith(staleWhileRevalidateJSON(request));
		} else {
			event.respondWith(networkOnly(request));
		}
		return;
	}

	// Navigations: network-first
	if (url.pathname.match(/^\/([^.]*|$)/)) {
		event.respondWith(networkFirst(request));
		return;
	}

	event.respondWith(networkFirst(request));
});

// JSON-safe stale-while-revalidate: serves cached response only when it is
// valid application/json; refreshes from network; never caches non-JSON.
// Also purges any poisoned (text/html) cache entries from older SW versions.
async function staleWhileRevalidateJSON(request) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);
	const isJson = (r) => (r?.headers?.get('content-type') || '').includes('application/json');
	if (cached && isJson(cached)) {
		// revalidate in background
		fetch(request)
			.then(async (res) => {
				if (res.ok && isJson(res)) await cache.put(request, res.clone());
			})
			.catch(() => {});
		return cached;
	}
	// Purge poisoned entry, then network
	if (cached) await cache.delete(request);
	try {
		const res = await fetch(request);
		if (res.ok && isJson(res)) await cache.put(request, res.clone());
		return res;
	} catch {
		return cached ?? Response.error();
	}
}

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;
	try {
		const res = await fetch(request);
		if (res.ok) {
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, res.clone());
		}
		return res;
	} catch {
		return caches.match('/offline.html');
	}
}

async function networkOnly(request) {
	try {
		return await fetch(request);
	} catch {
		return new Response(null, { status: 503 });
	}
}

async function networkFirst(request) {
	try {
		const res = await fetch(request);
		if (res.ok) {
			const cache = await caches.open(CACHE_NAME);
			cache.put(request, res.clone());
		}
		return res;
	} catch {
		const cached = await caches.match(request);
		return cached || caches.match('/offline.html');
	}
}
