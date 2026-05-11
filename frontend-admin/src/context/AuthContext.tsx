import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import authService from '../services/authService';
import type { User } from '../types/models';
import { clearAuthStorage, getCookie } from '../utils/cookies';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    const token = getCookie('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    const me = await authService.getMe();
    setUser(me);
    setLoading(false);
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = (u: User) => setUser(u);

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearAuthStorage();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
