import { createBrowserRouter, Navigate } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { GuestOnly, RequireAuth } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ProjectLayout } from '@/features/projects/project-layout';
import { ProjectsPage } from '@/features/projects/projects-page';

import { NotFoundPage } from './not-found-page';
import { RootLayout } from './root-layout';
import { RouteError } from './route-error';

/* Těžší stránky (grafy, drag & drop) se načítají až při první návštěvě. */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            errorElement: <RouteError />,
            children: [
              {
                index: true,
                lazy: () => import('@/features/dashboard/dashboard-page').then((m) => ({ Component: m.DashboardPage })),
              },
              { path: 'projects', element: <ProjectsPage /> },
              {
                path: 'projects/:projectId',
                element: <ProjectLayout />,
                children: [
                  { index: true, element: <Navigate to="board" replace /> },
                  {
                    path: 'board',
                    lazy: () => import('@/features/board/board-page').then((m) => ({ Component: m.BoardPage })),
                  },
                  {
                    path: 'tasks',
                    lazy: () => import('@/features/tasks/tasks-page').then((m) => ({ Component: m.ProjectTasksPage })),
                  },
                  {
                    path: 'activity',
                    lazy: () =>
                      import('@/features/projects/project-activity-page').then((m) => ({
                        Component: m.ProjectActivityPage,
                      })),
                  },
                  {
                    path: 'settings',
                    lazy: () =>
                      import('@/features/projects/settings/project-settings-page').then((m) => ({
                        Component: m.ProjectSettingsPage,
                      })),
                  },
                ],
              },
              {
                path: 'tasks',
                lazy: () => import('@/features/tasks/tasks-page').then((m) => ({ Component: m.TasksPage })),
              },
              {
                path: 'tasks/:taskRef',
                lazy: () => import('@/features/tasks/task-page').then((m) => ({ Component: m.TaskPage })),
              },
              {
                path: 'settings',
                lazy: () => import('@/features/settings/settings-page').then((m) => ({ Component: m.SettingsPage })),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
