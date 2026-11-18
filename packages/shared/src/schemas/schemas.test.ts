import { describe, expect, it } from 'vitest';

import { dashboardQuerySchema } from './activity.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.js';
import { createProjectSchema, updateProjectSchema } from './project.js';
import { createTaskSchema, moveTaskSchema, taskListQuerySchema, taskRefSchema, updateTaskSchema } from './task.js';

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? [];
}

describe('registerSchema', () => {
  it('normalizuje e-mail a ořízne jméno', () => {
    const parsed = registerSchema.parse({ name: '  Jana Nováková ', email: ' Jana@Example.CZ ', password: 'Heslo123' });
    expect(parsed).toEqual({ name: 'Jana Nováková', email: 'jana@example.cz', password: 'Heslo123' });
  });

  it('odmítne slabé heslo s českými chybovými hláškami', () => {
    const result = registerSchema.safeParse({ name: 'Jan', email: 'jan@example.cz', password: 'kratke' });
    expect(result.success).toBe(false);
    expect(messages(result)).toContain('Heslo musí mít alespoň 8 znaků');
    expect(messages(result)).toContain('Heslo musí obsahovat alespoň jednu číslici');
  });

  it('odmítne neplatný e-mail', () => {
    const result = registerSchema.safeParse({ name: 'Jan', email: 'neni-email', password: 'Heslo1234' });
    expect(messages(result)).toContain('Zadejte platnou e-mailovou adresu');
  });
});

describe('loginSchema', () => {
  it('nevynucuje pravidla síly hesla', () => {
    expect(loginSchema.safeParse({ email: 'a@b.cz', password: 'x' }).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('vyžaduje odlišné nové heslo', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: 'Heslo123', newPassword: 'Heslo123' });
    expect(messages(result)).toContain('Nové heslo se musí lišit od současného');
  });
});

describe('createProjectSchema', () => {
  it('převede klíč na velká písmena a doplní výchozí stav', () => {
    const parsed = createProjectSchema.parse({ name: 'Web', key: 'web2', color: '#2563EB', icon: 'globe' });
    expect(parsed.key).toBe('WEB2');
    expect(parsed.status).toBe('ACTIVE');
  });

  it.each(['1AB', 'A', 'ABCDEFG', 'A-B'])('odmítne neplatný klíč %s', (key) => {
    expect(createProjectSchema.safeParse({ name: 'Web', key, color: '#2563EB', icon: 'globe' }).success).toBe(false);
  });

  it('odmítne barvu mimo paletu', () => {
    expect(createProjectSchema.safeParse({ name: 'Web', key: 'WEB', color: '#123456', icon: 'globe' }).success).toBe(
      false,
    );
  });

  it('update vyžaduje alespoň jednu změnu', () => {
    expect(updateProjectSchema.safeParse({}).success).toBe(false);
    expect(updateProjectSchema.safeParse({ description: null }).success).toBe(true);
  });
});

describe('task schemas', () => {
  it('createTaskSchema doplní výchozí hodnoty', () => {
    expect(createTaskSchema.parse({ title: 'Opravit login' })).toEqual({
      title: 'Opravit login',
      status: 'TODO',
      priority: 'MEDIUM',
      labelIds: [],
    });
  });

  it('odmítne prázdný název a neplatné datum', () => {
    const result = createTaskSchema.safeParse({ title: '   ', dueDate: '2025-13-45' });
    expect(messages(result)).toEqual(expect.arrayContaining(['Název úkolu je povinný', 'Neplatné datum']));
  });

  it('odmítne duplicitní štítky', () => {
    const id = '7b0b1d32-4a43-4e3f-9b8a-2f1f3c1a9d10';
    expect(updateTaskSchema.safeParse({ labelIds: [id, id] }).success).toBe(false);
  });

  it('moveTaskSchema přijme null sousedy', () => {
    expect(moveTaskSchema.parse({ status: 'DONE', prevId: null, nextId: null }).status).toBe('DONE');
  });

  it('taskListQuerySchema rozparsuje seznamy a booleany z query stringu', () => {
    const parsed = taskListQuerySchema.parse({
      status: 'TODO,IN_PROGRESS',
      priority: ['HIGH', 'URGENT'],
      overdue: 'true',
      page: '2',
    });
    expect(parsed.status).toEqual(['TODO', 'IN_PROGRESS']);
    expect(parsed.priority).toEqual(['HIGH', 'URGENT']);
    expect(parsed.overdue).toBe(true);
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(20);
    expect(parsed.sort).toBe('updatedAt');
  });

  it('taskListQuerySchema omezí velikost stránky', () => {
    expect(taskListQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('taskRefSchema přijme UUID i klíč úkolu', () => {
    expect(taskRefSchema.safeParse('TF-104').success).toBe(true);
    expect(taskRefSchema.safeParse('7b0b1d32-4a43-4e3f-9b8a-2f1f3c1a9d10').success).toBe(true);
    expect(taskRefSchema.safeParse('DROP TABLE').success).toBe(false);
  });
});

describe('dashboardQuerySchema', () => {
  it('validuje časové pásmo', () => {
    expect(dashboardQuerySchema.parse({}).tz).toBe('UTC');
    expect(dashboardQuerySchema.parse({ tz: 'Europe/Prague' }).tz).toBe('Europe/Prague');
    expect(dashboardQuerySchema.safeParse({ tz: 'Mars/Olympus' }).success).toBe(false);
  });
});
