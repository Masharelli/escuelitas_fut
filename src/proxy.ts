import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 usa la convención "proxy" (antes "middleware").
// Corre en el runtime edge: usa solo `authConfig` (sin DB ni credenciales).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Corre en todas las rutas excepto assets estáticos y la API de Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
