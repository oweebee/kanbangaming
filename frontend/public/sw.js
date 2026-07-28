// KangBanGaming — Service Worker
// Stratégie : cache-first pour les assets statiques, network-first pour l'API

const CACHE_VERSION = 'v1';
const SHELL_CACHE   = `kbg-shell-${CACHE_VERSION}`;
const ASSET_CACHE   = `kbg-assets-${CACHE_VERSION}`;

// Ressources du shell à pré-cacher (mises à jour à chaque déploiement via Vite)
const SHELL_URLS = ['/', '/index.html'];

// ── Install : pré-cache du shell ──────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : nettoyage des anciens caches ───────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions de navigateur
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── API : network-first, pas de cache ────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── Assets Vite (JS/CSS hashés) : cache-first ────────────────────────────
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // ── Images statiques (icônes, task-types, preview) : cache-first ─────────
  if (/\.(png|jpg|jpeg|webp|svg|gif|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // ── Navigation (HTML) : network-first, fallback shell ────────────────────
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre à jour le cache shell si OK
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline : retourner le shell caché
          const cached = await caches.match('/') || await caches.match('/index.html');
          return cached || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // ── Tout le reste : network avec fallback cache ───────────────────────────
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
