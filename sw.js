const CACHE_NAME = 'pwa-cache-v2'; // Versi dinaikkan ke v2 untuk memaksa pembersihan cache lama
const urlsToCache = [
  '/',
  'index.html'
  // Anda dapat menambahkan aset lokal penting lainnya di sini (misalnya: ikon, audio, dll.)
];

// Event Install - Mengunduh aset awal dan langsung mengaktifkan Service Worker baru
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Membuka cache dan menyimpan aset utama');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Memaksa SW baru untuk langsung aktif tanpa menunggu
  );
});

// Event Activate - Membersihkan sisa-sisa cache lama dari versi sebelumnya
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache usang:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Mengambil kendali penuh atas halaman yang terbuka secara instan
  );
});

// Event Fetch - Strategi pengiriman berkas dengan sistem proteksi cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. STRATEGI: Network-First khusus untuk Navigasi Halaman Utama (Index)
  // Menjamin pengguna mendapatkan versi terbaru dari server jika online, dan fallback ke cache saat offline
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline, sajikan versi terakhir yang tersimpan di cache
          return caches.match(event.request);
        })
    );
  } else {
    // 2. STRATEGI: Cache-First untuk Aset Statis (Google Fonts, unpkg Icons, dll.)
    // Membantu mempercepat loading komponen visual aplikasi
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(networkResponse => {
            // Hanya simpan aset eksternal penting atau aset dari domain asal ke dalam cache
            if (
              networkResponse.status === 200 &&
              (url.origin === self.location.origin || 
               url.href.includes('fonts.googleapis.com') || 
               url.href.includes('fonts.gstatic.com') || 
               url.href.includes('unpkg.com'))
            ) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          });
        })
    );
  }
});