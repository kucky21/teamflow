import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  ActivityPage,
  Board,
  Comment,
  CreateTaskInput,
  Paginated,
  Task,
  TaskDetail,
  TaskPriority,
  TaskSortField,
  TaskStatus,
  UpdateTaskInput,
} from '@teamflow/shared';

import { applyOptimisticMove, type MoveInput } from '@/features/board/board-logic';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

export interface BoardFilters {
  q?: string | undefined;
  assigneeId?: string | undefined;
  priority?: TaskPriority[] | undefined;
  labelId?: string | undefined;
}

export interface TaskListQuery extends BoardFilters {
  projectId?: string | undefined;
  status?: TaskStatus[] | undefined;
  overdue?: boolean | undefined;
  sort: TaskSortField;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/** Úkoly se zobrazují na mnoha místech – po změně obnovíme všechny pohledy. */
export function invalidateTaskViews(qc: QueryClient, projectId?: string) {
  void qc.invalidateQueries({ queryKey: projectId ? ['board', projectId] : ['board'] });
  void qc.invalidateQueries({ queryKey: ['tasks'] });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  void qc.invalidateQueries({ queryKey: ['projects'] });
  if (projectId) {
    void qc.invalidateQueries({ queryKey: queryKeys.project(projectId), exact: true });
    void qc.invalidateQueries({ queryKey: queryKeys.projectActivity(projectId) });
  }
}

export function useBoard(projectId: string, filters: BoardFilters) {
  return useQuery({
    queryKey: queryKeys.board(projectId, filters),
    queryFn: ({ signal }) => api.get<Board>(`/projects/${projectId}/board`, { ...filters }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useTasks(query: TaskListQuery) {
  return useQuery({
    queryKey: queryKeys.tasks(query),
    queryFn: ({ signal }) => api.get<Paginated<Task>>('/tasks', { ...query }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useTask(ref: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task(ref ?? ''),
    queryFn: ({ signal }) => api.get<TaskDetail>(`/tasks/${ref}`, undefined, signal),
    enabled: Boolean(ref),
  });
}

export function useTaskComments(ref: string) {
  return useQuery({
    queryKey: queryKeys.taskComments(ref),
    queryFn: ({ signal }) =>
      api.get<{ items: Comment[] }>(`/tasks/${ref}/comments`, undefined, signal).then((r) => r.items),
  });
}

export function useTaskHistory(ref: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.taskHistory(ref),
    queryFn: ({ pageParam, signal }) =>
      api.get<ActivityPage>(`/tasks/${ref}/history`, { cursor: pageParam, limit: 30 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<TaskDetail>(`/projects/${projectId}/tasks`, input),
    onSuccess: (task) => {
      qc.setQueryData(queryKeys.task(task.key), task);
      invalidateTaskViews(qc, projectId);
    },
  });
}

export function useUpdateTask(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => api.patch<TaskDetail>(`/tasks/${ref}`, input),
    onSuccess: (task) => {
      qc.setQueryData(queryKeys.task(ref), task);
      qc.setQueryData(queryKeys.task(task.key), task);
      void qc.invalidateQueries({ queryKey: queryKeys.taskHistory(ref) });
      invalidateTaskViews(qc, task.project.id);
    },
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => api.delete(`/tasks/${ref}`),
    onSuccess: (_data, ref) => {
      qc.removeQueries({ queryKey: queryKeys.task(ref) });
      invalidateTaskViews(qc, projectId);
    },
  });
}

/**
 * Přesun na Kanbanu s optimistickou aktualizací: karta se přesune okamžitě,
 * při chybě API se obnoví původní stav boardu.
 */
export function useMoveTask(projectId: string, boardKey: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...body }: MoveInput) => api.post<Task>(`/tasks/${taskId}/move`, body),
    onMutate: async (move) => {
      await qc.cancelQueries({ queryKey: boardKey });
      const previous = qc.getQueryData<Board>(boardKey);
      if (previous) {
        qc.setQueryData<Board>(boardKey, { ...previous, tasks: applyOptimisticMove(previous.tasks, move) });
      }
      return { previous };
    },
    onError: (_error, _move, context) => {
      if (context?.previous) qc.setQueryData(boardKey, context.previous);
    },
    onSuccess: (task) => {
      qc.setQueryData<Board>(boardKey, (board) =>
        board ? { ...board, tasks: board.tasks.map((t) => (t.id === task.id ? task : t)) } : board,
      );
      void qc.invalidateQueries({ queryKey: queryKeys.task(task.key) });
      void qc.invalidateQueries({ queryKey: queryKeys.task(task.id) });
    },
    onSettled: () => invalidateTaskViews(qc, projectId),
  });
}

export function useCommentMutations(ref: string) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.taskComments(ref) });
    void qc.invalidateQueries({ queryKey: queryKeys.taskHistory(ref) });
    void qc.invalidateQueries({ queryKey: queryKeys.task(ref), exact: true });
    void qc.invalidateQueries({ queryKey: ['board'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: string) => api.post<Comment>(`/tasks/${ref}/comments`, { body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: string }) => api.patch<Comment>(`/comments/${id}`, { body }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`/comments/${id}`),
      onSuccess: refresh,
    }),
  };
}
