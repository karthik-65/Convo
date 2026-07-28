const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ChatRequest = require('../models/ChatRequest');
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

// GET all chat requests for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const requests = await ChatRequest.find({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    // Stringify sender/receiver so frontend === comparisons work reliably
    const serializedRequests = requests.map(r => ({
      _id: r._id.toString(),
      sender: r.sender.toString(),
      receiver: r.receiver.toString(),
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    // Check which users already have existing message history
    const existingMessagePairs = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userObjectId }, { receiver: userObjectId }]
        }
      },
      {
        $group: {
          _id: null,
          userPairs: {
            $addToSet: {
              $cond: [{ $eq: ['$sender', userObjectId] }, '$receiver', '$sender']
            }
          }
        }
      }
    ]);

    const connectedUserIds = (existingMessagePairs[0]?.userPairs || []).map(id => id.toString());

    res.json({
      requests: serializedRequests,
      connectedUserIds
    });
  } catch (err) {
    console.error('Error fetching chat requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST send a chat request
router.post('/send', verifyToken, async (req, res) => {
  try {
    const sender = req.userId;
    const { receiver } = req.body;

    if (!receiver) return res.status(400).json({ message: 'Receiver is required' });

    let existingReq = await ChatRequest.findOne({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender }
      ]
    });

    if (existingReq) {
      // If rejected, allow re-sending by resetting to pending
      if (existingReq.status === 'rejected' && existingReq.sender.toString() === sender) {
        existingReq.status = 'pending';
        await existingReq.save();
      }
      return res.json({
        _id: existingReq._id.toString(),
        sender: existingReq.sender.toString(),
        receiver: existingReq.receiver.toString(),
        status: existingReq.status,
        createdAt: existingReq.createdAt,
        updatedAt: existingReq.updatedAt,
      });
    }

    const newRequest = new ChatRequest({ sender, receiver, status: 'pending' });
    await newRequest.save();
    res.json({
      _id: newRequest._id.toString(),
      sender: newRequest.sender.toString(),
      receiver: newRequest.receiver.toString(),
      status: newRequest.status,
      createdAt: newRequest.createdAt,
      updatedAt: newRequest.updatedAt,
    });
  } catch (err) {
    console.error('Error sending chat request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST respond to a chat request (accept / decline)
router.post('/respond', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { requestId, action } = req.body; // action: 'accept' | 'decline'

    const chatReq = await ChatRequest.findById(requestId);
    if (!chatReq) return res.status(404).json({ message: 'Request not found' });

    if (chatReq.receiver.toString() !== userId && chatReq.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (action === 'accept') {
      chatReq.status = 'accepted';
      await chatReq.save();
    } else if (action === 'decline') {
      chatReq.status = 'rejected';
      await chatReq.save();
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    return res.json({
      _id: chatReq._id.toString(),
      sender: chatReq.sender.toString(),
      receiver: chatReq.receiver.toString(),
      status: chatReq.status,
      createdAt: chatReq.createdAt,
      updatedAt: chatReq.updatedAt,
    });
  } catch (err) {
    console.error('Error responding to chat request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
