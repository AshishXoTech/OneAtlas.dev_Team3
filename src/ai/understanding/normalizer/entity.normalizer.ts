export class EntityNormalizer {
  /**
   * Deterministically normalizes entity (database table) names.
   * Transforms raw LLM guesses into Prisma-safe standard formats.
   * e.g., "users" -> "User", "auth system" -> "Auth"
   */
  normalize(entities: string[]): string[] {
    const unique = new Set(entities.map(e => {
      let name = e.trim();
      
      // Basic singularization rules (extremely safe fallback)
      if (name.toLowerCase().endsWith('ies')) {
        name = name.slice(0, -3) + 'y';
      } else if (name.toLowerCase().endsWith('s') && !name.toLowerCase().endsWith('ss')) {
        name = name.slice(0, -1);
      }
      
      // Enforce PascalCase formatting for Database models
      name = name.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return word.toUpperCase();
      }).replace(/\s+/g, '');

      // Remove generic filler words the LLM might hallucinate
      return name.replace(/(System|Module|App|Table|Model)$/ig, '').trim();
    }).filter(Boolean));

    return Array.from(unique);
  }
}
