import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import {jwtDecode} from 'jwt-decode'; // Correction d'import

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp < currentTime) {
          // Token expiré
          localStorage.removeItem('token');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Token valide => on récupère /me
          const response = await axios.get('/auth/me'); 
          // /auth/me => correspond à app.use('/api/auth') + '/me' => /api/auth/me
          setUser(response.data);
          setIsAuthenticated(true);

        }
      } catch (error) {
        console.error("Échec de la vérification d'authentification:", error);
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (phoneNumber, password) => {
    try {
      const response = await axios.post('/auth/login', { phoneNumber, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);

      return response.data;
    } catch (error) {
      console.error('Échec de la connexion:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
