const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { buildConnectionConfig } = require('./databaseUrl');

const { PrismaClient, Prisma } = require('../generated/prisma/client');
const { extensionHoraLocal } = require('./horaLocal');
const config = buildConnectionConfig();
const adapter = new PrismaMariaDb(config, { database: config.database });

const log = process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'];

// Los timestamps se guardan y se leen en hora local, como el resto del sistema (ver prisma/horaLocal.js).
const prisma = global.__gestionRiesgosPrisma || new PrismaClient({ adapter, log }).$extends(extensionHoraLocal(Prisma));

if (process.env.NODE_ENV !== 'production') {
    global.__gestionRiesgosPrisma = prisma;
}

module.exports = prisma;
