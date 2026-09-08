import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('gharse_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setSellerProfile(data.sellerProfile || null);
    } catch {
      localStorage.removeItem('gharse_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  function login(token, userData, sellerProfileData) {
    localStorage.setItem('gharse_token', token);
    setUser(userData);
    setSellerProfile(sellerProfileData || null);
  }

  function logout() {
    localStorage.removeItem('gharse_token');
    setUser(null);
    setSellerProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, sellerProfile, setSellerProfile, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
