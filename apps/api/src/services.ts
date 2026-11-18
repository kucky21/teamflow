import type { AppConfig } from './config/env.js';
import type { Db } from './lib/prisma.js';
import { AccessService } from './modules/access/access.service.js';
import { ActivityService } from './modules/activity/activity.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { SessionService } from './modules/auth/session.service.js';
import { CommentService } from './modules/comments/comments.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { LabelService } from './modules/labels/labels.service.js';
import { MemberService } from './modules/projects/members.service.js';
import { ProjectService } from './modules/projects/projects.service.js';
import { TaskService } from './modules/tasks/tasks.service.js';

/** Jednoduchý kompoziční kořen – služby dostávají závislosti přes konstruktor. */
export function createServices(db: Db, config: AppConfig) {
  const access = new AccessService(db);
  const activity = new ActivityService(db, access);
  const sessions = new SessionService(db, config);
  return {
    access,
    activity,
    sessions,
    auth: new AuthService(db, sessions, access),
    projects: new ProjectService(db, access, activity),
    members: new MemberService(db, access, activity),
    labels: new LabelService(db, access, activity),
    tasks: new TaskService(db, access, activity),
    comments: new CommentService(db, access, activity),
    dashboard: new DashboardService(db, activity),
  };
}

export type Services = ReturnType<typeof createServices>;
