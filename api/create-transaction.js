// File: /api/create-transaction.js
// Ini adalah backend Node.js

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
      return res.status(400).json({ message: 'Amount and UserID are required' });
    }

    // 3. Buat koneksi Snap ke Midtrans (secara aman)
    let snap = new midtransClient.Snap({
      isProduction: false, // Ganti ke true saat sudah live
      // Ambil Server Key dari Vercel Environment Variables (RAHASIA)
      serverKey: process.env.MIDTRANS_SERVER_KEY, 
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    });

    // 4. Siapkan parameter transaksi
    // PENTING: Kita gunakan userId sebagai order_id agar mudah dicari di webhook
    let parameter = {
      transaction_details: {
        order_id: `TOPUP-${userId}-${Date.now()}`, // ID order unik
        gross_amount: Number(amount)
      },
      customer_details: {
        first_name: username || 'Pelanggan',
        email: email || 'noreply@example.com'
      },
      // Simpan userId di metadata untuk webhook
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
    console.error("Midtrans Error:", error.message);
    res.status(500).json({ message: 'Failed to create transaction', error: error.message });
  }
}
