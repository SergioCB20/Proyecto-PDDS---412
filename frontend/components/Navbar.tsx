'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Plane } from 'lucide-react';
import { auth } from '@/lib/auth';
import type { Usuario } from '@/lib/types';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(auth.getUser());
  }, []);

  const navLinks = [
    { href: '/admin', label: 'Administracion', rol: 'ADMINISTRADOR' as const },
    { href: '/simulacion', label: 'Simulacion', rol: 'ANALISTA' as const },
    { href: '/operacion', label: 'Operacion', rol: 'OPERADOR_LOGISTICO' as const },
  ];

  const linksVisibles = user ? navLinks.filter((l) => l.rol === user.rol) : [];

  return (
    <nav className="h-14 bg-slate-800 text-white flex items-center px-4 gap-6 shadow-md">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg">
        <Plane size={22} className="text-blue-400" />
        <span>TASF B2B</span>
      </Link>

      <div className="flex-1 flex items-center gap-1">
        {linksVisibles.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? 'bg-slate-700 text-white border-b-2 border-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">{user.nombre}</div>
            <div className="text-xs text-slate-400">{user.rol?.replace('_', ' ')}</div>
          </div>
          <button
            onClick={auth.logout}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Cerrar sesion"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </nav>
  );
}
