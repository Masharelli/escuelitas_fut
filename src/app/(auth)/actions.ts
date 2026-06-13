"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export type ActionState = { error?: string } | undefined;

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

  // Inicia sesión automáticamente tras registrarse.
  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/onboarding",
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
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos" };
    }
    throw error;
  }
}
