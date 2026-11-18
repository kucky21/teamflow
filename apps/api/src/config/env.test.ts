import { describe, expect, it } from 'vitest';

import { loadConfig } from './env.js';

describe('loadConfig', () => {
  it('rozparsuje seznam originů a booleany', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://x',
      APP_ORIGIN: 'http://a.cz/, https://b.cz',
      COOKIE_SECURE: 'true',
    });
    expect(config.allowedOrigins).toEqual(['http://a.cz', 'https://b.cz']);
    expect(config.cookieSecure).toBe(true);
    expect(config.trustProxy).toBe(false);
    expect(config.sessionTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('selže bez DATABASE_URL se srozumitelnou chybou', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
