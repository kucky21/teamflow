import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('Button v režimu načítání je neaktivní', () => {
    render(<Button loading>Uložit</Button>);
    expect(screen.getByRole('button', { name: 'Uložit' })).toBeDisabled();
  });
});
