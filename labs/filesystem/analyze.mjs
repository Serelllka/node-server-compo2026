import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function analyze(root) {
  let files = 0n;
  let directories = 0n;
  let size = 0n;
  for (const name of await readdir(root)) {
    const path = join(root, name);
    const info = await lstat(path, { bigint: true });
    if (info.isFile()) {
      files++;
      size += info.size;
    } else if (info.isDirectory()) {
      const nested = await analyze(path);
      files += nested.files;
      directories += 1n + nested.directories;
      size += nested.size;
    }
  }
  return { files, directories, size };
}

export function formatResult(isu, { files, directories, size }) {
  if (!/^[0-9]{6}$/.test(isu)) throw new Error('ISU must contain exactly six digits');
  return `${isu}-${files}-${directories}-${size}`;
}
