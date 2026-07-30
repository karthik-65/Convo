const mongoose = require('mongoose');

// GET latest activity / last message timestamp for each conversation involving current user
router.get('/recent/conversations', verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const recentMessages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessageAt: { $first: '$createdAt' }
        }
      }
    ]);

    const activityMap = {};
    recentMessages.forEach(item => {
      if (item._id) {
        activityMap[item._id.toString()] = item.lastMessageAt;
      }
    });

    res.json(activityMap);
  } catch (err) {
    console.error('Error fetching recent conversations:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
