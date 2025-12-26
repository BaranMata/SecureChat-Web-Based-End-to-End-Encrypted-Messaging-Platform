-- SecureChat Database Schema (PROD READY)
-- UUID (Universally Unique Identifier) yapısına geçildi.

-- UUID fonksiyonlarını kullanabilmek için bu eklentiyi açıyoruz
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tablolar varsa temizle
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS users;

-- 1. KULLANICILAR TABLOSU
CREATE TABLE users (
    -- ID artık sayı değil, rastgele üretilen uzun bir kod (UUID)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    public_key TEXT NOT NULL,         -- E2EE için şart
    
    -- Kayıt formundan gelen ek veriler:
    email VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. MESAJLAR TABLOSU
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- UUID tipindeki user id'lerini referans alıyoruz
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    
    cipher_text TEXT NOT NULL,        -- Şifreli içerik
    iv TEXT NOT NULL,                 -- Initialization Vector
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PERFORMANS İÇİN İNDEKSLER (Başak'ın önerisi)
-- UUID'ler rastgele olduğu için arama hızı düşmesin diye index şarttır.
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_users_username ON users(username);

-- Not: UUID kullandığımız için Frontend tarafında ID tiplerini 'string' yapman gerekecek.