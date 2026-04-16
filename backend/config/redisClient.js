//Creates and connects redis client using Upstash 
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL
});

client.on('error', err => console.warn('⚠️ Redis unavailable:', err.message));
client.on('connect', () => console.log('✅ Redis connected to Upstash'));

try {
  await client.connect();
} catch (err) {
  console.warn('⚠️ Redis not available, running without cache');
}

export default client;