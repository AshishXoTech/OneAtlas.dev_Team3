import { ModelRouter } from '../../gateway/router/model.router.js';

export interface ChainStep<T> {
  name: string;
  taskType: string;
  execute: (router: ModelRouter, contextData: any) => Promise<T>;
}

export class ChainRunner {
  private router: ModelRouter;

  constructor(router: ModelRouter) {
    this.router = router;
  }

  /**
   * Executes a series of modular AI steps sequentially.
   * Dynamically merges results into context to be passed to subsequent steps.
   */
  async executeChain<T>(steps: ChainStep<any>[], initialContext: any): Promise<T> {
    console.log(`[ChainRunner] Starting chain execution with ${steps.length} steps.`);
    
    let currentContext = { ...initialContext };

    for (const step of steps) {
      console.log(`[ChainRunner] Executing step: ${step.name}`);
      try {
        const stepResult = await step.execute(this.router, currentContext);
        
        // Accumulate context iteratively
        currentContext = { ...currentContext, [step.name]: stepResult };
      } catch (error) {
        console.error(`[ChainRunner] Critical failure at step: ${step.name}`, error);
        throw new Error(`Chain execution aborted at ${step.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`[ChainRunner] Chain completed successfully.`);
    return currentContext as T; // Final accumulated context containing all step outputs
  }
}
