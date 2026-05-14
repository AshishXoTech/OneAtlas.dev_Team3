import fs from 'fs';
import path from 'path';

const fileList = [
  'src/ai/gateway/providers/openai.provider.ts',
  'src/ai/gateway/providers/claude.provider.ts',
  'src/ai/gateway/providers/gemini.provider.ts',
  'src/ai/gateway/providers/base.provider.ts',
  'src/ai/gateway/router/model.router.ts',
  'src/ai/gateway/router/routing.config.ts',
  'src/ai/gateway/config/models.config.ts',
  'src/ai/gateway/config/provider.config.ts',
  'src/ai/gateway/types/gateway.types.ts',
  'src/ai/gateway/types/provider.types.ts',
  'src/ai/gateway/index.ts',

  'src/ai/prompts/system/understanding.system.ts',
  'src/ai/prompts/system/extraction.system.ts',
  'src/ai/prompts/templates/app-understanding.template.ts',
  'src/ai/prompts/templates/feature-extraction.template.ts',
  'src/ai/prompts/templates/intent-detection.template.ts',
  'src/ai/prompts/chains/understanding.chain.ts',
  'src/ai/prompts/chains/chain.runner.ts',
  'src/ai/prompts/context/context.manager.ts',
  'src/ai/prompts/context/context.types.ts',
  'src/ai/prompts/index.ts',

  'src/ai/validation/schemas/app-understanding.schema.ts',
  'src/ai/validation/schemas/feature.schema.ts',
  'src/ai/validation/schemas/intent.schema.ts',
  'src/ai/validation/recovery/response.recovery.ts',
  'src/ai/validation/recovery/fallback.strategies.ts',
  'src/ai/validation/formatters/output.formatter.ts',
  'src/ai/validation/orchestrator/validation.orchestrator.ts',
  'src/ai/validation/index.ts',

  'src/ai/understanding/parser/prompt.parser.ts',
  'src/ai/understanding/parser/parser.utils.ts',
  'src/ai/understanding/extractors/intent.extractor.ts',
  'src/ai/understanding/extractors/feature.extractor.ts',
  'src/ai/understanding/extractors/apptype.extractor.ts',
  'src/ai/understanding/normalizer/app.normalizer.ts',
  'src/ai/understanding/normalizer/entity.normalizer.ts',
  'src/ai/understanding/detector/apptype.detector.ts',
  'src/ai/understanding/orchestrator/understanding.orchestrator.ts',
  'src/ai/understanding/index.ts',

  'src/ai/generators/schema/entity.generator.ts',
  'src/ai/generators/schema/field.generator.ts',
  'src/ai/generators/schema/relationship.generator.ts',
  'src/ai/generators/schema/prisma.builder.ts',
  'src/ai/generators/code/page.generator.ts',
  'src/ai/generators/code/crud.generator.ts',
  'src/ai/generators/code/component.generator.ts',
  'src/ai/generators/code/route.generator.ts',
  'src/ai/generators/code/layout.generator.ts',
  'src/ai/generators/index.ts',

  'src/ai/workflows/pipeline/generation.pipeline.ts',
  'src/ai/workflows/pipeline/pipeline.executor.ts',
  'src/ai/workflows/optimization/cache.service.ts',
  'src/ai/workflows/optimization/retry.service.ts',
  'src/ai/workflows/optimization/token.tracker.ts',
  'src/ai/workflows/state/generation.state.ts',
  'src/ai/workflows/state/state.store.ts',
  'src/ai/workflows/index.ts',

  'src/ai/shared/contracts/app-understanding.contract.ts',
  'src/ai/shared/contracts/generation.contract.ts',
  'src/ai/shared/types/app-understanding.types.ts',
  'src/ai/shared/types/generation.types.ts',
  'src/ai/shared/types/common.types.ts',
  'src/ai/shared/constants/app-types.constants.ts',
  'src/ai/shared/constants/feature.constants.ts',
  'src/ai/shared/errors/ai.errors.ts',
  'src/ai/shared/errors/validation.errors.ts',
  'src/ai/shared/utils/token.utils.ts',
  'src/ai/shared/utils/json.utils.ts'
];

fileList.forEach(file => {
  const fullPath = path.join(__dirname, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  const fileName = path.basename(file);
  const isIndex = fileName === 'index.ts';
  const nameWithoutExt = fileName.replace('.ts', '');
  
  const generateInterfaceName = (str) => {
    return str.split(/[-.]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  let content = '';

  if (isIndex) {
    const moduleDir = path.dirname(file);
    const subFiles = fileList.filter(f => f.startsWith(moduleDir + '/') && f !== file);
    
    const exportsSet = new Set();
    subFiles.forEach(subFile => {
      let relPath = path.relative(moduleDir, path.dirname(path.join(__dirname, subFile))).replace(/\\\\/g, '/');
      if (relPath === '') relPath = '.';
      else relPath = './' + relPath;
      
      const subFileName = path.basename(subFile, '.ts');
      exportsSet.add(`export * from '${relPath}/${subFileName}';`);
    });
    
    content = `// TODO: Module entry point - Barrel file\n\n` + Array.from(exportsSet).join('\n') + '\n';
  } else {
    let specialComment = '';
    if (file === 'src/ai/shared/types/app-understanding.types.ts') {
      specialComment = `/**\n * CRITICAL BOUNDARY: Contract boundary between Teammate 1 (AI Layer) and Teammate 2 (Generation Engine).\n * DO NOT modify without cross-team agreement.\n */\n`;
    }

    if (fileName.includes('types') || fileName.includes('schema') || fileName.includes('contract')) {
      const typeName = generateInterfaceName(nameWithoutExt);
      content = `${specialComment}/**\n * TODO: Define ${nameWithoutExt} structure\n */\nexport interface ${typeName} {\n  // Add properties here\n}\n`;
    } else if (fileName.includes('constants') || fileName.includes('config')) {
      const constName = nameWithoutExt.split('.')[0].toUpperCase() + '_' + (nameWithoutExt.split('.')[1] ? nameWithoutExt.split('.')[1].toUpperCase() : 'CONST');
      content = `/**\n * TODO: Define configuration/constants for ${nameWithoutExt}\n */\nexport const ${constName} = {};\n`;
    } else if (fileName.includes('errors')) {
      const className = generateInterfaceName(nameWithoutExt);
      content = `/**\n * TODO: Implement custom errors for ${nameWithoutExt}\n */\nexport class ${className} extends Error {\n  constructor(message: string) {\n    super(message);\n    this.name = '${className}';\n  }\n}\n`;
    } else {
      const className = generateInterfaceName(nameWithoutExt);
      content = `/**\n * TODO: Implement ${nameWithoutExt} logic\n */\nexport class ${className} {\n  constructor() {}\n  \n  // Add methods here\n}\n`;
    }
  }

  fs.writeFileSync(fullPath, content);
  console.log(`Created: ${file}`);
});
