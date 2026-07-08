//Creates and connects to local Redis (via Docker)
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

let client;

try {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: { reconnectStrategy: false }, // ponytail: fail fast instead of retrying forever, so a down Redis can't block server startup
  });

  client.on('error', err => {
    console.warn('⚠️ Redis unavailable:', err.message);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  await client.connect();
} catch (err) {
  console.warn('⚠️ Redis not available, running without cache');
  // Provide a fallback mock client
  client = {
    isReady: false,
    get: async () => null,
    setEx: async () => null,
    del: async () => null,
    keys: async () => [],
  };
}

export default client;