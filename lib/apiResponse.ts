import { ErrorCode } from "./errors";

/**
 * Formato padrão de resposta de sucesso da API
 */
export type ApiSuccessResponse<T = unknown> = {
  ok: true;
  data: T;
};

/**
 * Formato padrão de resposta de erro da API
 */
export type ApiErrorResponse = {
  ok: false;
  code: string;
  message: string;
};

/**
 * Tipo união para respostas da API
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Cria uma resposta de sucesso
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    ok: true,
    data,
  };
}

/**
 * Cria uma resposta de erro
 */
export function errorResponse(
  code: string,
  message: string
): ApiErrorResponse {
  return {
    ok: false,
    code,
    message,
  };
}

/** Código usado quando o banco está inacessível (ex: Supabase "Tenant or user not found") */
export const ErrorCodeDbUnavailable = "DATABASE_UNAVAILABLE";

/**
 * Verifica se o erro é de conexão/tenant do banco (ex: Supabase)
 */
function isDatabaseConnectionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tenant or user not found") ||
    lower.includes("connection") ||
    lower.includes("econnrefused") ||
    lower.includes("connection refused")
  );
}

/**
 * Helper para tratar erros e retornar resposta padronizada
 */
export function handleApiError(error: unknown): ApiErrorResponse {
  // Se for um AppError, usa os dados dele
  if (error && typeof error === "object" && "code" in error && "message" in error && "statusCode" in error) {
    return errorResponse(
      error.code as string,
      error.message as string
    );
  }

  // Se for um Error comum
  if (error instanceof Error) {
    const msg = error.message || "";
    // Não expor erros de conexão/tenant do banco ao cliente
    if (isDatabaseConnectionError(msg)) {
      console.error("[DB] Erro de conexão (não exposto ao cliente):", msg);
      return errorResponse(
        ErrorCodeDbUnavailable,
        "Banco de dados temporariamente indisponível. Tente novamente em instantes."
      );
    }
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      msg || "Erro interno do servidor"
    );
  }

  // Erro desconhecido
  return errorResponse(
    ErrorCode.INTERNAL_ERROR,
    "Erro interno do servidor"
  );
}
