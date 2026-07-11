
export enum ErrorCode {
  OK = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalError = 500,
  
  // Custom AList/OpenList codes
  InvalidConfig = 1001,
  InvalidStorage = 1002,
  StorageNotReady = 1003,
  PathNotFound = 1004,
  AccountNotFound = 1005,
  TaskNotFound = 1006,
}

export class OpenListError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "OpenListError";
  }
}

export const Errs = {
  PathNotFound: new OpenListError(ErrorCode.PathNotFound, "Path not found"),
  NotReady: new OpenListError(ErrorCode.StorageNotReady, "Storage not ready"),
  InvalidConfig: new OpenListError(ErrorCode.InvalidConfig, "Invalid configuration"),
  Unauthorized: new OpenListError(ErrorCode.Unauthorized, "Unauthorized access"),
  Forbidden: new OpenListError(ErrorCode.Forbidden, "Permission denied"),
};
