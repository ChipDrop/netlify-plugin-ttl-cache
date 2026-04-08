import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

/** Returns an array of file paths within the given directory */
export const getDirFilenames = async (dir: string): Promise<string[]> => {
  const files = await readdir(dir);
  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = join(dir, file);
      const isDirectory = (await stat(filePath)).isDirectory();
      if (isDirectory) {
        return getDirFilenames(filePath);
      }

      return filePath;
    }),
  );
  return results.flat();
};

/** Returns number of days between two dates */
export const getDaysApart = (d1: Date, d2: Date): number =>
  Math.ceil(Math.abs(Number(d1) - Number(d2)) / (1000 * 60 * 60 * 24));

/** Add trailing slash to string */
export const addTrailingSlash = (str: string): string =>
  str.replace(/\/?$/, '/');
