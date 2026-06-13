import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Configuración base, segura para el runtime "edge" (middleware).
 * No incluye el adaptador de base de datos ni el proveedor de credenciales,
 * que requieren Node.js — esos viven en `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    // Solo se activa si las variables de entorno están presentes.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    // Protege rutas privadas. Las rutas bajo /admin y /padres requieren sesión.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isProtected =
        path.startsWith("/admin") || path.startsWith("/padres");

      if (isProtected) return isLoggedIn;

      // Si ya inició sesión y va a /login o /registro, lo mandamos al inicio.
      if (isLoggedIn && (path === "/login" || path === "/registro")) {
        return Response.redirect(new URL("/", nextUrl.origin));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
