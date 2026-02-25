import { randomUUID } from "node:crypto";
import type { RunConfig } from "@mapqc/shared";
import { Logger, type LoggerOptions } from "./logger.js";

export class RunContext {
  readonly runId: string;
  readonly config: RunConfig;
  readonly logger: Logger;
  readonly startTime: number;

  constructor(config: RunConfig, loggerOptions?: LoggerOptions) {
    this.runId = randomUUID();
    this.config = config;
    this.logger = new Logger(loggerOptions);
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

export function createRunContext(config: RunConfig, loggerOptions?: LoggerOptions): RunContext {
  return new RunContext(config, loggerOptions);
}
