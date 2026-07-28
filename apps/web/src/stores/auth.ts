import { create } from 'zustand';
import { apiRequest, setAuthToken, getAuthToken } from '@/lib/api';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      setAuthToken(res.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('embedmind_user', JSON.stringify(res.user));
      }
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await apiRequest('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Signup failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('embedmind_user');
      window.location.href = '/login';
    }
    set({ user: null, isAuthenticated: false, error: null });
  },

  initialize: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      await apiRequest('/api/v1/projects');
      const storedUser = localStorage.getItem('embedmind_user');
      if (storedUser) {
        set({ user: JSON.parse(storedUser), isAuthenticated: true, isLoading: false });
      } else {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userObj = { id: payload.sub, email: '', created_at: '' };
        set({ user: userObj, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      setAuthToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
