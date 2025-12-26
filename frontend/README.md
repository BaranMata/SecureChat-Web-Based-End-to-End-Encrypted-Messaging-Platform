# 🔒 SecureChat: Web-Based End-to-End Encrypted Messaging

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Status](https://img.shields.io/badge/status-In%20Development-orange.svg) ![Security](https://img.shields.io/badge/security-E2EE-green)

**SecureChat**, tarayıcı tabanlı, uçtan uca şifreli (End-to-End Encrypted) modern bir mesajlaşma platformudur. Kullanıcı verilerinin gizliliğini sağlamak amacıyla, mesajlar sunucuya gönderilmeden önce istemci tarafında (Client-Side) şifrelenir.

---

## 🚀 Özellikler

- **🔐 Uçtan Uca Şifreleme (E2EE):** Mesajlar tarayıcıda `WebCrypto API` kullanılarak şifrelenir. Sunucu sadece şifreli metni görür.
- **🔑 Güvenli Anahtar Değişimi:** `ECDH (Elliptic Curve Diffie-Hellman)` algoritması ile güvenli anahtar paylaşımı.
- **🛡️ AES-256-GCM:** Mesaj içeriği askeri standartlarda simetrik şifreleme ile korunur.
- **🎨 Modern Cyberpunk Arayüz:** Göz yormayan, "Dark Mode" odaklı ve neon efektli modern UI tasarımı.
- **⚡ Yüksek Performans:** `Vite`, `React` ve `TypeScript` ile ışık hızında çalışan Single Page Application (SPA).

---

## 🛠️ Teknoloji Yığını (Tech Stack)

| Alan | Teknoloji |
|---|---|
| **Frontend** | React.js, TypeScript |
| **Build Tool** | Vite |
| **Styling** | CSS3 (Custom Cyberpunk Theme, Glassmorphism) |
| **Cryptography** | W3C Web Cryptography API (Native) |
| **State Management** | React Hooks (useState, useEffect) |
| **Routing** | React Router DOM |

---

## 🏗️ Mimari ve Güvenlik

SecureChat, güvenliği merkeze alan bir mimariye sahiptir:

1.  **Anahtar Üretimi:** Kullanıcı giriş yaptığında tarayıcı hafızasında geçici `Public` ve `Private` anahtar çiftleri üretilir.
2.  **Handshake:** İki kullanıcı arasında ECDH protokolü ile ortak bir "Sır" (Shared Secret) oluşturulur.
3.  **Şifreleme:** Bu sır kullanılarak mesajlar `AES-GCM` ile şifrelenir.
4.  **İletim:** Ağ üzerinden sadece şifreli veri (Cipher Text) akar.

---

## 💻 Kurulum ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

```bash
# 1. Projeyi klonlayın
git clone [(https://github.com/BaranMata/SecureChat-Web-Based-End-to-End-Encrypted-Messaging-Platform.git)](https://github.com/BaranMata/SecureChat-Web-Based-End-to-End-Encrypted-Messaging-Platform.git)

# 2. Proje klasörüne girin
cd secure-chat-frontend

# 3. Gerekli paketleri yükleyin
npm install

# 4. Uygulamayı başlatın
npm run dev


# 🔒 SecureChat – Web-Based End-to-End Encrypted Messaging Platform

SecureChat, web tabanlı ve **uçtan uca şifreleme (E2EE)** mantığını öğretici ve aşamalı şekilde geliştirmeyi hedefleyen bir mesajlaşma projesidir.  
Proje şu anda **altyapı + kriptografi demo aşamasındadır** ve aktif mesajlaşma entegrasyonu bir sonraki adımda yapılacaktır.

---

## 📌 Projenin Şu Anki Durumu (Önemli)

> ⚠️ **Aktif kullanıcı kayıt / gerçek zamanlı mesajlaşma henüz tamamlanmadı.**

Şu anda projede:

- ✅ Frontend–Backend ayrımı kuruludur  
- ✅ Backend API ve Socket.IO altyapısı hazırdır  
- ✅ Veritabanı şeması (users, messages) oluşturulmuştur  
- ✅ Client-side **AES-GCM şifreleme & çözme (encrypt/decrypt)** başarıyla çalışmaktadır  
- ✅ Şifreli mesajların **sunucuya plaintext gitmediği** demo olarak gösterilmektedir  

❌ Ancak:
- Kullanıcı kayıt / login akışı frontend’e tam bağlanmamıştır  
- Gerçek kişiler arası mesajlaşma henüz aktif değildir  

Bu nedenle ekranda görülen mesajlar **demo/debug amaçlıdır**.

---

## 🔐 Şifreleme Bu Projede Nerede?

Şifreleme **frontend tarafında** yapılmaktadır.

Şu an çalışan akış:

1. Kullanıcı mesaj yazar  
2. Mesaj **tarayıcı içinde** AES-GCM ile şifrelenir  
3. Ortaya çıkan:
   - `cipherText`
   - `iv`
4. Bu veriler:
   - Demo ekranında gösterilir
   - Backend’e **plaintext olmadan** gönderilmeye hazırdır  

> Sunucu **şifreli içeriği görür**, mesajın kendisini **asla çözmez**.

Bu yapı, E2EE mantığını göstermek için **bilinçli olarak ayrıştırılmıştır**.

---

## 🧪 Debug / Demo Ekranı Ne İşe Yarıyor?

Uygulamada görülen **Encrypt / Decrypt debug penceresi**:

- Gerçek sistemin **öğretici bir simülasyonudur**
- Şifrelemenin **gerçekten çalıştığını kanıtlamak** içindir
- Sunum ve rapor için özellikle bırakılmıştır

> Gerçek kullanımda bu ekran **kullanıcıya gösterilmeyecektir**.

---

## 🛠️ Kullanılan Teknolojiler

### Frontend
- React + TypeScript
- Vite
- Web Crypto API (AES-GCM)
- Custom UI (Dark / Cyberpunk)

### Backend
- Node.js
- Express
- PostgreSQL
- Socket.IO
- Helmet & CORS

---

## ▶️ Çalıştırma

### Backend
```bash
cd backend
npm install
node server.js
Backend şu adreste çalışır:
http://localhost:3000
###Frontend
cd frontend
npm install
npm run dev
Frontend şu adreste çalışır:
http://localhost:5173
🔜 Bir Sonraki Adım (Ekip İçin)
Backend & frontend entegrasyonu tamamlandığında:
Kullanıcı kayıt / login aktif edilecek
Public key’ler backend üzerinden alınacak
ECDH ile kullanıcılar arası shared secret üretilecek
Şifreli mesajlar:
Socket.IO ile gönderilecek
Veritabanına şifreli şekilde kaydedilecek
Debug ekranı kaldırılıp gerçek chat UI açılacak
###👩‍💻 Not (Ekip Arkadaşlarına)
Bu repo şu an:
kriptografi altyapısını
E2EE mantığını
frontend–backend hazırlığını
