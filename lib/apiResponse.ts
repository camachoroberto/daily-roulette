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
    return errorResponse(
      ErrorCode.INTERNAL_ERROR,
      error.message || "Erro interno do servidor"
    );
  }

  // Erro desconhecido
  return errorResponse(
    ErrorCode.INTERNAL_ERROR,
    "Erro interno do servidor"
  );
}
