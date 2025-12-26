// src/types/index.ts

// Bir mesajın yapısı
export interface Message {
  id: string;              // GÜNCELLENDİ: number -> string
  sender: string;

  text: string;            // Şifresi çözülmüş (plaintext) metin
  cipherText?: string;     // Şifreli metin (backend'e giden)
  iv?: string;             // AES-GCM için IV (base64)

  timestamp: string;
  isOwn: boolean;          // Mesajı biz mi attık?
}

// Bir kullanıcının yapısı
export interface User {
  id: string;              // GÜNCELLENDİ: number -> string
  username: string;
  isOnline: boolean;
  publicKey?: string;      // İleride ECDH için lazım olacak
}