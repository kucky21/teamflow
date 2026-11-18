import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityPage,
  AddMemberInput,
  CreateLabelInput,
  CreateProjectInput,
  Label,
  Member,
  ProjectDetail,
  ProjectRole,
  ProjectSummary,
  UpdateLabelInput,
  UpdateProjectInput,
} from '@teamflow/shared';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

export function useProjects(archived = false) {
  return useQuery({
    queryKey: queryKeys.projects(archived),
    queryFn: ({ signal }) =>
      api
        .get<{ items: ProjectSummary[] }>('/projects', archived ? { archived: true } : {}, signal)
        .then((r) => r.items),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: ({ signal }) => api.get<ProjectDetail>(`/projects/${projectId}`, undefined, signal),
    enabled: Boolean(projectId),
  });
}

export function useProjectActivity(projectId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.projectActivity(projectId),
    queryFn: ({ pageParam, signal }) =>
      api.get<ActivityPage>(`/projects/${projectId}/activity`, { cursor: pageParam, limit: 25 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Po změně projektu obnovíme vše, co z něj zobrazuje odvozená data. */
function invalidateProject(qc: QueryClient, projectId: string) {
  void qc.invalidateQueries({ queryKey: ['projects'] });
  void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<ProjectDetail>('/projects', input),
    onSuccess: (project) => {
      qc.setQueryData(queryKeys.project(project.id), project);
      invalidateProject(qc, project.id);
    },
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => api.patch<ProjectDetail>(`/projects/${projectId}`, input),
    onSuccess: (project) => {
      qc.setQueryData(queryKeys.project(projectId), project);
      invalidateProject(qc, projectId);
      void qc.invalidateQueries({ queryKey: queryKeys.projectActivity(projectId) });
    },
  });
}

export function useArchiveProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      api.post<ProjectDetail>(`/projects/${projectId}/${archived ? 'archive' : 'unarchive'}`),
    onSuccess: (project) => {
      qc.setQueryData(queryKeys.project(projectId), project);
      invalidateProject(qc, projectId);
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: ['task'] });
    },
  });
}

export function useDeleteProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: queryKeys.project(projectId) });
      qc.removeQueries({ queryKey: ['board', projectId] });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMemberInput) => api.post<Member>(`/projects/${projectId}/members`, input),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useUpdateMemberRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      api.patch<Member>(`/projects/${projectId}/members/${userId}`, { role }),
    onSuccess: () => invalidateProject(qc, projectId),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      invalidateProject(qc, projectId);
      void qc.invalidateQueries({ queryKey: ['board', projectId] });
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useLabelMutations(projectId: string) {
  const qc = useQueryClient();
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    void qc.invalidateQueries({ queryKey: ['board', projectId] });
    void qc.invalidateQueries({ queryKey: ['tasks'] });
    void qc.invalidateQueries({ queryKey: ['task'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateLabelInput) => api.post<Label>(`/projects/${projectId}/labels`, input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateLabelInput & { id: string }) =>
        api.patch<Label>(`/projects/${projectId}/labels/${id}`, input),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`/projects/${projectId}/labels/${id}`),
      onSuccess,
    }),
  };
}
