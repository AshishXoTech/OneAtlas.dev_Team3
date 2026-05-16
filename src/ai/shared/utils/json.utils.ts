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
   * Deeply repairs truncated JSON by closing dangling braces/brackets.
   * Essential for recovering partial semantic state from cut-off provider outputs.
   */
  static tryRepairTruncated(content: string): string {
    let cleaned = content.trim();
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) return cleaned;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && !escaped) inString = !inString;
      if (inString) {
        escaped = char === '\\' && !escaped;
        continue;
      }

      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }

    return cleaned + stack.reverse().join('');
  }

  /**
   * Safe JSON parse that handles errors gracefully.
   * Now with aggressive truncated recovery.
   */
  static safeParse<T>(content: string): T | null {
    const cleaned = this.cleanMarkdown(content);
    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      try {
        const repaired = this.tryRepairTruncated(cleaned);
        return JSON.parse(repaired) as T;
      } catch (secondErr) {
        return null;
      }
    }
  }
}
