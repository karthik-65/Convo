import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5000/api',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = token;
      localStorage.setItem('last_active_time', Date.now().toString());
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const token = localStorage.getItem('token');
    if (token) {
      localStorage.setItem('last_active_time', Date.now().toString());
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const code = error.response.data?.code;
      const message = error.response.data?.message;

      if (code === 'SESSION_EXPIRED_INACTIVE') {
        sessionStorage.setItem('session_expired_message', message || 'Your session expired because you have not been active for multiple days. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_active_time');
        window.location.href = '/login';
      } else if (code === 'LOGGED_IN_ELSEWHERE') {
        sessionStorage.setItem('session_expired_message', 'You have been logged out because your account was accessed on another device.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_active_time');
        window.location.href = '/login';
      } else if (code === 'TOKEN_EXPIRED') {
        sessionStorage.setItem('session_expired_message', 'Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('last_active_time');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
