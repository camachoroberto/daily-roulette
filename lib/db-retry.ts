/**
 * Utilitários para retry em falhas de conexão com o banco.
 */

export function isDatabaseConnectionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tenant or user not found") ||
    lower.includes("connection") ||
    lower.includes("econnrefused") ||
    lower.includes("connection refused")
  );
}

const DEFAULT_MAX_ATTEMPTS = 3; // 1 tentativa inicial + 2 retries

/**
 * Executa uma função assíncrona e, em caso de falha de conexão com o banco,
 * refaz até no máximo (maxAttempts - 1) vezes (ex.: maxAttempts 3 = 2 retries).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const message = e instanceof Error ? e.message : String(e);
      const shouldRetry =
        attempt < maxAttempts && isDatabaseConnectionError(message);
      if (!shouldRetry) throw e;
      // Retry: próximo attempt
    }
  }
  throw lastError;
}
