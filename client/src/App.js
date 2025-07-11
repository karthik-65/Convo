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
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false); // Done checking
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login');
  };

  if (loading) return null; // Don't render routes until user is checked

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Chat onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
      <Route
        path="/login"
        element={<Login setUser={setUser} />}
      />
      <Route
        path="/register"
        element={<Register setUser={setUser} />}
      />
    </Routes>
  );
}

export default App;
