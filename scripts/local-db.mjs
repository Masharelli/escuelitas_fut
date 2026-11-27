import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });
const target = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) {
  throw new Error("db:local solo admite una base de datos en este equipo.");
}
const probe = postgres(target.href, { max: 1, connect_timeout: 3 });
let available = false;
try {
  await probe.unsafe("select 1");
  available = true;
} catch (error) {
  if (error.code !== "ECONNREFUSED" && error.code !== "3D000") throw error;
} finally {
  await probe.end();
}
if (available) {
  console.log("La base local ya está disponible.");
  process.exit(0);
}
const runtime = resolve(".local/postgres-runtime/node_modules/embedded-postgres/dist/index.js");
if (!existsSync(runtime)) {
  throw new Error("Instala el runtime local: npm.cmd install --prefix .local/postgres-runtime --no-audit --no-fund --ignore-scripts --save-exact embedded-postgres@16.16.0-beta.19");
}
const { default: EmbeddedPostgres } = await import(pathToFileURL(runtime).href);
const dataDir = resolve(".local/postgres-data");
const database = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(target.username),
  password: decodeURIComponent(target.password),
  port: Number(target.port || 5432),
  authMethod: "scram-sha-256",
  persistent: true,
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "localhost"],
});
if (!existsSync(resolve(dataDir, "PG_VERSION"))) await database.initialise();
await database.start();
const client = database.getPgClient("postgres", target.hostname);
await client.connect();
const name = decodeURIComponent(target.pathname.slice(1));
try {
  const found = await client.query("select 1 from pg_database where datname = $1", [name]);
  if (!found.rowCount) await database.createDatabase(name);
} finally {
  await client.end();
}
console.log(`Base local lista en ${target.hostname}:${target.port || 5432}/${name}. Conserva esta terminal abierta.`);
await new Promise(() => {});
