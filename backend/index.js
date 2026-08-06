// index.js
require('module-alias/register');

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
require('dotenv').config();

const HOURS = 3;
const timeToken = 1000 * 60 * 60 * HOURS;
const port = process.env.SERVER_PORT || process.env.PORT || 8080;

const { DOCS_DIR } = require('./services/paths');

const corsOrigin = process.env.CORS_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';

// Si estás detrás de proxy (Nginx/ALB), habilita esto
// app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-access-token',
    'X-CSRF-Token'
  ],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cookies y sesión
app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET_KEY || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: timeToken
  }
  // store: new RedisStore({ client }), // recomendado en prod
}));

// Estáticos DEL BACKEND (NO del frontend)
app.use('/Pictures', express.static(path.join(__dirname, 'Pictures')));
app.use('/docs', express.static(DOCS_DIR));

// Healthcheck
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// Rutas general
app.use('/api/administracion-actualizados', require('./Routes/general/administracion.js'));
app.use('/api/direcciones-actualizados', require('./Routes/general/unidades.js'));
app.use('/api/responsables-actualizados', require('./Routes/general/responsables.js'));
app.use('/api/dependencias-actualizados', require('./Routes/general/dependencias.js'));

// Rutas Riesgos
app.use('/api/carga-archivos', require('./Routes/riesgos/cargaArchivos.js'));
app.use('/api/areas-actualizados', require('./Routes/riesgos/areas.js'));
app.use('/api/entidades-actualizados', require('./Routes/riesgos/entidades.js'));
app.use('/api/institucion-actualizados', require('./Routes/riesgos/institucion.js'));
app.use('/api/objetivos-actualizados', require('./Routes/riesgos/objetivos.js'));
app.use('/api/organos', require('./Routes/riesgos/organos.js'));
app.use('/api/periodos-actualizados', require('./Routes/riesgos/periodos.js'));
app.use('/api/primera-matriz-actualizados', require('./Routes/riesgos/primera-matriz.js'));
app.use('/api/reportes-actualizados', require('./Routes/riesgos/reportes.js'));
app.use('/api/riesgos-variables-actualizados', require('./Routes/riesgos/riesgosVariables.js'));
app.use('/api/roles-actualizados', require('./Routes/riesgos/roles.js'));
app.use('/api/seguimientos-actualizados', require('./Routes/riesgos/seguimientos.js'));
app.use('/api/segunda-matriz-actualizados', require('./Routes/riesgos/segunda-matriz.js'));
app.use('/api/tipo-objetivo-actualizados', require('./Routes/riesgos/tipo-objetivo.js'));
app.use('/api/viceministerios', require('./Routes/riesgos/viceministerio.js'));
app.use('/descargar', require('./Routes/riesgos/descarga-archivos.js'));

// Ruta Login
app.use('/api/login-actualizados', require('./Routes/login.js'));

// Rutas Menu aplicaciones
app.use('/api/general', require('./Routes/menu/general.js'));

// React fallback (SPA)
if (process.env.NODE_ENV !== 'production') {
  const clientBuildPath = path.resolve(__dirname, '../frontend/build');

  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  const clientBuildPath = path.resolve(__dirname, '../frontend/build');

  app.use(express.static(clientBuildPath));

  app.use((req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`running on port ${port} (CORS: ${corsOrigin})`);
});
