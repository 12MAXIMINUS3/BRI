/**
 * Thrown by API functions whose backend is not built yet. The UI shows these
 * as an informational notice rather than a failure, and never pretends the
 * action succeeded.
 */
export class NotConnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotConnectedError';
  }
}

export function isNotConnectedError(error: unknown): error is NotConnectedError {
  return error instanceof NotConnectedError;
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
