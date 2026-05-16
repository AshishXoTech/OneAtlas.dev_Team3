import { BaseProvider } from '../providers/base.provider.js';
import { OpenAIProvider } from '../providers/openai.provider.js';
import { GroqProvider } from '../providers/groq.provider.js';
import { GeminiProvider } from '../providers/gemini.provider.js';
import { ClaudeProvider } from '../providers/claude.provider.js';
import { DeepSeekProvider } from '../providers/deepseek.provider.js';
import { OpenRouterProvider } from '../providers/openrouter.provider.js';
import { MistralProvider } from '../providers/mistral.provider.js';
import { ROUTING_CONFIG, RouteConfig } from './routing.config.js';
import { ProviderName } from '../config/models.config.js';
import { ProviderHealthTracker } from './provider.health.js';
import { logger } from '../../shared/utils/logger.js';

export class ModelRouter {
  private providers: Map<ProviderName, BaseProvider> = new Map();
  private healthTracker = new ProviderHealthTracker();

  constructor(keys: { 
    openaiKey?: string; 
    anthropicKey?: string; 
    geminiKey?: string; 
    groqKey?: string; 
    deepseekKey?: string; 
    openrouterKey?: string; 
    mistralKey?: string 
  } = {}) {
    // Principal Infra Strategy: Load from env if not explicitly provided (prevents test-runner collapse)
    const activeKeys = {
      openaiKey: keys.openaiKey || process.env.OPENAI_API_KEY,
      anthropicKey: keys.anthropicKey || process.env.ANTHROPIC_API_KEY,
      geminiKey: keys.geminiKey || process.env.GEMINI_API_KEY,
      groqKey: keys.groqKey || process.env.GROQ_API_KEY,
      deepseekKey: keys.deepseekKey || process.env.DEEPSEEK_API_KEY,
      openrouterKey: keys.openrouterKey || process.env.OPENROUTER_API_KEY,
      mistralKey: keys.mistralKey || process.env.MISTRAL_API_KEY
    };

    if (activeKeys.openaiKey) this.providers.set('OPENAI', new OpenAIProvider({ apiKey: activeKeys.openaiKey }));
    if (activeKeys.groqKey) this.providers.set('GROQ', new GroqProvider({ apiKey: activeKeys.groqKey }));
    if (activeKeys.geminiKey) this.providers.set('GEMINI', new GeminiProvider({ apiKey: activeKeys.geminiKey }));
    if (activeKeys.anthropicKey) this.providers.set('ANTHROPIC', new ClaudeProvider({ apiKey: activeKeys.anthropicKey }));
    if (activeKeys.deepseekKey) this.providers.set('DEEPSEEK', new DeepSeekProvider({ apiKey: activeKeys.deepseekKey }));
    if (activeKeys.openrouterKey) this.providers.set('OPENROUTER', new OpenRouterProvider({ apiKey: activeKeys.openrouterKey }));
    if (activeKeys.mistralKey) this.providers.set('MISTRAL', new MistralProvider({ apiKey: activeKeys.mistralKey }));

    logger.info('ModelRouter', 'INITIALIZED', `Registered ${this.providers.size} providers.`, {
      available: Array.from(this.providers.keys())
    });
  }

  getProviderForTask(taskType: string, attempt: number = 0): { provider: BaseProvider, config: RouteConfig, name: ProviderName } {
    const routeConfig = ROUTING_CONFIG[taskType] || ROUTING_CONFIG['DEFAULT'];
    
    // Adaptive Routing Logic:
    // 1. Check primary provider health
    // 2. If unhealthy or on retry > 0, cycle through healthy fallback providers
    
    const candidates: ProviderName[] = [routeConfig.primaryProvider, ...routeConfig.fallbackProviders];
    
    for (let i = 0; i < candidates.length; i++) {
      const providerName = candidates[(i + attempt) % candidates.length];
      const provider = this.providers.get(providerName);
      
      if (provider && this.healthTracker.isHealthy(providerName)) {
        if (i > 0 || attempt > 0) {
          logger.info('ModelRouter', 'ADAPTIVE_ROUTING', `Routing to ${providerName} (Attempt: ${attempt}, Index: ${i})`);
        }
        return { provider, config: routeConfig, name: providerName };
      }
    }

    // Last resort: Return primary if everything is unhealthy but configured
    const primary = this.providers.get(routeConfig.primaryProvider);
    if (primary) return { provider: primary, config: routeConfig, name: routeConfig.primaryProvider };

    throw new Error(`[ModelRouter] No configured and healthy providers available for task: ${taskType}`);
  }

  recordFailure(providerName: ProviderName, error: any): void {
    this.healthTracker.recordFailure(providerName, error);
  }

  recordSuccess(providerName: ProviderName): void {
    this.healthTracker.recordSuccess(providerName);
  }
}
