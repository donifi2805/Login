const CACHE_NAME = 'game-auth-tools-v2'; // Ubah versi cache jika ada pembaruan
const urlsToCache = [
  '/',
  'index.html', // Ganti 'index.html' dengan nama file HTML utama Anda
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhI8j1iJeFgIagFemTu0q3_yxUph06s4T6K03apxFf11HmQagnDM-PkaUNlV-VK0k2O-Mj93P4cnVZSWjf6jbmt1imTeAP_woH6aUMEsp9YgyMzCdHNoixyuWtvUf9pmhXlYIvwVt1Tb9CuSFi-Jk6D3pB6-ggMzhKMGkpoJD9ZT-d5T3LcJkW4d_mfGLA/s1600/1750238969835.jpg'
];

// Event 'install' - Menyimpan aset ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Gagal melakukan caching saat instalasi:', err);
      })
  );
});

// Event 'activate' - Membersihkan cache lama
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event 'fetch' - Menyajikan aset dari cache (Cache First Strategy)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika aset ditemukan di cache, kembalikan dari cache
        if (response) {
          return response;
        }
        // Jika tidak, coba ambil dari jaringan
        return fetch(event.request).catch(() => {
            // Jika jaringan gagal (offline) dan aset tidak ada di cache,
            // Anda bisa memberikan halaman fallback offline di sini jika perlu.
        });
      })
  );
});
