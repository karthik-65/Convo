const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'convo_jwt_secret_key_2026_fallback';

// Default inactivity expiration: 7 days (configurable via SESSION_INACTIVITY_DAYS)
const INACTIVITY_DAYS = parseInt(process.env.SESSION_INACTIVITY_DAYS || '7', 10);
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

const verifyToken = async (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 1. Check token version (force logout if logged in on another device)
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        message: 'Session expired: logged in on another device',
        code: 'LOGGED_IN_ELSEWHERE'
      });
    }

    // 2. Check inactivity expiration (user logged in and hasn't been active for many days)
    if (user.lastActiveAt) {
      const inactiveDuration = Date.now() - new Date(user.lastActiveAt).getTime();
      if (inactiveDuration > INACTIVITY_MS) {
        return res.status(401).json({
          message: `Your session has expired because you have not been active for ${INACTIVITY_DAYS} days. Please log in again.`,
          code: 'SESSION_EXPIRED_INACTIVE'
        });
      }
    }

    // 3. Throttled activity update (update at most once every 5 minutes to avoid DB overhead)
    const now = Date.now();
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    if (now - lastActive > 5 * 60 * 1000) {
      User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date(now) } }).catch(e => {
        console.warn('[Auth Middleware] Failed to update lastActiveAt:', e.message);
      });
    }

    req.userId = decoded.id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Your session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  verifyToken,
  INACTIVITY_DAYS,
  INACTIVITY_MS
};
