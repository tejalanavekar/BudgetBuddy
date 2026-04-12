import dotenv from 'dotenv';
dotenv.config();

import redis from '../config/redisClient.js';

const TTL =  60*5 //-> 5 minutes

export const getCache = async (key) => {
  try {
    if (!redis.isReady) return null;
    const data = await redis.get(key);
    if (!data) return null;
    // ✅ Make sure we're parsing a string, not a number
    if (typeof data !== 'string') return null;
    return JSON.parse(data);
  } catch (err) {
    console.error('Cache GET error:', err);
    return null;
  }
};

export const setCache = async(key, value, ttl = TTL) => {
    try {
    if (!redis.isReady) return;
    // ✅ Always stringify before storing
    const stringValue = JSON.stringify(value);
    await redis.setEx(key, ttl, stringValue);
  } catch (err) {
    console.error('Cache SET error:', err);
  }
};

export const deleteCache = async(key) =>{
    try {
    if (!redis.isReady) return;
    await redis.del(key);
  } catch (err) {
    console.error('Cache DELETE error:', err);
  }
};

//Delete all keys
export const deleteCachePatterns = async(pattern) => {
    const keys = await redis.keys(pattern);
    if(keys.length > 0) await redis.del(keys);
};