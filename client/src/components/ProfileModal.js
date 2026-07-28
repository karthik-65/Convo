import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';
import { Camera, X, Check, Save, FileText, User, Mail, Lock } from 'lucide-react';
import { getUserGradient, getUserInitials } from '../utils/avatar';
import './ProfileModal.css';

function ProfileModal({ user, onUpdateUser, onClose }) {
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || '');

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const uploadRes = await axiosInstance.post('/upload', formData);
      setAvatar(uploadRes.data.fileUrl);
      setStatusMsg({ type: 'success', text: 'Photo uploaded! Click Save to apply.' });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to upload photo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });
    setIsLoading(true);

    try {
      const res = await axiosInstance.put('/auth/profile', {
        bio: bio.trim(),
        avatar
      });

      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
      onUpdateUser(res.data);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <motion.div
        className="profile-modal-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal-header">
          <h3 className="profile-modal-title">Edit Profile</h3>
          <button className="nav-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Avatar Upload Section */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-container">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div
                className="avatar-circle"
                style={{
                  width: '96px',
                  height: '96px',
                  fontSize: '2.2rem',
                  background: getUserGradient(user.username)
                }}
              >
                {getUserInitials(user.username)}
              </div>
            )}

            <label htmlFor="avatar-file-input" className="profile-avatar-upload-btn" title="Change photo">
              <Camera size={16} />
            </label>
            <input
              id="avatar-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            Click the camera icon to change your photo
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-form">

          {/* Read-only Username */}
          <div className="profile-field-group">
            <label className="profile-field-label">
              <User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Username
              <span className="profile-readonly-badge">
                <Lock size={10} /> Read-only
              </span>
            </label>
            <input
              className="profile-input profile-input--readonly"
              type="text"
              value={user.username}
              readOnly
              tabIndex={-1}
            />
          </div>

          {/* Read-only Email */}
          <div className="profile-field-group">
            <label className="profile-field-label">
              <Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Email Address
              <span className="profile-readonly-badge">
                <Lock size={10} /> Read-only
              </span>
            </label>
            <input
              className="profile-input profile-input--readonly"
              type="email"
              value={user.email}
              readOnly
              tabIndex={-1}
            />
          </div>

          {/* Editable Bio */}
          <div className="profile-field-group">
            <label className="profile-field-label">
              <FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Bio / Status
            </label>
            <textarea
              className="profile-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={120}
              placeholder="Tell others a bit about yourself..."
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {bio.length}/120
            </div>
          </div>

          {statusMsg.text && (
            <div className={`profile-status-alert ${statusMsg.type}`}>
              {statusMsg.type === 'success' ? <Check size={14} style={{ verticalAlign: 'middle' }} /> : null}{' '}
              {statusMsg.text}
            </div>
          )}

          <button type="submit" className="profile-save-btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default ProfileModal;
