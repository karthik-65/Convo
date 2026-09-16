import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

// Inactivity session expiration: 7 days by default (configurable)
const INACTIVITY_DAYS = parseInt(process.env.REACT_APP_SESSION_INACTIVITY_DAYS || '7', 10);
const INACTIVITY_MS = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const lastActive = localStorage.getItem('last_active_time');

      if (!token || !savedUser) {
        return null;
      }

      // Check if user has been inactive for many days
      if (lastActive) {
        const elapsed = Date.now() - Number(lastActive);
        if (elapsed > INACTIVITY_MS) {
          sessionStorage.setItem(
            'session_expired_message',
            `Your session expired because you haven't been active for ${INACTIVITY_DAYS} days. Please log in again.`
          );
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('last_active_time');
          return null;
        }
      }

      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem('last_active_time', Date.now().toString());
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing saved user from localStorage:', e);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('last_active_time');
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
  };

  // Track active user interaction and check inactivity periodically
  useEffect(() => {
    if (!user) return;

    let lastUpdated = Date.now();
    const updateActivity = () => {
      const now = Date.now();
      // Throttle updates to once every minute to reduce localStorage writes
      if (now - lastUpdated > 60 * 1000) {
        lastUpdated = now;
        localStorage.setItem('last_active_time', now.toString());
      }
    };

    // Periodic check in case tab remains open for many days without activity
    const checkInterval = setInterval(() => {
      const lastActive = localStorage.getItem('last_active_time');
      if (lastActive && Date.now() - Number(lastActive) > INACTIVITY_MS) {
        sessionStorage.setItem(
          'session_expired_message',
          `Your session expired because you haven't been active for ${INACTIVITY_DAYS} days. Please log in again.`
        );
        handleLogout();
      }
    }, 60 * 1000);

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];
    events.forEach(ev => window.addEventListener(ev, updateActivity, { passive: true }));

    return () => {
      clearInterval(checkInterval);
      events.forEach(ev => window.removeEventListener(ev, updateActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Chat onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={!user ? <Login setUser={setUser} /> : <Navigate to="/" replace />}
      />
      <Route
        path="/register"
        element={!user ? <Register setUser={setUser} /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
