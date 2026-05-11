'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { LoginRequest, LoginResponse } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginRequest>({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>('/auth/login', form);
      auth.setToken(res.token);
      auth.setUser(res.usuario);

      switch (res.usuario.rol) {
        case 'ADMINISTRADOR':
          router.push('/admin');
          break;
        case 'OPERADOR_LOGISTICO':
          router.push('/operacion');
          break;
        case 'ANALISTA':
          router.push('/simulacion');
          break;
        default:
          router.push('/');
      }
    } catch (err: unknown) {
      const apiErr = err as { mensaje?: string; status?: number };
      setError(apiErr.mensaje || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Plane size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TAS FB2B</h1>
          <p className="text-slate-400 text-sm mt-1">Gestion Logistica de Equipaje</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-5">
            Iniciar Sesion
          </h2>

          {typeof error === 'string' && error ? (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo"
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              required
              autoComplete="email"
            />
            <Input
              label="Contrasena"
              type="password"
              placeholder="********"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Sistema de gestion logistica de equipaje aereo
        </p>
      </div>
    </div>
  );
}