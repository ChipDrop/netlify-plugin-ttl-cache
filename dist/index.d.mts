import { NetlifyPlugin } from '@netlify/build';

/** Get old cache and prepare files. */
declare const onPreBuild: NetlifyPlugin['onPreBuild'];
/** Restore cached files along with latest build assets (without replacement). */
declare const onPostBuild: NetlifyPlugin['onPreBuild'];

export { onPostBuild, onPreBuild };
