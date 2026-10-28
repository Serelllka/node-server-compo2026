import { readFile } from 'node:fs/promises';
import { analyze, formatResult } from './analyze.mjs';

try {
  const isu = (await readFile(new URL('./isu.txt', import.meta.url), 'utf8')).trim();
  console.log(formatResult(isu, await analyze('/data')));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
