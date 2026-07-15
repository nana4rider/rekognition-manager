export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApplicationError';
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(message: string, options?: ErrorOptions) {
    super('RESOURCE_NOT_FOUND', message, 404, options);
  }
}

export class ResourceConflictError extends ApplicationError {
  constructor(message: string, options?: ErrorOptions) {
    super('RESOURCE_CONFLICT', message, 409, options);
  }
}

export class InvalidInputError extends ApplicationError {
  constructor(message: string, options?: ErrorOptions) {
    super('INVALID_INPUT', message, 400, options);
  }
}
