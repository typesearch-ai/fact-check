import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

/*
 * Inside the typesearch devtools repo, typesearch-js is linked from ../../packages until it is on
 * npm, so Turbopack has to see the whole repo. In a standalone copy of the demo this does nothing.
 */
const repo = path.resolve(import.meta.dirname, '../..');
const linkedSdk = fs.existsSync(path.join(repo, 'packages/typesearch-js/package.json'));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(linkedSdk ? { turbopack: { root: repo } } : {}),
};

export default nextConfig;
