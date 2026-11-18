import type { LightMyRequestResponse } from 'fastify';

import { type App, buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/env.js';
import { createPrismaClient, type Db } from '../../src/lib/prisma.js';

export interface TestContext {
  app: App;
  db: Db;
  close: () => Promise<void>;
}

export async function createTestContext(env: Record<string, string> = {}): Promise<TestContext> {
  const config = loadConfig({
    ...process.env,
    NODE_ENV: 'test',
    APP_ENV: 'test',
    AUTH_RATE_LIMIT_MAX: '1000',
    APP_ORIGIN: 'http://localhost:5173',
    ...env,
  });
  const db = createPrismaClient(config.databaseUrl);
  const app = await buildApp({ config, db });
  await app.ready();
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await db.$disconnect();
    },
  };
}

export async function resetDatabase(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE activity_logs, task_comments, task_labels, tasks, labels, project_members, projects, sessions, users CASCADE',
  );
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Klient simulující prohlížeč: udržuje cookies a u zápisových požadavků
 * posílá CSRF hlavičku z cookie `tf_csrf` (stejně jako frontend).
 */
export class TestClient {
  readonly cookies = new Map<string, string>();
  user: { id: string; name: string; email: string } | null = null;

  constructor(private readonly app: App) {}

  get csrfToken(): string | undefined {
    return this.cookies.get('tf_csrf');
  }

  async request(
    method: Method,
    url: string,
    body?: unknown,
    options: { csrf?: boolean; headers?: Record<string, string> } = {},
  ): Promise<LightMyRequestResponse> {
    const headers: Record<string, string> = { ...options.headers };
    if (this.cookies.size > 0) {
      headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    if (method !== 'GET' && options.csrf !== false && this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await this.app.inject({
      method,
      url,
      headers,
      ...(body !== undefined ? { payload: body as Record<string, unknown> } : {}),
    });
    for (const cookie of res.cookies as { name: string; value: string; expires?: Date }[]) {
      if (!cookie.value || (cookie.expires && cookie.expires.getTime() < Date.now())) this.cookies.delete(cookie.name);
      else this.cookies.set(cookie.name, cookie.value);
    }
    return res;
  }

  get = (url: string) => this.request('GET', url);
  post = (url: string, body?: unknown) => this.request('POST', url, body ?? {});
  patch = (url: string, body: unknown) => this.request('PATCH', url, body);
  delete = (url: string) => this.request('DELETE', url);
}

let counter = 0;

export async function registerUser(
  app: App,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<TestClient> {
  counter += 1;
  const client = new TestClient(app);
  const res = await client.post('/api/auth/register', {
    name: overrides.name ?? `Uživatel ${counter}`,
    email: overrides.email ?? `user${counter}-${Date.now()}@example.cz`,
    password: overrides.password ?? 'Heslo1234',
  });
  if (res.statusCode !== 201) throw new Error(`Registrace selhala: ${res.statusCode} ${res.body}`);
  client.user = res.json().user;
  return client;
}

let projectCounter = 0;

export async function createProject(client: TestClient, overrides: Record<string, unknown> = {}) {
  projectCounter += 1;
  const res = await client.post('/api/projects', {
    name: `Projekt ${projectCounter}`,
    key: `P${projectCounter}`,
    color: '#2563EB',
    icon: 'rocket',
    ...overrides,
  });
  if (res.statusCode !== 201) throw new Error(`Vytvoření projektu selhalo: ${res.statusCode} ${res.body}`);
  return res.json<{ id: string; key: string }>();
}

export async function addMember(owner: TestClient, projectId: string, member: TestClient, role = 'MEMBER') {
  const res = await owner.post(`/api/projects/${projectId}/members`, { userId: member.user!.id, role });
  if (res.statusCode !== 201) throw new Error(`Přidání člena selhalo: ${res.statusCode} ${res.body}`);
}

export async function createTask(client: TestClient, projectId: string, body: Record<string, unknown> = {}) {
  const res = await client.post(`/api/projects/${projectId}/tasks`, { title: 'Úkol', ...body });
  if (res.statusCode !== 201) throw new Error(`Vytvoření úkolu selhalo: ${res.statusCode} ${res.body}`);
  return res.json<{ id: string; key: string; number: number; status: string; position: number }>();
}
