const CACHE_NAME = 'smart-menu-v7';
// REMINDER: bump CACHE_VERSION whenever this file changes
// r126 (P4-W3b / audit G2): the two first-paint arabic subsets (~86 KB,
// fonts.css "First paint needs only the two preloaded arabic subsets") are
// precached at install — previously they were cache-first ONLY after the
// first visit of each, so offline/weak-signal revisits flashed fallback
// text (FOUT). 400 = body/regular runs, 700 = bold/CTA runs.
const STATIC_ASSETS = [
	'/offline.html',
	'/manifest.json',
	'/icon-192.png',
	'/icon-512.png',
	'/fonts/plex-sans-arabic-400-normal-arabic.woff2',
	'/fonts/plex-sans-arabic-700-normal-arabic.woff2',
];

// round87-D10: dedicated cache for /_next/image responses, separate from
// CACHE_NAME so bounded eviction below can never touch the precached static
// assets or JSON entries. Capped: menus with hundreds of content-addressed
// item images would otherwise grow CacheStorage without limit.
// r126 (P4-W3b): NOT renamed to v7 — the entries are content-addressed
// (?url=&w=&q=) and stay valid across SW versions; renaming would evict up
// to 60 images for zero gain. The v6 tag tracks the last bump that touched
// THIS cache's strategy, and the activate filter keeps it by name.
const IMAGE_CACHE_NAME = 'smart-menu-v6-images';
const IMAGE_CACHE_MAX = 60;

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
			await Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== IMAGE_CACHE_NAME).map((k) => caches.delete(k)));
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
	// URLs carry no file extension). round87-D10: now served from the bounded
	// LRU image cache (IMAGE_CACHE_MAX entries, see imageCacheFirst below).
	if (url.pathname.startsWith('/_next/image')) {
		event.respondWith(imageCacheFirst(request));
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

// round87-D10: bounded LRU variant of cacheFirst for /_next/image URLs.
// Cache keys() yields requests in insertion order, so "oldest" = first key.
// A hit refreshes recency (delete + re-put moves it to the tail); a new
// entry evicts from the head first until the cache fits the cap.
async function imageCacheFirst(request) {
	const cache = await caches.open(IMAGE_CACHE_NAME);
	const cached = await cache.match(request);
	if (cached) {
		// LRU touch: clone BEFORE returning (a consumed body can no longer be
		// cloned). Background refresh — failure is harmless, worst case the
		// entry keeps its old position and is evicted sooner.
		const fresh = cached.clone();
		cache.delete(request).then(() => cache.put(request, fresh)).catch(() => {});
		return cached;
	}
	try {
		const res = await fetch(request);
		if (res.ok) {
			// +1 accounts for the entry we are about to insert.
			const keys = await cache.keys();
			while (keys.length + 1 > IMAGE_CACHE_MAX) {
				const oldest = keys.shift();
				if (!oldest) break;
				await cache.delete(oldest);
			}
			await cache.put(request, res.clone());
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
