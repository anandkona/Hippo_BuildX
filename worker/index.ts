import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { handleProvisionTenant } from './jobs/provisionTenant';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

console.log('🚀 Starting BullMQ Worker Service...');

const worker = new Worker('tenant.provision', async (job: Job) => {
  console.log(`Processing job ${job.id} of type ${job.name}...`);
  if (job.name === 'provision') {
    await handleProvisionTenant(job.data);
  }
}, {
  connection: redisConnection,
  concurrency: 1, // process one schema creation at a time to prevent overload
});

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});
