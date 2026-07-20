'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plane, Monitor } from 'lucide-react';
import { device } from '@/lib/device';

export function Navbar() {
  const [deviceId] = useState(() => device.getId().slice(0, 8));

  return (
    <nav className="h-11 bg-slate-800 text-white flex items-center px-4 gap-3 shadow-md">
      <Link href="/" className="flex items-center gap-2 font-bold text-base">
        <Plane size={18} className="text-blue-400" />
        <span>TASF B2B</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Monitor size={13} />
        <span>Device: {deviceId}</span>
      </div>
    </nav>
  );
}
