/**
 * Estrae un messaggio leggibile da un errore di tipo `unknown`.
 * Sostituisce il pattern `catch (e: any) { e.message }`, che disabilita i
 * controlli di tipo: qui la variabile del catch resta `unknown` e viene
 * ristretta in modo sicuro.
 */
export function getErrorMessage(error: unknown, fallback = 'Errore'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

/** Codice errore Postgres/Supabase (es. '23505' = unique violation), se presente. */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
