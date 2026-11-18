import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PriorityIcon } from './priority';
import { StatusBadge } from './status';
import { UserAvatar } from './user-avatar';

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
