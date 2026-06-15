"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type ActionState = { error?: string } | undefined;

/** Sólo permite redirigir a rutas internas (evita open-redirect). */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

const registerSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function registerUser(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { error: "Ya existe una cuenta con este correo" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.insert(users).values({
    name: parsed.data.name,
    email,
    passwordHash,
  });

  // Inicia sesión automáticamente tras registrarse. Por defecto la página de
  // inicio decide a dónde llevarlo; si viene de una invitación, vuelve a ella.
  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: safeNext(formData.get("next")),
  });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function authenticate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: formData.get("password"),
      redirectTo: safeNext(formData.get("next")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos" };
    }
    throw error;
  }
}
