import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest, buildQuery, readCookie } from './api';

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
