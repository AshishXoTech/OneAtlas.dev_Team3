export class AppNormalizer {
  /**
   * Cleanly normalizes global app-level string conventions.
   */
  
  normalizeName(name: string): string {
    // Capitalize each word and strip crazy special characters
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  normalizePages(pages: string[]): string[] {
    // Convert to strict web-friendly routes: "User Dashboard" -> "user-dashboard"
    const unique = new Set(pages.map(p => 
      p.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    ));
    return Array.from(unique);
  }

  normalizeFeatures(features: string[]): string[] {
    // Deduplicate array
    return Array.from(new Set(features.map(f => f.trim().toLowerCase())));
  }

  normalizeWorkflows(workflows: string[]): string[] {
    return Array.from(new Set(workflows.map(w => w.trim())));
  }
}
