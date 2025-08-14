// Nama cache unik untuk versi aplikasi Anda.
// Jika Anda memperbarui aplikasi, ganti 'v1' menjadi 'v2', dst.
// Ini akan memicu service worker untuk menginstal ulang dan mengambil file baru.
const CACHE_NAME = 'maleo-shop-cache-v1';

// Daftar file dan aset penting yang perlu di-cache agar aplikasi bisa berjalan offline.
const urlsToCache = [
  '.', // Mewakili direktori saat ini (penting untuk navigasi)
  'index.html',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js',
  'images/icon-192.png',
  'images/icon-512.png'
];

// Event: 'install'
// Dipicu saat service worker pertama kali diinstal.
self.addEventListener('install', event => {
  // Menunggu hingga proses caching selesai sebelum melanjutkan.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache berhasil dibuka. Menambahkan aset ke cache...');
        return cache.addAll(urlsToCache);
      })
  );
});

// Event: 'activate'
// Dipicu setelah service worker diinstal. Berguna untuk membersihkan cache lama.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // Hanya cache dengan nama ini yang akan disimpan.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Jika nama cache tidak ada di dalam whitelist, hapus cache tersebut.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event: 'fetch'
// Dipicu setiap kali aplikasi meminta resource (seperti gambar, skrip, dll).
self.addEventListener('fetch', event => {
  // Hanya proses permintaan GET, abaikan yang lain (misal: POST ke API).
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategi Caching: Cache-First, lalu Network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika resource ditemukan di cache, langsung kembalikan dari cache.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, ambil dari jaringan (network).
        return fetch(event.request).then(
          networkResponse => {
            // Periksa apakah respons dari jaringan valid.
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone respons karena stream hanya bisa dibaca sekali.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Simpan respons baru ke dalam cache untuk digunakan lain waktu.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(error => {
        // Terjadi jika cache dan jaringan gagal (misal: mode offline).
        console.log('Fetch gagal; Anda sedang offline.', error);
        // Di sini Anda bisa mengembalikan halaman offline fallback jika ada.
        // Contoh: return caches.match('offline.html');
      })
  );
});
