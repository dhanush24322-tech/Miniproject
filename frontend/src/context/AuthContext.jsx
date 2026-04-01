/**
 * Authentication context provider.
 * Manages user state, login, signup, and logout across the app.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('dr_token');
    const savedUser = localStorage.getItem('dr_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('dr_token');
        localStorage.removeItem('dr_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await client.post('auth/login', { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('dr_token', token);
    localStorage.setItem('dr_user', JSON.stringify(userData));
    setUser(userData);
    // Redirect based on role
    navigate(userData.role === 'organizer' ? '/organizer' : '/doctor');
    return userData;
  };

  const signup = async (data) => {
    const res = await client.post('auth/signup', data);
    const { token, user: userData } = res.data;
    localStorage.setItem('dr_token', token);
    localStorage.setItem('dr_user', JSON.stringify(userData));
    setUser(userData);
    navigate(userData.role === 'organizer' ? '/organizer' : '/doctor');
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('dr_token');
    localStorage.removeItem('dr_user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
