// src/server/redis.ts
import { Redis } from '@upstash/redis';

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the environment.
export const redis = Redis.fromEnv();

export const entryKey = (id: string): string => `entry:${id}`;
export const statsKey = (id: string): string => `stats:${id}`;
export const INDEX_KEY = 'entries';
