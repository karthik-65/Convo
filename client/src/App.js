import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error('Error parsing saved user from localStorage:', e);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (loading) return null;

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
