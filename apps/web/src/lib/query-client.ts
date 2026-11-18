import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryKeys = {
  me: ['auth', 'me'] as const,
  projects: (archived = false) => ['projects', { archived }] as const,
  project: (id: string) => ['project', id] as const,
  projectActivity: (id: string) => ['project', id, 'activity'] as const,
  board: (projectId: string, filters: object = {}) => ['board', projectId, filters] as const,
  tasks: (query: object) => ['tasks', query] as const,
  task: (ref: string) => ['task', ref] as const,
  taskComments: (ref: string) => ['task', ref, 'comments'] as const,
  taskHistory: (ref: string) => ['task', ref, 'history'] as const,
  dashboard: ['dashboard'] as const,
  users: (q: string, excludeProjectId?: string) => ['users', q, excludeProjectId] as const,
};

export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => handleUnauthorized(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleUnauthorized(error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });

  /** Vypršená relace: vynulujeme uživatele, AuthGuard přesměruje na přihlášení. */
  function handleUnauthorized(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      client.setQueryData(queryKeys.me, null);
    }
  }

  return client;
}
