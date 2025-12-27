// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { 
  generateKeyPair, 
  exportPublicKey, 
  exportPrivateKey 
} from '../crypto/cryptoService';

const Login: React.FC = () => {
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Register Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const navigate = useNavigate();

  // --- GİRİŞ YAPMA İŞLEMİ (LOGIN) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.clear();

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      console.log("✅ Giriş Başarılı:", data);

      // Token ve Kullanıcı bilgilerini sakla
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user.id); // UUID
      localStorage.setItem('username', data.user.username);

      // Chat sayfasına yönlendir
      navigate('/chat');

    } catch (error: any) {
      console.error("Login Hatası:", error);
      alert(error.message || "Giriş yapılamadı. Backend çalışıyor mu?");
    } finally {
      setLoading(false);
    }
  };

  // --- KAYIT OLMA İŞLEMİ (REGISTER) ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      if (registerPassword !== registerPasswordConfirm) {
        alert("❌ Şifreler eşleşmiyor!");
        setRegisterLoading(false);
        return;
      }

      console.log("🔐 Anahtar çifti oluşturuluyor...");
      // 1. Tarayıcıda Anahtar Çifti (Public/Private) Üret
      const keyPair = await generateKeyPair();

      // 2. Anahtarları String formatına çevir
      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);

      // 3. Backend'e Kayıt İsteği At (Public Key ile birlikte)
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
          firstName: registerFirstName,
          lastName: registerLastName,
          publicKey: publicKeyBase64 // Sunucuya bunu gönderiyoruz
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt başarısız');
      }

      console.log("💾 Kayıt Başarılı:", data);

      // 4. Private Key'i Kullanıcının Cihazına Kaydet (Çok Önemli!)
      // Not: Gerçek bir uygulamada bu IndexedDB'de şifreli saklanmalıdır.
      // MVP için localStorage kullanıyoruz.
      localStorage.setItem('private_key', privateKeyBase64);
      
      alert("✅ Kayıt başarılı! Lütfen giriş yapınız.");
      setIsRegisterModalOpen(false);

    } catch (error: any) {
      console.error("Kayıt Hatası:", error);
      alert(error.message || "Kayıt olurken bir hata oluştu.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-container form"> 
        {/* Logo Alanı */}
        <div className="login-header">
           <div className="app-logo">
             <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2">
               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
             </svg>
           </div>
           <h2>Giriş Yap</h2>
           <p>Uçtan Uca Şifreli Mesajlaşma</p>
        </div>

        <form onSubmit={handleLogin} style={{boxShadow: 'none', padding: 0, background: 'none', border: 'none', marginTop: 0}}>
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              placeholder="kullaniciadi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Parola</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-actions">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Bağlanıyor...' : 'Giriş Yap'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setIsRegisterModalOpen(true)}>
              Kayıt Ol
            </button>
          </div>
        </form>

        <div className="toggle-mode">
          <p>
            Hesabın yok mu?{' '}
            <span onClick={() => setIsRegisterModalOpen(true)}>
              Kayıt Ol
            </span>
          </p>
        </div>
      </div>

      {/* MODAL: Kayıt Formu */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          // Formu temizle
          setRegisterUsername('');
          setRegisterEmail('');
          setRegisterPassword('');
        }}
        title="Hesap Oluştur"
      >
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Ad</label>
            <input
              type="text"
              value={registerFirstName}
              onChange={(e) => setRegisterFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Soyad</label>
            <input
              type="text"
              value={registerLastName}
              onChange={(e) => setRegisterLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Parola</label>
            <input
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Parola Tekrar</label>
            <input
              type="password"
              value={registerPasswordConfirm}
              onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={registerLoading}>
            {registerLoading ? 'Anahtarlar Üretiliyor...' : 'Kayıt Ol'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Login;