import { ParsedPrompt } from '../parser/prompt.parser.js';

export type AppCategory = "dashboard" | "e-commerce" | "social" | "productivity" | "internal-tool" | "other";

export class AppTypeDetector {
  // Deterministic Keyword Mapping rules
  private static heuristics: Record<AppCategory, string[]> = {
    "dashboard": ["admin", "dashboard", "analytics", "metrics", "crm", "tracker", "panel"],
    "e-commerce": ["store", "shop", "checkout", "cart", "products", "ecommerce", "merchant"],
    "social": ["feed", "friends", "chat", "social", "community", "posts", "forum"],
    "productivity": ["todo", "tasks", "calendar", "notes", "project management", "kanban"],
    "internal-tool": ["backoffice", "hr", "inventory", "internal", "employee", "portal"],
    "other": []
  };

  /**
   * Deterministically identifies app type based on keyword heuristic algorithms.
   * If confidence is high, we bypass the LLM entirely, saving latency and tokens.
   */
  detect(parsed: ParsedPrompt): { type: AppCategory, confidence: number } {
    let bestMatch: AppCategory = "other";
    let highestScore = 0;

    for (const [category, keywords] of Object.entries(AppTypeDetector.heuristics)) {
      let score = 0;
      for (const keyword of keywords) {
        if (parsed.keywords.includes(keyword) || parsed.sanitized.includes(keyword)) {
          score += 1.5; // Weighted match
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = category as AppCategory;
      }
    }

    return { 
      type: bestMatch, 
      confidence: highestScore >= 1.5 ? Math.min(highestScore * 0.3, 0.95) : 0.2 
    };
  }
}
