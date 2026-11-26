'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { isProtectedPath } from '@/lib/constants';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const data = await apiGet<{ user: User }>('/auth/me');
      setUser(data.user);
      return data.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      if (isProtectedPath(pathname)) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    };
    window.addEventListener('scene:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('scene:unauthorized', handleUnauthorized);
  }, [pathname, router]);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Clearing local state is still the correct outcome if the session is gone.
    }
    setUser(null);
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, setUser, logout }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
