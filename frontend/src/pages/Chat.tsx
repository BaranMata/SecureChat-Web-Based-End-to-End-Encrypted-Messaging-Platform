import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Modal from '../components/Modal'; 
import { 
  importPrivateKey, 
  importPublicKey, 
  deriveSharedKey, 
  encryptMessage, 
  decryptMessage 
} from '../crypto/cryptoService';

// Backend URL
const SERVER_URL = 'http://localhost:3000';

interface User {
  id: string;
  username: string;
  is_online: boolean;
  public_key: string;
}

interface Message {
  id?: number;
  sender_id: string;
  receiver_id?: string;
  text: string;
  cipher_text?: string;
  iv?: string;
  timestamp?: string;
  isMe: boolean;
}

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement | null>(null);

  // --- STATE ---
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentSharedKey, setCurrentSharedKey] = useState<CryptoKey | null>(null);

  // Debug / İspat İçin State'ler
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [lastEncryptedData, setLastEncryptedData] = useState<{cipher: string, iv: string} | null>(null);
  const [debugDecryptedText, setDebugDecryptedText] = useState("");
  
  // Kendi bilgilerimiz
  const myUserId = localStorage.getItem('user_id');
  const myUsername = localStorage.getItem('username');

  // --- 1. BAŞLANGIÇ: Socket Bağlantısı ---
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }

    socketRef.current = io(SERVER_URL);
    socketRef.current.emit('register_user', myUserId);
    
    // Veritabanındaki herkesi getir (Otomatik Liste)
    fetchUsers();

    socketRef.current.on('user_status', (data) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, is_online: data.status === 'online' } : u
      ));
    });

    socketRef.current.on('receive_message', async (data) => {
      setMessages(prev => [...prev, {
        sender_id: data.senderId,
        text: "🔒 Şifre Çözülüyor...",
        cipher_text: data.cipherText,
        iv: data.iv,
        isMe: false
      }]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // --- 2. KULLANICI SEÇME VE ANAHTAR TÜRETME ---
  useEffect(() => {
    if (!selectedUser || !myUserId) return;

    const prepareChat = async () => {
      setMessages([]);
      try {
        console.log(`🔐 ${selectedUser.username} ile anahtar anlaşması yapılıyor...`);
        
        const myPrivateKeyBase64 = localStorage.getItem('private_key');
        if (!myPrivateKeyBase64) throw new Error("Private Key yok!");
        
        const myPrivateKey = await importPrivateKey(myPrivateKeyBase64);
        const friendPublicKey = await importPublicKey(selectedUser.public_key);
        const sharedKey = await deriveSharedKey(myPrivateKey, friendPublicKey);
        
        setCurrentSharedKey(sharedKey);
        fetchHistory(selectedUser.id, sharedKey);

      } catch (error) {
        console.error("Anahtar hatası:", error);
      }
    };
    prepareChat();
  }, [selectedUser]);

  // --- 3. GEÇMİŞ MESAJLARI ÇEK ---
  const fetchHistory = async (friendId: string, sharedKey: CryptoKey) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/messages/${myUserId}/${friendId}`);
      const data = await res.json();
      
      const decryptedMessages = await Promise.all(data.map(async (msg: any) => {
        const isMe = String(msg.sender_id) === String(myUserId);

        try {
          const decryptedText = await decryptMessage(msg.cipher_text, msg.iv, sharedKey);
          return { ...msg, text: decryptedText, isMe: isMe };
        } catch (e) {
          return { ...msg, text: "⚠️ Mesaj çözülemedi", isMe: isMe };
        }
      }));

      setMessages(decryptedMessages);
      scrollToBottom();
    } catch (error) { console.error("Geçmiş hatası", error); }
  };

  // --- 4. GELEN MESAJI ANLIK ÇÖZME ---
  useEffect(() => {
    const decryptLastMessage = async () => {
      if (messages.length === 0 || !currentSharedKey) return;
      const lastMsg = messages[messages.length - 1];
      
      if (lastMsg.text === "🔒 Şifre Çözülüyor..." && lastMsg.cipher_text && lastMsg.iv) {
        try {
          const plainText = await decryptMessage(lastMsg.cipher_text, lastMsg.iv, currentSharedKey);
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: plainText } : m));
          scrollToBottom();
        } catch (e) { console.error("Decrypt hatası"); }
      }
    };
    decryptLastMessage();
  }, [messages, currentSharedKey]);

  // --- 5. MESAJ GÖNDERME ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUser || !currentSharedKey || !socketRef.current) return;

    try {
      const { cipherText, iv } = await encryptMessage(inputText, currentSharedKey);
      
      setLastEncryptedData({ cipher: cipherText, iv: iv });
      setDebugDecryptedText("");

      socketRef.current.emit('send_message', {
        senderId: myUserId,
        receiverId: selectedUser.id,
        cipherText,
        iv
      });

      setMessages(prev => [...prev, {
        sender_id: myUserId!,
        text: inputText,
        isMe: true
      }]);

      setInputText("");
      scrollToBottom();

    } catch (error) { console.error("Gönderme hatası:", error); }
  };

  // --- DEBUG DECRYPT ---
  const handleDebugDecrypt = async () => {
    if (!lastEncryptedData || !currentSharedKey) return;
    try {
      const plain = await decryptMessage(lastEncryptedData.cipher, lastEncryptedData.iv, currentSharedKey);
      setDebugDecryptedText(plain);
    } catch (e) {
      setDebugDecryptedText("⚠️ Hata: Çözülemedi.");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/users`);
      const data = await res.json();
      // Kendimiz hariç herkesi listeye ekle
      setUsers(data.filter((u: User) => u.id !== myUserId));
    } catch (error) { console.error("User fetch hatası"); }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesBoxRef.current) {
        messagesBoxRef.current.scrollTo({ top: messagesBoxRef.current.scrollHeight, behavior: 'smooth' });
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    
    socketRef.current?.disconnect();
    navigate('/');
  };

  return (
    <div className="chat-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        
        {/* Başlık ve Profil Kartı */}
        <div className="sidebar-header">
          <div className="app-brand">
            <h3>SecureChat</h3>
            <span className="lock-icon">🔒</span>
          </div>
          
          <div className="user-profile-card">
            <div className="user-avatar">
              {myUsername?.charAt(0).toUpperCase()}
            </div>
            <span className="my-username">{myUsername}</span>
          </div>

          <div className="header-actions">
             <button onClick={() => setIsDebugOpen(true)} className="action-btn debug-btn">
               🛠 Debug
             </button>
             <button onClick={handleLogout} className="action-btn logout-btn">
               Çıkış
             </button>
          </div>
        </div>

        {/* Kullanıcı Listesi (Herkes burada görünür) */}
        <div className="users-list">
          {users.map(user => (
            <div 
              key={user.id} 
              className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className={`status-indicator ${user.is_online ? 'online' : 'offline'}`} />
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className="status-text">{user.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT ALANI */}
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>{selectedUser.username}</h3>
              {currentSharedKey ? <span className="secure-badge">🔒 Uçtan Uca Şifreli (ECDH)</span> : <span>🔑 Anahtar Bekleniyor...</span>}
            </div>

            <div className="messages-box" ref={messagesBoxRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.isMe ? 'sent' : 'received'}`}>
                  <div className="message-content">
                    <p>{msg.text}</p>
                    <span className="time">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form className="message-input-area" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                placeholder="Şifreli mesajını yaz..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button type="submit">Gönder ➤</button>
            </form>
          </>
        ) : (
          <div className="empty-chat">
            <h2>Hoşgeldin, {myUsername}! 👋</h2>
            <p>Soldaki listeden birini seç ve mesajlaşmaya başla.</p>
          </div>
        )}
      </div>

      {/* DEBUG MODAL */}
      <Modal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} title="🔐 Kriptografi Debugger">
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          <p>Son gönderilen mesajın ağ üzerindeki (şifreli) hali:</p>
          <div style={{ wordBreak: 'break-all', background: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 10, marginTop: 10, fontFamily: 'monospace' }}>
            <div><b>CipherText:</b> {lastEncryptedData?.cipher.substring(0, 50) ?? "—"}...</div>
            <div style={{marginTop: 5}}><b>IV:</b> {lastEncryptedData?.iv ?? "—"}</div>
          </div>
          
          <button className="login-btn" style={{ marginTop: 15, width: '100%' }} onClick={handleDebugDecrypt}>
             Şifreyi Çöz (Decrypt Test)
          </button>
          
          {debugDecryptedText && (
            <div style={{ marginTop: 15, padding: 10, background: 'rgba(0,255,0,0.1)', color: '#fff', borderRadius: 5 }}>
              <b>✅ Çözülen Orijinal Metin:</b> {debugDecryptedText}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Chat;