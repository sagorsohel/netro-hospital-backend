// Error carrying an HTTP status code, picked up by the global errorHandler
export class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized request.") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden.") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found.") {
    return new ApiError(404, message);
  }
}
