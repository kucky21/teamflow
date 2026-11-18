import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { PriorityIcon, StatusBadge, UserAvatar } from './domain';
import { EmptyState, ErrorState } from './states';
import { Button } from './ui/button';
import { FolderKanban } from 'lucide-react';

describe('doménové komponenty', () => {
  it('StatusBadge zobrazí český název stavu', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('Probíhá')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Probíhá' })).toBeInTheDocument();
  });

  it('PriorityIcon má přístupný popis', () => {
    render(<PriorityIcon priority="URGENT" />);
    expect(screen.getByRole('img', { name: 'Priorita: Urgentní' })).toBeInTheDocument();
  });

  it('UserAvatar zobrazí iniciály', () => {
    render(<UserAvatar user={{ name: 'Jana Nováková', avatarColor: '#2563EB' }} />);
    expect(screen.getByRole('img', { name: 'Jana Nováková' })).toHaveTextContent('JN');
  });
});

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

  it('Button v režimu načítání je neaktivní', () => {
    render(<Button loading>Uložit</Button>);
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeDisabled();
  });
});
