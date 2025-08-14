const CACHE_NAME = 'maleo-shop-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// Event: Install
// Dipicu saat service worker diinstal.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Event: Activate
// Dipicu setelah instalasi, digunakan untuk membersihkan cache lama.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event: Fetch
// Dipicu setiap kali aplikasi meminta resource (misalnya gambar, skrip, data API).
self.addEventListener('fetch', event => {
  // Hanya tangani permintaan GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Strategi: Cache-First, lalu Network
  // Mencoba menyajikan dari cache terlebih dahulu. Jika gagal (tidak ada di cache),
  // baru mengambil dari jaringan.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Jika ditemukan di cache, kembalikan dari cache
          return response;
        }

        // Jika tidak ada di cache, ambil dari jaringan
        return fetch(event.request).then(
          networkResponse => {
            // Periksa apakah respons valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // Jika tidak, kembalikan respons jaringan apa adanya tanpa caching
              return networkResponse;
            }
            
            // Penting: Clone respons. Stream hanya bisa dibaca sekali.
            // Kita perlu satu untuk dikirim ke browser dan satu untuk dimasukkan ke cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Tambahkan respons baru ke cache untuk permintaan di masa mendatang
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(error => {
        // Jika cache dan jaringan gagal, ini adalah mode offline
        console.log('Fetch failed; returning offline page (if available).', error);
        // Anda bisa mengembalikan halaman offline fallback di sini jika mau
        // return caches.match('/offline.html'); 
      })
  );
});
