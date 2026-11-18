import { describe, expect, it } from 'vitest';

import { buildPrefixTsQuery } from './search.js';

describe('buildPrefixTsQuery', () => {
  it('vytvoří prefixový dotaz s AND', () => {
    expect(buildPrefixTsQuery('Přihlášení Google')).toBe('přihlášení:* & google:*');
  });

  it('odstraní operátory a speciální znaky (ochrana proti injection do tsquery)', () => {
    expect(buildPrefixTsQuery("a & b | !c <-> d:* ' ;")).toBe('a:* & b:* & c:* & d:*');
    expect(buildPrefixTsQuery('  !!!  ')).toBeNull();
  });

  it('omezí počet termů', () => {
    expect(buildPrefixTsQuery('a b c d e', 2)).toBe('a:* & b:*');
  });
});
