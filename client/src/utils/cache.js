// Client-side persistent cache manager for zero-latency data hydration
// Keeps contacts, friends, chat requests, conversation metadata, and recent messages
// instantly accessible right when the user enters the page.

const PREFIX = 'convo_cache_';
const MAX_CACHED_MESSAGES_PER_CONVO = 100;

function safeGet(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.warn(`[Cache] Error reading ${key}:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Cache] Error writing ${key} (storage quota may be near limit):`, err);
    // If quota exceeded, clean up old message caches
    pruneOldCaches();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (retryErr) {
      // Ignore if still fails
    }
  }
}

function pruneOldCaches() {
  try {
    const msgKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes('_msgs_')) {
        msgKeys.push(k);
      }
    }
    // Remove half of the oldest message caches
    if (msgKeys.length > 5) {
      msgKeys.slice(0, Math.ceil(msgKeys.length / 2)).forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    // ignore
  }
}

export const chatCache = {
  // Users Directory
  getUsers(userId) {
    if (!userId) return [];
    return safeGet(`${PREFIX}${userId}_users`, []) || [];
  },
  setUsers(userId, users) {
    if (!userId || !Array.isArray(users)) return;
    safeSet(`${PREFIX}${userId}_users`, users);
  },

  // Chat Requests
  getChatRequests(userId) {
    if (!userId) return [];
    return safeGet(`${PREFIX}${userId}_chat_requests`, []) || [];
  },
  setChatRequests(userId, requests) {
    if (!userId || !Array.isArray(requests)) return;
    safeSet(`${PREFIX}${userId}_chat_requests`, requests);
  },

  // Connected User IDs (Friends)
  getConnectedUserIds(userId) {
    if (!userId) return [];
    return safeGet(`${PREFIX}${userId}_connected_ids`, []) || [];
  },
  setConnectedUserIds(userId, ids) {
    if (!userId || !Array.isArray(ids)) return;
    safeSet(`${PREFIX}${userId}_connected_ids`, ids);
  },

  // Activity map: { [otherUserId]: ISO timestamp }
  getActivityMap(userId) {
    if (!userId) return {};
    return safeGet(`${PREFIX}${userId}_activity_map`, {}) || {};
  },
  setActivityMap(userId, map) {
    if (!userId || !map) return;
    safeSet(`${PREFIX}${userId}_activity_map`, map);
  },

  // Unread counts: { [otherUserId]: count }
  getUnreadCounts(userId) {
    if (!userId) return {};
    return safeGet(`${PREFIX}${userId}_unread_counts`, {}) || {};
  },
  setUnreadCounts(userId, counts) {
    if (!userId || !counts) return;
    safeSet(`${PREFIX}${userId}_unread_counts`, counts);
  },

  // Messages per conversation
  getMessages(userId, otherUserId) {
    if (!userId || !otherUserId) return [];
    return safeGet(`${PREFIX}${userId}_msgs_${otherUserId}`, []) || [];
  },
  setMessages(userId, otherUserId, messages) {
    if (!userId || !otherUserId || !Array.isArray(messages)) return;
    // Keep up to MAX_CACHED_MESSAGES_PER_CONVO
    const trimmed = messages.length > MAX_CACHED_MESSAGES_PER_CONVO
      ? messages.slice(-MAX_CACHED_MESSAGES_PER_CONVO)
      : messages;
    safeSet(`${PREFIX}${userId}_msgs_${otherUserId}`, trimmed);
  },

  appendMessage(userId, otherUserId, msg) {
    if (!userId || !otherUserId || !msg) return;
    const current = this.getMessages(userId, otherUserId);
    // Avoid duplicates
    if (msg._id && current.some(m => m._id === msg._id)) return;
    const updated = [...current, msg];
    this.setMessages(userId, otherUserId, updated);
  },

  updateMessage(userId, otherUserId, messageId, newText) {
    if (!userId || !otherUserId || !messageId) return;
    const current = this.getMessages(userId, otherUserId);
    const updated = current.map(m => m._id === messageId ? { ...m, text: newText } : m);
    this.setMessages(userId, otherUserId, updated);
  },

  deleteMessage(userId, otherUserId, messageId) {
    if (!userId || !otherUserId || !messageId) return;
    const current = this.getMessages(userId, otherUserId);
    const updated = current.filter(m => m._id !== messageId);
    this.setMessages(userId, otherUserId, updated);
  },

  // Clear all caches for a user (or on logout)
  clearUserCache(userId) {
    try {
      const keysToRemove = [];
      const userPrefix = `${PREFIX}${userId}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(userPrefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[Cache] Error clearing user cache:', e);
    }
  }
};

export default chatCache;
