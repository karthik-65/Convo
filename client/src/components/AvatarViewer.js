import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, User } from 'lucide-react';
import { getUserGradient, getUserInitials } from '../utils/avatar';
import './AvatarViewer.css';

function AvatarViewer({ user, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = () => {
    if (!user?.avatar) return;
    const a = document.createElement('a');
    a.href = user.avatar;
    a.download = `${user.username}-avatar`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="avatar-viewer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="avatar-viewer-card"
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top bar */}
          <div className="avatar-viewer-topbar">
            <div className="avatar-viewer-username">
              <User size={14} />
              <span>{user?.username}</span>
            </div>
            <div className="avatar-viewer-actions">
              {user?.avatar && (
                <button
                  className="avatar-viewer-btn"
                  onClick={handleDownload}
                  title="Download photo"
                >
                  <Download size={16} />
                </button>
              )}
              <button className="avatar-viewer-btn close" onClick={onClose} title="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Photo or initials fallback */}
          <div className="avatar-viewer-photo-wrap">
            {user?.avatar ? (
              <motion.img
                src={user.avatar}
                alt={user.username}
                className="avatar-viewer-photo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              />
            ) : (
              <div
                className="avatar-viewer-initials"
                style={{ background: getUserGradient(user?.username) }}
              >
                {getUserInitials(user?.username)}
              </div>
            )}
          </div>

          {/* User info footer */}
          <div className="avatar-viewer-footer">
            <div className="avatar-viewer-name">{user?.username}</div>
            {user?.bio && <div className="avatar-viewer-bio">"{user.bio}"</div>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AvatarViewer;
