import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const provisionTenantQueue = new Queue('tenant.provision', {
  connection: redisConnection,
});
