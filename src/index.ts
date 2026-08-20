import { stat, unlink, rm } from 'node:fs/promises';
import { getDaysApart, getDirFilenames, addTrailingSlash } from './utils.js';
import type { NetlifyPlugin } from '@netlify/build';

const TMP_CACHE_DIR = '.netlify-plugin-ttl-cache';

/** Get old cache and prepare files. */
export const onPreBuild: NetlifyPlugin['onPreBuild'] = async ({
  utils,
  inputs,
}) => {
  let hasCache = false;
  if (typeof inputs.path === 'string') {
    // Restore build cache
    hasCache = await utils.cache.restore(inputs.path);
  }

  if (!hasCache) {
    return;
  }

  // Remove files that have passed ttl threshold or match exclude regex
  const files =
    typeof inputs.path === 'string' ? await getDirFilenames(inputs.path) : [];
  const today = new Date();
  const exclude =
    typeof inputs.exclude === 'string' && new RegExp(inputs.exclude);
  await Promise.all(
    files.map(async (file) => {
      const { mtime } = await stat(file);
      if (
        (exclude && exclude.test(file)) ||
        (typeof inputs.ttl === 'number' &&
          getDaysApart(mtime, today) > inputs.ttl)
      ) {
        await unlink(file);
      }
    }),
  );

  if (typeof inputs.path === 'string') {
    // -p keeps each file's original mtime; without it every carried-forward
    // file looks brand new, so the ttl check above never finds it expired.
    await utils.run('cp', ['-r', '-p', inputs.path, TMP_CACHE_DIR]);
  }
};

/** Restore cached files along with latest build assets (without replacement). */
export const onPostBuild: NetlifyPlugin['onPostBuild'] = async ({
  utils,
  inputs,
}) => {
  if (typeof inputs.path === 'string') {
    const hasTmpCache = await stat(TMP_CACHE_DIR).catch(() => false);
    if (hasTmpCache) {
      // -t keeps each file's original mtime through this merge too, for the
      // same reason as the -p above on cp.
      await utils.run('rsync', [
        '-r',
        '-t',
        '--ignore-existing',
        addTrailingSlash(TMP_CACHE_DIR),
        addTrailingSlash(inputs.path),
      ]);
      await rm(TMP_CACHE_DIR, { recursive: true, force: true });
    }

    // Save new cache
    await utils.cache.save(inputs.path);
  }
};
