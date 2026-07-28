import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2, Sun, Moon, MessageSquare } from 'lucide-react';
import './Login.css'; // Shared auth styles
import './Register.css';


function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const validateUsername = (name) => {
    const regex = /^[A-Za-z][A-Za-z0-9]*$/;
    return regex.test(name);
  };

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$*!])[A-Za-z\d@#$*!]{8,}$/;
    return regex.test(pwd);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    let isValid = true;

    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.length > 16) {
      setUsernameError('Username cannot exceed 16 characters');
      isValid = false;
    } else if (!validateUsername(username)) {
      setUsernameError('Username must start with a letter and contain only letters and numbers');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Invalid email format');
        isValid = false;
      }
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError(
        'Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character (@, #, $, *, !).'
      );
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);

    try {
      await axiosInstance.post('/auth/register', {
        username,
        email,
        password,
      });


      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/login');
      }, 1800);
    } catch (err) {
      console.error('Registration Error:', err);
      const rawMessage = (err.response?.data?.message || err.message || '').toLowerCase();
      const status = err.response?.status;

      if (rawMessage.includes('username')) {
        setUsernameError('This username is already taken. Please choose another.');
      } else if (rawMessage.includes('email')) {
        setEmailError('This email is already registered. Please log in or use another email.');
      } else if (status === 500 || status === 503 || !err.response || rawMessage.includes('database') || rawMessage.includes('timeout') || rawMessage.includes('network') || rawMessage.includes('server')) {
        setGeneralError('Service temporarily unavailable. Please try again in a moment.');
      } else {
        setGeneralError('Registration failed. Please check your details and try again.');
      }
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
          <p className="auth-subtitle">Create a new account to join Convo</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                className={`auth-input ${usernameError ? 'error-input' : ''}`}
                placeholder="Choose a username"
              />
              <User size={18} className="input-icon" />
            </div>
            <div className="field-error">{usernameError}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`auth-input ${emailError ? 'error-input' : ''}`}
                placeholder="name@example.com"
              />
              <Mail size={18} className="input-icon" />
            </div>
            <div className="field-error">{emailError}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input ${passwordError ? 'error-input' : ''}`}
                placeholder="Create a strong password"
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
            <div className="password-requirements">
              Requires 8+ characters, 1 uppercase letter, 1 number, and 1 special char (@, #, $, *, !).
            </div>
            <div className="field-error">{passwordError}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`auth-input ${confirmPasswordError ? 'error-input' : ''}`}
                placeholder="Confirm your password"
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="field-error">{confirmPasswordError}</div>
          </div>

          {generalError && <div className="field-error" style={{ textAlign: 'center' }}>{generalError}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Register</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </motion.div>

      {showSuccessModal && (
        <div className="success-modal-overlay">
          <motion.div
            className="success-modal-card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="success-icon-badge">
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Registration Successful!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Redirecting you to login...</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Register;
