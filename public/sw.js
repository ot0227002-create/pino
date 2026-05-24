const CACHE_NAME = "pro-mgmt-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// サーバーからのプッシュ受信
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title  = data.title  || "PRO-MANAGEMENT";
  const options = {
    body:    data.body    || "新しい通知があります",
    icon:    data.icon    || "/icon-192.png",
    badge:   data.badge   || "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    data:    { url: data.url || "/dashboard" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップ → アプリを開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
