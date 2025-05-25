import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:5007/api'
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