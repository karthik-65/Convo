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
const Message = require('./models/Message'); // ✅ Add at the top


const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const User = require('./models/User');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// ✅ MongoDB + GridFS setup
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// ✅ GridFS Storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    const filename = `${Date.now()}-${file.originalname}`;
    return {
      filename: filename,
      bucketName: 'uploads', // GridFS collection name will be uploads.files and uploads.chunks
      metadata: {
        originalname: file.originalname,
        mimetype: file.mimetype,
      }
    };
  }
});

const upload = multer({ storage });

// ✅ Upload route to MongoDB
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({
    fileId: req.file.id,
    filename: req.file.filename,
    originalName: req.file.metadata.originalname,
    size: req.file.size,
    type: req.file.metadata.mimetype,
    fileUrl: `/file/${req.file.filename}` // frontend can use this to preview/download
  });
});

// ✅ Download route (file preview/download from GridFS)
app.get('/file/:filename', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

    downloadStream.on('error', () => {
      res.status(404).json({ message: 'File not found' });
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Server error during file download' });
  }
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// ✅ Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Socket.IO
const users = {}; // Map of userId => socket.id

io.on('connection', (socket) => {
  socket.on('join', async (userId) => {
    users[userId] = socket.id;
    io.emit('online-users', Object.keys(users)); // Emit userIds
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

  // ✅ Broadcast deleted message to others
  socket.on('delete-message', ({ id }) => {
    socket.broadcast.emit('delete-message', { id });
  });


  socket.on('disconnect', async () => {
    for (const [userId, sockId] of Object.entries(users)) {
      if (sockId === socket.id) delete users[userId];
    }
    io.emit('online-users', Object.keys(users));
  });
});

// ✅ Start server
server.listen(5000, () => console.log('Server running on port 5000'));
