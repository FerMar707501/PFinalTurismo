import app from './app.js';
import { env } from './config/env.js';
import { APP_NAME, APP_VERSION, API_PREFIX } from './config/constants.js';
import { checkDatabaseConnection, closePool } from './config/db.js';

const server = app.listen(env.PORT, () => {
  console.log(`[API] ${APP_NAME} v${APP_VERSION}`);
  console.log(`[API] Entorno: ${env.NODE_ENV}`);
  console.log(`[API] Escuchando en http://localhost:${env.PORT}`);
  console.log(
    `[API] Documentación: http://localhost:${env.PORT}${API_PREFIX}/docs`,
  );
  console.log(
    `[API] Health check: http://localhost:${env.PORT}${API_PREFIX}/health`,
  );
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[API] El puerto ${env.PORT} ya está en uso.`);
  } else {
    console.error('[API] Error del servidor:', error.message);
  }
  process.exit(1);
});

async function logDatabaseStatus() {
  try {
    await checkDatabaseConnection();
    console.log('[DB] MySQL conectado correctamente.');
  } catch (error) {
    console.warn(
      `[DB] MySQL no disponible (${error.code ?? error.message}). ` +
        'La API arrancará, pero /api/health responderá 503.',
    );
  }
}

logDatabaseStatus();

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`\n[API] ${signal} recibido. Cerrando servidor...`);

  server.close(async (error) => {
    try {
      await closePool();
      console.log('[DB] Pool de conexiones cerrado.');
    } catch (closeError) {
      console.error('[DB] Error al cerrar el pool:', closeError.message);
    }

    if (error) {
      console.error('[API] Error al cerrar el servidor:', error.message);
      process.exit(1);
    }

    console.log('[API] Servidor cerrado correctamente.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[API] Cierre forzado por tiempo de espera.');
    process.exit(1);
  }, 10000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
  console.error('[API] Promesa rechazada no manejada:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[API] Excepción no capturada:', error);
  shutdown('uncaughtException');
});
