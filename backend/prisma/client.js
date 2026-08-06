const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { buildConnectionConfig, buildDatabaseUrl } = require('./databaseUrl');

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = buildDatabaseUrl();
}

const { PrismaClient } = require('../generated/prisma/client');
const adapter = new PrismaMariaDb(buildConnectionConfig(), {
    database: buildConnectionConfig().database
});

const log = process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'];

const prisma = global.__gestionRiesgosPrisma || new PrismaClient({ adapter, log });

if (process.env.NODE_ENV !== 'production') {
    global.__gestionRiesgosPrisma = prisma;
}

module.exports = prisma;
