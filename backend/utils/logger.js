// ES module imports are hoisted and resolved before server.js's own dotenv.config()
// call runs, so NODE_ENV wouldn't be set yet if we relied on that — load it here too.
import 'dotenv/config';
import pino from 'pino';

// Pretty, colorized output in dev; plain structured JSON in production (what a
// log platform like CloudWatch/Datadog actually wants to ingest).
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' }
});

export default logger;
