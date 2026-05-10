import type { Usuario } from './types';

export const auth = {
  getToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}`;
  },
  clearToken: () => {
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0';
  },

  getUser: (): Usuario | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as Usuario) : null;
  },
  setUser: (user: Usuario) => localStorage.setItem('user', JSON.stringify(user)),

  getRol: () => {
    const user = auth.getUser();
    return user?.rol ?? null;
  },

  logout: () => {
    auth.clearToken();
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  isAuthenticated: () => typeof window !== 'undefined' && !!localStorage.getItem('token'),
};