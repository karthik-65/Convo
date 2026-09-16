import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';
import axiosInstance from '../api/axiosInstance';
import { motion } from 'framer-motion';
import {
  MessageSquare, Sun, Moon, Volume2, VolumeX, LogOut, Search, X,
  Paperclip, Send, Mic, Square, ArrowLeft, CheckCheck, Check,
  Edit2, Trash2, Download, Smile, Play, Pause, UserPlus, UserCheck, UserX, Clock, Settings, Bell
} from 'lucide-react';
import EditMessage from './EditMessage';
import EmojiPicker from './EmojiPicker';
import ProfileModal from './ProfileModal';
import AvatarViewer from './AvatarViewer';
import soundManager from '../utils/sound';
import chatCache from '../utils/cache';
import { getUserGradient, getUserInitials } from '../utils/avatar';
import './Chat.css';

// Custom Voice Audio Player Component
function VoicePlayer({ src }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="voice-note-card">
      <button className="voice-play-btn" onClick={togglePlay}>
        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>
      <div className="voice-waveform">
        <div className="voice-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function Chat({ onLogout }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const currentUserId = currentUser?._id;

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Synchronous zero-latency instant hydration from persistent cache!
  const [allUsers, setAllUsers] = useState(() => chatCache.getUsers(currentUserId));
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatRequests, setChatRequests] = useState(() => chatCache.getChatRequests(currentUserId));
  const [connectedUserIds, setConnectedUserIds] = useState(() => chatCache.getConnectedUserIds(currentUserId));
  const [lastActivityMap, setLastActivityMap] = useState(() => chatCache.getActivityMap(currentUserId));
  const [unreadCounts, setUnreadCounts] = useState(() => chatCache.getUnreadCounts(currentUserId));

  // Remember last receiver for instant desktop continuation
  const [receiver, setReceiver] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return chatCache.getLastReceiver(currentUserId);
    }
    return null;
  });

  // Zero-latency instant messages hydration for current receiver
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      const lastRec = chatCache.getLastReceiver(currentUserId);
      if (lastRec) {
        return chatCache.getMessages(currentUserId, lastRec);
      }
    }
    return [];
  });

  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Avatar viewer state
  const [viewingAvatar, setViewingAvatar] = useState(null); // user object

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Customization & UI state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  // Dynamic Mobile Viewport Height calculation & window resize listener
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Mobile Hardware / Gesture Back Button handling: prevents logout on back press
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e) => {
      window.history.pushState(null, '', window.location.href);
      if (isMobileChatOpen) {
        setIsMobileChatOpen(false);
        setReceiver(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileChatOpen]);


  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    isFileMessage: false,
  });

  const typingTimeoutRef = useRef({});
  const lastTypingEmitRef = useRef(0);
  const chatBoxRef = useRef(null);
  const receiverRef = useRef(receiver);
  const isAutoScroll = useRef(true);

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Keep latest receiver in ref (only active when chat panel is open)
  useEffect(() => {
    if (isMobile && !isMobileChatOpen) {
      receiverRef.current = null;
    } else {
      receiverRef.current = receiver;
    }
  }, [receiver, isMobile, isMobileChatOpen]);

  // Fetch Chat Requests fallback
  async function fetchChatRequests() {
    try {
      const res = await axiosInstance.get('/chat-requests');
      const reqs = res.data.requests || [];
      const ids = res.data.connectedUserIds || [];
      setChatRequests(reqs);
      setConnectedUserIds(ids);
      chatCache.setChatRequests(currentUserId, reqs);
      chatCache.setConnectedUserIds(currentUserId, ids);
    } catch (err) {
      console.error('Failed to fetch chat requests:', err);
    }
  }

  // Fast single-roundtrip bootstrap to synchronize everything with 0 delay
  useEffect(() => {
    if (!currentUserId) return;

    let isCancelled = false;

    async function syncData() {
      try {
        const res = await axiosInstance.get('/bootstrap');
        if (isCancelled) return;
        const data = res.data;

        if (data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        if (Array.isArray(data.users)) {
          setAllUsers(data.users);
          chatCache.setUsers(currentUserId, data.users);
        }
        if (Array.isArray(data.chatRequests)) {
          setChatRequests(data.chatRequests);
          chatCache.setChatRequests(currentUserId, data.chatRequests);
        }
        if (Array.isArray(data.connectedUserIds)) {
          setConnectedUserIds(data.connectedUserIds);
          chatCache.setConnectedUserIds(currentUserId, data.connectedUserIds);
        }
        if (data.activityMap) {
          setLastActivityMap(data.activityMap);
          chatCache.setActivityMap(currentUserId, data.activityMap);
        }
        if (data.unreadMap) {
          setUnreadCounts(data.unreadMap);
          chatCache.setUnreadCounts(currentUserId, data.unreadMap);
        }
      } catch (err) {
        console.warn('Bootstrap API fallback to individual calls:', err);
        if (isCancelled) return;
        // Fallback endpoints
        axiosInstance.get('/auth/me').then(res => {
          setCurrentUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        }).catch(() => {});
        axiosInstance.get('/users').then(res => {
          setAllUsers(res.data);
          chatCache.setUsers(currentUserId, res.data);
        }).catch(() => {});
        fetchChatRequests();
        axiosInstance.get('/messages/recent/conversations').then(res => {
          if (res.data) {
            const act = res.data.activityMap || res.data || {};
            setLastActivityMap(act);
            chatCache.setActivityMap(currentUserId, act);
            if (res.data.unreadMap) {
              setUnreadCounts(res.data.unreadMap);
              chatCache.setUnreadCounts(currentUserId, res.data.unreadMap);
            }
          }
        }).catch(() => {});
      }
    }

    syncData();

    // Background poll every 15s to keep requests fresh
    const interval = setInterval(fetchChatRequests, 15000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  function getChatStatus(otherUserId) {
    if (!otherUserId) return 'none';
    const myId = currentUserId?.toString();
    const otherId = otherUserId?.toString();

    if (connectedUserIds.map(id => id.toString()).includes(otherId)) return 'accepted';

    const req = chatRequests.find(
      r => (r.sender?.toString() === myId && r.receiver?.toString() === otherId) ||
           (r.sender?.toString() === otherId && r.receiver?.toString() === myId)
    );

    if (!req) return 'none';
    if (req.status === 'accepted') return 'accepted';
    if (req.status === 'pending') {
      if (req.sender?.toString() === myId) return { type: 'pending', request: req };
      return { type: 'received', request: req };
    }
    return 'none';
  }

  async function handleSendChatRequest(receiverId) {
    try {
      const res = await axiosInstance.post('/chat-requests/send', { receiver: receiverId });
      setChatRequests(prev => {
        const updated = [...prev.filter(r => r._id !== res.data._id), res.data];
        chatCache.setChatRequests(currentUserId, updated);
        return updated;
      });
      // Stringify ObjectIds so the server socket map lookup works correctly
      socket.emit('send-chat-request', {
        ...res.data,
        sender: res.data.sender?.toString(),
        receiver: res.data.receiver?.toString(),
      });
    } catch (err) {
      console.error('Failed to send chat request:', err);
    }
  }

  async function handleRespondChatRequest(requestId, action) {
    try {
      const res = await axiosInstance.post('/chat-requests/respond', { requestId, action });
      setChatRequests(prev => {
        const updated = prev.map(r => r._id === requestId ? res.data : r);
        chatCache.setChatRequests(currentUserId, updated);
        return updated;
      });
      if (action === 'accept') {
        const myId = currentUserId?.toString();
        const otherId = res.data.sender === myId ? res.data.receiver : res.data.sender;
        setConnectedUserIds(prev => {
          const updated = [...prev, otherId];
          chatCache.setConnectedUserIds(currentUserId, updated);
          return updated;
        });
      }
      // Stringify ObjectIds so the server socket map lookup works correctly
      socket.emit('respond-chat-request', {
        ...res.data,
        sender: res.data.sender?.toString(),
        receiver: res.data.receiver?.toString(),
      });
    } catch (err) {
      console.error('Failed to respond to chat request:', err);
    }
  }

  function handleProfileUpdated(updatedUser) {
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setAllUsers(prev => {
      const updated = prev.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u);
      chatCache.setUsers(currentUserId, updated);
      return updated;
    });
    socket.emit('update-user-profile', updatedUser);
  }

  // Socket setup
  useEffect(() => {
    if (!currentUserId) return;

    // Register this user in the server's online-users map
    const joinServer = () => {
      socket.emit('join', currentUserId);
    };
    joinServer();

    // Re-join after reconnect so the server's `users` map stays fresh
    // and re-fetch chat requests to catch any missed real-time events
    socket.on('connect', () => {
      joinServer();
      fetchChatRequests();
    });

    socket.on('online-users', (onlineUserIds) => {
      setOnlineUsers(allUsers.filter(u => onlineUserIds.includes(u._id)));
    });

    socket.on('typing', ({ sender, receiver }) => {
      if (receiver !== currentUserId) return;
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

    socket.on('receive-message', (msg) => {
      const myId = currentUserId?.toString();
      const msgReceiver = msg.receiver?.toString();
      const msgSender = msg.sender?.toString();

      if (msgReceiver === myId) {
        if (msg._id) {
          socket.emit('markAsDelivered', { messageIds: [msg._id], userId: currentUserId });
        }

        const isActiveChat = receiverRef.current?.toString() === msgSender;

        const senderObj = allUsers.find(u => u._id?.toString() === msgSender);
        const senderName = senderObj?.username || 'New Message';
        const msgText = msg.file ? (msg.text ? `${msg.text} (Attachment)` : 'Sent an attachment') : (msg.text || 'New message');

        soundManager.playDeviceNotification({
          title: senderName,
          body: msgText,
          icon: senderObj?.avatar || '/chat.png'
        });

        chatCache.appendMessage(currentUserId, msgSender, msg);

        setLastActivityMap(prev => {
          const updated = {
            ...prev,
            [msgSender]: msg.createdAt || new Date().toISOString(),
          };
          chatCache.setActivityMap(currentUserId, updated);
          return updated;
        });

        if (!isActiveChat) {
          setUnreadCounts(prev => {
            const updated = {
              ...prev,
              [msgSender]: (prev[msgSender] || 0) + 1,
            };
            chatCache.setUnreadCounts(currentUserId, updated);
            return updated;
          });
        } else {
          setMessages(prev => [...prev, msg]);
        }
      }
    });

    socket.on('edit-message', ({ id, text }) => {
      setMessages(prev =>
        prev.map(msg => (msg._id === id ? { ...msg, text } : msg))
      );
      if (receiverRef.current) {
        chatCache.updateMessage(currentUserId, receiverRef.current, id, text);
      }
    });

    socket.on('delete-message', ({ id }) => {
      setMessages(prev => prev.filter(msg => msg._id !== id));
      if (receiverRef.current) {
        chatCache.deleteMessage(currentUserId, receiverRef.current, id);
      }
    });

    socket.on('receive-chat-request', (chatReq) => {
      setChatRequests(prev => {
        const updated = [...prev.filter(r => r._id !== chatReq._id), chatReq];
        chatCache.setChatRequests(currentUserId, updated);
        return updated;
      });
      const senderObj = allUsers.find(u => u._id?.toString() === chatReq.sender?.toString());
      const senderName = senderObj?.username || 'Someone';
      soundManager.playDeviceNotification({
        title: 'New Chat Request',
        body: `${senderName} sent you a chat request`,
        icon: senderObj?.avatar || '/chat.png'
      });
    });

    socket.on('update-chat-request', (chatReq) => {
      setChatRequests(prev => {
        const updated = prev.map(r => r._id === chatReq._id ? chatReq : r);
        chatCache.setChatRequests(currentUserId, updated);
        return updated;
      });
      if (chatReq.status === 'accepted') {
        const otherId = chatReq.sender === currentUserId ? chatReq.receiver : chatReq.sender;
        setConnectedUserIds(prev => {
          const updated = [...prev, otherId];
          chatCache.setConnectedUserIds(currentUserId, updated);
          return updated;
        });
      }
    });

    socket.on('update-user-profile', (updatedUser) => {
      setAllUsers(prev => {
        const updated = prev.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u);
        chatCache.setUsers(currentUserId, updated);
        return updated;
      });
    });

    socket.on('new-user-registered', (newUser) => {
      setAllUsers(prev => {
        if (prev.some(u => u._id?.toString() === newUser._id?.toString())) return prev;
        const updated = [...prev, newUser];
        chatCache.setUsers(currentUserId, updated);
        return updated;
      });
    });

    socket.on('force-logout', (data) => {
      alert(data?.message || 'You have been logged out because your account was accessed on another device.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });

    return () => {
      socket.off('connect');
      socket.off('online-users');
      socket.off('typing');
      socket.off('stop-typing');
      socket.off('receive-message');
      socket.off('edit-message');
      socket.off('delete-message');
      socket.off('receive-chat-request');
      socket.off('update-chat-request');
      socket.off('update-user-profile');
      socket.off('new-user-registered');
      socket.off('force-logout');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, allUsers]);


  // Delivered & Seen status listener
  useEffect(() => {
    socket.on('messageDelivered', ({ messageId, deliveredTo }) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId && !msg.deliveredTo?.includes(deliveredTo)
            ? { ...msg, deliveredTo: [...(msg.deliveredTo || []), deliveredTo] }
            : msg
        )
      );
    });

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
      socket.off('messageDelivered');
      socket.off('messageSeen');
    };
  }, []);

  // On mount, if a receiver was restored, sync its messages in the background
  useEffect(() => {
    if (receiver && currentUserId) {
      axiosInstance.get(`/messages/${receiver}`)
        .then(res => {
          if (res.data) {
            setMessages(res.data);
            chatCache.setMessages(currentUserId, receiver, res.data);
          }
        })
        .catch(err => console.error('Initial receiver sync error:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMessages(receiverId) {
    if (!receiverId) return;
    setReceiver(receiverId);
    chatCache.setLastReceiver(currentUserId, receiverId);

    setUnreadCounts(prev => {
      const updated = { ...prev, [receiverId?.toString()]: 0 };
      chatCache.setUnreadCounts(currentUserId, updated);
      return updated;
    });

    if (isMobile) {
      setIsMobileChatOpen(true);
    }

    // Zero latency: immediately hydrate messages from persistent cache!
    const cached = chatCache.getMessages(currentUserId, receiverId);
    if (cached && cached.length > 0) {
      setMessages(cached);
    } else {
      setMessages([]);
    }

    // Background sync to fetch fresh / newly delivered messages
    try {
      const res = await axiosInstance.get(`/messages/${receiverId}`);
      if (res.data) {
        setMessages(res.data);
        chatCache.setMessages(currentUserId, receiverId, res.data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }

  // Mark unseen messages as seen
  useEffect(() => {
    if (receiver && messages.length > 0 && currentUserId) {
      const unseenMessageIds = messages
        .filter(msg => msg.receiver === currentUserId && !msg.seenBy?.includes(currentUserId))
        .map(msg => msg._id);

      if (unseenMessageIds.length > 0) {
        socket.emit('markAsSeen', {
          messageIds: unseenMessageIds,
          userId: currentUserId
        });
      }
    }
  }, [receiver, messages, currentUserId]);

  // Auto scroll listener setup - attaches to chatBox when chat opens or changes
  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (!chatBox) return;

    const handleScroll = () => {
      const nearBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 60;
      isAutoScroll.current = nearBottom;
    };

    chatBox.addEventListener('scroll', handleScroll);
    return () => chatBox.removeEventListener('scroll', handleScroll);
  }, [receiver, messages.length]);

  // Reset scroll to bottom when selecting a user
  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (chatBox) {
      isAutoScroll.current = true;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [receiver]);

  // Auto-scroll on message updates ONLY if user is already at/near the bottom
  useEffect(() => {
    const chatBox = chatBoxRef.current;
    if (chatBox && isAutoScroll.current) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [messages]);

  // Close context menu on window click
  useEffect(() => {
    const handleClose = () => {
      if (contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false }));
      if (showEmojiPicker) setShowEmojiPicker(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [contextMenu.visible, showEmojiPicker]);




  async function sendMessage(overrideFile = null, overrideText = null) {
    if (!receiver) return;
    const sendFile = overrideFile || file;
    const sendText = overrideText !== null ? overrideText : message;

    if (!sendText.trim() && !sendFile) return;

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let fileType = '';

    if (sendFile) {
      const formData = new FormData();
      formData.append('file', sendFile.raw);
      try {
        const uploadRes = await axiosInstance.post('/upload', formData);
        fileUrl = uploadRes.data.fileUrl;
        fileName = sendFile.name;
        fileSize = sendFile.size;
        fileType = sendFile.type;
        if (!overrideFile) setFile(null);
      } catch (err) {
        console.error('File upload failed:', err);
        return;
      }
    }

    const msg = {
      sender: currentUserId,
      receiver,
      text: sendText,
      file: fileUrl,
      fileName,
      fileSize,
      fileType,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await axiosInstance.post('/messages', msg);
      const savedMsg = response.data;
      socket.emit('send-message', savedMsg);
      const newMsgWithStatus = { ...savedMsg, seenBy: [] };
      setMessages(prev => [...prev, newMsgWithStatus]);
      chatCache.appendMessage(currentUserId, receiver, newMsgWithStatus);

      if (overrideText === null) setMessage('');
      setTypingUsers({});
      setLastActivityMap(prev => {
        const updated = {
          ...prev,
          [receiver]: new Date().toISOString(),
        };
        chatCache.setActivityMap(currentUserId, updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  // Voice Note Recorder Handlers
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

        await sendMessage({
          raw: voiceFile,
          name: voiceFile.name,
          size: voiceFile.size,
          type: voiceFile.type
        }, '🎙️ Voice Note');

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  }

  function handleTyping(val) {
    if (!receiver) return;
    const now = Date.now();
    if (val.trim().length > 0 && now - lastTypingEmitRef.current > 1000) {
      socket.emit('typing', { sender: currentUserId, receiver });
      lastTypingEmitRef.current = now;
    } else if (val.trim().length === 0) {
      socket.emit('stop-typing', { sender: currentUserId, receiver });
    }
  }

  async function handleUpdateMessage(id, newText) {
    if (!newText.trim()) return;
    try {
      await axiosInstance.put(`/messages/${id}`, { text: newText });
      setMessages(prev =>
        prev.map(msg => (msg._id === id ? { ...msg, text: newText } : msg))
      );
      if (receiver) {
        chatCache.updateMessage(currentUserId, receiver, id, newText);
      }
      socket.emit('edit-message', { id, text: newText });
      setEditingMessageId(null);
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  }

  async function handleDeleteMessage(id) {
    try {
      await axiosInstance.delete(`/messages/${id}`);
      setMessages(prev => prev.filter(msg => msg._id !== id));
      if (receiver) {
        chatCache.deleteMessage(currentUserId, receiver, id);
      }
      socket.emit('delete-message', { id });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  function toggleMute() {
    soundManager.initContext();
    soundManager.requestPermission();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }

  function formatTimestamp(createdAt) {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatDaySeparator(dateStr) {
    const now = new Date();
    const day = new Date(dateStr);
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());

    const diffDays = Math.round((nowMidnight - dayMidnight) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return day.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const currentReceiverObj = allUsers.find(u => u._id === receiver);
  const isReceiverOnline = onlineUsers.some(u => u._id === receiver);
  const isReceiverTyping = !!typingUsers?.[receiver];
  const currentChatStatus = getChatStatus(receiver);

  const totalUnreadCount = Object.values(unreadCounts).reduce((acc, count) => acc + (count || 0), 0);

  // Filter messages by chat search
  const filteredMessages = chatSearchQuery.trim()
    ? messages.filter(m => m.text.toLowerCase().includes(chatSearchQuery.toLowerCase()))
    : messages;

  // Split users into Friends (accepted/connected) and Others
  const baseUsers = allUsers
    .filter(u => u._id !== currentUser._id)
    .filter(u => u.username.toLowerCase().includes(userSearchQuery.toLowerCase()));

  const friendUsers = baseUsers
    .filter(u => {
      const status = getChatStatus(u._id);
      return status === 'accepted';
    })
    .sort((a, b) => {
      const aTime = new Date(lastActivityMap[a._id] || 0).getTime();
      const bTime = new Date(lastActivityMap[b._id] || 0).getTime();
      if (aTime !== bTime) {
        return bTime - aTime;
      }

      const aUnread = unreadCounts[a._id] || 0;
      const bUnread = unreadCounts[b._id] || 0;
      if (aUnread !== bUnread) {
        return bUnread - aUnread;
      }

      const aOnline = onlineUsers.some(ou => ou._id === a._id) ? 1 : 0;
      const bOnline = onlineUsers.some(ou => ou._id === b._id) ? 1 : 0;
      return bOnline - aOnline;
    });

  const otherUsers = baseUsers
    .filter(u => {
      const status = getChatStatus(u._id);
      return status !== 'accepted';
    })
    .sort((a, b) => {
      // Pending/received requests float to top
      const aStatus = getChatStatus(a._id);
      const bStatus = getChatStatus(b._id);
      const aHasReq = aStatus?.type === 'pending' || aStatus?.type === 'received' ? 1 : 0;
      const bHasReq = bStatus?.type === 'pending' || bStatus?.type === 'received' ? 1 : 0;
      if (bHasReq !== aHasReq) return bHasReq - aHasReq;
      // Then online first
      const aOnline = onlineUsers.some(ou => ou._id === a._id) ? 1 : 0;
      const bOnline = onlineUsers.some(ou => ou._id === b._id) ? 1 : 0;
      return bOnline - aOnline;
    });


  return (
    <div className="chat-container">
      {/* NAVBAR */}
      <nav className="chat-navbar" style={{ display: isMobile && isMobileChatOpen ? 'none' : 'flex' }}>

        <div className="chat-logo">
          <div className="chat-app-icon">
            <img src="/chat.png" alt="Convo" className="brand-logo-img" />
          </div>
          <span className="chat-app-title">Convo</span>
        </div>

        <div className="navbar-right-actions">
          {/* User Profile Badge Button */}
          <div
            className="user-profile-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowProfileModal(true)}
            title="Edit Profile"
          >
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="avatar" className="avatar-circle" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="avatar-circle" style={{ background: getUserGradient(currentUser.username) }}>
                {getUserInitials(currentUser.username)}
              </div>
            )}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{currentUser.username}</span>
            <Settings size={14} color="var(--text-muted)" style={{ marginLeft: 2 }} />
          </div>

          {notifPermission === 'default' && (
            <button
              className="nav-icon-btn highlight-bell"
              onClick={async () => {
                const perm = await soundManager.requestPermission();
                setNotifPermission(perm);
              }}
              title="Click to enable browser notifications"
            >
              <Bell size={18} color="#f59e0b" />
            </button>
          )}

          <button className="nav-icon-btn" onClick={toggleMute} title={isMuted ? 'Unmute sounds' : 'Mute sounds'}>
            {isMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} />}
          </button>

          <button className="nav-icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </button>

          <button className="logout-button" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* CHAT BODY */}
      <div className="chat-body">
        {/* SIDEBAR - USER LIST */}
        <div
          className="user-list-sidebar"
          style={{ display: isMobile && isMobileChatOpen ? 'none' : 'flex' }}
        >
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <h2 className="sidebar-title">Chats</h2>
            </div>

            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search people..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
              />
              <Search size={16} className="search-icon" />
              {userSearchQuery && (
                <button className="clear-search-btn" onClick={() => setUserSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="users-scroll-area">

            {/* ── FRIENDS SECTION ── */}
            <div className="sidebar-section-label">
              <span>Friends</span>
              <span className="sidebar-section-count">{friendUsers.length}</span>
            </div>

            {friendUsers.length === 0 ? (
              <div className="sidebar-empty-state">
                No friends yet. Send a chat request below!
              </div>
            ) : (
              friendUsers.map(u => {
                const isOnline = onlineUsers.some(ou => ou._id === u._id);
                const unreadCount = unreadCounts[u._id?.toString()] || 0;
                const isTyping = !!typingUsers?.[u._id];
                const isSelected = receiver === u._id;


                return (
                  <motion.div
                    key={u._id}
                    className={`user-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => fetchMessages(u._id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="user-item-left">
                      <div
                        className="avatar-wrapper"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setViewingAvatar(u); }}
                        title={`View ${u.username}'s photo`}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" className="avatar-circle lg" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar-circle lg" style={{ background: getUserGradient(u.username) }}>
                            {getUserInitials(u.username)}
                          </div>
                        )}
                        {isOnline && <div className="online-dot" />}
                      </div>

                      <div className="user-info-text">
                        <span className="user-name-text">{u.username}</span>
                        {isTyping ? (
                          <span className="user-status-text typing-indicator-text">typing...</span>
                        ) : (
                          <span className="user-status-text">
                            {u.bio || (isOnline ? 'Online' : 'Offline')}
                          </span>
                        )}
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount}</span>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* ── ALL USERS SECTION ── */}
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>
              <span>People</span>
              <span className="sidebar-section-count">{otherUsers.length}</span>
            </div>

            {otherUsers.length === 0 && userSearchQuery ? (
              <div className="sidebar-empty-state">No users found.</div>
            ) : (
              otherUsers.map(u => {
                const isOnline = onlineUsers.some(ou => ou._id === u._id);
                const unreadCount = unreadCounts[u._id?.toString()] || 0;
                const isSelected = receiver === u._id;
                const uStatus = getChatStatus(u._id);

                return (
                  <motion.div
                    key={u._id}
                    className={`user-item-card ${isSelected ? 'selected' : ''} other-user`}
                    onClick={() => fetchMessages(u._id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="user-item-left">
                      <div
                        className="avatar-wrapper"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setViewingAvatar(u); }}
                        title={`View ${u.username}'s photo`}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" className="avatar-circle lg" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar-circle lg" style={{ background: getUserGradient(u.username) }}>
                            {getUserInitials(u.username)}
                          </div>
                        )}
                        {isOnline && <div className="online-dot" />}
                      </div>

                      <div className="user-info-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="user-name-text">{u.username}</span>
                          {uStatus?.type === 'pending' && <span className="status-tag pending">Pending</span>}
                          {uStatus?.type === 'received' && <span className="status-tag received">Request</span>}
                        </div>
                        <span className="user-status-text">
                          {u.bio || (isOnline ? 'Online' : 'Offline')}
                        </span>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount}</span>
                    )}
                  </motion.div>
                );
              })
            )}

          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div
          className="chat-area"
          style={{ display: !isMobile || isMobileChatOpen ? 'flex' : 'none' }}
        >
          {receiver ? (
            <>
              {/* CHAT HEADER */}
              <div className="chat-header">
                <div className="chat-header-user">
                  {isMobile && (
                    <button
                      className="nav-icon-btn"
                      style={{ position: 'relative' }}
                      onClick={() => {
                        setIsMobileChatOpen(false);
                        setReceiver(null);
                      }}
                      title="Back to User List"
                    >
                      <ArrowLeft size={20} />
                      {totalUnreadCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -3,
                            right: -3,
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            padding: '2px 5px',
                            minWidth: '16px',
                            textAlign: 'center',
                            lineHeight: 1,
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                          }}
                        >
                          {totalUnreadCount}
                        </span>
                      )}
                    </button>
                  )}
                  <div
                    className="avatar-wrapper"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setViewingAvatar(currentReceiverObj)}
                    title={`View ${currentReceiverObj?.username}'s photo`}
                  >
                    {currentReceiverObj?.avatar ? (
                      <img src={currentReceiverObj.avatar} alt="avatar" className="avatar-circle" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div
                        className="avatar-circle"
                        style={{ background: getUserGradient(currentReceiverObj?.username) }}
                      >
                        {getUserInitials(currentReceiverObj?.username)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="chat-header-name">{currentReceiverObj?.username}</div>
                    <div className="chat-header-status">
                      {isReceiverOnline && <span className="status-pulse-dot" />}
                      {isReceiverTyping
                        ? 'typing...'
                        : currentReceiverObj?.bio || (isReceiverOnline ? 'Online' : 'Offline')}
                    </div>
                  </div>
                </div>

                {currentChatStatus === 'accepted' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {showChatSearch ? (
                      <div className="inchat-search-bar">
                        <Search size={14} color="var(--text-muted)" />
                        <input
                          type="text"
                          placeholder="Search in chat..."
                          value={chatSearchQuery}
                          onChange={e => setChatSearchQuery(e.target.value)}
                          autoFocus
                        />
                        <button
                          className="clear-search-btn"
                          onClick={() => {
                            setShowChatSearch(false);
                            setChatSearchQuery('');
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="nav-icon-btn"
                        onClick={() => setShowChatSearch(true)}
                        title="Search messages"
                      >
                        <Search size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CHAT CONTENT BASED ON CHAT REQUEST STATUS */}
              {currentChatStatus === 'accepted' ? (
                <>
                  {/* MESSAGES STREAM */}
                  <div id="chat-box" ref={chatBoxRef} className="chat-box-stream">
                    {filteredMessages.length === 0 ? (
                      <div className="empty-chat-state">
                        <div className="empty-icon-circle">
                          <MessageSquare size={32} />
                        </div>
                        <p>No messages yet. Say hello to {currentReceiverObj?.username}!</p>
                      </div>
                    ) : (
                      (() => {
                        let lastMessageDate = null;
                        return filteredMessages.map((msg, i) => {
                          const msgDateStr = new Date(msg.createdAt).toDateString();
                          let showSeparator = false;
                          if (lastMessageDate !== msgDateStr) {
                            showSeparator = true;
                            lastMessageDate = msgDateStr;
                          }

                          const isSender = msg.sender === currentUser._id;

                          return (
                            <React.Fragment key={msg._id || i}>
                              {showSeparator && (
                                <div className="day-separator">
                                  {formatDaySeparator(msg.createdAt)}
                                </div>
                              )}

                              <motion.div
                                className={`message-row ${isSender ? 'sender' : 'receiver'}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div
                                  className={`message-bubble ${isSender ? 'sender' : 'receiver'}`}
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
                                >


                                  {editingMessageId === msg._id ? (
                                    <EditMessage
                                      initialText={msg.text}
                                      onSave={(newText) => handleUpdateMessage(msg._id, newText)}
                                      onCancel={() => setEditingMessageId(null)}
                                    />
                                  ) : (
                                    <>
                                      {msg.text && <p className="message-text">{msg.text}</p>}

                                      {/* Voice Note Audio Player */}
                                      {msg.file && (msg.fileType?.includes('audio') || msg.fileName?.endsWith('.webm')) && (
                                        <VoicePlayer src={msg.file} />
                                      )}

                                      {/* Image File Attachment */}
                                      {msg.file && msg.fileType?.startsWith('image') && (
                                        <img
                                          src={msg.file}
                                          alt="attachment"
                                          className="chat-media-img"
                                          onClick={() => setPreviewImage({ url: msg.file, name: msg.fileName })}
                                        />
                                      )}

                                      {/* General File Attachment */}
                                      {msg.file && !msg.fileType?.startsWith('image') && !msg.fileType?.includes('audio') && !msg.fileName?.endsWith('.webm') && (
                                        <div
                                          className="message-file-card"
                                          onClick={() => window.open(msg.file, '_blank')}
                                        >
                                          <Paperclip size={20} color={isSender ? '#fff' : 'var(--accent-primary)'} />
                                          <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {msg.fileName || 'Attachment'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                              {(msg.fileSize / 1024).toFixed(1)} KB
                                            </div>
                                          </div>
                                          <Download size={16} />
                                        </div>
                                      )}

                                      <div className="message-meta">
                                        <span>{formatTimestamp(msg.createdAt)}</span>
                                        {isSender && (() => {
                                          const isSeen = msg.seenBy?.includes(receiver);
                                          const isDelivered = isSeen || msg.deliveredTo?.includes(receiver);

                                          if (isSeen) {
                                            return (
                                              <CheckCheck
                                                size={15}
                                                color="#ff7b00"
                                                style={{ filter: 'drop-shadow(0 0 2px rgba(255, 123, 0, 0.9))' }}
                                                title="Seen"
                                              />
                                            );
                                          } else if (isDelivered) {
                                            return <CheckCheck size={15} color="rgba(255, 255, 255, 0.7)" title="Delivered" />;
                                          } else {
                                            return <Check size={15} color="rgba(255, 255, 255, 0.7)" title="Sent" />;
                                          }
                                        })()}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            </React.Fragment>
                          );
                        });
                      })()
                    )}
                  </div>

                  {/* CHAT INPUT AREA */}
                  <div className="chat-input-wrapper">
                    {file && (
                      <div className="selected-file-banner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Paperclip size={16} color="var(--accent-primary)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{file.name}</span>
                        </div>
                        <button className="clear-search-btn" onClick={() => setFile(null)}>
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <div className="input-controls-row">
                      <button
                        className="input-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        title="Add Emoji"
                      >
                        <Smile size={20} />
                      </button>

                      <label htmlFor="file-upload" className="input-icon-btn" title="Attach file">
                        <Paperclip size={20} />
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const selected = e.target.files[0];
                          if (selected) {
                            setFile({
                              raw: selected,
                              name: selected.name,
                              size: selected.size,
                              type: selected.type
                            });
                          }
                        }}
                      />

                      {/* Microphone / Voice Recorder Button */}
                      <button
                        className={`input-icon-btn ${isRecording ? 'recording' : ''}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? `Recording... (${recordingTime}s) Click to send` : 'Record voice note'}
                      >
                        {isRecording ? <Square size={18} /> : <Mic size={20} />}
                      </button>

                      <input
                        type="text"
                        className="chat-text-input"
                        placeholder={isRecording ? `Recording voice note (${recordingTime}s)...` : 'Type a message...'}
                        value={message}
                        disabled={isRecording}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMessage(val);
                          handleTyping(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />

                      <button
                        className="send-msg-btn"
                        disabled={(!message.trim() && !file) || isRecording}
                        onClick={() => sendMessage()}
                        title="Send message"
                      >
                        <Send size={18} />
                      </button>
                    </div>

                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker
                          onSelectEmoji={(emoji) => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : currentChatStatus?.type === 'received' ? (
                /* RECEIVED REQUEST CARD */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <motion.div
                    className="chat-request-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="chat-request-avatar-group">
                      {currentReceiverObj?.avatar ? (
                        <img src={currentReceiverObj.avatar} alt="avatar" className="avatar-circle lg" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar-circle lg" style={{ background: getUserGradient(currentReceiverObj?.username) }}>
                          {getUserInitials(currentReceiverObj?.username)}
                        </div>
                      )}
                    </div>
                    <h3 className="chat-request-title">{currentReceiverObj?.username} sent you a chat request</h3>
                    <p className="chat-request-desc">
                      Accept this chat request to connect and start messaging with {currentReceiverObj?.username}.
                    </p>
                    <div className="chat-request-actions">
                      <button
                        className="request-btn accept"
                        onClick={() => handleRespondChatRequest(currentChatStatus.request._id, 'accept')}
                      >
                        <UserCheck size={18} /> Accept Request
                      </button>
                      <button
                        className="request-btn decline"
                        onClick={() => handleRespondChatRequest(currentChatStatus.request._id, 'decline')}
                      >
                        <UserX size={18} /> Decline
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : currentChatStatus?.type === 'pending' ? (
                /* PENDING REQUEST CARD */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <motion.div
                    className="chat-request-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="chat-request-avatar-group">
                      {currentReceiverObj?.avatar ? (
                        <img src={currentReceiverObj.avatar} alt="avatar" className="avatar-circle lg" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar-circle lg" style={{ background: getUserGradient(currentReceiverObj?.username) }}>
                          {getUserInitials(currentReceiverObj?.username)}
                        </div>
                      )}
                    </div>
                    <h3 className="chat-request-title">Chat Request Pending</h3>
                    <p className="chat-request-desc">
                      Your chat request to {currentReceiverObj?.username} has been sent. Messaging will be enabled once they accept your request.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Clock size={16} /> Pending approval from {currentReceiverObj?.username}
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* NO REQUEST YET - SEND REQUEST CARD */
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <motion.div
                    className="chat-request-card"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="chat-request-avatar-group">
                      {currentReceiverObj?.avatar ? (
                        <img src={currentReceiverObj.avatar} alt="avatar" className="avatar-circle lg" style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar-circle lg" style={{ background: getUserGradient(currentReceiverObj?.username) }}>
                          {getUserInitials(currentReceiverObj?.username)}
                        </div>
                      )}
                    </div>
                    <h3 className="chat-request-title">Start a conversation with {currentReceiverObj?.username}</h3>
                    <p className="chat-request-desc">
                      You haven't chatted with {currentReceiverObj?.username} before. Send a chat request to connect and start messaging.
                    </p>
                    <div className="chat-request-actions">
                      <button
                        className="request-btn primary"
                        onClick={() => handleSendChatRequest(receiver)}
                      >
                        <UserPlus size={18} /> Send Chat Request
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-chat-state">
              <div className="empty-icon-circle">
                <MessageSquare size={40} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Select a conversation</h3>
              <p style={{ margin: 0 }}>Choose a user from the sidebar to start messaging in real-time.</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onUpdateUser={handleProfileUpdated}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="modal-backdrop">
          <motion.div
            className="modal-dialog"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 style={{ margin: '0 0 12px 0' }}>Confirm Logout</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Are you sure you want to sign out of Convo?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                className="auth-submit-btn"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                Yes, Logout
              </button>
              <button
                className="logout-button"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu.visible && (
        <div
          className="context-menu-popover"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.isFileMessage && (
            <div
              className="context-menu-item"
              onClick={() => {
                const msg = messages.find(m => m._id === contextMenu.messageId);
                if (msg) setEditingMessageId(msg._id);
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <Edit2 size={14} /> Edit
            </div>
          )}
          <div
            className="context-menu-item danger"
            onClick={() => {
              handleDeleteMessage(contextMenu.messageId);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            <Trash2 size={14} /> Delete
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX MODAL */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              className="nav-icon-btn"
              style={{ position: 'absolute', top: -45, right: 0 }}
              onClick={() => setPreviewImage(null)}
            >
              <X size={20} />
            </button>
            <img
              src={previewImage.url}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* PROFILE PHOTO VIEWER */}
      {viewingAvatar && (
        <AvatarViewer
          user={viewingAvatar}
          onClose={() => setViewingAvatar(null)}
        />
      )}

    </div>
  );
}

export default Chat;
