import React from 'react';

function UserList({ users, currentUserId, onSelectUser }) {
  return (
    <ul>
      {users
        .filter(u => u._id !== currentUserId)
        .map(user => (
          <li
            key={user._id}
            onClick={() => onSelectUser(user._id)}
            style={{ cursor: 'pointer', margin: '5px 0' }}
          >
            {user.username}
          </li>
        ))}
    </ul>
  );
}

export default UserList;
