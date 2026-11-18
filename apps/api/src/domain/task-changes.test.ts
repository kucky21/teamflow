import { describe, expect, it } from 'vitest';

import { compactChanges, diffField, diffList, diffText } from './task-changes.js';

describe('task-changes', () => {
  it('zaznamená jen skutečné změny', () => {
    expect(diffField('title', 'A', 'A')).toBeNull();
    expect(diffField('title', 'A', 'B')).toEqual({ field: 'title', from: 'A', to: 'B' });
  });

  it('porovná seznamy bez ohledu na pořadí', () => {
    expect(diffList('labels', ['b', 'a'], ['a', 'b'])).toBeNull();
    expect(diffList('labels', ['a'], [])).toEqual({ field: 'labels', from: 'a', to: null });
  });

  it('u textu neukládá obsah a prázdné hodnoty považuje za shodné', () => {
    expect(diffText('description', null, '')).toBeNull();
    expect(diffText('description', 'x', 'y')).toEqual({ field: 'description', from: null, to: null });
  });

  it('compactChanges odfiltruje null', () => {
    expect(compactChanges([null, diffField('a', '1', '2'), null])).toHaveLength(1);
  });
});
