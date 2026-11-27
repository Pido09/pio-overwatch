// PIO Offset Tracker service worker.
// Always asks GitHub for the newest files first (skipping the browser cache), so updates show up
// on the next refresh. The saved copy is used only when offline. Data calls to Apps Script are never cached.
var CACHE = 'pio-offsets-v100';
var SHELL = ['./', 'index.html', 'app.css', 'js/core.js', 'js/views.js', 'js/events.js', 'js/documents.js', 'js/data.js', 'js/tasks.js', 'js/push.js', 'js/app.js', 'config.js', 'pio-logo.webp', 'pio-digital.webp', 'capitol.webp', 'icon-192.png', 'icon-maskable-192.png', 'apple-touch-icon.png', 'badge-96.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});

/* phone alerts sent by the alerts worker (push-worker/), even when the app is closed */
self.addEventListener('push', function(e){
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'PIO Overwatch', { body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icon-192.png', badge: 'badge-96.png', data: { url: d.url || './' } }));
});
/* tapping an alert opens the app on the right page */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for (var i = 0; i < list.length; i++) if ('focus' in list[i]){ var c = list[i]; return c.focus().then(function(){ if ('navigate' in c && c.url !== url) return c.navigate(url); }); }
    return self.clients.openWindow(url);
  }));
});
