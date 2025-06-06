import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://fish-test-back.vercel.app//api'
    // baseURL: 'http://localhost:5008/api'
    // baseURL: 'https://fish-back-ff020bcec824.herokuapp.com/api'
});

instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

export default instance;