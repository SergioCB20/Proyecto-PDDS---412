'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const rol = auth.getRol();

    if (!rol) {
      router.replace('/login');
      return;
    }

    switch (rol) {
      case 'ADMINISTRADOR':
        router.replace('/admin');
        break;
      case 'OPERADOR_LOGISTICO':
        router.replace('/operacion');
        break;
      case 'ANALISTA':
        router.replace('/simulacion');
        break;
      default:
        router.replace('/login');
    }
  }, [router]);

  return null;
}