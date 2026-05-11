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

export function parseJwtFromCookie(cookieValue: string): { rol: string | null; [key: string]: unknown } {
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 3) return { rol: null };
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { rol?: string; [key: string]: unknown };
    return { rol: parsed.rol ?? null, ...parsed };
  } catch {
    return { rol: null };
  }
}