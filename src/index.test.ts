import { vi, beforeEach, describe, it, expect } from 'vitest';
import {
  type NetlifyPluginOptions,
  type OnPostBuild,
  type OnPreBuild,
} from '@netlify/build';

type JSONValue =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: JSONValue;
    }
  | JSONValue[];

/* 1️⃣  Register mocks *first* */
vi.mock('node:fs/promises', () => ({
  stat: vi.fn(),
  unlink: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('./utils.js', async () => {
  const actual = await import('./utils.js');
  return { ...actual, getDirFilenames: vi.fn() };
});

/* 2️⃣  Import after mocks (TLA works natively) */
const { stat, unlink, rm } = (await import('node:fs/promises')) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { getDirFilenames } = (await import('./utils.js')) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const { onPreBuild, onPostBuild } = await import('./index.js');

/* 3️⃣  Shared fixtures */
const inputs = { ttl: 10, path: 'some-path', exclude: 'a^' };
const utils = {
  cache: { restore: vi.fn(), save: vi.fn() },
  run: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  utils.cache.restore.mockReturnValue(true);
  getDirFilenames.mockResolvedValue(['file-1.js', 'file-2.png']);
  stat.mockResolvedValue({ mtime: new Date() });
});

describe('on onPreBuild', () => {
  const files = ['file-1.js', 'file-2.png', 'folder/file-1.png'];
  beforeEach(() => {
    utils.cache.restore.mockReturnValue(true);
    getDirFilenames.mockImplementation(() => Promise.resolve(files));
    stat.mockImplementation(() => Promise.resolve({ mtime: new Date() }));
  });

  it('attempts to load cache', async () => {
    const options = {
      inputs,
      utils,
    } as unknown as NetlifyPluginOptions;
    await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
      options,
    );
    expect(utils.cache.restore).toHaveBeenCalledTimes(1);
    expect(utils.cache.restore).toHaveBeenCalledWith(inputs.path);
  });

  describe('on cache miss', () => {
    beforeEach(() => {
      utils.cache.restore.mockImplementation(() => Promise.resolve(false));
    });

    it('returns early', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(getDirFilenames).toHaveBeenCalledTimes(0);
    });
  });

  describe('on cache hit', () => {
    it('checks all files', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(stat).toHaveBeenCalledTimes(files.length);
      expect(unlink).toHaveBeenCalledTimes(0);
    });

    it('copies files to temporary directory', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(utils.run).toHaveBeenCalledTimes(1);
      expect(utils.run).toHaveBeenCalledWith('cp', [
        '-r',
        inputs.path,
        expect.any(String),
      ]);
    });
  });

  describe('on cache hit + expired files', () => {
    const invalidFiles = [files[0]];

    beforeEach(() => {
      stat.mockImplementation((arg: string) =>
        Promise.resolve({
          mtime: invalidFiles.includes(arg) ? new Date(0) : new Date(),
        }),
      );
    });

    it('removes expired files before moving to cache dir', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(unlink).toHaveBeenCalledTimes(invalidFiles.length);
      invalidFiles.forEach((f) => expect(unlink).toHaveBeenCalledWith(f));
    });
  });

  describe('on cache hit + excluded files', () => {
    const invalidFiles = [files[1], files[2]];

    beforeEach(() => {
      stat.mockImplementation((arg: string) =>
        Promise.resolve({
          mtime: invalidFiles.includes(arg as string)
            ? new Date(0)
            : new Date(),
        }),
      );
    });

    it('removes excluded files before moving to cache dir', async () => {
      const options = {
        inputs: { ...inputs, exclude: '.*.png$' },
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPreBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(unlink).toHaveBeenCalledTimes(invalidFiles.length);
      invalidFiles.forEach((f) => expect(unlink).toHaveBeenCalledWith(f));
    });
  });
});

describe('on onPostBuild', () => {
  describe('on no cache directory', () => {
    beforeEach(() => {
      stat.mockImplementation(() =>
        Promise.reject('no such file or directory'),
      );
    });

    it('caches new output', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPostBuild as OnPreBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(utils.run).toHaveBeenCalledTimes(0);
      expect(utils.cache.save).toHaveBeenCalledTimes(1);
      expect(utils.cache.save).toHaveBeenCalledWith(inputs.path);
    });
  });

  describe('on cache directory', () => {
    beforeEach(() => {
      stat.mockImplementation(() => Promise.resolve({}));
    });

    it('files are synced with build dir', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPostBuild as OnPostBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(utils.run).toHaveBeenCalledTimes(1);
      expect(utils.run).toHaveBeenCalledWith('rsync', [
        '-r',
        '--ignore-existing',
        expect.any(String),
        `${inputs.path}/`,
      ]);
    });

    it('cache is updated', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPostBuild as OnPostBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(utils.cache.save).toHaveBeenCalledTimes(1);
      expect(utils.cache.save).toHaveBeenCalledWith(inputs.path);
    });

    it('removes old cache directory', async () => {
      const options = {
        inputs,
        utils,
      } as unknown as NetlifyPluginOptions;
      await (onPostBuild as OnPostBuild<Partial<Record<string, JSONValue>>>)(
        options,
      );
      expect(rm).toHaveBeenCalledTimes(1);
      expect(rm.mock.calls[0]).toMatchInlineSnapshot(`
        [
          ".netlify-plugin-ttl-cache",
          {
            "force": true,
            "recursive": true,
          },
        ]
      `);
    });
  });
});
