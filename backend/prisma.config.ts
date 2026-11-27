import "dotenv/config";
import { defineConfig } from "prisma/config";
import { buildDatabaseUrl } from "./prisma/databaseUrl.js";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL || buildDatabaseUrl(),
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined
    }
});
