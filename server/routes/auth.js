const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'convo_jwt_secret_key_2026_fallback';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Register Route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Username already taken' });

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      },
      token
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: err.message || 'Server error during registration' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ message: 'Username/Email and password are required' });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      },
      token
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: err.message || 'Server error during login' });
  }
});

// GET Current Profile (/api/auth/me)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId, '_id username email avatar bio createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT Update Profile (/api/auth/profile) — only avatar and bio
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
