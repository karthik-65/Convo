import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, LogIn, Sun, Moon, MessageSquare } from 'lucide-react';
import './Login.css';

function Login({ setUser }) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setEmailError('');
    setPasswordError('');
    setLoginError('');

    let isValid = true;

    if (!emailOrUsername.trim()) {
      setEmailError('Username or Email is required');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);

    try {
      const res = await axiosInstance.post('/auth/login', {
        emailOrUsername: emailOrUsername.trim(),
        password: password.trim(),
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err.response ? err.response.data : err.message);
      setLoginError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-bg-orb-1" />
      <div className="auth-bg-orb-2" />

      <button className="auth-theme-toggle" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="auth-card-header">
          <div className="auth-brand">
            <div className="auth-brand-logo">
              <img src="/chat.png" alt="Convo" className="brand-logo-img" />
            </div>
            <h1 className="auth-brand-title">Convo</h1>
          </div>
          <p className="auth-subtitle">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter username or email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className={`auth-input ${emailError || loginError ? 'error-input' : ''}`}
              />
              <User size={18} className="input-icon" />
            </div>
            <div className="field-error">{emailError}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input ${passwordError || loginError ? 'error-input' : ''}`}
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="field-error">{passwordError}</div>
          </div>

          {loginError && <div className="field-error" style={{ textAlign: 'center' }}>{loginError}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create account</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
