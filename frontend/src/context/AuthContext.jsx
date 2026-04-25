import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, getProfile } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem('sf_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await getMe();
      setUser(data);
      try {
        const profileRes = await getProfile();
        setProfile(profileRes.data.profile);
      } catch (e) { /* profile may not exist yet */ }
    } catch {
      localStorage.removeItem('sf_token');
    }
    setLoading(false);
  };

  useEffect(() => { loadUser(); }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('sf_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sf_token');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const { data } = await getProfile();
      setProfile(data.profile);
      if (data.user) setUser(data.user);
    } catch (e) { console.error('Failed to refresh profile'); }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginUser, logout, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
