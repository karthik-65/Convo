import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5000/api',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = token;
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
