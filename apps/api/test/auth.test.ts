import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, registerUser, resetDatabase, TestClient, type TestContext } from './helpers.js';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.db);
});

describe('registrace a přihlášení', () => {
  it('registrace vytvoří uživatele s Argon2id hashem a nastaví bezpečné cookies', async () => {
    const client = new TestClient(ctx.app);
    const res = await client.post('/api/auth/register', {
      name: 'Jana Nováková',
      email: 'Jana@Example.cz',
      password: 'Heslo1234',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().user).toMatchObject({ name: 'Jana Nováková', email: 'jana@example.cz' });
    expect(res.json().user).not.toHaveProperty('passwordHash');

    const session = (res.cookies as { name: string; httpOnly?: boolean; sameSite?: string }[]).find(
      (c) => c.name === 'tf_session',
    );
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
    const csrf = (res.cookies as { name: string; httpOnly?: boolean }[]).find((c) => c.name === 'tf_csrf');
    expect(csrf?.httpOnly).toBeFalsy();

    const user = await ctx.db.user.findUniqueOrThrow({ where: { email: 'jana@example.cz' } });
    expect(user.passwordHash.startsWith('$argon2id$')).toBe(true);

    const stored = await ctx.db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).not.toBe(client.cookies.get('tf_session'));
  });

  it('odmítne duplicitní e-mail', async () => {
    await registerUser(ctx.app, { email: 'dup@example.cz' });
    const client = new TestClient(ctx.app);
    const res = await client.post('/api/auth/register', {
      name: 'Druhý',
      email: 'DUP@example.cz',
      password: 'Heslo1234',
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('vrací validační chyby s cestou k poli', async () => {
    const client = new TestClient(ctx.app);
    const res = await client.post('/api/auth/register', { name: 'J', email: 'x', password: '123' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const paths = body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('přihlášení se špatným heslem i neexistujícím účtem vrací stejnou chybu', async () => {
    await registerUser(ctx.app, { email: 'login@example.cz', password: 'Spravne123' });
    const client = new TestClient(ctx.app);
    const wrong = await client.post('/api/auth/login', { email: 'login@example.cz', password: 'Spatne123' });
    const unknown = await client.post('/api/auth/login', { email: 'nikdo@example.cz', password: 'Spatne123' });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());

    const ok = await client.post('/api/auth/login', { email: 'LOGIN@example.cz', password: 'Spravne123' });
    expect(ok.statusCode).toBe(200);
    expect((await client.get('/api/auth/me')).statusCode).toBe(200);
  });

  it('odhlášení zneplatní relaci na serveru', async () => {
    const client = await registerUser(ctx.app);
    const token = client.cookies.get('tf_session')!;
    expect((await client.post('/api/auth/logout')).statusCode).toBe(204);

    // Původní cookie už nesmí fungovat ani při ručním opětovném použití.
    const replay = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `tf_session=${token}` },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('chráněné endpointy vyžadují přihlášení', async () => {
    const anonymous = new TestClient(ctx.app);
    for (const url of ['/api/auth/me', '/api/projects', '/api/tasks', '/api/dashboard']) {
      const res = await anonymous.get(url);
      expect(res.statusCode, url).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    }
  });

  it('prošlá relace je odmítnuta a smazána', async () => {
    const client = await registerUser(ctx.app);
    await ctx.db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await client.get('/api/auth/me')).statusCode).toBe(401);
    expect(await ctx.db.session.count()).toBe(0);
  });
});

describe('CSRF ochrana', () => {
  it('zápis bez CSRF hlavičky je zablokován', async () => {
    const client = await registerUser(ctx.app);
    const res = await client.request(
      'POST',
      '/api/projects',
      { name: 'Test', key: 'TST', color: '#2563EB', icon: 'rocket' },
      { csrf: false },
    );
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('zápis s cizím CSRF tokenem je zablokován', async () => {
    const client = await registerUser(ctx.app);
    const res = await client.request(
      'POST',
      '/api/projects',
      { name: 'Test', key: 'TST', color: '#2563EB', icon: 'rocket' },
      { csrf: false, headers: { 'x-csrf-token': 'podvrzeny-token-00000000000000000000' } },
    );
    expect(res.statusCode).toBe(403);
  });

  it('požadavek z cizího originu je zablokován, stejný host a povolený origin projdou', async () => {
    const client = new TestClient(ctx.app);
    const body = { name: 'Jan Novák', email: 'origin@example.cz', password: 'Heslo1234' };
    const evil = await client.request('POST', '/api/auth/register', body, {
      headers: { origin: 'https://evil.example.com' },
    });
    expect(evil.statusCode).toBe(403);
    expect(evil.json().error.code).toBe('CSRF_ORIGIN');

    const allowed = await client.request('POST', '/api/auth/register', body, {
      headers: { origin: 'http://localhost:5173' },
    });
    expect(allowed.statusCode).toBe(201);

    const sameHost = await client.request('POST', '/api/auth/logout', undefined, {
      headers: { origin: 'http://localhost:80', host: 'localhost:80' },
    });
    expect(sameHost.statusCode).toBe(204);
  });
});

describe('profil a heslo', () => {
  it('změna hesla ověří současné heslo a odhlásí ostatní relace', async () => {
    const first = await registerUser(ctx.app, { email: 'heslo@example.cz', password: 'Puvodni123' });
    const second = new TestClient(ctx.app);
    await second.post('/api/auth/login', { email: 'heslo@example.cz', password: 'Puvodni123' });

    const bad = await first.post('/api/users/me/password', { currentPassword: 'Spatne123', newPassword: 'Nove12345' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('INVALID_PASSWORD');

    const ok = await first.post('/api/users/me/password', { currentPassword: 'Puvodni123', newPassword: 'Nove12345' });
    expect(ok.statusCode).toBe(204);
    expect((await first.get('/api/auth/me')).statusCode).toBe(200);
    expect((await second.get('/api/auth/me')).statusCode).toBe(401);

    const relogin = new TestClient(ctx.app);
    expect(
      (await relogin.post('/api/auth/login', { email: 'heslo@example.cz', password: 'Nove12345' })).statusCode,
    ).toBe(200);
  });

  it('úprava profilu změní jméno', async () => {
    const client = await registerUser(ctx.app);
    const res = await client.patch('/api/users/me', { name: 'Nové Jméno' });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.name).toBe('Nové Jméno');
  });
});

describe('rate limiting', () => {
  it('omezí opakované pokusy o přihlášení', async () => {
    const limited = await createTestContext({ AUTH_RATE_LIMIT_MAX: '3' });
    try {
      const client = new TestClient(limited.app);
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await client.post('/api/auth/login', { email: 'nikdo@example.cz', password: 'Heslo1234' });
        statuses.push(res.statusCode);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses[3]).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
