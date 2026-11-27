const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { buildConnectionConfig } = require('./databaseUrl');

const { PrismaClient } = require('../generated/prisma/client');
const config = buildConnectionConfig();
const adapter = new PrismaMariaDb(config, { database: config.database });

const log = process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'];

const prisma = global.__gestionRiesgosPrisma || new PrismaClient({ adapter, log });

if (process.env.NODE_ENV !== 'production') {
    global.__gestionRiesgosPrisma = prisma;
}

module.exports = prisma;
