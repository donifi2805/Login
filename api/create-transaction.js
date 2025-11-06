// File: /api/create-transaction.js
// Ini adalah backend Node.js yang berjalan di Vercel

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
      // Ambil Server Key & Client Key dari Vercel Environment Variables
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // 4. Siapkan parameter transaksi
    let parameter = {
      transaction_details: {
        order_id: `TOPUP-${userId}-${Date.now()}`, // ID order unik
        gross_amount: Number(amount)
      },
      customer_details: {
        first_name: username || 'Pelanggan',
        email: email || 'noreply@example.com'
      },
      // PENTING: Kirim metadata ini agar webhook tahu siapa yang harus diupdate
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
    // 7. Tangani jika ada error (misal: Server Key salah)
    console.error("Midtrans Error:", error.message);
    res.status(500).json({ message: 'Gagal membuat transaksi', error: error.message });
  }
}
