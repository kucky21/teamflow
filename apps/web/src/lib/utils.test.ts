import { describe, expect, it } from 'vitest';

import { initials, plural } from './utils';

describe('utils', () => {
  it('initials vrátí iniciály jména a příjmení', () => {
    expect(initials('Tereza Dvořáková')).toBe('TD');
    expect(initials('Jan')).toBe('J');
    expect(initials('  ')).toBe('?');
  });

  it('plural volí správný český tvar', () => {
    const forms: [string, string, string] = ['úkol', 'úkoly', 'úkolů'];
    expect([0, 1, 2, 4, 5, 22].map((n) => plural(n, forms))).toEqual([
      'úkolů',
      'úkol',
      'úkoly',
      'úkoly',
      'úkolů',
      'úkolů',
    ]);
  });
});
