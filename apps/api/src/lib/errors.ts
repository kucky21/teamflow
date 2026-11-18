/**
 * Doménové chyby aplikace. Error handler je převádí na jednotný tvar
 * odpovědi `{ error: { code, message, details? } }`.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') => new AppError(400, code, message);

export const unauthorized = (message = 'Pro tuto akci se musíte přihlásit.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'K této akci nemáte oprávnění.', code = 'FORBIDDEN') =>
  new AppError(403, code, message);

export const notFound = (message = 'Požadovaný záznam neexistuje.') => new AppError(404, 'NOT_FOUND', message);

export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message);

export const projectArchived = () =>
  new AppError(409, 'PROJECT_ARCHIVED', 'Projekt je archivovaný a nelze ho upravovat.');

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}
