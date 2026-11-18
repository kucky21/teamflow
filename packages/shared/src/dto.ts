import { z } from 'zod';

import {
  ACTIVITY_TYPES,
  PROJECT_ICONS,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from './constants.js';

/**
 * Tvary odpovědí API. Backend je používá k serializaci (a tím i k ochraně
 * před nechtěným únikem polí), OpenAPI dokumentace z nich generuje schémata
 * a frontend z nich odvozuje typy.
 */

const dateTime = z.iso.datetime({ offset: true });
const date = z.iso.date();

export const userSummaryDto = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  avatarColor: z.string(),
});
export type UserSummary = z.infer<typeof userSummaryDto>;

export const currentUserDto = userSummaryDto.extend({
  createdAt: dateTime,
});
export type CurrentUser = z.infer<typeof currentUserDto>;

export const labelDto = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string(),
});
export type Label = z.infer<typeof labelDto>;

export const projectRefDto = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.enum(PROJECT_ICONS),
});
export type ProjectRef = z.infer<typeof projectRefDto>;

export const memberDto = z.object({
  user: userSummaryDto,
  role: z.enum(PROJECT_ROLES),
  joinedAt: dateTime,
});
export type Member = z.infer<typeof memberDto>;

export const taskCountsDto = z.object({
  total: z.number().int(),
  open: z.number().int(),
  done: z.number().int(),
  overdue: z.number().int(),
});
export type TaskCounts = z.infer<typeof taskCountsDto>;

export const projectSummaryDto = projectRefDto.extend({
  description: z.string().nullable(),
  status: z.enum(PROJECT_STATUSES),
  archivedAt: dateTime.nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  owner: userSummaryDto,
  myRole: z.enum(PROJECT_ROLES),
  memberCount: z.number().int(),
  membersPreview: z.array(userSummaryDto),
  taskCounts: taskCountsDto,
});
export type ProjectSummary = z.infer<typeof projectSummaryDto>;

export const projectDetailDto = projectSummaryDto.extend({
  members: z.array(memberDto),
  labels: z.array(labelDto),
});
export type ProjectDetail = z.infer<typeof projectDetailDto>;

export const taskDto = z.object({
  id: z.uuid(),
  key: z.string(),
  number: z.number().int(),
  project: projectRefDto,
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  position: z.number(),
  dueDate: date.nullable(),
  createdAt: dateTime,
  updatedAt: dateTime,
  completedAt: dateTime.nullable(),
  assignee: userSummaryDto.nullable(),
  labels: z.array(labelDto),
  commentCount: z.number().int(),
});
export type Task = z.infer<typeof taskDto>;

export const taskDetailDto = taskDto.extend({
  description: z.string().nullable(),
  creator: userSummaryDto,
  myRole: z.enum(PROJECT_ROLES),
  projectArchived: z.boolean(),
});
export type TaskDetail = z.infer<typeof taskDetailDto>;

export const commentDto = z.object({
  id: z.uuid(),
  taskId: z.uuid(),
  body: z.string(),
  createdAt: dateTime,
  updatedAt: dateTime,
  edited: z.boolean(),
  author: userSummaryDto,
});
export type Comment = z.infer<typeof commentDto>;

export const activityChangeDto = z.object({
  field: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
});
export type ActivityChange = z.infer<typeof activityChangeDto>;

export const activityDto = z.object({
  id: z.uuid(),
  type: z.enum(ACTIVITY_TYPES),
  createdAt: dateTime,
  actor: userSummaryDto,
  project: projectRefDto,
  task: z.object({ id: z.uuid().nullable(), key: z.string(), title: z.string() }).nullable(),
  changes: z.array(activityChangeDto),
  meta: z.record(z.string(), z.string()),
});
export type Activity = z.infer<typeof activityDto>;

export const activityPageDto = z.object({
  items: z.array(activityDto),
  nextCursor: z.uuid().nullable(),
});
export type ActivityPage = z.infer<typeof activityPageDto>;

export function paginatedDto<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });
}
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const taskPageDto = paginatedDto(taskDto);

export const boardDto = z.object({
  tasks: z.array(taskDto),
  truncated: z.boolean(),
});
export type Board = z.infer<typeof boardDto>;

export const dashboardDto = z.object({
  stats: z.object({
    activeProjects: z.number().int(),
    openTasks: z.number().int(),
    overdueTasks: z.number().int(),
    completedTasks: z.number().int(),
    completedLast30Days: z.number().int(),
  }),
  completedByDay: z.array(z.object({ date, count: z.number().int() })),
  statusDistribution: z.array(z.object({ status: z.enum(TASK_STATUSES), count: z.number().int() })),
  recentActivity: z.array(activityDto),
  myTasks: z.array(taskDto),
});
export type Dashboard = z.infer<typeof dashboardDto>;

export const errorBodyDto = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodyDto>;
