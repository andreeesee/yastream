export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Rate Limit Error";
  }
}
