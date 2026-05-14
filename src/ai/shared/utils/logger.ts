/**
 * Structured logging system for the AI Understanding Layer pipeline.
 * Emits observable, parseable, structured JSON logs compatible with
 * log aggregators like Datadog, Grafana Loki, and AWS CloudWatch.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface PipelineLogEntry {
  level: LogLevel;
  module: string;
  event: string;
  message: string;
  timestamp: string;
  durationMs?: number;
  meta?: Record<string, any>;
}

class PipelineLogger {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  private emit(entry: PipelineLogEntry) {
    if (!this.enabled) return;
    const output = JSON.stringify(entry);
    if (entry.level === 'ERROR' || entry.level === 'WARN') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  info(module: string, event: string, message: string, meta?: Record<string, any>) {
    this.emit({ level: 'INFO', module, event, message, meta, timestamp: new Date().toISOString() });
  }

  warn(module: string, event: string, message: string, meta?: Record<string, any>) {
    this.emit({ level: 'WARN', module, event, message, meta, timestamp: new Date().toISOString() });
  }

  error(module: string, event: string, message: string, meta?: Record<string, any>) {
    this.emit({ level: 'ERROR', module, event, message, meta, timestamp: new Date().toISOString() });
  }

  /**
   * Records the latency of any async operation and emits a structured trace.
   */
  async trace<T>(module: string, event: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      this.emit({ level: 'INFO', module, event, message: 'Trace complete.', durationMs, timestamp: new Date().toISOString() });
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      this.emit({ level: 'ERROR', module, event, message: 'Trace failed.', durationMs, meta: { error: err instanceof Error ? err.message : String(err) }, timestamp: new Date().toISOString() });
      throw err;
    }
  }
}

export const logger = new PipelineLogger();
