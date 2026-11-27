import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });
const target = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
  throw new Error("Solo se pueden crear estas credenciales en la base local.");
}
const credentialsPath = resolve(".local/admin-credentials.json");
const credentials = existsSync(credentialsPath)
  ? JSON.parse(readFileSync(credentialsPath, "utf8"))
  : { email: "admin@escuelitas.test", password: `Futbol!${randomBytes(9).toString("base64url")}` };
const passwordHash = await bcrypt.hash(credentials.password, 12);
const sql = postgres(target.href, { max: 1, connect_timeout: 5 });
try {
  await sql.begin(async (tx) => {
    const existing = await tx.unsafe("select id, password_hash from users where email = $1", [credentials.email]);
    let userId = existing[0]?.id;
    if (userId) {
      if (!existing[0].password_hash || !await bcrypt.compare(credentials.password, existing[0].password_hash)) {
        throw new Error("Esta cuenta ya existe con otra contraseña. No se modificó su acceso.");
      }
    } else {
      userId = randomUUID();
      await tx.unsafe("insert into users (id, name, email, email_verified, password_hash) values ($1, $2, $3, now(), $4)", [userId, "Admin Local", credentials.email, passwordHash]);
    }
    const schools = await tx.unsafe("select id from schools where slug = $1", ["escuelita-demo-local"]);
    const schoolId = schools[0]?.id ?? randomUUID();
    if (!schools.length) {
      await tx.unsafe("insert into schools (id, name, slug) values ($1, $2, $3)", [schoolId, "Escuelita Demo", "escuelita-demo-local"]);
    }
    const memberships = await tx.unsafe("select role from memberships where user_id = $1 and school_id = $2", [userId, schoolId]);
    if (!memberships.length) {
      await tx.unsafe("insert into memberships (id, user_id, school_id, role) values ($1, $2, $3, 'owner')", [randomUUID(), userId, schoolId]);
    } else if (memberships[0].role !== "owner") {
      throw new Error("La cuenta ya tiene otro rol; no se modificaron sus permisos.");
    }
  });
  mkdirSync(resolve(".local"), { recursive: true });
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ ...credentials, role: "owner", school: "Escuelita Demo", login: "http://localhost:3000/login" }, null, 2));
} finally {
  await sql.end();
}
