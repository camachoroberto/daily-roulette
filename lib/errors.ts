/**
 * Códigos de erro padronizados para a aplicação
 */
export enum ErrorCode {
  // Validação
  VALIDATION_ERROR = "VALIDATION_ERROR",
  
  // Não encontrado
  NOT_FOUND = "NOT_FOUND",
  
  // Conflito
  CONFLICT = "CONFLICT",
  
  // Erro interno
  INTERNAL_ERROR = "INTERNAL_ERROR",
  
  // Não autorizado (para uso futuro)
  UNAUTHORIZED = "UNAUTHORIZED",
  
  // Proibido (para uso futuro)
  FORBIDDEN = "FORBIDDEN",
  
  // Sem participantes presentes
  NO_PRESENT_PARTICIPANTS = "NO_PRESENT_PARTICIPANTS",
}

/**
 * Classe de erro customizada para a aplicação
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Helpers para criar erros específicos
 */
export const createValidationError = (message: string) =>
  new AppError(ErrorCode.VALIDATION_ERROR, message, 400);

export const createNotFoundError = (message: string = "Recurso não encontrado") =>
  new AppError(ErrorCode.NOT_FOUND, message, 404);

export const createConflictError = (message: string) =>
  new AppError(ErrorCode.CONFLICT, message, 409);

export const createInternalError = (message: string = "Erro interno do servidor") =>
  new AppError(ErrorCode.INTERNAL_ERROR, message, 500);

export const createUnauthorizedError = (message: string = "Não autorizado") =>
  new AppError(ErrorCode.UNAUTHORIZED, message, 401);

export const createForbiddenError = (message: string = "Acesso negado") =>
  new AppError(ErrorCode.FORBIDDEN, message, 403);

export const createNoPresentParticipantsError = (message: string = "Não há participantes presentes") =>
  new AppError(ErrorCode.NO_PRESENT_PARTICIPANTS, message, 400);
