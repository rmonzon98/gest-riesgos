import "dotenv/config";
import { defineConfig } from "prisma/config";

function cleanEnv(value: string | undefined, fallback = "") {
    return String(value ?? fallback).trim().replace(/^['"]|['"]$/g, "");
}

function buildDatabaseUrl() {
    const host = cleanEnv(process.env.DB_HOST, "localhost");
    const port = cleanEnv(process.env.DB_PORT, "3306");
    const user = encodeURIComponent(cleanEnv(process.env.DB_USER, "root"));
    const password = encodeURIComponent(cleanEnv(process.env.DB_PASSWORD, ""));
    const database = cleanEnv(process.env.DB_NAME, "gestion_riesgos");

    return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: process.env.DATABASE_URL || buildDatabaseUrl()
    }
});
