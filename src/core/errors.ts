export type ErrorCode =
  | 'malformed'
  | 'limit'
  | 'unknown_field'
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'no_change'
  | 'meaning_change'
  | 'idempotency_mismatch'
  | 'storage_failure'
  | 'storage_full'
  | 'unsupported_version'
  | 'dependency';

export interface DomainError {
  code: ErrorCode;
  message: string;
  path?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: DomainError[] };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(code: ErrorCode, message: string, path?: string): Result<never> {
  return { ok: false, errors: [{ code, message, ...(path ? { path } : {}) }] };
}

export function failures(errors: DomainError[]): Result<never> {
  return { ok: false, errors };
}
