// File: /api/webhook.js
// Ini adalah backend Node.js

// Import library
const midtransClient = require('midtrans-client');
const admin = require('firebase-admin');

// 1. Konfigurasi Firebase Admin SDK (HANYA SEKALI)
// Kita cek apakah app sudah diinisialisasi
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      // Ambil Service Account dari Vercel Environment Variables (RAHASIA BESAR)
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
    databaseURL: "https://donitata1717-f10f7-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = admin.firestore();

// 2. Handler Webhook
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const notificationJson = req.body;

  try {
    // 3. Buat koneksi Midtrans (hanya untuk verifikasi)
    let apiClient = new midtransClient.CoreApi({
      isProduction: false, // Ganti ke true saat live
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    });

    // 4. Verifikasi notifikasi (PENTING untuk keamanan)
    const statusResponse = await apiClient.transaction.notification(notificationJson);
    let orderId = statusResponse.order_id;
    let transactionStatus = statusResponse.transaction_status;
    let fraudStatus = statusResponse.fraud_status;
    let metadata = statusResponse.metadata;

    console.log(`Notification received for order ${orderId}: ${transactionStatus}`);

    // 5. Logika utama: Cek apakah pembayaran SUKSES
    if (transactionStatus == 'settlement') {
      // Pembayaran sukses
      if (fraudStatus == 'accept') {
        
        // 6. Ambil userId dan amount dari metadata yang kita simpan
        const userId = metadata.userId;
        const amount = Number(metadata.amount);

        if (!userId) {
          throw new Error('UserID not found in metadata');
        }

        // 7. Update saldo pengguna di Firestore!
        const userRef = db.collection('users').doc(userId);
        
        // Gunakan FieldValue.increment untuk menambah saldo dengan aman
        await userRef.update({
          saldo: admin.firestore.FieldValue.increment(amount),
          pendingTransaction: 0 // Hapus penanda transaksi pending
        });

        console.log(`SUCCESS: Saldo updated for user ${userId}. Added ${amount}`);
      }
    } else if (transactionStatus == 'cancel' ||
               transactionStatus == 'deny' ||
               transactionStatus == 'expire') {
      // Pembayaran gagal atau dibatalkan
      console.log(`FAILED: Payment for ${orderId} failed or expired.`);
      // Anda bisa membersihkan pendingTransaction di sini jika perlu
    }

    // 8. Kirim balasan OK ke Midtrans
    res.status(200).json({ message: 'Webhook received successfully' });

  } catch (error) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ message: 'Webhook processing failed', error: error.message });
  }
}
