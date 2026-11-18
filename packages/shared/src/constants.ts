/**
 * Doménové výčty a jejich české popisky. Jsou jediným zdrojem pravdy
 * pro databázi (Prisma enumy musí odpovídat), API i uživatelské rozhraní.
 */

export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'K řešení',
  IN_PROGRESS: 'Probíhá',
  REVIEW: 'Kontrola',
  DONE: 'Hotovo',
};

/** Stavy, ve kterých je úkol považován za otevřený (nedokončený). */
export const OPEN_TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW'] as const satisfies readonly TaskStatus[];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Nízká',
  MEDIUM: 'Střední',
  HIGH: 'Vysoká',
  URGENT: 'Urgentní',
};

/** Číselná váha priority pro řazení (vyšší = důležitější). */
export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export const PROJECT_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: 'Administrátor',
  PROJECT_MANAGER: 'Projektový manažer',
  MEMBER: 'Člen',
};

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Plánování',
  ACTIVE: 'Aktivní',
  ON_HOLD: 'Pozastaveno',
  COMPLETED: 'Dokončeno',
};

/** Paleta barev projektů a štítků – laděná pro světlý i tmavý režim. */
export const PALETTE_COLORS = [
  '#0EA5A4',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#E11D48',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#059669',
  '#475569',
] as const;
export type PaletteColor = (typeof PALETTE_COLORS)[number];

export const PROJECT_ICONS = [
  'rocket',
  'layers',
  'code',
  'smartphone',
  'globe',
  'database',
  'palette',
  'shield',
  'zap',
  'box',
  'briefcase',
  'flask',
] as const;
export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export const ACTIVITY_TYPES = [
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'PROJECT_UNARCHIVED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'MEMBER_ROLE_CHANGED',
  'LABEL_CREATED',
  'LABEL_UPDATED',
  'LABEL_DELETED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_MOVED',
  'TASK_DELETED',
  'COMMENT_ADDED',
  'COMMENT_DELETED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const AVATAR_COLORS = [
  '#0EA5A4',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#65A30D',
  '#0891B2',
  '#9333EA',
] as const;

/** Limity sdílené mezi validací na klientu a serveru. */
export const LIMITS = {
  pageSizeMax: 100,
  pageSizeDefault: 20,
  taskTitleMax: 200,
  taskDescriptionMax: 10_000,
  commentMax: 5_000,
  projectNameMax: 80,
  projectDescriptionMax: 2_000,
  labelsPerTask: 10,
  boardTaskLimit: 500,
} as const;
