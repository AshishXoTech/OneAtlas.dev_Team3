/**
 * TODO: Implement custom errors for validation.errors
 */
export class ValidationErrors extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationErrors';
  }
}
