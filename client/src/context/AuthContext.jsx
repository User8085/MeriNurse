import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('medivault_token');
    const savedUser = localStorage.getItem('medivault_user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Verify token is still valid
        const res = await authAPI.getProfile();
        setUser(res.data.data);
        localStorage.setItem('medivault_user', JSON.stringify(res.data.data));
      } catch {
        localStorage.removeItem('medivault_token');
        localStorage.removeItem('medivault_user');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      const { token, user: userData } = res.data.data;
      localStorage.setItem('medivault_token', token);
      localStorage.setItem('medivault_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (formData) => {
    setError(null);
    try {
      const res = await authAPI.register(formData);
      const { token, user: userData } = res.data.data;
      localStorage.setItem('medivault_token', token);
      localStorage.setItem('medivault_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('medivault_token');
    localStorage.removeItem('medivault_user');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
    localStorage.setItem('medivault_user', JSON.stringify({ ...user, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
