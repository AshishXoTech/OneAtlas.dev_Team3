/**
 * Types and interfaces for Conversation and App Context Management.
 * Crucial for iterative multi-turn prompting and App refinement.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AppState {
  appName?: string;
  appType?: string;
  features: string[];
  pages: string[];
  entities: string[];
  workflows: string[];
  lastUpdated: number;
}

export interface ConversationContext {
  sessionId: string;
  messages: Message[];
  appState: AppState;
  metadata: Record<string, any>;
}
