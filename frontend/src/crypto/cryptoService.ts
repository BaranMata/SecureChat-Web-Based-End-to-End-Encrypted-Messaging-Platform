// src/crypto/cryptoService.ts

// 1) ANAHTAR ÇİFTİ OLUŞTURMA (ECDH)
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

// 2) ECDH ANAHTARINI DIŞARI AKTARMA (Public/Private -> Base64 String)
// Bu fonksiyonu anahtarını sunucuya gönderirken kullanacaksın.
export const exportEcdhKey = async (key: CryptoKey): Promise<string> => {
  const format = key.type === "public" ? "spki" : "pkcs8";
  const exported = await window.crypto.subtle.exportKey(format, key);
  return arrayBufferToBase64(exported);
};

// 3) ECDH ANAHTARINI İÇERİ ALMA (Base64 String -> Key Object)
// Arkadaşının public key'ini sunucudan aldığında bu fonksiyonla çevireceksin.
export const importEcdhKey = async (
  keyDataBase64: string,
  type: "public" | "private"
): Promise<CryptoKey> => {
  const binary = base64ToArrayBuffer(keyDataBase64);
  const format = type === "public" ? "spki" : "pkcs8";

  return await window.crypto.subtle.importKey(
    format,
    binary,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    type === "public" ? [] : ["deriveKey", "deriveBits"]
  );
};

// 4) ORTAK SIR TÜRETME (Shared Secret - AES Key)
// Senin Private Key'in + Arkadaşının Public Key'i = Ortak Şifre
export const deriveSharedKey = async (
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> => {
  return await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// ✅ 5) AES (SECRET) KEY EXPORT (CryptoKey -> JWK object)
// Bunu sessionStorage'a kaydetmek için kullanıyoruz.
export const exportAesKey = async (key: CryptoKey): Promise<JsonWebKey> => {
  return await window.crypto.subtle.exportKey("jwk", key);
};

// ✅ 6) AES (SECRET) KEY IMPORT (JWK object -> CryptoKey)
// Chat sayfasına geçtiğinde sessionStorage'dan okuyup tekrar anahtara çevirmek için.
export const importAesKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// 7) MESAJ ŞİFRELEME (Encrypt)
export const encryptMessage = async (
  text: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> => {
  const encodedText = new TextEncoder().encode(text);

  // IV: Her şifrelemede rastgele olmalı (Güvenlik için şart)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );

  return {
    cipherText: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
  };
};

// 8) MESAJ ÇÖZME (Decrypt)
export const decryptMessage = async (
  cipherText: string,
  iv: string,
  key: CryptoKey
): Promise<string> => {
  const encryptedBuffer = base64ToArrayBuffer(cipherText);
  const ivBuffer = base64ToArrayBuffer(iv);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      key,
      encryptedBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error("Şifre çözülemedi (Anahtar yanlış olabilir):", e);
    return "⚠️ Şifre Çözülemedi";
  }
};

// --- YARDIMCILAR ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}