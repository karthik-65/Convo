const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// GET messages between current user and another user
router.get('/:receiverId', verifyToken, async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.userId;
  try {
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new message
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      receiver,
      text,
      file,
      fileName,
      fileSize,
      fileType
    } = req.body;

    const message = new Message({
      sender: req.userId,
      receiver,
      text,
      file,
      fileName,
      fileSize,
      fileType
    });

    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT to edit a message
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== req.userId)
      return res.status(403).json({ message: 'Unauthorized to edit this message' });

    message.text = text;
    await message.save();

    res.json(message);
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a message
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    console.log('Delete requested for message:', id, 'by user:', req.userId);

    if (message.sender.toString() !== req.userId)
      return res.status(403).json({ message: 'Unauthorized to delete this message' });

    await message.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});





module.exports = router;
