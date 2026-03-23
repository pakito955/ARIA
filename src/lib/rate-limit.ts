import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter that allows 5 AI analysis requests per 10 seconds per user
export const aiRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
  prefix: 'aria-ai-ratelimit',
});
