import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseJwtFromCookie } from "@/lib/auth";

const BASE_PATH = "/front";
const RUTAS_PUBLICAS = ["/login", "/health"];

const RUTAS_POR_ROL: Record<string, string[]> = {
  ADMINISTRADOR: ["/admin"],
  OPERADOR_LOGISTICO: ["/operacion"],
  ANALISTA: ["/simulacion"],
};

function stripBase(path: string) {
  return path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) || "/" : path;
}

export function proxy(request: NextRequest) {
  const pathname = stripBase(request.nextUrl.pathname);

  if (RUTAS_PUBLICAS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
  }

  const payload = parseJwtFromCookie(token);
  const rol = payload.rol;

  if (rol && RUTAS_POR_ROL[rol]) {
    const rutasPermitidas = RUTAS_POR_ROL[rol];
    const tieneAcceso = rutasPermitidas.some((r) => pathname.startsWith(r));
    if (!tieneAcceso) {
      const redirect = `${BASE_PATH}${rutasPermitidas[0]}` || `${BASE_PATH}/login`;
      return NextResponse.redirect(new URL(redirect, request.url));
    }
  } else {
    return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
