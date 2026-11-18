import { describe, expect, it } from 'vitest';
import { canDeleteComment, canDeleteTask, canManageRole, hasProjectPermission } from './permissions.js';
import { formatTaskKey, parseTaskKey, suggestProjectKey } from './task-key.js';

describe('hasProjectPermission', () => {
  it('člen může pracovat s úkoly, ale nesmí spravovat projekt', () => {
    expect(hasProjectPermission('MEMBER', 'task:create')).toBe(true);
    expect(hasProjectPermission('MEMBER', 'task:update')).toBe(true);
    expect(hasProjectPermission('MEMBER', 'project:update')).toBe(false);
    expect(hasProjectPermission('MEMBER', 'member:manage')).toBe(false);
    expect(hasProjectPermission('MEMBER', 'task:delete:any')).toBe(false);
  });

  it('manažer spravuje projekt, ale nesmí ho archivovat ani smazat', () => {
    expect(hasProjectPermission('PROJECT_MANAGER', 'project:update')).toBe(true);
    expect(hasProjectPermission('PROJECT_MANAGER', 'member:manage')).toBe(true);
    expect(hasProjectPermission('PROJECT_MANAGER', 'project:archive')).toBe(false);
    expect(hasProjectPermission('PROJECT_MANAGER', 'project:delete')).toBe(false);
  });

  it('administrátor má všechna oprávnění', () => {
    expect(hasProjectPermission('ADMIN', 'project:delete')).toBe(true);
    expect(hasProjectPermission('ADMIN', 'comment:delete:any')).toBe(true);
  });

  it('bez role nemá nikdo žádné oprávnění', () => {
    expect(hasProjectPermission(null, 'project:view')).toBe(false);
    expect(hasProjectPermission(undefined, 'task:create')).toBe(false);
  });
});

describe('canManageRole', () => {
  it('manažer nesmí jmenovat ani odebrat administrátora', () => {
    expect(canManageRole('PROJECT_MANAGER', 'ADMIN')).toBe(false);
    expect(canManageRole('PROJECT_MANAGER', 'PROJECT_MANAGER')).toBe(true);
    expect(canManageRole('PROJECT_MANAGER', 'MEMBER')).toBe(true);
  });

  it('člen nesmí spravovat role', () => {
    expect(canManageRole('MEMBER', 'MEMBER')).toBe(false);
  });

  it('administrátor smí spravovat všechny role', () => {
    expect(canManageRole('ADMIN', 'ADMIN')).toBe(true);
  });
});

describe('canDeleteTask / canDeleteComment', () => {
  it('autor smí smazat vlastní úkol i komentář', () => {
    expect(canDeleteTask('MEMBER', true)).toBe(true);
    expect(canDeleteComment('MEMBER', true)).toBe(true);
  });

  it('člen nesmí mazat cizí úkoly ani komentáře', () => {
    expect(canDeleteTask('MEMBER', false)).toBe(false);
    expect(canDeleteComment('MEMBER', false)).toBe(false);
  });

  it('manažer smí moderovat', () => {
    expect(canDeleteTask('PROJECT_MANAGER', false)).toBe(true);
    expect(canDeleteComment('PROJECT_MANAGER', false)).toBe(true);
  });

  it('nečlen nesmí nic', () => {
    expect(canDeleteTask(null, true)).toBe(false);
  });
});

describe('task keys', () => {
  it('formátuje a parsuje klíč úkolu', () => {
    expect(formatTaskKey('TF', 104)).toBe('TF-104');
    expect(parseTaskKey('tf-104')).toEqual({ projectKey: 'TF', number: 104 });
    expect(parseTaskKey('TF-0')).toBeNull();
    expect(parseTaskKey('TF104')).toBeNull();
    expect(parseTaskKey('1F-2')).toBeNull();
  });

  it('navrhne klíč z názvu projektu', () => {
    expect(suggestProjectKey('Mobilní aplikace')).toBe('MA');
    expect(suggestProjectKey('Žluťoučký kůň')).toBe('ZK');
    expect(suggestProjectKey('Platforma')).toBe('PLA');
    expect(suggestProjectKey('2024 Redesign webu klienta')).toBe('RWK');
    expect(suggestProjectKey('X')).toBe('XPR');
  });
});
