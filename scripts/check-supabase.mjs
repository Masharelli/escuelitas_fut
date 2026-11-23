import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { saveImage, hasUpload } from "../src/lib/uploads.ts";
import { config } from "dotenv";
import postgres from "postgres";
import ts from "typescript";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const image = new File([new Uint8Array([137, 80, 78, 71])], "test.png", { type: "image/png" });
let localUrl;
try {
  assert.equal(hasUpload(image), true);
  assert.equal(hasUpload(new File([], "empty.png")), false);
  assert.equal(hasUpload("text"), false);
  await assert.rejects(saveImage(new File(["bad"], "bad.svg", { type: "image/svg+xml" })), /Formato/);
  await assert.rejects(saveImage(new File([], "empty.png", { type: "image/png" })), /contenido/);
  await assert.rejects(saveImage(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })), /4 MB/);
  await assert.rejects(saveImage(image, "../escape"), /inválido/);

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  process.env.NODE_ENV = "production";
  await assert.rejects(saveImage(image), /configurar/);
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;
  localUrl = await saveImage(image, "check");
  assert.match(localUrl, /^\/uploads\/check_[\w-]+\.png$/);
  assert.deepEqual(await readFile(`public${localUrl}`), Buffer.from(await image.arrayBuffer()));
  process.env.VERCEL = "1";
  await assert.rejects(saveImage(image), /configurar/);

  process.env.SUPABASE_URL = "https://example.supabase.co/";
  await assert.rejects(saveImage(image), /configurar/);
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (url, options) => {
    assert.match(url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/images\/escudo_[\w-]+\.png$/);
    assert.equal(options.method, "POST");
    assert.equal(options.headers.apikey, "sb_secret_test");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers["Content-Type"], "image/png");
    assert.deepEqual(options.body, Buffer.from(await image.arrayBuffer()));
    return new Response("{}", { status: 200 });
  };
  assert.match(await saveImage(image, "escudo"), /^\/api\/images\/escudo_[\w-]+\.png$/);
  globalThis.fetch = async () => new Response("denied", { status: 403 });
  await assert.rejects(saveImage(image), /guardar/);
  globalThis.fetch = async () => { throw new Error("network"); };
  await assert.rejects(saveImage(image), /conectar/);
  console.log("Supabase: validación, guardado local, bloqueo en Vercel y subida verificados.");
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  if (localUrl) await rm(`public${localUrl}`);
}

if (process.argv.includes("--database")) {
  config({ path: [".env.local", ".env"], quiet: true });
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5 });
  const rollback = new Error("Verificación terminada; revertir cambios");
  try {
    await sql.begin(async (tx) => {
      const tables = Object.keys(JSON.parse(await readFile("drizzle/meta/0022_snapshot.json", "utf8")).tables).map((name) => name.split(".")[1]);
      for (const role of ["anon", "authenticated"]) {
        if (!(await tx`select 1 from pg_roles where rolname = ${role}`).length) await tx.unsafe(`create role ${role} nologin`);
      }
      await tx.unsafe(await readFile("drizzle/0023_supabase_security.sql", "utf8"));
      for (const table of tables) {
        assert.equal((await tx`select relrowsecurity from pg_class where oid = ${`public.${table}`}::regclass`)[0].relrowsecurity, true);
        for (const role of ["anon", "authenticated"]) {
          assert.equal((await tx`select has_table_privilege(${role}, ${`public.${table}`}, 'SELECT,INSERT,UPDATE,DELETE') as allowed`)[0].allowed, false);
        }
      }
      await tx`select count(*) from public.users`;
      await assert.rejects(tx.savepoint(async (restricted) => {
        await restricted.unsafe("set local role anon");
        await restricted`select * from public.users`;
      }), /permission denied/);
      console.log(`Seguridad: ${tables.length} tablas con RLS; acceso API bloqueado y acceso del servidor verificado.`);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await sql.end();
  }
}

// Ejecuta el handler real con datos aislados; comprueba quién puede firmar cada imagen.
const imageCheck = { userId: null, rows: {}, signed: 0, coachTeamIds: [], invitation: null };
globalThis.imageCheck = imageCheck;
const asModule = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const fakeDb = { query: Object.fromEntries(["schools", "students", "tournaments", "memberships", "guardianships"].map((table) => [table, {
  findFirst: async ({ where }) => (imageCheck.rows[table] ?? []).find((row) => Object.entries(where).every(([column, value]) => row[column] === value)),
}])) };
imageCheck.db = fakeDb;
const deps = {
  "drizzle-orm": "export const eq=(key,value)=>({[key]:value}); export const and=(...conditions)=>Object.assign({},...conditions);",
  "@/auth": "export const auth=async()=>globalThis.imageCheck.userId?{user:{id:globalThis.imageCheck.userId}}:null;",
  "@/db": "export const db=globalThis.imageCheck.db;",
  "@/db/schema": ["schools", "students", "tournaments", "memberships", "guardianships"].map((name) => `export const ${name}=${JSON.stringify(Object.fromEntries(["id", "userId", "schoolId", "studentId", "photoUrl", "logoUrl", "resultsImageUrl"].map((key) => [key, key])))};`).join("\n"),
  "@/lib/coach": "export const getCoachTeamIds=async()=>globalThis.imageCheck.coachTeamIds;",
  "@/lib/invitations": "export const getInvitationByToken=async(token)=>globalThis.imageCheck.invitation?.token===token && globalThis.imageCheck.invitation.status==='pending'?globalThis.imageCheck.invitation:null;",
};
let handlerCode = ts.transpileModule(await readFile("src/app/api/images/[filename]/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
for (const [name, code] of Object.entries(deps)) handlerCode = handlerCode.replaceAll(`"${name}"`, JSON.stringify(asModule(code)));
const { GET } = await import(asModule(handlerCode));
const filename = "alumno_00000000-0000-4000-8000-000000000001.png";
const student = { id: "student-a", schoolId: "school-a", teamId: "team-a", photoUrl: `/api/images/${filename}` };
const savedFetch = globalThis.fetch;
const savedUrl = process.env.SUPABASE_URL;
const savedKey = process.env.SUPABASE_SECRET_KEY;
try {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (url, options) => {
    imageCheck.signed++;
    assert.match(url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/sign\/images\//);
    assert.equal(options.headers.apikey, "sb_secret_test");
    assert.equal(JSON.parse(options.body).expiresIn, 60);
    assert.equal(options.cache, "no-store");
    return Response.json({ signedURL: `/object/sign/images/${filename}?token=test` });
  };
  const check = async (expected) => {
    const before = imageCheck.signed;
    const response = await GET(new Request("https://app.example/api/images/test"), { params: Promise.resolve({ filename }) });
    assert.equal(response.status, expected);
    assert.equal(imageCheck.signed - before, expected === 307 ? 1 : 0);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  };
  imageCheck.rows = { students: [student] };
  await check(404); // Sin sesión.
  imageCheck.userId = "user-a";
  imageCheck.rows.memberships = [{ userId: "user-a", schoolId: "other-school", role: "owner" }];
  await check(404); // Administrador de otra escuela.
  imageCheck.rows.memberships = [{ userId: "other-user", schoolId: "school-a", role: "owner" }];
  await check(404); // Membresía de otra persona.
  imageCheck.rows.memberships = [{ userId: "user-a", schoolId: "school-a", role: "owner" }];
  await check(307);
  imageCheck.rows.memberships[0].role = "parent";
  await check(404); // Ser padre en la escuela no autoriza todas las fotos.
  imageCheck.rows.guardianships = [{ userId: "user-a", studentId: "other-student" }];
  await check(404);
  imageCheck.rows.guardianships[0].studentId = "student-a";
  await check(307);
  imageCheck.rows.guardianships = [];
  imageCheck.rows.memberships[0].role = "coach";
  imageCheck.coachTeamIds = ["other-team"];
  await check(404);
  imageCheck.coachTeamIds = ["team-a"];
  await check(307);
  imageCheck.userId = null;
  imageCheck.invitation = { token: "invitation-a", status: "pending", studentId: "student-a" };
  const request = new Request("https://app.example/api/images/test?invitation=invitation-a");
  assert.equal((await GET(request, { params: Promise.resolve({ filename }) })).status, 307);
  imageCheck.invitation.status = "revoked";
  assert.equal((await GET(request, { params: Promise.resolve({ filename }) })).status, 404);
  imageCheck.invitation.status = "pending";
  imageCheck.invitation.studentId = "other-student";
  assert.equal((await GET(request, { params: Promise.resolve({ filename }) })).status, 404);
  assert.equal((await GET(request, { params: Promise.resolve({ filename: "../private.png" }) })).status, 404);
  console.log("Imágenes privadas: aislamiento por escuela, tutor, equipo e invitación verificado.");
} finally {
  globalThis.fetch = savedFetch;
  if (savedUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = savedUrl;
  if (savedKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = savedKey;
  delete globalThis.imageCheck;
}
