export class Logger {
  private name: string;
  constructor(name: string) {
    this.name = name.padEnd(6, " ");
  }
  log(message: string) {
    console.log(`[${this.name}] ${message}`);
  }
  error(content: string) {
    console.error(`[${this.name}] ${content}`);
  }
}
