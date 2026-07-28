import React from 'react';
import { getUserGradient, getUserInitials } from '../utils/avatar';

function UserList({ users, currentUserId, onSelectUser }) {
  return (
    <ul className="users-scroll-area" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {users
        .filter(u => u._id !== currentUserId)
        .map(user => (
          <li
            key={user._id}
            onClick={() => onSelectUser(user._id)}
            className="user-item-card"
          >
            <div className="user-item-left">
              <div className="avatar-circle" style={{ background: getUserGradient(user.username) }}>
                {getUserInitials(user.username)}
              </div>
              <span className="user-name-text">{user.username}</span>
            </div>
          </li>
        ))}
    </ul>
  );
}

export default UserList;
