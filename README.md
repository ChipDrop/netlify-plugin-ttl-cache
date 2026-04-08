# Netlify plugin TTL cache

A Netlify plugin for persisting immutable build assets across releases.

## How it works

By default, Netlify replaces all existing static assets when publishing new releases.

For sites where assets are unique across deployments, and dynamically loaded (e.g. [`React.lazy`](https://reactjs.org/docs/code-splitting.html)) this can lead to runtime errors (e.g. [chunk-load errors](https://www.google.com/search?q=chunk+load+error+netlify&oq=chunk+load+error+netlify)).

This plugin prevents this problem by allowing users to include legacy assets across releases.

## Publishing

`main` is source-only. Run the manual GitHub Actions workflow to build the package and force-update the `release` branch with the installable artifact.

To publish the `release` branch:

1. Push the workflow file to the default branch.
2. Open the repository's `Actions` tab in GitHub.
3. Select the `Publish release branch` workflow.
4. Click `Run workflow`.

The workflow installs dependencies, runs lint/tests, builds `dist/`, and force-pushes the installable package files to the `release` branch.

## Usage

Install the plugin from the `release` branch:

```sh
npm i -D github:ChipDrop/netlify-plugin-ttl-cache#release
```

For reproducible installs, prefer pinning a commit SHA instead of tracking the branch head.

Add the plugin to your `netlify.toml`

```toml
[[plugins]]
package = "@chipdrop/netlify-plugin-ttl-cache"
  [plugins.inputs]
  path = "build"
  ttl = 90
```

## Inputs

### path

_Build output directory._

**type:** `string`

**default:** `"build"`

### ttl

_Maximum age (days) of files in cache._

**type:** `number`

**default:** `90`

### exclude

_Regular expression [string pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) for files to exclude._

**type:** `string`

**default:** `n/a`
