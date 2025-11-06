// File: /api/create-transaction.js
// --- VERSI TES HARDCODE (TIDAK AMAN) ---

// 1. Import library Midtrans
const midtransClient = require('midtrans-client');

export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 2. Ambil data dari frontend (index.html)
    const { amount, userId, username, email } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({ message: 'Amount or UserID are required' });
    }

    // 3. Buat koneksi Snap ke Midtrans (secara aman)
    let snap = new midtransClient.Snap({
      isProduction: false, // Ganti ke true saat sudah live
      
      // --- PERHATIAN: KUNCI RAHASIA DI-HARDCODE DI SINI ---
      serverKey: "Mid-server-mwtNt4KdXhfTh_7ZlcvQ7PPY",
      clientKey: "Mid-client-8TT0eNd07TlxaBLz", // Client key juga di-hardcode
      // ----------------------------------------------------

    });

    // 4. Siapkan parameter transaksi
    let parameter = {
      transaction_details: {
        order_id: `TOPUP-TEST-${userId}-${Date.now()}`, // ID order unik
        gross_amount: Number(amount)
      },
      customer_details: {
        first_name: username || 'Pelanggan',
        email: email || 'noreply@example.com'
      },
      metadata: {
         userId: userId,
         amount: Number(amount)
      }
    };

    // 5. Buat transaksi dan dapatkan token
    const transaction = await snap.createTransaction(parameter);
    const snapToken = transaction.token;

    // 6. Kirim token kembali ke frontend (index.html)
    res.status(200).json({ snapToken });

  } catch (error) {
    // 7. Tangani jika ada error
    console.error("Hardcoded Midtrans Error:", error.message);
    res.status(500).json({ message: 'Gagal membuat transaksi (Tes Hardcode)', error: error.message });
  }
}
