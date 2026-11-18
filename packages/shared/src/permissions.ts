import type { ProjectRole } from './constants.js';

/**
 * Matice oprávnění na úrovni projektu. Backend ji používá jako autoritativní
 * kontrolu, frontend pouze k tomu, aby nezobrazoval akce, které by server odmítl.
 */
export const PROJECT_PERMISSIONS = {
  'project:view': ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
  'project:update': ['ADMIN', 'PROJECT_MANAGER'],
  'project:archive': ['ADMIN'],
  'project:delete': ['ADMIN'],
  'member:manage': ['ADMIN', 'PROJECT_MANAGER'],
  'label:manage': ['ADMIN', 'PROJECT_MANAGER'],
  'task:create': ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
  'task:update': ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
  'task:delete:any': ['ADMIN', 'PROJECT_MANAGER'],
  'comment:create': ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
  'comment:delete:any': ['ADMIN', 'PROJECT_MANAGER'],
} as const satisfies Record<string, readonly ProjectRole[]>;

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS;

export function hasProjectPermission(role: ProjectRole | null | undefined, permission: ProjectPermission): boolean {
  if (!role) return false;
  return (PROJECT_PERMISSIONS[permission] as readonly ProjectRole[]).includes(role);
}

/**
 * Smí uživatel s rolí `actorRole` nastavit (nebo odebrat) členovi roli `targetRole`?
 * - Administrátor smí spravovat všechny role.
 * - Projektový manažer smí spravovat pouze manažery a členy, nikdy administrátory.
 * - Člen nesmí spravovat nikoho.
 */
export function canManageRole(actorRole: ProjectRole, targetRole: ProjectRole): boolean {
  if (actorRole === 'ADMIN') return true;
  if (actorRole === 'PROJECT_MANAGER') return targetRole !== 'ADMIN';
  return false;
}

/** Smí uživatel smazat úkol? Kdokoli s oprávněním `task:delete:any`, nebo autor úkolu. */
export function canDeleteTask(role: ProjectRole | null | undefined, isCreator: boolean): boolean {
  if (!role) return false;
  return hasProjectPermission(role, 'task:delete:any') || isCreator;
}

/** Smí uživatel smazat komentář? Autor vždy, ostatní pouze s moderátorským oprávněním. */
export function canDeleteComment(role: ProjectRole | null | undefined, isAuthor: boolean): boolean {
  if (!role) return false;
  return isAuthor || hasProjectPermission(role, 'comment:delete:any');
}
