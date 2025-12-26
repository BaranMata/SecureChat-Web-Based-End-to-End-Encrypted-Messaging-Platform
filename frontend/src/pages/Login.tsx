// src/pages/Login.tsx
import { useState } from 'react'; // Sadece bunu çağırmak yeterli
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { 
  generateKeyPair, 
  deriveSharedKey, 
  encryptMessage, 
  decryptMessage,
  exportAesKey 
} from '../crypto/cryptoService';

// CSS dosyasını import etmiyoruz çünkü index.css zaten her yerde geçerli!

const Login: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.clear();

    try {
      // --- SENARYO: KAYIT OLMA ---
      if (!isLoginMode) {
        const existingUser = localStorage.getItem(`user_${username}`);
        if (existingUser) {
          alert("Bu kullanıcı adı zaten alınmış!");
          setLoading(false);
          return;
        }
        // Kullanıcıyı kaydet
        const userData = { username, email, createdAt: new Date().toISOString() };
        localStorage.setItem(`user_${username}`, JSON.stringify(userData));
        console.log("💾 Yeni kullanıcı kaydedildi.");
      } 
      // --- SENARYO: GİRİŞ YAPMA ---
      else {
        const existingUser = localStorage.getItem(`user_${username}`);
        if (!existingUser) {
          alert("❌ Kullanıcı bulunamadı! Lütfen önce kayıt olun.");
          setLoading(false);
          return;
        }
      }

      // --- ORTAK GÜVENLİK İŞLEMLERİ (Her iki durumda da çalışır) ---
      console.log("🔐 Kriptografik anahtarlar üretiliyor...");
      const myKeys = await generateKeyPair();
      const gokceKeys = await generateKeyPair(); // Simülasyon
      const sharedKey = await deriveSharedKey(myKeys.privateKey, gokceKeys.publicKey);

      // Anahtarı sakla
      const exportedSharedKey = await exportAesKey(sharedKey);
      sessionStorage.setItem("securechat_shared_aes", JSON.stringify(exportedSharedKey));
      sessionStorage.setItem("securechat_username", username);

      // Chat'e yönlendir
      setTimeout(() => navigate('/chat'), 1000);

    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu.");
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    console.clear();

    try {
      // Şifre tekrar kontrolü
      if (registerPassword !== registerPasswordConfirm) {
        alert("❌ Şifreler eşleşmiyor!");
        setRegisterLoading(false);
        return;
      }

      const existingUser = localStorage.getItem(`user_${registerUsername}`);
      if (existingUser) {
        alert("Bu kullanıcı adı zaten alınmış!");
        setRegisterLoading(false);
        return;
      }

      // Kullanıcıyı kaydet
      const userData = { 
        username: registerUsername, 
        email: registerEmail, 
        firstName: registerFirstName,
        lastName: registerLastName,
        createdAt: new Date().toISOString() 
      };
      localStorage.setItem(`user_${registerUsername}`, JSON.stringify(userData));
      console.log("💾 Yeni kullanıcı kaydedildi.");

      // --- ORTAK GÜVENLİK İŞLEMLERİ ---
      console.log("🔐 Kriptografik anahtarlar üretiliyor...");
      const myKeys = await generateKeyPair();
      const gokceKeys = await generateKeyPair(); // Simülasyon
      const sharedKey = await deriveSharedKey(myKeys.privateKey, gokceKeys.publicKey);

      // Anahtarı sakla
      const exportedSharedKey = await exportAesKey(sharedKey);
      sessionStorage.setItem("securechat_shared_aes", JSON.stringify(exportedSharedKey));
      sessionStorage.setItem("securechat_username", registerUsername);

      // Modal kapat ve chat'e yönlendir
      setIsRegisterModalOpen(false);
      setTimeout(() => navigate('/chat'), 1000);

    } catch (error) {
      console.error("Hata:", error);
      alert("Bir hata oluştu.");
      setRegisterLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-container form"> 
        {/* Logo Alanı */}
        <div className="login-header">
           <div className="app-logo">
             {/* Basit bir CSS logosu veya SVG */}
             <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00ffa3" strokeWidth="2">
               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
             </svg>
           </div>
           <h2>{isLoginMode ? 'Giriş Yap' : 'Hesap Oluştur'}</h2>
           <p>Uçtan Uca Şifreli Mesajlaşma</p>
        </div>

        <form onSubmit={handleAuth} style={{boxShadow: 'none', padding: 0, background: 'none', border: 'none', marginTop: 0}}>
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

          {/* Sadece Kayıt Modundaysa E-posta Göster */}
          {!isLoginMode && (
            <div className="form-group">
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

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
              {loading ? 'İşleniyor...' : 'Giriş Yap'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => setIsRegisterModalOpen(true)}>
              Kayıt Ol
            </button>
          </div>
        </form>

        {/* İŞTE EKSİK OLAN KISIM BURASIYDI */}
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
          setRegisterUsername('');
          setRegisterEmail('');
          setRegisterPassword('');
          setRegisterPasswordConfirm('');
          setRegisterFirstName('');
          setRegisterLastName('');
        }}
        title="Hesap Oluştur"
      >
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              placeholder="kullaniciadi"
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
              placeholder="ornek@email.com"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Ad</label>
            <input
              type="text"
              placeholder="Adınız"
              value={registerFirstName}
              onChange={(e) => setRegisterFirstName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Soyad</label>
            <input
              type="text"
              placeholder="Soyadınız"
              value={registerLastName}
              onChange={(e) => setRegisterLastName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Parola</label>
            <input
              type="password"
              placeholder="••••••••"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Parola Tekrar</label>
            <input
              type="password"
              placeholder="••••••••"
              value={registerPasswordConfirm}
              onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={registerLoading}>
            {registerLoading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Login;