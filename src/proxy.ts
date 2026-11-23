import NextAuth from "next-auth";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";
import { authConfig } from "./auth.config";

// Next.js 16 usa la convención "proxy" (antes "middleware").
// Corre en el runtime edge: usa solo `authConfig` (sin DB ni credenciales).
const { auth } = NextAuth(authConfig);
const authenticate = auth as NextMiddleware;

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = await authenticate(request, event);
  // Una respuesta pendiente del proxy no debe restaurar la cookie tras cerrar sesión.
  if (response) response.headers.delete("set-cookie");
  return response;
}

export const config = {
  // Corre en todas las rutas excepto assets estáticos y la API de Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
