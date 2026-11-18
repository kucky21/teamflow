/**
 * Tenký klient nad fetch API.
 * - posílá cookies (session je v HttpOnly cookie),
 * - u zápisových požadavků doplní CSRF hlavičku z cookie `tf_csrf`,
 * - chyby převádí na `ApiError` se strojově čitelným kódem.
 */

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const CSRF_COOKIE = 'tf_csrf';
export const CSRF_HEADER = 'X-CSRF-Token';

export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return undefined;
}

type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}${buildQuery(options.query)}`, {
      method,
      headers,
      credentials: 'same-origin',
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Server není dostupný. Zkontrolujte připojení.');
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } } | null)?.error;
    throw new ApiError(
      response.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Něco se pokazilo. Zkuste to prosím znovu.',
      err?.details ?? [],
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) =>
    apiRequest<T>(path, { query, ...(signal ? { signal } : {}) }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: (path: string) => apiRequest<void>(path, { method: 'DELETE' }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Něco se pokazilo.';
}
