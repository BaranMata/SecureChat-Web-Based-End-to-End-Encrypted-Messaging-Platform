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

// --- SWAGGER AYARLARI (Manuel ve Kesin Tanımlama) ---
// Harici dosya kullanmıyoruz, her şey burada tanımlı.
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SecureChat API',
    version: '1.0.0',
    description: 'SecureChat API Dokümantasyonu (UUID Destekli)',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Sunucu',
    },
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
  // Rotaları burada Elle ve /api ön ekiyle tanımlıyoruz
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
                  username: { type: 'string', example: 'oguzhan' },
                  password: { type: 'string', example: '123456' },
                  publicKey: { type: 'string', description: 'Base64 Public Key' },
                  email: { type: 'string', example: 'test@mail.com' },
                  firstName: { type: 'string', example: 'Oguzhan' },
                  lastName: { type: 'string', example: 'Atak' },
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
                  username: { type: 'string', example: 'oguzhan' },
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
          {
            in: 'path',
            name: 'userId',
            required: true,
            schema: { type: 'string', format: 'uuid' }, // UUID OLARAK GÜNCELLENDİ
          },
        ],
        responses: {
          200: { description: 'Key döndü' },
        },
      },
    },
    '/api/messages/{userId}/{friendId}': {
      get: {
        summary: 'Mesaj geçmişini getir',
        tags: ['Chat'],
        parameters: [
          { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } }, // UUID
          { in: 'path', name: 'friendId', required: true, schema: { type: 'string', format: 'uuid' } }, // UUID
        ],
        responses: {
          200: { description: 'Mesajlar listelendi' },
        },
      },
    },
    '/api/users': {
      get: {
        summary: 'Tüm kullanıcıları listele',
        tags: ['Users'],
        responses: {
          200: { description: 'Kullanıcı listesi' },
        },
      },
    },
  },
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [], // Dosyadan okumayı kapattık, yukarıdaki 'paths' geçerli
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// --- MIDDLEWARES ---
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173" })); 
app.use(express.json());

// --- SWAGGER UI ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// --- API ROTALARI (Burası Express'in dinlediği yer) ---
// Dikkat: Swagger'daki adreslerle burası birebir aynı olmalı (/api/...)
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/users/:userId/public-key', authController.getPublicKey);
app.get('/api/messages/:userId/:friendId', chatController.getHistory);

app.get('/api/users', async (req, res) => {
    try {
        // Frontend için gerekli alanları çekiyoruz
        const users = await pool.query("SELECT id, username, email, first_name, last_name, public_key, is_online FROM users");
        res.json(users.rows);
    } catch (e) { res.status(500).json({error: "Hata"}); }
});


// --- SOCKET.IO ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Yeni Socket Bağlantısı:', socket.id);

  socket.on('register_user', async (userId) => {
    onlineUsers.set(userId, socket.id);
    // Online durumunu güncelle
    try {
        await pool.query("UPDATE users SET is_online = true WHERE id = $1", [userId]);
        console.log(`✅ Kullanıcı ${userId} online oldu.`);
        io.emit('user_status', { userId, status: 'online' });
    } catch (e) { console.error(e); }
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, cipherText, iv } = data;
    
    // DB'ye kaydet
    try {
      await pool.query(
        "INSERT INTO messages (sender_id, receiver_id, cipher_text, iv) VALUES ($1, $2, $3, $4)",
        [senderId, receiverId, cipherText, iv]
      );
    } catch (e) { console.error("DB Hatası:", e); }

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

  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 BACKEND ÇALIŞIYOR: http://localhost:${PORT}`);
  console.log(`📄 SWAGGER DOKÜMANI: http://localhost:${PORT}/api-docs`);
});