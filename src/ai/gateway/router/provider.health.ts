import { ProviderName } from '../config/models.config.js';
import { logger } from '../../shared/utils/logger.js';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED', // 429s or high latency
  OFFLINE = 'OFFLINE'    // 5xx or connection errors
}

interface ProviderState {
  status: HealthStatus;
  lastFailureAt?: number;
  failureCount: number;
  cooldownUntil?: number;
  quotaExhausted: boolean;
}

export class ProviderHealthTracker {
  private states: Map<ProviderName, ProviderState> = new Map();
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown for degraded providers

  constructor() {}

  getState(provider: ProviderName): ProviderState {
    if (!this.states.has(provider)) {
      this.states.set(provider, {
        status: HealthStatus.HEALTHY,
        failureCount: 0,
        quotaExhausted: false
      });
    }
    return this.states.get(provider)!;
  }

  recordSuccess(provider: ProviderName): void {
    const state = this.getState(provider);
    state.status = HealthStatus.HEALTHY;
    state.failureCount = 0;
    state.quotaExhausted = false;
    state.cooldownUntil = undefined;
  }

  recordFailure(provider: ProviderName, error: any): void {
    const state = this.getState(provider);
    state.lastFailureAt = Date.now();
    state.failureCount++;

    const errorMessage = String(error).toLowerCase();
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      state.status = HealthStatus.DEGRADED;
      state.quotaExhausted = true;
      state.cooldownUntil = Date.now() + this.COOLDOWN_MS;
      logger.warn('ProviderHealth', 'QUOTA_EXHAUSTED', `${provider} marked as DEGRADED due to rate limits.`, { cooldown: '60s' });
    } else {
      state.status = HealthStatus.OFFLINE;
      state.cooldownUntil = Date.now() + (this.COOLDOWN_MS * 5); // 5 minute cooldown for offline
      logger.error('ProviderHealth', 'PROVIDER_OFFLINE', `${provider} marked as OFFLINE due to critical error.`, { error: errorMessage });
    }
  }

  isHealthy(provider: ProviderName): boolean {
    const state = this.getState(provider);
    if (state.status === HealthStatus.HEALTHY) return true;
    
    // Check if cooldown has expired
    if (state.cooldownUntil && Date.now() > state.cooldownUntil) {
      logger.info('ProviderHealth', 'COOLDOWN_EXPIRED', `Attempting to restore ${provider} to HEALTHY state.`);
      state.status = HealthStatus.HEALTHY;
      state.quotaExhausted = false;
      return true;
    }

    return false;
  }
}
