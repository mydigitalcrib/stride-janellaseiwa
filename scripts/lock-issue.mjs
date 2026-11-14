// Keeps a copy of a published issue as it is now, so `npm test` can warn if a later change to the template or the
// shared words would change how it looks. Run it after publishing an issue:
//
//   npm run build
//   npm run lock-issue -- 002-fitness-wellness
//
// If you change the design on purpose later, run it again for each issue to accept the new look.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('\n  Say which issue, for example:  npm run lock-issue -- 002-fitness-wellness\n');
  process.exit(1);
}

const page = join(root, 'dist/issues', slug, 'index.html');
if (!existsSync(page)) {
  console.error(`\n  dist/issues/${slug}/ isn't there. Run  npm run build  first (and check the name).\n`);
  process.exit(1);
}

const target = join(root, 'tests/reference/locked', slug);
rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, 'issues', slug), { recursive: true });
cpSync(page, join(target, 'issues', slug, 'index.html'));
for (const [, href] of readFileSync(page, 'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)">/g)) {
  mkdirSync(join(target, dirname(href)), { recursive: true });
  cpSync(join(root, 'dist', href), join(target, href));
}
console.log(`\n  Locked issue ${slug}. npm test will now check it stays exactly like this.\n`);
