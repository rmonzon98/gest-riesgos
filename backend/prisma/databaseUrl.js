function cleanEnv(value, fallback = '') {
    return String(value ?? fallback).trim().replace(/^['"]|['"]$/g, '');
}

function buildDatabaseUrl() {
    const config = buildConnectionConfig();
    const user = encodeURIComponent(config.user);
    const password = encodeURIComponent(config.password);

    return `mysql://${user}:${password}@${config.host}:${config.port}/${config.database}`;
}

function buildConnectionConfig() {
    return {
        host: cleanEnv(process.env.DB_HOST, 'localhost'),
        user: cleanEnv(process.env.DB_USER, 'root'),
        password: cleanEnv(process.env.DB_PASSWORD, ''),
        port: Number(cleanEnv(process.env.DB_PORT, '3306')),
        database: cleanEnv(process.env.DB_NAME, 'gestion_riesgos'),
        connectionLimit: Number(cleanEnv(process.env.DB_CONNECTION_LIMIT, '10'))
    };
}

module.exports = { buildDatabaseUrl, buildConnectionConfig };
