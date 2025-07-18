import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';
import { useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const validateUsername = (name) => {
    const regex = /^[A-Za-z][A-Za-z0-9]*$/;
    return regex.test(name);
  };

  const validatePassword = (pwd) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@#$*!])[A-Za-z\d@#$*!]{8,}$/;
    return regex.test(pwd);
  };

  const handleRegister = async () => {
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

    try {
      await axios.post(`${process.env.REACT_APP_API_BASE}/auth/register`, {
        username,
        email,
        password,
      });

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';

      if (message.toLowerCase().includes('username')) {
        setUsernameError('Username already exists');
      } else if (message.toLowerCase().includes('email')) {
        setEmailError('Email already exists');
      } else {
        setGeneralError(message);
      }
    }
  };

  return (
    <div className="page-wrapper">
    <div className="register-container">
      <h2>Register</h2>

      <label>Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={16}
        className={`register-input ${usernameError ? 'error' : ''}`}
        placeholder="Username"
      />
      <div className="error-text" style={{ visibility: usernameError ? 'visible' : 'hidden' }}>
        {usernameError || 'placeholder'}
      </div>

      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`register-input ${emailError ? 'error' : ''}`}
        placeholder="Email"
      />
      <div className="error-text" style={{ visibility: emailError ? 'visible' : 'hidden' }}>
        {emailError || 'placeholder'}
      </div>

      <label>Password</label>
      <div className="password-wrapper">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`register-input ${passwordError ? 'error' : ''}`}
          placeholder="Enter Password"
        />
        <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </span>
      </div>
      <div className="password-description">
        Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character (@, #, $, *, !).
      </div>
      <div className="error-text" style={{ visibility: passwordError ? 'visible' : 'hidden' }}>
        {passwordError || 'placeholder'}
      </div>

      <label>Confirm Password</label>
      <div className="password-wrapper">
        <input
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`register-input ${confirmPasswordError ? 'error' : ''}`}
          placeholder="Confirm Password"
        />
        <span
          className="toggle-password"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
        </span>
      </div>
      <div className="error-text" style={{ visibility: confirmPasswordError ? 'visible' : 'hidden' }}>
        {confirmPasswordError || 'placeholder'}
      </div>

      <div className="error-text" style={{ visibility: generalError ? 'visible' : 'hidden' }}>
        {generalError || 'placeholder'}
      </div>

      <button onClick={handleRegister} className="register-button">
        Register
      </button>

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 512 512"
              >
                <circle cx="256" cy="256" r="256" fill="#00C000" />
                <path
                  d="M378.305 164.736c10.033 10.033 10.033 26.29 0 36.323L229.013 350.352c-10.033 10.033-26.29 10.033-36.323 0l-72.995-72.995c-10.033-10.033-10.033-26.29 0-36.323s26.29-10.033 36.323 0l54.834 54.834L341.982 164.736c10.033-10.033 26.29-10.033 36.323 0z"
                  fill="#fff"
                />
              </svg>
              Registration Successful!
            </h3>
            <p>Redirecting to login...</p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default Register;
