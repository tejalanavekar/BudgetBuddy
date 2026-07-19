//Main backend entry point and starting the server
import dotenv from 'dotenv';
import connectDB from './config/db.js';
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

app.listen(port, () => {
    logger.info(`Server is running on port: ${port}`);
});
