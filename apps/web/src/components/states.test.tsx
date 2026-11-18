import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderKanban } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

import { EmptyState, ErrorState } from './states';

describe('stavové komponenty', () => {
  it('ErrorState zobrazí zprávu z API a umožní opakování', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new ApiError(500, 'X', 'Databáze není dostupná.')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Databáze není dostupná.');
    await userEvent.click(screen.getByRole('button', { name: /Zkusit znovu/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('EmptyState zobrazí titulek a akci', () => {
    render(<EmptyState icon={FolderKanban} title="Žádné projekty" action={<Button>Vytvořit</Button>} />);
    expect(screen.getByText('Žádné projekty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vytvořit' })).toBeInTheDocument();
  });
});
