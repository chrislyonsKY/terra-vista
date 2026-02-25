export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerOptions {
  level?: LogLevel;
  json?: boolean;
}

export class Logger {
  private level: number;
  private json: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = LOG_LEVELS[options.level ?? "info"];
    this.json = options.json ?? false;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.level) return;

    if (this.json) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data,
      };
      const stream = level === "error" ? process.stderr : process.stdout;
      stream.write(JSON.stringify(entry) + "\n");
    } else {
      const prefix = `[${level.toUpperCase().padEnd(5)}]`;
      const msg = data ? `${message} ${JSON.stringify(data)}` : message;
      const stream = level === "error" ? process.stderr : process.stdout;
      stream.write(`${prefix} ${msg}\n`);
    }
  }
}
