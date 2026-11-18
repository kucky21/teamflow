import type { RateLimitOptions } from '@fastify/rate-limit';

import type { AppConfig } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

/**
 * Přísnější limit pro endpointy, které ověřují heslo (ochrana proti hádání hesel).
 * Globální rate limit je vypnutý – limit se zapíná per-route přes `config.rateLimit`.
 */
export function passwordRateLimit(config: AppConfig): RateLimitOptions {
  return {
    max: config.authRateLimitMax,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) =>
      new AppError(
        429,
        'RATE_LIMITED',
        `Příliš mnoho pokusů. Zkuste to znovu za ${Math.max(1, Math.ceil(context.ttl / 1000))} s.`,
      ),
  };
}
