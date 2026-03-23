import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { NextAdapter } from '@bull-board/next';
import Redis from 'ioredis';

// Assume user will have process.env.REDIS_URL in production
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const emailQueue = new Queue('emailWorker', { connection: redisConnection });

const serverAdapter = new NextAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

export const GET = serverAdapter.getApp();
export const POST = serverAdapter.getApp();
