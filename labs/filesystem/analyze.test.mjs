import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyze, formatResult } from './analyze.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'fs-lab-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('empty input excludes the root directory', async (t) => {
  assert.deepEqual(await analyze(await fixture(t)), { files: 0n, directories: 0n, size: 0n });
});

test('counts nested and empty directories, spaces, zero files and UTF-8 bytes', async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, 'nested', 'deep'), { recursive: true });
  await mkdir(join(root, 'empty'));
  await writeFile(join(root, 'file with spaces.txt'), 'abc');
  await writeFile(join(root, 'nested', 'zero'), '');
  await writeFile(join(root, 'nested', 'deep', 'unicode'), 'я');
  assert.deepEqual(await analyze(root), { files: 3n, directories: 3n, size: 5n });
});

test('ignores file, directory, broken and cyclic symlinks', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'real'), 'abc');
  await symlink(join(root, 'real'), join(root, 'file-link'));
  await symlink(root, join(root, 'cycle'));
  await symlink(join(root, 'missing'), join(root, 'broken'));
  assert.deepEqual(await analyze(root), { files: 1n, directories: 0n, size: 3n });
});

test('missing inputs reject instead of returning incomplete totals', async (t) => {
  const root = await fixture(t);
  await assert.rejects(analyze(join(root, 'missing')), { code: 'ENOENT' });
});

test('output is exact and invalid signatures are rejected', () => {
  const counts = { files: 4n, directories: 3n, size: 850n };
  // Synthetic signature only for contract testing, never a student identity.
  assert.equal(formatResult('000000', counts), '000000-4-3-850');
  for (const isu of ['', '12345', '1234567', 'abcdef', '123456\n']) {
    assert.throws(() => formatResult(isu, counts), /six digits/);
  }
});
