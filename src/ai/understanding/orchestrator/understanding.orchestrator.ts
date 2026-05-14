import { PromptParser, ParsedPrompt } from '../parser/prompt.parser.js';
import { AppTypeDetector, AppCategory } from '../detector/apptype.detector.js';
import { IntentExtractor } from '../extractors/intent.extractor.js';
import { FeatureExtractor } from '../extractors/feature.extractor.js';
import { AppTypeExtractor } from '../extractors/apptype.extractor.js';
import { AppNormalizer } from '../normalizer/app.normalizer.js';
import { EntityNormalizer } from '../normalizer/entity.normalizer.js';
// Import the SHARED authoritative type — this is what the generation engine consumes
import { AppUnderstanding, Entity } from '../../shared/types/app-understanding.types.js';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { logger } from '../../shared/utils/logger.js';
import { truncateToTokenLimit, assertPromptSafe } from '../../shared/utils/token.utils.js';
import { ConfidenceScore, CONFIDENCE_THRESHOLD } from '../../shared/types/common.types.js';

export interface UnderstandingResult {
  data: AppUnderstanding;
  confidence: ConfidenceScore;
  latencyMs: number;
}

export class UnderstandingOrchestrator {
  private parser = new PromptParser();
  private detector = new AppTypeDetector();
  private appNormalizer = new AppNormalizer();
  private entityNormalizer = new EntityNormalizer();

  private intentExtractor: IntentExtractor;
  private featureExtractor: FeatureExtractor;
  private appTypeExtractor: AppTypeExtractor;

  constructor(router: ModelRouter) {
    this.intentExtractor = new IntentExtractor(router);
    this.featureExtractor = new FeatureExtractor(router);
    this.appTypeExtractor = new AppTypeExtractor(router);
  }

  async process(rawPrompt: string): Promise<UnderstandingResult> {
    const start = Date.now();
    logger.info('UnderstandingOrchestrator', 'PIPELINE_START', 'Starting modular extraction pipeline.', {
      promptLength: rawPrompt.length
    });

    // === EDGE CASE: Empty / trivially short prompt ===
    if (!rawPrompt || rawPrompt.trim().length < 5) {
      logger.warn('UnderstandingOrchestrator', 'INVALID_PROMPT', 'Prompt too short for meaningful extraction.');
      throw new Error('Prompt is too short. Please provide a meaningful application description.');
    }

    // === EDGE CASE: Token overflow protection ===
    const { safe, estimatedTokens } = assertPromptSafe(rawPrompt, 3500);
    let safePrompt = rawPrompt;
    if (!safe) {
      logger.warn('UnderstandingOrchestrator', 'TOKEN_OVERFLOW', 'Prompt exceeds safe token limit. Truncating.', { estimatedTokens });
      safePrompt = truncateToTokenLimit(rawPrompt, 3500);
    }

    // 1. Parsing
    const parsed: ParsedPrompt = await logger.trace('PromptParser', 'PARSE', () =>
      Promise.resolve(this.parser.parse(safePrompt))
    );

    // === EDGE CASE: Noisy/empty keyword extraction ===
    if (parsed.keywords.length === 0) {
      logger.warn('UnderstandingOrchestrator', 'NOISY_PROMPT', 'No extractable keywords found. Results may be low confidence.');
    }

    // 2. Hybrid App Type Detection
    let appType: AppCategory;
    let confidence: ConfidenceScore;
    const heuristicResult = this.detector.detect(parsed);

    if (heuristicResult.confidence >= CONFIDENCE_THRESHOLD) {
      appType = heuristicResult.type;
      confidence = { score: heuristicResult.confidence, method: 'heuristic', reliable: true };
      logger.info('UnderstandingOrchestrator', 'APPTYPE_HEURISTIC', `Fast heuristic detection: ${appType}`, { confidence: confidence.score });
    } else if (heuristicResult.confidence <= 0.2 && parsed.keywords.length === 0) {
      // Early-abort: Junk/gibberish prompt — skip expensive AI extraction entirely
      appType = 'other';
      confidence = { score: 0.3, method: 'fallback', reliable: false };
      logger.warn('UnderstandingOrchestrator', 'APPTYPE_EARLY_ABORT', 'Confidence too low and no extractable keywords. Skipping AI extractor.', { heuristicConfidence: heuristicResult.confidence });
    } else {
      logger.info('UnderstandingOrchestrator', 'APPTYPE_AI_FALLBACK', 'Low heuristic confidence. Escalating to AI extractor.', { heuristicConfidence: heuristicResult.confidence });
      appType = await logger.trace('AppTypeExtractor', 'AI_EXTRACT', () =>
        this.appTypeExtractor.extract(parsed.original)
      );
      confidence = { score: 0.75, method: 'ai', reliable: true };
    }

    // 3. Parallel AI Extraction with observability
    const [intentTitle, architecture] = await logger.trace('Extractors', 'PARALLEL_EXTRACT',
      () => Promise.all([
        this.intentExtractor.extract(parsed.original),
        this.featureExtractor.extract(`Intent: ${parsed.original}. Category Scope: ${appType}.`)
      ])
    );

    // === EDGE CASE: Empty extraction results ===
    if (architecture.features.length === 0) {
      logger.warn('UnderstandingOrchestrator', 'EMPTY_FEATURES', 'Feature extractor returned no results. Applying minimal fallback.');
    }

    // 4. Normalization
    /**
     * CRITICAL BRIDGE: Transform AI-extracted entities into standardized Entity objects.
     * We normalize the names but preserve the fields and relationships suggested by the AI.
     */
    const entities: Entity[] = architecture.entities.map(entity => ({
      name: this.entityNormalizer.normalize([entity.name])[0] || entity.name,
      fields: entity.fields,
      relations: entity.relations,
    }));

    const finalUnderstanding: AppUnderstanding = {
      appName: this.appNormalizer.normalizeName(intentTitle),
      appType,
      features: this.appNormalizer.normalizeFeatures(architecture.features),
      pages: this.appNormalizer.normalizePages(architecture.pages),
      entities,
      workflows: this.appNormalizer.normalizeWorkflows(architecture.workflows),
      metadata: {
        rawPrompt: rawPrompt,
      },
    };

    const latencyMs = Date.now() - start;
    logger.info('UnderstandingOrchestrator', 'PIPELINE_COMPLETE', 'Modular pipeline complete.', {
      appName: finalUnderstanding.appName,
      appType: finalUnderstanding.appType,
      featureCount: finalUnderstanding.features.length,
      entityCount: finalUnderstanding.entities.length,
      latencyMs,
      confidence: confidence.score
    });

    return { data: finalUnderstanding, confidence, latencyMs };
  }
}
