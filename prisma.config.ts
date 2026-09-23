import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrations need a direct (non-pooled) connection; the app itself
    // uses the pooled DATABASE_URL via the driver adapter at runtime.
    url: env("DIRECT_URL"),
  },
});
