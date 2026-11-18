import { useQuery } from '@tanstack/react-query';
import type { Dashboard } from '@teamflow/shared';

import { api } from '@/lib/api';
import { userTimeZone } from '@/lib/format';
import { queryKeys } from '@/lib/query-client';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => api.get<Dashboard>('/dashboard', { tz: userTimeZone() }, signal),
  });
}
