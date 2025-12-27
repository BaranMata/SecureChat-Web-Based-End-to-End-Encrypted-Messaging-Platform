// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import './App.css'; // Eğer global CSS kullanıyorsan kalsın, yoksa silebilirsin.

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Ana Sayfa (Login/Register Ekranı) */}
        <Route path="/" element={<Login />} />

        {/* 2. Sohbet Ekranı (Giriş Başarılı Olunca Buraya Gidecek) */}
        <Route path="/chat" element={<Chat />} />

        {/* 3. Güvenlik Önlemi: Yanlış bir linke girilirse Ana Sayfaya at */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;