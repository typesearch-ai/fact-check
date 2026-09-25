import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

/*
 * Until typesearch-js is on npm it is linked from ../../packages/typesearch-js (inside the typesearch
 * devtools repo, or where CI checks it out), so Turbopack has to see that folder too. Otherwise this
 * does nothing.
 */
const repo = path.resolve(import.meta.dirname, '../..');
const linkedSdk = fs.existsSync(path.join(repo, 'packages/typesearch-js/package.json'));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(linkedSdk ? { turbopack: { root: repo } } : {}),
};

export default nextConfig;
