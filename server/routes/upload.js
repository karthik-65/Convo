const express = require('express');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');
const mongoose = require('mongoose');
const router = express.Router();

// Mongo URI (ensure this is loaded from .env)
const mongoURI = process.env.MONGO_URI;

// Set up GridFS storage
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    const timestamp = Date.now();
    return {
      filename: `${timestamp}-${file.originalname}`,
      bucketName: 'uploads', // MongoDB will use uploads.files and uploads.chunks
    };
  },
});

const upload = multer({ storage });

// POST /api/upload — Save file to MongoDB
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  res.json({
    fileId: req.file.id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype,
  });
});

module.exports = router;
