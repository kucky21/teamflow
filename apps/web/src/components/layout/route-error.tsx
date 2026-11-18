import { Home, RotateCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '../ui/button';

/** Zachytí neošetřené chyby při vykreslení stránky (error boundary routeru). */
export function RouteError() {
  const error = useRouteError();
  const isChunkError =
    error instanceof Error &&
    /dynamically imported module|Failed to fetch|Importing a module script/i.test(error.message);

  const title = isRouteErrorResponse(error) && error.status === 404 ? 'Stránka nenalezena' : 'Něco se pokazilo';
  const message = isChunkError
    ? 'Aplikace byla mezitím aktualizována. Obnovte prosím stránku.'
    : 'Při zobrazení stránky došlo k neočekávané chybě. Zkuste ji obnovit, případně se vraťte na přehled.';

  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm font-semibold text-primary">Chyba</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RotateCw /> Obnovit
          </Button>
          <Button asChild>
            <Link to="/">
              <Home /> Na přehled
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
