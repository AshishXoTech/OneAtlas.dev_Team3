import { BaseProvider } from '../providers/base.provider.js';
import { OpenAIProvider } from '../providers/openai.provider.js';
import { GroqProvider } from '../providers/groq.provider.js';
import { GeminiProvider } from '../providers/gemini.provider.js';
import { ClaudeProvider } from '../providers/claude.provider.js';
import { DeepSeekProvider } from '../providers/deepseek.provider.js';
import { OpenRouterProvider } from '../providers/openrouter.provider.js';
import { ROUTING_CONFIG, RouteConfig } from './routing.config.js';
import { ProviderName } from '../config/models.config.js';

export class ModelRouter {
  private providers: Map<ProviderName, BaseProvider> = new Map();

  constructor(keys: { openaiKey?: string; anthropicKey?: string; geminiKey?: string; groqKey?: string; deepseekKey?: string; openrouterKey?: string }) {
    if (keys.openaiKey) {
      this.providers.set('OPENAI', new OpenAIProvider({ apiKey: keys.openaiKey }));
    }
    if (keys.groqKey) {
      this.providers.set('GROQ', new GroqProvider({ apiKey: keys.groqKey }));
    }
    if (keys.geminiKey) {
      this.providers.set('GEMINI', new GeminiProvider({ apiKey: keys.geminiKey }));
    }
    if (keys.anthropicKey) {
      this.providers.set('ANTHROPIC', new ClaudeProvider({ apiKey: keys.anthropicKey }));
    }
    if (keys.deepseekKey) {
      this.providers.set('DEEPSEEK', new DeepSeekProvider({ apiKey: keys.deepseekKey }));
    }
    if (keys.openrouterKey) {
      this.providers.set('OPENROUTER', new OpenRouterProvider({ apiKey: keys.openrouterKey }));
    }
  }

  /**
   * Intelligently selects the optimal provider based on the task type.
   * Gracefully falls back to secondary providers if the primary is offline or unconfigured.
   */
  getProviderForTask(taskType: keyof typeof ROUTING_CONFIG | string): { provider: BaseProvider, config: RouteConfig } {
    const routeConfig = ROUTING_CONFIG[taskType] || ROUTING_CONFIG['DEFAULT'];
    
    // Attempt to get primary provider
    let selectedProvider = this.providers.get(routeConfig.primaryProvider);

    // Fallback handling
    if (!selectedProvider) {
      for (const fallbackName of routeConfig.fallbackProviders) {
        selectedProvider = this.providers.get(fallbackName);
        if (selectedProvider) {
          console.log(`[ModelRouter] Primary provider ${routeConfig.primaryProvider} missing. Falling back to ${fallbackName}.`);
          break;
        }
      }
    }

    if (!selectedProvider) {
      throw new Error(`[ModelRouter] No configured providers available for task type: ${taskType}`);
    }

    return { provider: selectedProvider, config: routeConfig };
  }
}
