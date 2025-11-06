// File: /api/webhook.js
// Ini adalah backend Node.js yang berjalan di Vercel

// 1. Import library
const midtransClient = require('midtrans-client');
const admin = require('firebase-admin');

// 2. Konfigurasi Firebase Admin SDK (HANYA SEKALI)
// Kredensial diambil dari Vercel Environment Variables (RAHASIA BESAR)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Kita cek apakah app sudah diinisialisasi
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // INI ADALAH BARIS YANG DIPERBAIKI (firebasedatabase.app)
    databaseURL: "https://donitata1717-f10f7-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.firestore();

// 3. Handler Webhook
export default async function handler(req, res) {
  // Hanya izinkan metode POST dari Midtrans
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const notificationJson = req.body;

  try {
    // 4. Buat koneksi Midtrans CoreApi (untuk verifikasi)
    let apiClient = new midtransClient.CoreApi({
      isProduction: false, // Ganti ke true saat live
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // 5. Verifikasi notifikasi (SANGAT PENTING untuk keamanan)
    // Ini akan mengecek status ke server Midtrans, memastikan notif ini ASLI
    const statusResponse = await apiClient.transaction.notification(notificationJson);
    
    let orderId = statusResponse.order_id;
    let transactionStatus = statusResponse.transaction_status;
    let fraudStatus = statusResponse.fraud_status;
    let metadata = statusResponse.metadata; // Ambil metadata yang kita kirim

    console.log(`Webhook received for order ${orderId}: ${transactionStatus}`);

    // 6. Logika utama: Cek apakah pembayaran SUKSES
    if (transactionStatus == 'settlement') {
      // Pembayaran sukses
      if (fraudStatus == 'accept') {
        
        // 7. Ambil userId dan amount dari metadata
        const userId = metadata.userId;
        const amount = Number(metadata.amount);

        if (!userId || !amount) {
          throw new Error('UserID or Amount not found in metadata');
        }

        // 8. Update saldo pengguna di Firestore!
        const userRef = db.collection('users').doc(userId);
        
        // Gunakan FieldValue.increment untuk menambah saldo dengan aman
        // Ini adalah operasi ATOMIC (anti-race condition)
        await userRef.update({
          saldo: admin.firestore.FieldValue.increment(amount)
        });

        console.log(`SUCCESS: Saldo updated for user ${userId}. Added ${amount}`);
      
      }
    } else if (transactionStatus == 'cancel' ||
               transactionStatus == 'deny' ||
               transactionStatus == 'expire') {
      // Pembayaran gagal atau dibatalkan
      console.log(`FAILED: Payment for ${orderId} failed or expired.`);
    }

    // 9. Kirim balasan 200 OK ke Midtrans
    // (Ini memberitahu Midtrans "Notifikasi sudah diterima, jangan kirim lagi")
    res.status(200).json({ message: 'Webhook received successfully' });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ message: 'Webhook processing failed', error: error.message });
  }
}
