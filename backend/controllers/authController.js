const pool = require('../config/db'); // db yolunun doğru olduğundan emin ol
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gizli_anahtar_securechat_123';

// 1. KAYIT OLMA (Frontend Formuyla Uyumlu)
const register = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, publicKey } = req.body;

    if (!username || !password || !publicKey) {
      return res.status(400).json({ error: 'Kullanıcı adı, şifre ve Public Key zorunludur.' });
    }

    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users 
       (username, password_hash, email, first_name, last_name, public_key, is_online) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, first_name, last_name, public_key`,
      [username, hashedPassword, email, firstName, lastName, publicKey, true]
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, username: newUser.rows[0].username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı.',
      token: token,
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Register Hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
};

// 2. GİRİŞ YAPMA
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Hatalı şifre.' });
    }

    await pool.query('UPDATE users SET is_online = true WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Giriş başarılı.',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        publicKey: user.public_key
      }
    });

  } catch (error) {
    console.error('Login Hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// 3. TEKİL PUBLIC KEY GETİRME (Eksik olan buydu)
const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT public_key FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Frontend sadece { publicKey: "..." } bekliyor
    res.json({ publicKey: result.rows[0].public_key });

  } catch (error) {
    console.error('Public Key Hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
};

// KRİTİK: getPublicKey buraya eklendi
module.exports = { register, login, getPublicKey };