// Compares two built pages once the parts that change between builds are evened out, to prove a published issue
// still comes out exactly as it was:
// - Astro's style ids (data-astro-cid-xxxx) become cid1, cid2... in order of first appearance;
// - hashed file names lose their hash;
// - styles are compared as the full set of rules the page gets, wherever they sit: adding a page changes how the
//   build splits styles between files and inline <style> blocks, but not which rules a page has.
// Run by hand: node tests/compare.mjs <original-dist> <new-dist> <page path, e.g. issues/001-motherhood-family/>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const unhash = (text) => text.replace(/(\/_astro\/[A-Za-z0-9_.-]+?)\.[A-Za-z0-9_-]{8}\.(css|js|woff2?|png|svg)/g, '$1.$2');

/** Gives style ids stable names, shared between a page and its stylesheets. */
const cidNamer = () => {
  const ids = new Map();
  return (text) =>
    text.replace(/data-astro-cid-([a-z0-9]+)/g, (_, id) => {
      if (!ids.has(id)) ids.set(id, `cid${ids.size + 1}`);
      return `data-astro-cid-${ids.get(id)}`;
    });
};

/** Splits minified CSS into single rules; a rule inside @media is kept with its @media line. */
export function cssRules(css, prefix = '') {
  const rules = [];
  let depth = 0;
  let start = 0;
  let head = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      const end = css.indexOf(c, i + 1);
      i = end < 0 ? css.length : end;
    } else if (c === '{') {
      if (depth === 0) head = css.slice(start, i).trim();
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        const body = css.slice(css.indexOf('{', start) + 1, i);
        if (/^@(media|supports|layer|container)/.test(head)) rules.push(...cssRules(body, `${prefix}${head}{`));
        else rules.push(`${prefix}${head}{${body}}`);
        start = i + 1;
      }
    } else if (c === ';' && depth === 0) {
      rules.push(prefix + css.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return rules.filter((r) => r.trim() && !r.startsWith('/*'));
}

/** A built page as { markup, rules }: the HTML without its style tags, and every CSS rule it loads. */
export function readPage(dist, page) {
  const name = cidNamer();
  const html = readFileSync(join(dist, page, 'index.html'), 'utf8');
  const css = [];
  const markup = html
    .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
      css.push(readFileSync(join(dist, href), 'utf8'));
      return '';
    })
    .replace(/<style>([\s\S]*?)<\/style>/g, (_, inline) => {
      css.push(inline);
      return '';
    });
  const namedMarkup = unhash(name(markup));
  const rules = css.flatMap((c) => cssRules(unhash(name(c)))).sort();
  return { markup: namedMarkup, rules };
}

/** The first place two texts differ, with a little context either side, or null if they match. */
export function firstDifference(a, b) {
  if (a === b) return null;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const from = Math.max(0, i - 160);
  return { at: i, expected: a.slice(from, i + 160), actual: b.slice(from, i + 160) };
}

/** What differs between two pages' rule lists: rules only in the first, and rules only in the second. */
export function ruleDifference(a, b) {
  const count = (list) => list.reduce((m, r) => m.set(r, (m.get(r) ?? 0) + 1), new Map());
  const [ca, cb] = [count(a), count(b)];
  const missing = [...ca].filter(([r, n]) => (cb.get(r) ?? 0) < n).map(([r]) => r);
  const added = [...cb].filter(([r, n]) => (ca.get(r) ?? 0) < n).map(([r]) => r);
  return { missing, added };
}

if (process.argv[1]?.endsWith('compare.mjs') && process.argv.length >= 5) {
  const [before, after, page] = process.argv.slice(2);
  const a = readPage(before, page);
  const b = readPage(after, page);
  const diff = firstDifference(a.markup, b.markup);
  const rules = ruleDifference(a.rules, b.rules);
  console.log(diff ? `Markup differs at character ${diff.at}.\n--- before\n${diff.expected}\n--- after\n${diff.actual}` : 'Markup: same.');
  console.log(
    rules.missing.length || rules.added.length
      ? `Styles differ.\n--- only before (${rules.missing.length})\n${rules.missing.join('\n')}\n--- only after (${rules.added.length})\n${rules.added.join('\n')}`
      : `Styles: same (${a.rules.length} rules).`,
  );
  process.exit(diff || rules.missing.length || rules.added.length ? 1 : 0);
}
