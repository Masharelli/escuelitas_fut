import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Carga variables desde .env.local (dev) y .env como respaldo.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
