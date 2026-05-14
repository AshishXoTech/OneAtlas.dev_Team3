/**
 * Utility functions for robust JSON parsing and handling.
 * Specifically handles the common "markdown-wrapped" JSON issue from LLMs.
 */
export class JsonUtils {
  /**
   * Cleans a string that potentially contains markdown code blocks
   * and returns only the content inside the first JSON block.
   */
  static cleanMarkdown(content: string): string {
    // Regex to capture content between ```json and ```
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const match = content.match(jsonBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: try to find anything between the first { and the last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return content.slice(firstBrace, lastBrace + 1).trim();
    }

    return content.trim();
  }

  /**
   * Safe JSON parse that handles errors gracefully.
   */
  static safeParse<T>(content: string): T | null {
    try {
      const cleaned = this.cleanMarkdown(content);
      return JSON.parse(cleaned) as T;
    } catch (err) {
      return null;
    }
  }
}
