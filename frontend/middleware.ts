import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const RUTAS_PUBLICAS = ['/login', '/health'];

const RUTAS_POR_ROL: Record<string, string[]> = {
  ADMINISTRADOR: ['/admin'],
  OPERADOR_LOGISTICO: ['/operacion'],
  ANALISTA: ['/simulacion'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RUTAS_PUBLICAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const rol = auth.getRol();
  if (rol) {
    const rutasPermitidas = RUTAS_POR_ROL[rol] || [];
    const tieneAcceso = rutasPermitidas.some((r) => pathname.startsWith(r));
    if (!tieneAcceso) {
      const redirect = rutasPermitidas[0] || '/login';
      return NextResponse.redirect(new URL(redirect, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};