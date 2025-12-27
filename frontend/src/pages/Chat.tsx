import React, { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';
import Modal from '../components/Modal';

// ✅ Crypto Servis Fonksiyonları
import { 
  importAesKey, 
  encryptMessage, 
  decryptMessage, 
  generateKeyPair, 
  exportEcdhKey 
} from '../crypto/cryptoService';

const MOCK_DB: Record<string, Message[]> = {
  "1": [
    { id: "init-1", sender: 'Gokce_Naz', text: 'Hey!', timestamp: '10:00', isOwn: false },
    { id: "init-2", sender: 'Ben', text: 'Hey!', timestamp: '10:01', isOwn: true },
  ],
  "2": [
    { id: "init-3", sender: 'Basak_Su', text: 'Merhaba!', timestamp: '10:02', isOwn: false },
  ],
};

const Chat: React.FC = () => {
  const [input, setInput] = useState('');
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [lastEncrypted, setLastEncrypted] = useState<{ cipherText: string; iv: string } | null>(null);

  const [users, setUsers] = useState<User[]>([
    { id: "1", username: 'Gokce_Naz', isOnline: true },
    { id: "2", username: 'Basak_Su', isOnline: false },
    { id: "3", username: 'Oguzhan', isOnline: true },
  ]);

  const [selectedUser, setSelectedUser] = useState<User>(users[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugDecryptedText, setDebugDecryptedText] = useState<string>('');

  // ✅ Güvenlik Başlatma: Sayfa açıldığında anahtarı yükle
  useEffect(() => {
    const initializeSecurity = async () => {
      const stored = sessionStorage.getItem("securechat_shared_aes");
      if (!stored) {
        console.warn("⚠️ AES key yok. Test için anahtar üretiliyor...");
        const pair = await generateKeyPair();
        const pub = await exportEcdhKey(pair.publicKey);
        console.log("🔑 [GÜVENLİK] Test Public Key:", pub);
        return;
      }
      try {
        const jwk = JSON.parse(stored);
        const key = await importAesKey(jwk);
        setSharedKey(key);
        console.log("✅ [GÜVENLİK] Shared AES Key aktif.");
      } catch (err) {
        console.error("❌ Key import hatası:", err);
      }
    };
    initializeSecurity();
  }, []);

  useEffect(() => {
    const userMessages = MOCK_DB[selectedUser.id] || [];
    setMessages([...userMessages]);
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ KRİTİK FONKSİYON: Şifreleme ve Backend'e Gönderim
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let cipherText: string | undefined;
    let iv: string | undefined;

    // 1. Şifreleme (Client-side)
    if (sharedKey) {
      try {
        const encrypted = await encryptMessage(input, sharedKey);
        cipherText = encrypted.cipherText;
        iv = encrypted.iv;
        setLastEncrypted({ cipherText, iv });

        console.log("🔒 [GÜVENLİK] Mesaj Şifrelendi!");
        console.log("📡 Gönderilecek Şifreli Veri:", cipherText);
      } catch (err) {
        console.error("❌ Şifreleme hatası:", err);
        return;
      }
    }

    // 2. Backend API İsteği (Veritabanına Kaydetme)
    try {
      // Chat.tsx içinde 5000 olan yeri 3000 yap
const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          cipher_text: cipherText,
          iv: iv
        })
      });

      if (response.ok) {
        console.log("🚀 Şifreli mesaj veritabanına (PostgreSQL) başarıyla kaydedildi!");
      }
    } catch (error) {
      console.error("❌ Mesaj gönderilirken ağ hatası:", error);
    }

    // 3. UI Güncelleme (Yerel görünüm)
    const newMessage: Message = {
      id: window.crypto.randomUUID(),
      sender: 'Ben',
      text: input, // Kendi ekranında düz metin görüyorsun
      cipherText,
      iv,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    setMessages(prev => [...prev, newMessage]);
    if (!MOCK_DB[selectedUser.id]) MOCK_DB[selectedUser.id] = [];
    MOCK_DB[selectedUser.id].push(newMessage);
    setInput('');
  };

  const handleDebugDecrypt = async () => {
    if (!sharedKey || !lastEncrypted) return;
    try {
      const plain = await decryptMessage(lastEncrypted.cipherText, lastEncrypted.iv, sharedKey);
      setDebugDecryptedText(plain);
    } catch (e) {
      setDebugDecryptedText("⚠️ Hata: Çözülemedi.");
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const newId = window.crypto.randomUUID();
    const newUser: User = { id: newId, username: newUsername, isOnline: false };
    setUsers(prev => [...prev, newUser]);
    MOCK_DB[newId] = [];
    setSelectedUser(newUser);
    setNewUsername('');
    setIsAddUserOpen(false);
  };

  return (
    <div className="chat-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Kişiler</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="add-user-btn" onClick={() => setIsDebugOpen(true)}>🛠</button>
            <button className="add-user-btn" onClick={() => setIsAddUserOpen(true)}>+</button>
          </div>
        </div>
        <div className="user-list">
          {users.map(user => (
            <div key={user.id} className={`user-item ${selectedUser.id === user.id ? 'active' : ''}`} onClick={() => setSelectedUser(user)}>
              <div className={`status-dot ${user.isOnline ? 'online' : 'offline'}`}></div>
              <span>{user.username}</span>
            </div>
          ))}
        </div>
        <div className="current-user-info">
          <small>Oturum: <b>Baran Asar</b></small>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="chat-area">
        <div className="chat-header">
          <div className="header-info">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-green)', fontWeight: 'bold' }}>
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ marginLeft: '15px' }}>
              <h3>{selectedUser.username}</h3>
              <span className="security-badge">E2E Encrypted (AES-256)</span>
            </div>
          </div>
        </div>

        <div className="messages-box">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.isOwn ? 'own-message' : 'other-message'}`}>
              <div className="message-bubble">
                <p>{msg.text}</p>
                <span className="timestamp">{msg.timestamp}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSend}>
          <input type="text" placeholder="Şifreli mesaj yaz..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit">Gönder ➤</button>
        </form>
      </div>

      {/* MODALLAR */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title="Yeni Kişi Ekle">
        <form onSubmit={handleAddUserSubmit}>
          <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Kullanıcı adı" autoFocus />
          <button type="submit" className="login-btn" style={{ marginTop: 10 }}>Ekle</button>
        </form>
      </Modal>

      <Modal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} title="Debug (Encrypt/Decrypt)">
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          <p>Sunucu metni bu şekilde saklıyor (Confidentiality İspatı):</p>
          <div style={{ wordBreak: 'break-all', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 10, marginTop: 10 }}>
            <div><b>cipherText:</b> {lastEncrypted?.cipherText ?? "—"}</div>
            <div><b>iv:</b> {lastEncrypted?.iv ?? "—"}</div>
          </div>
          <button className="login-btn" style={{ marginTop: 15, width: '100%' }} onClick={handleDebugDecrypt}>Çöz (Decrypt)</button>
          {debugDecryptedText && (
            <div style={{ marginTop: 15, padding: 10, background: 'rgba(0,255,0,0.1)', color: '#fff' }}>
              <b>Sistemden Çözülen Veri:</b> {debugDecryptedText}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Chat;