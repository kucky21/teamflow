import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChangePasswordInput,
  CurrentUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserSummary,
} from '@teamflow/shared';

import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

/**
 * Při změně uživatele zahodíme data předchozí relace. Dotaz `auth/me` ponecháme
 * (jen mu nastavíme novou hodnotu), aby na něj navázané komponenty dostaly změnu.
 */
function resetSessionData(qc: QueryClient, user: CurrentUser | null) {
  qc.setQueryData(queryKeys.me, user);
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return (await api.get<{ user: CurrentUser }>('/auth/me')).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

/** Aktuální uživatel – použitelné jen uvnitř chráněných stránek. */
export function useCurrentUser(): CurrentUser {
  const { data } = useMe();
  if (!data) throw new Error('useCurrentUser použito mimo přihlášenou část aplikace');
  return data;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<{ user: CurrentUser }>('/auth/login', input),
    onSuccess: ({ user }) => resetSessionData(qc, user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<{ user: CurrentUser }>('/auth/register', input),
    onSuccess: ({ user }) => resetSessionData(qc, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<undefined>('/auth/logout'),
    onSettled: () => resetSessionData(qc, null),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<{ user: CurrentUser }>('/users/me', input),
    onSuccess: ({ user }) => {
      qc.setQueryData(queryKeys.me, user);
      // Jméno a barva se zobrazují i v projektech a úkolech.
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.post<undefined>('/users/me/password', input),
  });
}

export function useUserSearch(q: string, excludeProjectId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users(q, excludeProjectId),
    queryFn: ({ signal }) =>
      api.get<{ items: UserSummary[] }>('/users', { q, excludeProjectId }, signal).then((r) => r.items),
    enabled,
    staleTime: 10_000,
  });
}
