import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const createError = (
  message: string,
  statusCode: number,
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode ?? 500;
  const message =
    err.isOperational
      ? err.message
      : process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error';

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('💥 Unhandled Error:', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
