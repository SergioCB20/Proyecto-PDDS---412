import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function HomePage() {
  const rol = auth.getRol();

  if (!rol) {
    redirect('/login');
  }

  switch (rol) {
    case 'ADMINISTRADOR':
      redirect('/admin');
    case 'OPERADOR_LOGISTICO':
      redirect('/operacion');
    case 'ANALISTA':
      redirect('/simulacion');
    default:
      redirect('/login');
  }
}