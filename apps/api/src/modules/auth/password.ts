import * as argon2 from 'argon2';

/**
 * Argon2id s parametry dle doporučení OWASP (19 MiB paměti, 2 iterace, 1 vlákno).
 * Parametry jsou uloženy přímo v hashi, takže je lze později zvýšit
 * bez invalidace existujících hesel.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Hash používaný při přihlášení neexistujícího uživatele, aby doba odpovědi
 * neprozrazovala, zda je e-mail registrovaný (ochrana proti enumeraci účtů).
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('teamflow-timing-equalizer-0');
  return dummyHash;
}
