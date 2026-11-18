import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dueState, formatDue } from './format';

describe('format', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 4, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('dueState rozliší termín po splatnosti, dnešní a blízký', () => {
    expect(dueState('2025-05-14', false)).toBe('overdue');
    expect(dueState('2025-05-15', false)).toBe('today');
    expect(dueState('2025-05-17', false)).toBe('soon');
    expect(dueState('2025-06-30', false)).toBe('later');
    expect(dueState('2025-05-14', true)).toBeNull();
    expect(dueState(null, false)).toBeNull();
  });

  it('formatDue používá relativní popisky', () => {
    expect(formatDue('2025-05-15')).toBe('Dnes');
    expect(formatDue('2025-05-16')).toBe('Zítra');
    expect(formatDue('2025-05-14')).toBe('Včera');
    expect(formatDue('2025-06-02')).toBe('2. 6.');
  });
});
