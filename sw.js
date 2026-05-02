// Mira Service Worker — Offline Support
const CACHE = "mira-v1";
const ASSETS = [
  "/app.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (e) => {
  // Skip non-GET and API calls (must be live)
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.includes("groq.com") || 
      url.hostname.includes("openai.com") ||
      url.hostname.includes("railway.app")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications (future use)
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  self.registration.showNotification(data.title || "Mira", {
    body: data.body || "Time to practice!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "mira-notification",
  });
});
