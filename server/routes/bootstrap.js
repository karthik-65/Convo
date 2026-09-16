const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const ChatRequest = require('../models/ChatRequest');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

// GET /api/bootstrap - unified single fast query returning all initial data
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      currentUser,
      allUsers,
      chatRequests,
      existingMessagePairs,
      recentMessages,
      unreadCountsGroup
    ] = await Promise.all([
      // 1. Current user profile
      User.findById(userId, '_id username email avatar bio createdAt'),

      // 2. All users directory
      User.find({}, '_id username email avatar bio'),

      // 3. Chat requests involving this user
      ChatRequest.find({
        $or: [{ sender: userId }, { receiver: userId }]
      }),

      // 4. Existing message pairs (to detect connected friends)
      Message.aggregate([
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
      ]),

      // 5. Recent conversation timestamps
      Message.aggregate([
        {
          $match: {
            $or: [{ sender: userObjectId }, { receiver: userObjectId }]
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$sender', userObjectId] },
                '$receiver',
                '$sender'
              ]
            },
            lastMessageAt: { $first: '$createdAt' }
          }
        }
      ]),

      // 6. Unread message counts
      Message.aggregate([
        {
          $match: {
            receiver: userObjectId,
            seenBy: { $ne: userObjectId }
          }
        },
        {
          $group: {
            _id: '$sender',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format chat requests
    const serializedRequests = chatRequests.map(r => ({
      _id: r._id.toString(),
      sender: r.sender.toString(),
      receiver: r.receiver.toString(),
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    // Derive connected user IDs
    const connectedUserIdsSet = new Set();
    serializedRequests.forEach(r => {
      if (r.status === 'accepted') {
        const otherId = r.sender === userId ? r.receiver : r.sender;
        connectedUserIdsSet.add(otherId);
      }
    });

    if (existingMessagePairs.length > 0 && existingMessagePairs[0].userPairs) {
      existingMessagePairs[0].userPairs.forEach(id => {
        connectedUserIdsSet.add(id.toString());
      });
    }

    // Format activity map
    const activityMap = {};
    recentMessages.forEach(item => {
      if (item._id) {
        activityMap[item._id.toString()] = item.lastMessageAt;
      }
    });

    // Format unread map
    const unreadMap = {};
    unreadCountsGroup.forEach(item => {
      if (item._id) {
        unreadMap[item._id.toString()] = item.count;
      }
    });

    res.json({
      user: currentUser,
      users: allUsers,
      chatRequests: serializedRequests,
      connectedUserIds: Array.from(connectedUserIdsSet),
      activityMap,
      unreadMap
    });
  } catch (err) {
    console.error('Error in bootstrap endpoint:', err);
    res.status(500).json({ message: 'Server error during bootstrap' });
  }
});

module.exports = router;
