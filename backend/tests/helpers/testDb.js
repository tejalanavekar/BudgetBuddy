// Spins up a real MongoDB server in memory (no network, no account, no cost) so
// tests never touch the real Atlas cluster. Loads the real .env first (so
// JWT_SECRET/GOOGLE_CLIENT_ID/etc are the real dev values — fine for signing
// test tokens), then overrides just ATLAS_URI to point at the in-memory instance.
import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  process.env.ATLAS_URI = mongod.getUri();
  await mongoose.connect(process.env.ATLAS_URI);
}

export async function teardownTestDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

export async function clearTestDB() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
