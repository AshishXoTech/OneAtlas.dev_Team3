import { ConversationContext, Message, AppState } from './context.types.js';

export class ContextManager {
  // In production, this would be backed by Redis or Postgres for state persistence.
  private contexts: Map<string, ConversationContext> = new Map();

  /**
   * Retrieves or initializes a conversation context session.
   */
  getContext(sessionId: string): ConversationContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, {
        sessionId,
        messages: [],
        appState: this.getEmptyAppState(),
        metadata: {}
      });
    }
    return this.contexts.get(sessionId)!;
  }

  /**
   * Appends a new message to the conversation history while preventing token overflow.
   */
  addMessage(sessionId: string, role: Message['role'], content: string): void {
    const context = this.getContext(sessionId);
    context.messages.push({ role, content, timestamp: Date.now() });
    
    // Context trimming: Keep system prompts, trim middle history, keep recent history
    if (context.messages.length > 20) {
      context.messages = context.messages.filter((msg, index) => 
        msg.role === 'system' || index >= context.messages.length - 15
      );
    }
  }

  /**
   * Intelligently merges dynamically extracted state into the ongoing AppState memory.
   */
  updateAppState(sessionId: string, partialState: Partial<AppState>): void {
    const context = this.getContext(sessionId);
    
    context.appState = {
      ...context.appState,
      ...partialState,
      // Merge arrays uniquely (no duplicates across multi-turn extractions)
      features: Array.from(new Set([...context.appState.features, ...(partialState.features || [])])),
      pages: Array.from(new Set([...context.appState.pages, ...(partialState.pages || [])])),
      entities: Array.from(new Set([...context.appState.entities, ...(partialState.entities || [])])),
      workflows: Array.from(new Set([...context.appState.workflows, ...(partialState.workflows || [])])),
      lastUpdated: Date.now()
    };
  }

  private getEmptyAppState(): AppState {
    return { features: [], pages: [], entities: [], workflows: [], lastUpdated: Date.now() };
  }
}
