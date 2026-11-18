import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import type { AppConfig } from '../config/env.js';
import { AppError, forbidden, unauthorized } from '../lib/errors.js';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  type IssuedSession,
  safeEqual,
  SESSION_COOKIE,
} from '../modules/auth/session.service.js';
import type { AuthContext } from '../types.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Autentizace a CSRF ochrana.
 *
 * - Session token je v HttpOnly cookie `tf_session` (SameSite=Lax), v DB je jen jeho hash.
 * - Zápisové požadavky musí mít povolený `Origin` (stejný host nebo APP_ORIGIN).
 * - Přihlášené zápisové požadavky navíc musí poslat hlavičku `X-CSRF-Token`
 *   shodnou s tokenem session (synchronizer token pattern). Token klient čte
 *   z cookie `tf_csrf`, kterou cizí stránka přečíst nemůže.
 */
export const authPlugin = fp(
  async (app) => {
    const { sessions } = app.services;
    const config = app.config;

    app.decorateRequest('auth', null);

    app.decorate('requireAuth', async (request: FastifyRequest) => {
      if (!request.auth) throw unauthorized();
    });

    app.addHook('onRequest', async (request, reply) => {
      if (!request.url.startsWith('/api/')) return;

      const token = request.cookies[SESSION_COOKIE];
      if (token) {
        const resolved = await sessions.resolve(token);
        if (resolved) {
          request.auth = { user: resolved.user, sessionId: resolved.sessionId, csrfToken: resolved.csrfToken };
          if (resolved.renewed) {
            setSessionCookies(reply, config, {
              token,
              csrfToken: resolved.csrfToken,
              expiresAt: resolved.expiresAt,
            });
          }
        } else {
          clearSessionCookies(reply, config);
        }
      }

      if (UNSAFE_METHODS.has(request.method)) {
        verifyOrigin(request, config);
        if (request.auth) verifyCsrfToken(request, request.auth);
      }
    });
  },
  { name: 'teamflow-auth' },
);

function verifyOrigin(request: FastifyRequest, config: AppConfig): void {
  const origin = request.headers.origin ?? refererOrigin(request.headers.referer);
  // Bez Origin i Referer jde o neprohlížečového klienta (curl, testy) – CSRF se ho netýká.
  if (!origin) return;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw forbidden('Neplatný původ požadavku.', 'CSRF_ORIGIN');
  }
  const sameHost = parsed.host === normalizeHost(request.headers.host, parsed.protocol);
  const allowed = config.allowedOrigins.includes(parsed.origin);
  if (!sameHost && !allowed) {
    throw forbidden('Požadavek z nepovoleného původu byl zablokován.', 'CSRF_ORIGIN');
  }
}

/** Hlavička Host může obsahovat výchozí port (`:80`/`:443`), URL.host ho vynechává. */
function normalizeHost(host: string | undefined, protocol: string): string | undefined {
  if (!host) return undefined;
  const lower = host.toLowerCase();
  if (protocol === 'http:' && lower.endsWith(':80')) return lower.slice(0, -3);
  if (protocol === 'https:' && lower.endsWith(':443')) return lower.slice(0, -4);
  return lower;
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return 'invalid:';
  }
}

function verifyCsrfToken(request: FastifyRequest, auth: AuthContext): void {
  const header = request.headers[CSRF_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !safeEqual(value, auth.csrfToken)) {
    throw new AppError(403, 'CSRF_TOKEN_INVALID', 'Neplatný bezpečnostní token. Obnovte prosím stránku.');
  }
}

export function setSessionCookies(reply: FastifyReply, config: AppConfig, session: IssuedSession): void {
  const base = { path: '/', sameSite: 'lax' as const, secure: config.cookieSecure, expires: session.expiresAt };
  reply.setCookie(SESSION_COOKIE, session.token, { ...base, httpOnly: true });
  // CSRF cookie musí být čitelná z JavaScriptu (double-submit do hlavičky).
  reply.setCookie(CSRF_COOKIE, session.csrfToken, { ...base, httpOnly: false });
}

export function clearSessionCookies(reply: FastifyReply, config: AppConfig): void {
  const base = { path: '/', sameSite: 'lax' as const, secure: config.cookieSecure };
  reply.clearCookie(SESSION_COOKIE, { ...base, httpOnly: true });
  reply.clearCookie(CSRF_COOKIE, base);
}

/** Vrátí kontext přihlášeného uživatele; volat jen v routách chráněných `requireAuth`. */
export function getAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) throw unauthorized();
  return request.auth;
}
