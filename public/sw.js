const CACHE_NAME = 'survey-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/manifest.json'
];

// 1. 安装阶段：强行缓存核心静态前端资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// 2. 激活阶段：清理过期的老缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

// 3. 网络请求拦截：静态资源使用缓存优先策略，API 接口正常放行
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 如果是后端的 API 请求，不进行本地离线缓存拦截
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
