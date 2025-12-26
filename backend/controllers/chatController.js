const pool = require('../config/db');

exports.getHistory = async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    
    // DÜZELTME 1: Sıralama yaparken 'timestamp' yerine 'created_at' kullanıldı.
    const messages = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, friendId]
    );

    // Frontend'in anlayacağı formata çevir
    const formatted = messages.rows.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      cipherText: msg.cipher_text, 
      iv: msg.iv,                  
      timestamp: msg.created_at // DÜZELTME 2: Veri tabanından gelen 'created_at' verisi atandı.
    }));

    res.json(formatted);
  } catch (err) {
    // DÜZELTME 3: Hatayı terminale yazdıralım ki bir daha hata olursa sebebini görelim.
    console.error("Chat Geçmişi Hatası:", err);
    res.status(500).json({ error: "Mesajlar yüklenemedi" });
  }
};