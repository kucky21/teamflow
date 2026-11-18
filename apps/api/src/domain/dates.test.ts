import { describe, expect, it } from 'vitest';

import { fromIsoDate, todayUtc, toIsoDate } from './dates.js';

describe('dates', () => {
  it('převádí mezi Date a YYYY-MM-DD bez posunu pásma', () => {
    expect(toIsoDate(fromIsoDate('2025-03-09'))).toBe('2025-03-09');
    expect(todayUtc(new Date('2025-03-09T23:59:00Z')).toISOString()).toBe('2025-03-09T00:00:00.000Z');
  });
});
