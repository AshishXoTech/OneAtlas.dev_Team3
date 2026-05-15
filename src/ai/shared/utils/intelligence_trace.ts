import { logger } from './logger.js';

export interface IntelligenceSpan {
  id: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  retries: number;
  model: string;
}

/**
 * Singleton tracer to aggregate metrics across a single pipeline request.
 * In a real-world multi-user environment, this would be tied to a RequestID/AsyncLocalStorage.
 * For this local build, we use a simple stateful tracer.
 */
class IntelligenceTracer {
  private spans: IntelligenceSpan[] = [];
  private securityTriggers: string[] = [];

  reset() {
    this.spans = [];
    this.securityTriggers = [];
  }

  recordSpan(span: IntelligenceSpan) {
    this.spans.push(span);
  }

  recordSecurityTrigger(guardName: string) {
    this.securityTriggers.push(guardName);
  }

  getSummary() {
    const totalTokensIn = this.spans.reduce((acc, s) => acc + s.tokensIn, 0);
    const totalTokensOut = this.spans.reduce((acc, s) => acc + s.tokensOut, 0);
    const totalLatency = this.spans.reduce((acc, s) => acc + s.latencyMs, 0);
    const totalRetries = this.spans.reduce((acc, s) => acc + s.retries, 0);

    return {
      totalTokens: totalTokensIn + totalTokensOut,
      breakdown: { tokensIn: totalTokensIn, tokensOut: totalTokensOut },
      totalLatencyMs: totalLatency,
      totalRetries,
      spanCount: this.spans.length,
      securityTriggers: this.securityTriggers,
      spans: this.spans.map(s => ({
        id: s.id,
        model: s.model,
        latency: s.latencyMs,
        success: s.success
      }))
    };
  }

  emitTrace() {
    const summary = this.getSummary();
    logger.info('IntelligenceTracer', 'INTELLIGENCE_TRACE', 'Full pipeline trace aggregated.', {
      telemetry: summary
    });
  }
}

export const tracer = new IntelligenceTracer();
