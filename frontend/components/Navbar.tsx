'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Monitor } from 'lucide-react';
import { device } from '@/lib/device';

export function Navbar() {
  const pathname = usePathname();
  const [deviceId] = useState(() => device.getId().slice(0, 8));

  const navLinks = [
    { href: '/', label: 'Dashboard' },
  ];

  return (
    <nav className="h-14 bg-slate-800 text-white flex items-center px-4 gap-6 shadow-md">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg">
        <Plane size={22} className="text-blue-400" />
        <span>TASF B2B</span>
      </Link>

      <div className="flex-1 flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'bg-slate-700 text-white border-b-2 border-blue-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Monitor size={14} />
        <span>Device: {deviceId}</span>
      </div>
    </nav>
  );
}
