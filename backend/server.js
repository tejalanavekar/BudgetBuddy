//Main backend entry point and starting the server
import dotenv from 'dotenv';
import connectDB, { disconnectDB } from './config/db.js';
import logger from './utils/logger.js';

// Initialize environment variables
dotenv.config();

// Fail fast with a clear message if a required secret/config value is missing,
// rather than starting "successfully" and only breaking later when some request
// happens to hit the code path that needed it.
const REQUIRED_ENV_VARS = [
    'ATLAS_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID',
    'EMAIL_USER', 'EMAIL_APP_PASSWORD', 'FRONTEND_URL',
    'GOOGLE_VISION_API_KEY', 'GROQ_API_KEY'
];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = (await import('./app.js')).default;
const port = process.env.PORT || 5000;

// Startup Sanity Checks (Keep these for debugging in dev)
if (process.env.NODE_ENV !== 'production') {
    logger.info('Startup checks:');
    logger.info(`- ATLAS_URI present: ${!!process.env.ATLAS_URI}`);
    logger.info(`- process.cwd(): ${process.cwd()}`);
}

const server = app.listen(port, () => {
    logger.info(`Server is running on port: ${port}`);
});

// ── Graceful shutdown ──────────────────────────────────────────────
// Hosts send SIGTERM before killing a process on every redeploy/restart (Docker,
// Kubernetes, Render, Railway, etc.); SIGINT is Ctrl+C locally. With no handler,
// Node terminates immediately — any request mid-flight gets its connection cut,
// and the MongoDB socket gets torn down instead of closed cleanly.
const SHUTDOWN_TIMEOUT_MS = 10000;

const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);

    // Safety net: server.close() waits for every open connection to end on its own,
    // including idle keep-alive sockets a client hasn't closed yet — which can hang
    // far longer than any real request takes. Force-exit rather than hang forever if
    // that happens; most hosts SIGKILL after ~10-30s anyway, so this stays inside that.
    const forceExitTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit.');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Stops accepting new connections immediately; existing in-flight requests are
    // allowed to finish naturally before this callback fires.
    server.close(async () => {
        logger.info('HTTP server closed — no longer accepting new connections.');
        try {
            await disconnectDB();
        } catch (error) {
            logger.error('Error while closing MongoDB connection:', error);
        } finally {
            clearTimeout(forceExitTimer);
            process.exit(0);
        }
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
