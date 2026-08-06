export enum ErrorCode {
  OK = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalError = 500,

  // Custom AList/OpenListNext codes
  InvalidConfig = 1001,
  InvalidStorage = 1002,
  StorageNotReady = 1003,
  PathNotFound = 1004,
  AccountNotFound = 1005,
  TaskNotFound = 1006,
}

export class OpenListNextNextError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: any,
  ) {
    super(message)
    this.name = "OpenListNextNextError"
  }
}

export const Errs = {
  PathNotFound: new OpenListNextNextError(
    ErrorCode.PathNotFound,
    "Path not found",
  ),
  NotReady: new OpenListNextNextError(
    ErrorCode.StorageNotReady,
    "Storage not ready",
  ),
  InvalidConfig: new OpenListNextNextError(
    ErrorCode.InvalidConfig,
    "Invalid configuration",
  ),
  Unauthorized: new OpenListNextNextError(
    ErrorCode.Unauthorized,
    "Unauthorized access",
  ),
  Forbidden: new OpenListNextNextError(
    ErrorCode.Forbidden,
    "Permission denied",
  ),
}
