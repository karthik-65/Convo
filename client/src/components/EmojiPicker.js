import React, { useState } from 'react';

const EMOJI_CATEGORIES = [
  {
    name: 'Popular',
    emojis: ['😊', '😂', '😍', '👍', '❤️', '🔥', '🎉', '✨', '🙌', '🙏', '😎', '😭', '🤔', '👏', '🥳', '💯']
  },
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😭', '😉', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🖕', '✍️', '🙏', '🤝']
  },
  {
    name: 'Hearts & Vibes',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '🌟', '💥', '⚡', '🌈', '☀️', '⭐']
  }
];

function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="emoji-picker-container">
      <div className="emoji-picker-header">
        <div className="emoji-tabs">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              className={`emoji-tab-btn ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {onClose && (
          <button className="emoji-picker-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="emoji-picker-grid">
        {EMOJI_CATEGORIES[activeTab].emojis.map((emoji, i) => (
          <button
            key={i}
            className="emoji-btn"
            onClick={() => {
              onSelectEmoji(emoji);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmojiPicker;
