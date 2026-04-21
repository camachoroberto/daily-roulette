import { ErrorCode } from "@/lib/errors";
import { isDatabaseConnectionError } from "@/lib/db-retry";

/**
 * Resposta de sucesso da API (padrão).
 */
export type ApiSuccessResponse<T = unknown> = {
  ok: true;
  data: T;
};

/**
 * Resposta de erro da API (padrão).
 * Formato: { ok: false, error: string, code: string }
 */
export type ApiErrorResponse = {
  ok: false;
  error: string;
  code: string;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { ok: true, data };
}

export function errorResponse(code: string, error: string): ApiErrorResponse {
  return { ok: false, code, error };
}

/** Código quando o banco está inacessível (ex.: Supabase pausado) */
export const ErrorCodeDbUnavailable = "DATABASE_UNAVAILABLE";

export function getHttpStatusForErrorResponse(response: ApiErrorResponse): number {
  if (response.code === ErrorCodeDbUnavailable) return 503;
  switch (response.code) {
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.NO_PRESENT_PARTICIPANTS:
      return 400;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.CONFLICT:
    case ErrorCode.DUPLICATE_PARTICIPANT_NAME:
      return 409;
    default:
      return 500;
  }
}

/**
 * Log estruturado de erro (para console em produção).
 * Formato: { level, timestamp, code?, error, context? }
 */
export function logStructuredError(payload: {
  code?: string;
  error: string;
  context?: string;
  raw?: string;
}): void {
  const entry = {
    level: "error",
    timestamp: new Date().toISOString(),
    ...(payload.code && { code: payload.code }),
    error: payload.error,
    ...(payload.context && { context: payload.context }),
    ...(payload.raw && { raw: payload.raw }),
  };
  console.error(JSON.stringify(entry));
}

/**
 * Trata erro e retorna resposta padronizada { ok: false, error, code }.
 * Em caso de erro, faz log estruturado no console.
 */
export function handleApiError(error: unknown, context?: string): ApiErrorResponse {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    "statusCode" in error
  ) {
    const code = (error as { code: string }).code;
    const msg = (error as { message: string }).message;
    logStructuredError({ code, error: msg, context });
    return errorResponse(code, msg);
  }

  if (error instanceof Error) {
    const msg = error.message || "Erro interno do servidor";
    if (isDatabaseConnectionError(msg)) {
      logStructuredError({
        code: ErrorCodeDbUnavailable,
        error: "Banco de dados temporariamente indisponível",
        context,
        raw: msg,
      });
      return errorResponse(
        ErrorCodeDbUnavailable,
        "Banco de dados temporariamente indisponível. Tente novamente em instantes."
      );
    }
    logStructuredError({
      code: ErrorCode.INTERNAL_ERROR,
      error: msg,
      context,
    });
    return errorResponse(ErrorCode.INTERNAL_ERROR, msg || "Erro interno do servidor");
  }

  logStructuredError({
    code: ErrorCode.INTERNAL_ERROR,
    error: "Erro desconhecido",
    context,
  });
  return errorResponse(ErrorCode.INTERNAL_ERROR, "Erro interno do servidor");
}
