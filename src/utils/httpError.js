export class HttpError extends Error {
  constructor(message, statusCode, errorCode, originalError) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = errorCode; // 'TOKEN_EXPIRED', 'TOKEN_INVALID', etc.
    this.originalError = originalError;
  }
  
  isUnauthorized() {
    return this.statusCode === 401;
  }
  
  isTokenExpired() {
    return this.statusCode === 401 && (
      this.errorCode === 'TOKEN_EXPIRED' ||
      (this.message && this.message.toLowerCase().includes('expirado'))
    );
  }
  
  isTokenInvalid() {
    return this.statusCode === 401 && (
      this.errorCode === 'TOKEN_INVALID' ||
      this.errorCode === 'NO_TOKEN'
    );
  }
  
  isNetworkError() {
    return !this.statusCode;
  }
}
