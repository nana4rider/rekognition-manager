import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pino } from 'pino';
import { generateSpecs } from 'hono-openapi';
import { format } from 'prettier';

import { createApp } from '../src/http/app.js';
import { createOpenApiOptions } from '../src/http/openapi-document.js';

const outputPath = resolve(import.meta.dirname, '../../../docs/openapi.json');
const packagePath = resolve(import.meta.dirname, '../package.json');
const checkOnly = process.argv.includes('--check');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as { version: string };
const app = createApp(pino({ level: 'silent' }), () => {
  throw new Error('OpenAPI生成時にRekognitionServiceは実行されません');
});
const document = await generateSpecs(app, createOpenApiOptions(packageJson.version));
const generated = await format(JSON.stringify(document), { parser: 'json', printWidth: 100 });

if (checkOnly) {
  const current = await readFile(outputPath, 'utf8').catch(() => '');
  if (current !== generated) {
    console.error(
      'docs/openapi.jsonがBFFの実装と一致しません。npm run openapi:generateを実行してください。',
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, generated);
  console.log(`OpenAPI仕様を${outputPath}へ出力しました。`);
}
