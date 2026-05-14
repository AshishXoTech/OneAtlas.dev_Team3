import { AIError } from './ai.errors.js';

/**
 * Thrown when AI output fails to pass Zod schema validation.
 */
export class ValidationError extends AIError {
  constructor(module: string, message: string, public details?: any) {
    super(module, 'VALIDATION_FAILURE', message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when the recovery pipeline fails to repair a malformed payload.
 */
export class RecoveryError extends AIError {
  constructor(module: string, message: string, public originalError?: any) {
    super(module, 'RECOVERY_FAILURE', message, { originalError });
    this.name = 'RecoveryError';
  }
}
