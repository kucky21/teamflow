import {
  formatTaskKey,
  type Activity,
  type ActivityChange,
  type ActivityType,
  type Comment,
  type Label,
  type ProjectIcon,
  type ProjectRef,
  type Task,
  type TaskDetail,
  type UserSummary,
} from '@teamflow/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { iso, toIsoDate } from '../domain/dates.js';

/*
 * Výběry a mapovací funkce mezi Prisma modely a DTO z @teamflow/shared.
 * Explicitní `select` zaručuje, že z databáze nikdy neodejde např. hash hesla.
 */

export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
} satisfies Prisma.UserSelect;

export const projectRefSelect = {
  id: true,
  key: true,
  name: true,
  color: true,
  icon: true,
} satisfies Prisma.ProjectSelect;

export const taskInclude = {
  project: { select: projectRefSelect },
  assignee: { select: userSummarySelect },
  labels: { include: { label: true }, orderBy: { label: { name: 'asc' } } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

export const taskDetailInclude = {
  ...taskInclude,
  creator: { select: userSummarySelect },
} satisfies Prisma.TaskInclude;

export const activityInclude = {
  actor: { select: userSummarySelect },
  project: { select: projectRefSelect },
} satisfies Prisma.ActivityLogInclude;

export const commentInclude = {
  author: { select: userSummarySelect },
} satisfies Prisma.TaskCommentInclude;

type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;
type ProjectRefRow = Prisma.ProjectGetPayload<{ select: typeof projectRefSelect }>;
export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;
export type TaskDetailRow = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;
export type ActivityRow = Prisma.ActivityLogGetPayload<{ include: typeof activityInclude }>;
export type CommentRow = Prisma.TaskCommentGetPayload<{ include: typeof commentInclude }>;

export function toUserSummary(u: UserSummaryRow): UserSummary {
  return { id: u.id, name: u.name, email: u.email, avatarColor: u.avatarColor };
}

export function toProjectRef(p: ProjectRefRow): ProjectRef {
  return { id: p.id, key: p.key, name: p.name, color: p.color, icon: p.icon as ProjectIcon };
}

export function toLabel(l: { id: string; name: string; color: string }): Label {
  return { id: l.id, name: l.name, color: l.color };
}

export function toTaskDto(t: TaskRow): Task {
  return {
    id: t.id,
    key: formatTaskKey(t.project.key, t.number),
    number: t.number,
    project: toProjectRef(t.project),
    title: t.title,
    status: t.status,
    priority: t.priority,
    position: t.position,
    dueDate: t.dueDate ? toIsoDate(t.dueDate) : null,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
    completedAt: iso(t.completedAt),
    assignee: t.assignee ? toUserSummary(t.assignee) : null,
    labels: t.labels.map((tl) => toLabel(tl.label)),
    commentCount: t._count.comments,
  };
}

export function toTaskDetailDto(
  t: TaskDetailRow,
  extra: { myRole: TaskDetail['myRole']; projectArchived: boolean },
): TaskDetail {
  return {
    ...toTaskDto(t),
    description: t.description,
    creator: toUserSummary(t.creator),
    myRole: extra.myRole,
    projectArchived: extra.projectArchived,
  };
}

export function toCommentDto(c: CommentRow): Comment {
  return {
    id: c.id,
    taskId: c.taskId,
    body: c.body,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
    // Tolerance 1 s – `updatedAt` se při vytvoření nastavuje nezávisle na `createdAt`.
    edited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
    author: toUserSummary(c.author),
  };
}

function asChanges(value: Prisma.JsonValue): ActivityChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { field, from, to } = item as Record<string, unknown>;
    if (typeof field !== 'string') return [];
    return [
      {
        field,
        from: typeof from === 'string' ? from : null,
        to: typeof to === 'string' ? to : null,
      },
    ];
  });
}

function asMeta(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') out[k] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
  }
  return out;
}

export function toActivityDto(a: ActivityRow): Activity {
  const meta = asMeta(a.meta);
  const { taskKey, taskTitle, ...rest } = meta;
  return {
    id: a.id,
    type: a.type as ActivityType,
    createdAt: iso(a.createdAt),
    actor: toUserSummary(a.actor),
    project: toProjectRef(a.project),
    task: taskKey ? { id: a.taskId, key: taskKey, title: taskTitle ?? '' } : null,
    changes: asChanges(a.changes),
    meta: rest,
  };
}
