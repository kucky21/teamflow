import { Compass } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <EmptyState
        icon={Compass}
        title="Stránka nenalezena"
        description="Adresa neexistuje, nebo k ní nemáte přístup."
        action={
          <Button asChild>
            <Link to="/">Zpět na přehled</Link>
          </Button>
        }
      />
    </div>
  );
}
