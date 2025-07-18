const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const { GridFSBucket } = require('mongodb');
const path = require('path');

const Message = require('./models/Message');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const User = require('./models/User');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Update this list to match actual frontend domains
const allowedOrigins = [
  'http://localhost:3000',
  'https://convo-client-hozd.onrender.com', 
];

// Apply CORS for REST API
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Convo backend is running.');
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO CORS Error: Not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not set in environment variables!");
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}-${file.originalname}`,
    bucketName: 'uploads',
    metadata: {
      originalname: file.originalname,
      mimetype: file.mimetype,
    }
  }),
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({
    fileId: req.file.id,
    filename: req.file.filename,
    originalName: req.file.metadata.originalname,
    size: req.file.size,
    type: req.file.metadata.mimetype,
    fileUrl: `${req.protocol}://${req.get('host')}/file/${req.file.filename}`,
  });
});

app.get('/file/:filename', async (req, res) => {
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const stream = bucket.openDownloadStreamByName(req.params.filename);

    stream.on('error', () => res.status(404).json({ message: 'File not found' }));
    stream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Server error during file download' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const users = {}; // Map userId => socket.id

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    users[userId] = socket.id;
    io.emit('online-users', Object.keys(users));
  });

  socket.on('send-message', (msg) => {
    const receiverSocket = users[msg.receiver];
    if (receiverSocket) io.to(receiverSocket).emit('receive-message', msg);
  });

  socket.on('typing', ({ sender, receiver }) => {
    const receiverSocket = users[receiver];
    if (receiverSocket) io.to(receiverSocket).emit('typing', { sender, receiver });
  });

  socket.on('stop-typing', ({ sender, receiver }) => {
    const receiverSocket = users[receiver];
    if (receiverSocket) io.to(receiverSocket).emit('stop-typing', { sender, receiver });
  });

  socket.on('edit-message', ({ id, text }) => {
    socket.broadcast.emit('edit-message', { id, text });
  });

  socket.on('delete-message', ({ id }) => {
    socket.broadcast.emit('delete-message', { id });
  });

  socket.on('markAsSeen', async ({ messageIds, userId }) => {
    try {
      await Message.updateMany(
        { _id: { $in: messageIds }, seenBy: { $ne: userId } },
        { $push: { seenBy: userId } }
      );

      messageIds.forEach((id) => {
          Object.entries(users).forEach(([uid, sid]) => {
            if (uid !== userId) {
              io.to(sid).emit('messageSeen', { messageId: id, seenBy: userId });
            }
          });
      });
    } catch (error) {
      console.error('Failed to mark messages as seen:', error);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) delete users[userId];
    }
    io.emit('online-users', Object.keys(users));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
