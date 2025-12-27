const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
require('dotenv').config();

// --- SWAGGER IMPORTLARI ---
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Controllerları içe aktar
const authController = require('./controllers/authController');
const chatController = require('./controllers/chatController');

const app = express();
const server = http.createServer(app);

// --- MIDDLEWARES ---
app.use(helmet({
  contentSecurityPolicy: false, 
}));

// CORS Ayarları
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// --- SWAGGER AYARLARI ---
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SecureChat API',
    version: '1.0.0',
    description: 'SecureChat API Dokümantasyonu (UUID Destekli)',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local Sunucu' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Yeni kullanıcı kaydı',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'publicKey'],
                properties: {
                  username: { type: 'string', example: 'kullanici1' },
                  password: { type: 'string', example: '123456' },
                  publicKey: { type: 'string', description: 'Base64 Public Key' },
                  email: { type: 'string', example: 'test@mail.com' },
                  firstName: { type: 'string', example: 'Ad' },
                  lastName: { type: 'string', example: 'Soyad' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Kayıt başarılı' },
          500: { description: 'Sunucu hatası' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Kullanıcı girişi',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'kullanici1' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Giriş başarılı' },
          401: { description: 'Hatalı giriş' },
        },
      },
    },
    '/api/users/{userId}/public-key': {
      get: {
        summary: 'Kullanıcı Public Key getir',
        tags: ['Security'],
        parameters: [
          { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Key döndü' } },
      },
    },
    '/api/messages/{userId}/{friendId}': {
      get: {
        summary: 'Mesaj geçmişini getir',
        tags: ['Chat'],
        parameters: [
          { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
          { in: 'path', name: 'friendId', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Mesajlar listelendi' } },
      },
    },
    '/api/users': {
      get: {
        summary: 'Tüm kullanıcıları listele',
        tags: ['Users'],
        responses: { 200: { description: 'Kullanıcı listesi' } },
      },
    },
  },
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// --- API ROTALARI ---

// 1. Auth Rotaları
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/users/:userId/public-key', authController.getPublicKey);

// 2. Chat Rotaları (Geçmiş Mesajlar)
app.get('/api/messages/:userId/:friendId', chatController.getHistory);

// 3. Kullanıcı Listesi Rotası
app.get('/api/users', async (req, res) => {
    try {
        const users = await pool.query("SELECT id, username, email, first_name, last_name, public_key, is_online FROM users");
        res.json(users.rows);
    } catch (e) { 
        console.error(e);
        res.status(500).json({error: "Kullanıcılar getirilemedi"}); 
    }
});

// 4. Mesaj Kaydetme Rotası (POST)
// Not: Socket.io zaten canlı mesajı iletiyor, bu endpoint HTTP üzerinden mesaj atmak veya yedeklemek için.
app.post('/api/messages', async (req, res) => {
    try {
        const { receiver_id, cipher_text, iv } = req.body;
        
        // TODO: Login sistemi tam oturunca burayı 'req.user.id' ile değiştir.
        // Şimdilik test için manuel ID: 1
        const sender_id = 1; 

        const result = await pool.query(
            "INSERT INTO messages (sender_id, receiver_id, cipher_text, iv) VALUES ($1, $2, $3, $4) RETURNING *",
            [sender_id, receiver_id, cipher_text, iv]
        );

        res.status(201).json({
            message: "✅ Mesaj şifreli olarak veritabanına kaydedildi.",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Mesaj Kaydetme Hatası:", error);
        res.status(500).json({ error: "Mesaj veritabanına yazılamadı." });
    }
});


// --- SOCKET.IO AYARLARI ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Hangi userId'nin hangi socketId'ye sahip olduğunu tutar
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Yeni Socket Bağlantısı:', socket.id);

  // Kullanıcı giriş yapınca
  socket.on('register_user', async (userId) => {
    onlineUsers.set(userId, socket.id);
    
    try {
        await pool.query("UPDATE users SET is_online = true WHERE id = $1", [userId]);
        console.log(`✅ Kullanıcı ${userId} online oldu.`);
        io.emit('user_status', { userId, status: 'online' });
    } catch (e) { console.error("Online update hatası:", e); }
  });

  // Mesaj Gönderimi
  socket.on('send_message', async (data) => {
    const { senderId, receiverId, cipherText, iv } = data;
    
    // 1. Veritabanına Kaydet
    try {
      await pool.query(
        "INSERT INTO messages (sender_id, receiver_id, cipher_text, iv) VALUES ($1, $2, $3, $4)",
        [senderId, receiverId, cipherText, iv]
      );
    } catch (e) { console.error("DB Mesaj Kayıt Hatası:", e); }

    // 2. Canlı Olarak İlet (Eğer kullanıcı online ise)
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', {
        senderId,
        cipherText,
        iv,
        timestamp: new Date()
      });
    }
  });

  // Kullanıcı Ayrılınca (Disconnect)
  socket.on('disconnect', async () => {
    console.log('❌ Kullanıcı ayrıldı:', socket.id);
    
    // Socket ID'den User ID'yi bul ve offline yap
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      onlineUsers.delete(disconnectedUserId);
      try {
        await pool.query("UPDATE users SET is_online = false WHERE id = $1", [disconnectedUserId]);
        io.emit('user_status', { userId: disconnectedUserId, status: 'offline' });
      } catch (e) { console.error("Offline update hatası:", e); }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 BACKEND ÇALIŞIYOR: http://localhost:${PORT}`);
  console.log(`📄 SWAGGER DOKÜMANI: http://localhost:${PORT}/api-docs`);
});