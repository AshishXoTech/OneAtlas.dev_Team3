/**
 * TODO: Implement custom errors for ai.errors
 */
export class AiErrors extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiErrors';
  }
}
