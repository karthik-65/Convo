const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

// ✅ Register Route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username or email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Username already taken' });

    // Save the new user
    const user = new User({ username, email, password});
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Login Route (username or email)
router.post('/login', async (req, res) => {
  console.log('Login request body:', req.body);

  const { emailOrUsername, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      console.log('No user found for:', emailOrUsername);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const match = await user.comparePassword(password);
    console.log('Password match result:', match);
    if (!match) {
      console.log('Password mismatch for:', emailOrUsername);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
