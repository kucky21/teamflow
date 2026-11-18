import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ErrorState } from '@/components/states';
import { Logo } from '@/components/domain';
import { useMe } from './api';

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo withText={false} className="animate-shimmer" />
        <span className="sr-only">Načítání…</span>
      </div>
    </div>
  );
}

/** Chráněná část aplikace – nepřihlášeného uživatele pošle na přihlášení. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullScreenLoader />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => void me.refetch()} className="min-h-dvh" />;
  if (!me.data) {
    const next = location.pathname + location.search;
    return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

/** Přihlášení a registrace – přihlášeného uživatele pošle dál. */
export function GuestOnly() {
  const me = useMe();
  const [params] = useSearchParams();
  if (me.isPending) return <FullScreenLoader />;
  if (me.data) {
    const next = params.get('next');
    // Přesměrováváme jen v rámci aplikace (ochrana proti open redirect).
    return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />;
  }
  return <Outlet />;
}
