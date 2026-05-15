import { MutationPatch } from '../../validation/schemas/mutation.schema.js';

export interface TurnHistory {
  userPrompt: string;
  appliedPatches: MutationPatch[];
  timestamp: number;
}

export interface Session {
  id: string;
  history: TurnHistory[];
}

export class MemoryManager {
  // In-memory store for Phase 3 testing. In production, this moves to Upstash Redis.
  private sessions = new Map<string, Session>();
  private readonly MAX_HISTORY_LENGTH = 5;

  getOrCreateSession(sessionId: string): Session {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { id: sessionId, history: [] });
    }
    return this.sessions.get(sessionId)!;
  }

  addTurn(sessionId: string, prompt: string, patches: MutationPatch[]): void {
    const session = this.getOrCreateSession(sessionId);
    session.history.push({
      userPrompt: prompt,
      appliedPatches: patches,
      timestamp: Date.now()
    });

    // Enforce sliding window to prevent token overflow
    if (session.history.length > this.MAX_HISTORY_LENGTH) {
      session.history.shift();
    }
  }

  getTurnHistory(sessionId: string): TurnHistory[] {
    return this.getOrCreateSession(sessionId).history;
  }

  formatHistoryForPrompt(sessionId: string): string {
    const history = this.getTurnHistory(sessionId);
    if (history.length === 0) return 'No previous conversational history.';

    return history.map((turn, index) => {
      const summary = turn.appliedPatches.map(p => 
        `[${p.operation} ${p.targetScope}] ${p.reasoning}`
      ).join(', ');
      
      return `Turn -${history.length - index}:
User Prompt: "${turn.userPrompt}"
System Action: ${summary}`;
    }).join('\n\n');
  }
}
