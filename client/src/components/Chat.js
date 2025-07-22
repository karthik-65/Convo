import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';  // your socket.io client instance
import axios from 'axios';
import { Paperclip } from 'lucide-react';
import { ArrowLeft,Send } from 'lucide-react';
import EditMessage from './EditMessage'; // adjust path as needed
import axiosInstance from '../api/axiosInstance';
import './Chat.css';


function Chat({ onLogout }) {
  const user = JSON.parse(localStorage.getItem('user'));
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [receiver, setReceiver] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // userId -> count
  const [typingUsers , setTypingUsers ] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimeoutRef = useRef({}); // initialize as empty object
  const lastTypingEmitRef = useRef(0);
  const chatBoxRef = useRef(null);  // Ref for the chat messages container
  const receiverRef = useRef(receiver);
  const [hoveredUserId, setHoveredUserId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // { url, name }
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null
  });
  const isAutoScroll = useRef(true);


  // Keep the latest receiver in a ref to use inside callbacks
  useEffect(() => {
    receiverRef.current = receiver;
  }, [receiver]);

  // Format timestamp helper (WhatsApp style)
  function formatTimestamp(createdAt) {
    if (!createdAt) return '';
    const msgDate = new Date(createdAt);
    const now = new Date();

    const isToday = msgDate.toDateString() === now.toDateString();
    if (isToday) {
      return msgDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit',hour12: true });
    } else {
      return msgDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit',hour12: true });
    }
  }

  // Format day separator
  function formatDaySeparator(date) {
    const now = new Date();
    const day = new Date(date);

    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    const diffTime = nowMidnight - dayMidnight;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return day.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

 // EFFECT 1 — Initialize socket events ONCE
  useEffect(() => {
  if (!user?._id) return;

  socket.emit('join', user._id); // let server know you're online

  socket.on('online-users', (onlineUserIds) => {
    setOnlineUsers(allUsers.filter(u => onlineUserIds.includes(u._id)));
  });

  socket.on('typing', ({ sender, receiver }) => {
    if (receiver !== user._id) return;
    setTypingUsers(prev => ({ ...prev, [sender]: true }));
    clearTimeout(typingTimeoutRef.current[sender]);
    typingTimeoutRef.current[sender] = setTimeout(() => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[sender];
        return updated;
      });
    }, 4000);
  });

  socket.on('stop-typing', ({ sender }) => {
    setTypingUsers(prev => {
      const updated = { ...prev };
      delete updated[sender];
      return updated;
    });
  });

  //  Simplify this now:
socket.on('receive-message', (msg) => {
  const isActiveChat = receiverRef.current === msg.sender;

  if (isActiveChat) {
    // Just add it; refetch will update seen
    setMessages(prev => [...prev, msg]);
  } else {
    setUnreadCounts(prev => ({
      ...prev,
      [msg.sender]: (prev[msg.sender] || 0) + 1,
    }));
  }
});

  socket.on('edit-message', ({ id, text }) => {
    setMessages(prev =>
      prev.map(msg => (msg._id === id ? { ...msg, text } : msg))
    );
  });

  socket.on('delete-message', ({ id }) => {
    setMessages(prev => prev.filter(msg => msg._id !== id));
  });

  return () => {
    socket.off('online-users');
    socket.off('typing');
    socket.off('stop-typing');
    socket.off('receive-message');
    socket.off('edit-message');
    socket.off('delete-message');
  };
}, [user, allUsers]);

  useEffect(() => {
  socket.on('messageSeen', ({ messageId, seenBy }) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg._id === messageId && !msg.seenBy?.includes(seenBy)
          ? { ...msg, seenBy: [...(msg.seenBy || []), seenBy] }
          : msg
      )
    );
  });

  return () => {
    socket.off('messageSeen');
  };
}, []);


  useEffect(() => {
      axiosInstance.get('/users')
      .then(res => {
        // console.log("All Users:", res.data);
        setAllUsers(res.data);
      })
      .catch(err => console.error('Failed to fetch users:', err));
  }, []);

  useEffect(() => {
    if (receiver) {
      fetchMessages(receiver);
      setUnreadCounts(prev => ({ ...prev, [receiver]: 0 }));
    }
  }, [receiver]);

  useEffect(() => {
    if (receiver && messages.length > 0) {
      const unseenMessageIds = messages
        .filter(msg => msg.receiver === user._id && !msg.seenBy?.includes(user._id))
        .map(msg => msg._id);

      if (unseenMessageIds.length > 0) {
        socket.emit('markAsSeen', {
          messageIds: unseenMessageIds,
          userId: user._id
        });
      }
    }
  }, [receiver, messages]);


  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (!chatBox) return;

    const handleScroll = () => {
      const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 20;
      isAutoScroll.current = nearBottom;
    };

    chatBox.addEventListener('scroll', handleScroll);
    return () => chatBox.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (chatBox && isAutoScroll.current) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (receiverId) => {
    setReceiver(receiverId);
    if (window.innerWidth < 768) {
          setIsMobileChatOpen(true);
        }   
     try {
      const res = await axiosInstance.get(`/messages/${receiverId}`);


      setMessages(res.data);

    } catch (err) {
      console.error('Error fetching or updating seen messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!receiver) return alert('Select a user first');
    if (!message.trim() && !file) return;

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let fileType = '';
    if (file) {
      const formData = new FormData();
      formData.append('file', file.raw);
      try {
        const uploadRes = await axiosInstance.post('/upload', formData);
        fileUrl = uploadRes.data.fileUrl;
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
        setFile(null);
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    const msg = {
      sender: user._id,
      receiver,
      text: message,
      file: fileUrl,
      fileName,
      fileSize,
      fileType,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await axiosInstance.post('/messages', msg);
      const savedMsg = response.data;
      socket.emit('send-message', savedMsg);  // Use server-saved message
      setMessages(prev => [...prev, { ...savedMsg, seen: false }]);
      setMessage('');
      setTypingUsers({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (val) => {
    if (!receiver) return;

    const now = Date.now();
    if (val.trim().length > 0 && now - lastTypingEmitRef.current > 1000) {
     console.log('🟢 EMIT typing:', { sender: user._id, receiver });
      socket.emit('typing', { sender: user._id, receiver });
      lastTypingEmitRef.current = now;
    } else if (val.trim().length === 0) {
      socket.emit('stop-typing', { sender: user._id, receiver });
    }
  };

  useEffect(() => {
  const handleClickOutside = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  window.addEventListener('click', handleClickOutside);
  return () => {
    window.removeEventListener('click', handleClickOutside);
  };
  }, [contextMenu]);

  const handleUpdateMessage = async (id, newText) => {
    if (!newText.trim()) return;
          console.log('Updating message:', id, newText);
    try {
        await axiosInstance.put(`/messages/${id}`, { text: newText });

      setMessages(prev =>
        prev.map(msg => (msg._id === id ? { ...msg, text: newText } : msg))
      );
      
      socket.emit('edit-message', { id, text: newText });
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      await axiosInstance.delete(`/messages/${id}`);

      setMessages(prev => prev.filter(msg => msg._id !== id));

      socket.emit('delete-message', { id });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };
    
  const isMobile = window.innerWidth < 768;
  const isReceiverOnline = onlineUsers.some(u => u._id === receiver);
  const isTyping = typingUsers?.[receiver];


  return (
    <div className="chat-container">
      <nav className="chat-navbar">
        <div className="chat-logo">
          <div className="chat-avatar" title={user.username}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span style={{ color: "#FFBC00" }}>Convo</span>
        </div>
        <button className="logout-button" onClick={() => setShowLogoutConfirm(true)}>Logout</button>
      </nav>


       <div className="chat-body" style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)' }}>
        <div
    className="user-list"
    style={{
      display: isMobileChatOpen && isMobile ? 'none' : 'flex',
    }}
  >
          <h3 style={{marginLeft:'15px'}}>Users</h3>
          <div style={{ padding: '8px 14px' }}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '5px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {allUsers.filter(u => u._id !== user._id && u.username.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
              const isOnline = onlineUsers.some(ou => ou._id === u._id);
              const unreadCount = unreadCounts[u._id] || 0;
              const isTyping = !!typingUsers?.[u._id];
              console.log('TypingUsers:', typingUsers);
              console.log('User loop id:', u._id, 'isTyping:', !!typingUsers?.[u._id]);
              console.log('User:', u.username, 'Online:', isOnline);


              return (
                <li key={u._id} style={{ marginBottom: '10px', position: 'relative' }}>
                <div
                  onClick={() => fetchMessages(u._id)}
                  onMouseEnter={() => setHoveredUserId(u._id)}
                  onMouseLeave={() => setHoveredUserId(null)}
                  style={{
                    backgroundColor:
                      receiver === u._id
                        ? '#e0e0e0' // selected
                        : hoveredUserId === u._id
                        ? '#f0f0f0' // hover
                        : '#fff', // default
                    width: '100%',
                    padding: '12px 16px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    display: 'flex',
                    borderRadius:10,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{u.username}</span>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            marginLeft: 6,
                            backgroundColor: '#00b4d8',
                            color: 'white',
                            borderRadius: '20px',
                            padding: '1px 5px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            userSelect: 'none',
                          }}
                          title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {isTyping && (
                      <span
                        style={{
                          fontStyle: 'italic',
                          fontSize: '0.85em',
                          color: '#888',
                          marginTop: '4px',
                        }}
                      >
                        is typing...
                      </span>
                    )}
                  </div>

                  {/* Online dot */}
                  {isOnline && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: 'green',
                        marginLeft: 12,
                      }}
                      title="Online"
                    />
                  )}
                </div>
              </li>
              );
            })}
          </ul>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="chat-area"
          style={{
            display: isMobileChatOpen || !isMobile ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {/* Back button for mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px' }}>
                      {(window.innerWidth < 768 && isMobileChatOpen) && (
                        <ArrowLeft
                          onClick={() => setIsMobileChatOpen(false)}
                          style={{
                            cursor: 'pointer',
                          }}
                          size={24}
                          title="Back"
                        />
                      )}
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {allUsers.find(u => u._id === receiver)?.username || 'Chat'}
            {isMobile && isReceiverOnline && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'green',
                  display: 'inline-block',
                  marginTop: 2,
                }}
                title="Online"
              />
            )}
            {isMobile && isTyping && (
              <span
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.75rem',
                  color: '#888',
                  marginLeft: '6px'
                }}
              >
                typing...
              </span>
            )}
          </h3>
          </div>
          {receiver ? (
            <>
              
              <div
                id="chat-box"
                ref={chatBoxRef}
                style={{
                  flex:1,
                  overflowY: 'auto',
                  border: '1px solid #ccc',
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  minHeight: '400px',     // 
                  height: '100%',   
                }}
              >
                {(() => {
                  let lastMessageDate = null;
                  return messages.map((msg, i) => {
                    const msgDate = new Date(msg.createdAt);
                    const msgDateStr = msgDate.toDateString();

                    let showSeparator = false;
                    if (lastMessageDate !== msgDateStr) {
                      showSeparator = true;
                      lastMessageDate = msgDateStr;
                    }


                    const isSender = msg.sender === user._id;
                    const isSeen = msg.seenBy?.includes(receiver);
                    const lastSentMessage = messages.filter(m => m.sender === user._id).slice(-1)[0];


                    return (
                      <React.Fragment key={msg._id || i}>
                        {showSeparator && (
                          <div
                            style={{
                              textAlign: 'center',
                              margin: '15px 0',
                              color: '#666',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              userSelect: 'none',
                            }}
                          >
                            {formatDaySeparator(msg.createdAt)}
                          </div>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: isSender ? 'flex-end' : 'flex-start',
                            marginBottom: '8px',
                          }}
                        >
                          <div
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (!isSender) return;
                              setContextMenu({
                                visible: true,
                                x: e.clientX,
                                y: e.clientY,
                                messageId: msg._id,
                                isFileMessage: !!msg.file
                              });
                            }}
                            style={{
                              backgroundColor: isSender ? '#dcf8c6' : '#f1f0f0',
                              padding: '10px',
                              borderRadius: '12px',
                              maxWidth: '60%',
                              textAlign: 'left',
                              wordBreak: 'break-word',
                              position: 'relative',
                            }}
                          >
                            {editingMessageId === msg._id ? (
                              <EditMessage
                                initialText={msg.text}
                                onSave={(newText) => handleUpdateMessage(msg._id, newText)}
                                onCancel={() => {
                                  setEditingMessageId(null);
                                  setEditText('');
                                }}
                              />
                            ) : (
                              <>
                                {/* Message Text */}
                                <p style={{ margin: 0 }}>{msg.text}</p>

                                {/* File Preview (Image or Downloadable) */}
                              {msg.file && (
                                <div
                                  className="file-preview"
                                  onClick={() => {
                                    const rawName = msg.fileName || msg.file.split('/').pop();
                                    const finalName = rawName.includes('-')
                                      ? rawName.split('-').slice(1).join('-')
                                      : rawName;

                                    if (msg.fileType.startsWith('image')) {
                                      setPreviewImage({
                                        url: msg.file,
                                        name: finalName,
                                      });
                                    } else {
                                      // Open all non-images (PDF, ZIP, DOC, etc.) in new tab
                                      window.open(msg.file, '_blank');
                                    }
                                  }}
                                  style={{
                                    marginTop: '6px',
                                    padding: '10px',
                                    backgroundColor: '#eef3fb',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    maxWidth: '300px',
                                  }}
                                >
                                  {/* Image Preview */}
                                  {msg.fileType.startsWith('image') && (
                                    <img
                                      src={msg.file}
                                      alt="preview"
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        borderRadius: '6px',
                                        objectFit: 'cover',
                                      }}
                                    />
                                  )}

                                  {/* Icon + Filename (always shown) */}
                                  {!msg.fileType.startsWith('image') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Paperclip size={18} color="#333" />
                                  <span
                                    style={{
                                      fontWeight: 'bold',
                                      color: '#000',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {
                                      (msg.fileName || msg.file.split('/').pop()).includes('-')
                                        ? (msg.fileName || msg.file.split('/').pop()).split('-').slice(1).join('-')
                                        : (msg.fileName || msg.file.split('/').pop())
                                    }
                                  </span>
                                </div>
                              )}
                              {/* File Info */}
                                <div style={{ fontSize: '0.85em', color: '#555' }}>
                                  {(msg.fileSize / 1024).toFixed(1)} KB • {msg.fileType.split('/')[1]}
                                </div>
                                </div>
                              )}

                                {/* Timestamp */}
                                <div
                                style={{
                                  fontSize: '0.75em',
                                  color: '#888',
                                  marginTop: '4px',
                                  textAlign: 'right',
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap',
                                }}
                                title={new Date(msg.createdAt).toLocaleString()}
                              >
                                {formatTimestamp(msg.createdAt)}
                                {isSender && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="17"
                                  height="17"
                                  fill={isSeen ? '#ff8c00' : '#aaa'} // green if seen, gray otherwise
                                  viewBox="0 0 20 20"
                                  style={{
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    transform: 'rotate(-10deg)',
                                    marginLeft: '4px', // small gap from timestamp
                                  }}
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              </div>
                              </>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>

              {/* Floating selected file container */}
              {file && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '60px', 
                    left: '20px',
                    right: '20px',
                    backgroundColor: '#e1ecf7',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    width: 'auto', 
                    maxWidth: 'calc(100% - 40px)', 
                  }}
                >
                  <Paperclip size={18} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexGrow: 1,
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <button
                    onClick={() => setFile(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.3rem',
                      lineHeight: 1,
                      color: '#555',
                    }}
                    aria-label="Remove selected file"
                  >
                    ×
                  </button>
                </div>
              )}

              <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              {/* Input Field */}
              <input
                value={message}
                onChange={(e) => {
                  const val = e.target.value;
                  setMessage(val);
                  handleTyping(val);
                }}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '20px',
                  border: '1px solid #ccc',
                  outline: 'none',
                  fontSize: '1rem',
                }}
                autoComplete="off"
              />

              {/* Paperclip Icon */}
              <label
                htmlFor="file-upload"
                style={{
                  cursor: 'pointer',
                  color: '#555',
                }}
                title="Attach file"
              >
                <Paperclip size={20} />
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const selectedFile = e.target.files[0];
                  if (selectedFile) {
                    setFile({
                      raw: selectedFile,
                      name: selectedFile.name,
                      size: selectedFile.size,
                      type: selectedFile.type
                    });
                  }
                }}
                style={{ display: 'none' }}
              />

              {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!message.trim() && !file}
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: (!message.trim() && !file) ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: (!message.trim() && !file) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              title="Send"
            >
              <Send size={18} />
            </button>

            </div>

            </>
          ) : (
            <p>Select a user to start chatting</p>
          )}
        </div>
      </div>
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px 32px',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            minWidth: '300px'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Are you sure you want to logout?</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                style={{
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            padding: '8px 0',
            width: '120px',
          }}
          onClick={() => setContextMenu({ ...contextMenu, visible: false })}
        >
          {/* Edit option */}
          <div
            onClick={(e) => {
              if (contextMenu.isFileMessage) {
                e.stopPropagation();
                return;
              }
              const msg = messages.find(m => m._id === contextMenu.messageId);
              if (msg) {
                setEditingMessageId(msg._id);
                setEditText(msg.text);
              }
              setContextMenu({ ...contextMenu, visible: false });
            }}
            style={{
              padding: '6px 12px',
              cursor: contextMenu.isFileMessage ? 'not-allowed' : 'pointer',
              color: contextMenu.isFileMessage ? '#999' : '#000',
              backgroundColor: contextMenu.isFileMessage ? '#f8f9fa' : '#fff',
              borderBottom: '1px solid #eee',
              userSelect: 'none',
            }}
            title={contextMenu.isFileMessage ? 'Editing disabled for file messages' : 'Edit message'}
          >
            Edit
          </div>

          {/* Delete option */}
          <div
            onClick={() => {
              handleDeleteMessage(contextMenu.messageId);
              setContextMenu({ ...contextMenu, visible: false });
            }}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            Delete
          </div>
        </div>
      )}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0, 0, 0, 0.4)',
                border: 'none',
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer',
              }}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24">
                <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L12 13.41l-6.29 6.3-1.42-1.42L10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z"/>
              </svg>
            </button>

            <img
              src={previewImage.url}
              alt="Preview"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;

