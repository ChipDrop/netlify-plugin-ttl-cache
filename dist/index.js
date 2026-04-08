// src/index.ts
import { stat as stat2, unlink, rm } from "fs/promises";

// src/utils.ts
import { join } from "path";
import { readdir, stat } from "fs/promises";
var getDirFilenames = async (dir) => {
  const files = await readdir(dir);
  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = join(dir, file);
      const isDirectory = (await stat(filePath)).isDirectory();
      if (isDirectory) {
        return getDirFilenames(filePath);
      }
      return filePath;
    })
  );
  return results.flat();
};
var getDaysApart = (d1, d2) => Math.ceil(Math.abs(Number(d1) - Number(d2)) / (1e3 * 60 * 60 * 24));
var addTrailingSlash = (str) => str.replace(/\/?$/, "/");

// src/index.ts
var TMP_CACHE_DIR = ".netlify-plugin-ttl-cache";
var onPreBuild = async ({
  utils,
  inputs
}) => {
  let hasCache = false;
  if (typeof inputs.path === "string") {
    hasCache = await utils.cache.restore(inputs.path);
  }
  if (!hasCache) {
    return;
  }
  const files = typeof inputs.path === "string" ? await getDirFilenames(inputs.path) : [];
  const today = /* @__PURE__ */ new Date();
  const exclude = typeof inputs.exclude === "string" && new RegExp(inputs.exclude);
  await Promise.all(
    files.map(async (file) => {
      const { mtime } = await stat2(file);
      if (exclude && exclude.test(file) || typeof inputs.ttl === "number" && getDaysApart(mtime, today) > inputs.ttl) {
        await unlink(file);
      }
    })
  );
  if (typeof inputs.path === "string") {
    await utils.run("cp", ["-r", inputs.path, TMP_CACHE_DIR]);
  }
};
var onPostBuild = async ({
  utils,
  inputs
}) => {
  if (typeof inputs.path === "string") {
    const hasTmpCache = await stat2(TMP_CACHE_DIR).catch(() => false);
    if (hasTmpCache) {
      await utils.run("rsync", [
        "-r",
        "--ignore-existing",
        addTrailingSlash(TMP_CACHE_DIR),
        addTrailingSlash(inputs.path)
      ]);
      await rm(TMP_CACHE_DIR, { recursive: true, force: true });
    }
    await utils.cache.save(inputs.path);
  }
};
export {
  onPostBuild,
  onPreBuild
};
