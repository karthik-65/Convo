import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        email,
        password,
      });

      // Show success modal
      setShowSuccessModal(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';

      if (message.toLowerCase().includes('username')) {
        setUsernameError('Username already exists');
      }
      if (message.toLowerCase().includes('email')) {
        setEmailError('Email already exists');
      }
      if (!message.toLowerCase().includes('username') && !message.toLowerCase().includes('email')) {
        setGeneralError(message);
      }
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>

      <label>Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className={`register-input ${usernameError ? 'error' : ''}`}
        placeholder="Username"
      />
      {usernameError && <div className="error-text">{usernameError}</div>}

      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`register-input ${emailError ? 'error' : ''}`}
        placeholder="Email"
      />
      {emailError && <div className="error-text">{emailError}</div>}

      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={`register-input ${passwordError ? 'error' : ''}`}
        placeholder="Password"
      />

      <label>Confirm Password</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={`register-input ${passwordError ? 'error' : ''}`}
        placeholder="Confirm Password"
      />
      {passwordError && <div className="error-text">{passwordError}</div>}
      {generalError && <div className="error-text">{generalError}</div>}

      <button onClick={handleRegister} className="register-button">
        Register
      </button>

      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>✅ Registration Successful!</h3>
            <p>Redirecting to login...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
