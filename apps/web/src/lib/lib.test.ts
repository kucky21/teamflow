import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError, buildQuery, readCookie } from './api';
import { dueState, formatDue } from './format';
import { initials, plural } from './utils';

describe('utils', () => {
  it('initials vrátí iniciály jména a příjmení', () => {
    expect(initials('Tereza Dvořáková')).toBe('TD');
    expect(initials('Jan')).toBe('J');
    expect(initials('  ')).toBe('?');
  });

  it('plural volí správný český tvar', () => {
    const forms: [string, string, string] = ['úkol', 'úkoly', 'úkolů'];
    expect([0, 1, 2, 4, 5, 22].map((n) => plural(n, forms))).toEqual([
      'úkolů',
      'úkol',
      'úkoly',
      'úkoly',
      'úkolů',
      'úkolů',
    ]);
  });
});

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

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = 'tf_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('buildQuery vynechá prázdné hodnoty a spojí pole čárkou', () => {
    expect(buildQuery({ q: 'test', status: ['TODO', 'DONE'], empty: '', none: undefined, page: 2 })).toBe(
      '?q=test&status=TODO%2CDONE&page=2',
    );
    expect(buildQuery({})).toBe('');
  });

  it('readCookie přečte hodnotu cookie', () => {
    document.cookie = 'tf_csrf=abc123; path=/';
    expect(readCookie('tf_csrf')).toBe('abc123');
    expect(readCookie('neexistuje')).toBeUndefined();
  });

  it('u zápisových požadavků posílá CSRF hlavičku z cookie', async () => {
    document.cookie = 'tf_csrf=token-xyz; path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await apiRequest('/projects', { method: 'POST', body: { name: 'X' } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/projects');
    expect((init!.headers as Record<string, string>)['X-CSRF-Token']).toBe('token-xyz');
    expect(init!.credentials).toBe('same-origin');
  });

  it('GET požadavek CSRF hlavičku neposílá', async () => {
    document.cookie = 'tf_csrf=token-xyz; path=/';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await apiRequest('/projects');
    expect((fetchMock.mock.calls[0]![1]!.headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined();
  });

  it('chybovou odpověď převede na ApiError s kódem a detaily', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Neplatná data',
            details: [{ path: 'title', message: 'Povinné' }],
          },
        }),
        { status: 400 },
      ),
    );
    const error = await apiRequest('/tasks', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'title', message: 'Povinné' }],
    });
  });

  it('síťovou chybu převede na srozumitelnou ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/projects')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('204 vrací undefined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
