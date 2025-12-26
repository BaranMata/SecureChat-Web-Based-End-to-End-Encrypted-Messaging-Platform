// src/pages/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import Modal from '../components/Modal';

// ✅ Crypto: AES key'i geri yüklemek ve mesaj şifrelemek için
import { importAesKey, encryptMessage, decryptMessage } from '../crypto/cryptoService';

// --- MOCK VERİTABANI (SAHTE MESAJ GEÇMİŞİ) ---
// Backend yokken "DB" simülasyonu: burada cipherText/iv saklayacağız.
const MOCK_DB: Record<number, Message[]> = {
  "1": [
    { id: "1", sender: 'Gokce_Naz', text: 'Hey!', timestamp: '10:00', isOwn: false },
    { id: "2", sender: 'Ben', text: 'Hey!', timestamp: '10:01', isOwn: true },
  ],
  "2": [
    { id: "3", sender: 'Basak_Su', text: 'Merhaba!', timestamp: '10:02', isOwn: false },
  ],
  "3": []
};

const Chat: React.FC = () => {
  // --- STATE ---
  const [input, setInput] = useState('');

  // ✅ Login'den gelen AES shared key (Chat'te kullanacağız)
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);

  // ✅ Debug amaçlı: son şifreli paket (UI bozulmasın diye ekranda göstermiyoruz)
  const [lastEncrypted, setLastEncrypted] = useState<{ cipherText: string; iv: string } | null>(null);

  // Kullanıcı Listesi
  const [users, setUsers] = useState<User[]>([
    { id: "1", username: 'Gokce_Naz', isOnline: true },
    { id: "2", username: 'Basak_Su', isOnline: false },
    { id: "3", username: 'Oguzhan', isOnline: true },
  ]);

  // Varsayılan olarak ilk kullanıcı seçili
  const [selectedUser, setSelectedUser] = useState<User>(users[0]);

  // Ekranda görünen mesajlar (plaintext göstereceğiz)
  const [messages, setMessages] = useState<Message[]>([]);

  // Otomatik kaydırma referansı
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- MODAL STATE'LERİ ---
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  // ✅ Debug Modal (Decrypt butonu burada, UI bozulmuyor)
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugDecryptedText, setDebugDecryptedText] = useState<string>('');

  // --- EFFECTS ---

  // ✅ 0) Chat açılınca AES key'i sessionStorage'tan yükle
  useEffect(() => {
    const loadSharedKey = async () => {
      const stored = sessionStorage.getItem("securechat_shared_aes");

      if (!stored) {
        console.warn("⚠️ Shared AES key bulunamadı. Önce Login yap.");
        return;
      }

      try {
        const jwk = JSON.parse(stored);
        const key = await importAesKey(jwk);
        setSharedKey(key);
        console.log("✅ Chat ekranında Shared AES key yüklendi!");
      } catch (err) {
        console.error("❌ Shared AES key import edilemedi:", err);
      }
    };

    loadSharedKey();
  }, []);

  // 1) Kullanıcı değişince mesajları güncelle
  useEffect(() => {
    const userId = selectedUser.id;
    const userMessages = MOCK_DB[userId] || [];
    setMessages(userMessages);
  }, [selectedUser]);

  // 2) Mesaj gelince en aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- FONKSİYONLAR ---

  // Mesaj Gönderme
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // ✅ 1) Encrypt (backend'e gidecek paket)
    let cipherText: string | undefined;
    let iv: string | undefined;

    if (sharedKey) {
      try {
        const encrypted = await encryptMessage(input, sharedKey);
        cipherText = encrypted.cipherText;
        iv = encrypted.iv;

        // Debug için sakla (UI'da göstermiyoruz)
        setLastEncrypted({ cipherText, iv });

        console.log("🔒 Chat Encrypt OK");
        console.log("cipherText:", cipherText);
        console.log("iv:", iv);
      } catch (err) {
        console.error("❌ Encrypt error:", err);
      }
    } else {
      console.warn("⚠️ sharedKey yok, şifreleme atlandı (Login yapılmamış olabilir).");
    }

    // ✅ 2) UI'da plaintext mesaj görünsün (tasarım bozulmasın)
    const newMessage: Message = {
      id: Date.now(),
      sender: 'Ben',
      text: input,          // UI plaintext
      cipherText,           // backend için
      iv,                   // backend için
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    // UI
    setMessages(prev => [...prev, newMessage]);

    // "DB" (mock)
    if (MOCK_DB[selectedUser.id]) {
      MOCK_DB[selectedUser.id].push(newMessage);
    } else {
      MOCK_DB[selectedUser.id] = [newMessage];
    }

    setInput('');
  };

  // ✅ Debug: son encrypted paketi decrypt et (UI bozulmasın diye modal içinde)
  const handleDebugDecrypt = async () => {
    if (!sharedKey || !lastEncrypted) return;

    try {
      const plain = await decryptMessage(lastEncrypted.cipherText, lastEncrypted.iv, sharedKey);
      setDebugDecryptedText(plain);
    } catch (e) {
      setDebugDecryptedText("⚠️ Decrypt başarısız");
    }
  };

  // Yeni Kişi Ekleme (Modal Submit)
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const newId = Date.now();
    const newUser: User = {
      id: newId,
      username: newUsername,
      isOnline: false
    };

    setUsers(prev => [...prev, newUser]);
    MOCK_DB[newId] = [];
    setSelectedUser(newUser);

    setNewUsername('');
    setIsAddUserOpen(false);
  };

  return (
    <div className="chat-container">
      {/* SOL PANEL (SIDEBAR) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Kişiler</h3>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Debug butonu */}
            <button
              className="add-user-btn"
              onClick={() => setIsDebugOpen(true)}
              title="Debug (Encrypt/Decrypt)"
              style={{ width: 34, height: 34 }}
            >
              🛠
            </button>

            {/* Kişi ekle */}
            <button
              className="add-user-btn"
              onClick={() => setIsAddUserOpen(true)}
              title="Yeni Kişi Ekle"
              style={{ width: 34, height: 34 }}
            >
              +
            </button>
          </div>
        </div>

        <div className="user-list">
          {users.map(user => (
            <div
              key={user.id}
              className={`user-item ${selectedUser.id === user.id ? 'active' : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className={`status-dot ${user.isOnline ? 'online' : 'offline'}`}></div>
              <span>{user.username}</span>
            </div>
          ))}
        </div>

        <div className="current-user-info">
          <small>Oturum: <b>Baran Asar</b></small>
        </div>
      </div>

      {/* SAĞ PANEL (CHAT AREA) */}
      <div className="chat-area">
        <div className="chat-header">
          <div className="header-info">
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--neon-green)', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>

            <div style={{ marginLeft: '15px' }}>
              <h3>{selectedUser.username}</h3>
              <span className="security-badge">E2E Encrypted (AES-256)</span>
            </div>
          </div>
        </div>

        <div className="messages-box">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>
              <p>👋 <b>{selectedUser.username}</b> kişisi eklendi.</p>
              <p>İlk mesajı göndererek şifreli sohbeti başlat!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.isOwn ? 'own-message' : 'other-message'}`}>
                <div className="message-bubble">
                  {/* ✅ Tasarımı bozmuyoruz: text her zaman plaintext */}
                  <p>{msg.text}</p>
                  <span className="timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={`${selectedUser.username} kişisine şifreli mesaj yaz...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">Gönder ➤</button>
        </form>
      </div>

      {/* --- MODAL: Yeni Kişi --- */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Yeni Kişi Ekle"
      >
        <form onSubmit={handleAddUserSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>
              Kullanıcı Adı veya ID
            </label>
            <input
              type="text"
              placeholder="ör. ahmet_yilmaz"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="login-btn">
            Kişiyi Listeme Ekle
          </button>
        </form>
      </Modal>

      {/* --- MODAL: Debug Encrypt/Decrypt --- */}
      <Modal
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        title="Debug (Encrypt/Decrypt)"
      >
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
          <p>
            Bu ekran sadece demo/debug için. Gerçek sistemde server plaintext görmez.
          </p>

          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, color: '#cbd5e1' }}>Son Encrypt Paketi:</div>
            <div style={{ wordBreak: 'break-all', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 10 }}>
              <div><b>cipherText:</b> {lastEncrypted?.cipherText ?? "—"}</div>
              <div style={{ marginTop: 8 }}><b>iv:</b> {lastEncrypted?.iv ?? "—"}</div>
            </div>
          </div>

          <button
            type="button"
            className="login-btn"
            style={{ marginTop: 14, width: '100%' }}
            onClick={handleDebugDecrypt}
            disabled={!lastEncrypted || !sharedKey}
          >
            Decrypt (son paketi çöz)
          </button>

          {debugDecryptedText && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 6, color: '#cbd5e1' }}>Çözülen Metin:</div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 10 }}>
                {debugDecryptedText}
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};

export default Chat;
