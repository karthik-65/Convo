import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login({ setUser }) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

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
      setLoginError('Invalid credentials');
    }
  };

  return (
    <div className="page-wrapper">
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>

        <label>Username or Email</label>
        <input
          type="text"
          placeholder="Email or Username"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          className={`login-input ${emailError || loginError ? 'error-input' : ''}`}
        />
        <div
          className="error-text"
          style={{ visibility: emailError ? 'visible' : 'hidden' }}
        >
          {emailError || 'placeholder'}
        </div>

        <label>Password</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`login-input ${passwordError || loginError ? 'error-input' : ''}`}
        />
        <div
          className="error-text"
          style={{ visibility: passwordError ? 'visible' : 'hidden' }}
        >
          {passwordError || 'placeholder'}
        </div>

        <div
          className="error-text"
          style={{ visibility: loginError ? 'visible' : 'hidden' }}
        >
          {loginError || 'placeholder'}
        </div>

        <button type="submit" className="login-button">Login</button>

        <p className="register-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
    </div>
  );
}

export default Login;
