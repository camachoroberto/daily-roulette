/**
 * Re-exporta utilitários de resposta padronizada de api-response.ts
 * para manter imports existentes (@/lib/apiResponse).
 *
 * Formato de erro da API: { ok: false, error: string, code: string }
 */
export {
  successResponse,
  errorResponse,
  getHttpStatusForErrorResponse,
  handleApiError,
  ErrorCodeDbUnavailable,
  logStructuredError,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
} from "@/lib/api-response";
