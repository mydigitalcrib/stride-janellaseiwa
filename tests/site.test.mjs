// npm test: builds the site a few ways and checks the things that matter.
// - The design: built from tests/fixtures/original/ (issue 001 and the original settings), the issue and home pages
//   come out exactly like the original site. This doesn't depend on which issues this copy of the template holds.
// - This site's own issues: every finished issue is built, listed in the archive and free of template text, and every
//   issue locked with `npm run lock-issue` is unchanged.
// - Adding issues fills the home page, the archive and each issue's own words, and changes no earlier issue.
// - Drafts stay out of the finished site, and a finished issue with template text left in stops the build.
// - `npm run new-issue` makes the next issue in the right place.
// Builds go to .test-output/ (deleted at the end), never to dist/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { firstDifference, readPage, ruleDifference } from './compare.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.test-output');
const fixtures = join(root, 'tests/fixtures/original');
const fixtureSettings = join(fixtures, 'settings.yaml');
const fixture001 = join(fixtures, 'issues/001-motherhood-family.yaml');
const reference = join(root, 'tests/reference/original-build');
const ISSUE_001 = 'issues/001-motherhood-family/';

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
after(() => rmSync(out, { recursive: true, force: true }));

const rel = (path) => relative(root, path).split('\\').join('/');

/** Runs `astro build` into .test-output/<name>, from the real content or from another issues folder and settings. */
function build(name, { issuesDir, settingsFile } = {}) {
  const env = { ...process.env };
  delete env.ISSUES_DIR;
  delete env.SETTINGS_FILE;
  if (issuesDir) env.ISSUES_DIR = rel(issuesDir);
  if (settingsFile) env.SETTINGS_FILE = rel(settingsFile);
  const result = spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', join(out, name)], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
  return { ok: result.status === 0, log: `${result.stdout}\n${result.stderr}`, dist: join(out, name) };
}

/** A scratch issues folder holding the fixture issue 001 plus any extra files. */
function issuesFolder(name, extra = {}) {
  const dir = join(out, `issues-${name}`);
  mkdirSync(dir, { recursive: true });
  cpSync(fixture001, join(dir, '001-motherhood-family.yaml'));
  for (const [file, text] of Object.entries(extra)) writeFileSync(join(dir, file), text);
  return dir;
}

const html = (dist, page) => readFileSync(join(dist, page, 'index.html'), 'utf8');
/** Visible text only, for checking words without tripping over markup. */
const text = (source) =>
  source
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** A copy of the blank template filled with plain sample words, as a finished (or draft) issue. */
function sampleIssue({ number, topic, start, end, audience, nav, draft = false }) {
  return readFileSync(join(root, 'templates/new-issue.yaml'), 'utf8')
    .replaceAll('{{no}}', String(number).padStart(3, '0'))
    .replaceAll('{{number}}', String(number))
    .replaceAll('{{topic}}', JSON.stringify(topic))
    .replaceAll('{{start}}', start)
    .replaceAll('{{end}}', end)
    .replaceAll('{{audience}}', JSON.stringify(audience))
    .replace('draft: true', `draft: ${draft}`)
    .replace('figuresChecked: false', 'figuresChecked: true')
    .replace('nav: "[[ What they’re saying ]]"', `nav: ${JSON.stringify(nav)}`)
    .replaceAll('https://example.com/[[replace-with-link]]', 'https://example.com/sample')
    .replace(/\[\[[^\]]*\]\]/g, 'Sample words');
}

/** Checks a page against a reference build: same markup and the same style rules. */
function assertSamePage(referenceDist, dist, page, adjust = (r) => r) {
  const before = adjust(readPage(referenceDist, page));
  const now = readPage(dist, page);
  const diff = firstDifference(before.markup, now.markup);
  assert.equal(diff, null, diff ? `${page} markup changed at ${diff.at}:\n  was: ${diff.expected}\n  now: ${diff.actual}` : '');
  const rules = ruleDifference(before.rules, now.rules);
  assert.deepEqual(rules, { missing: [], added: [] }, `${page} styles changed`);
}

// The one intended change to issue pages: the menu's "All issues" button opens the archive instead of the home page.
const withArchiveLink = (page) => {
  const from = '<a class="exp-pill exp-pill--ghost" href="/"';
  assert.ok(page.markup.includes(from), 'the original menu link is where expected');
  return { ...page, markup: page.markup.replace(from, '<a class="exp-pill exp-pill--ghost" href="/issues/"') };
};

/** This site's own issues: file name and whether it's a draft. */
const ownIssues = readdirSync(join(root, 'src/content/issues'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({ slug: f.replace(/\.yaml$/, ''), draft: /^draft:\s*true\s*$/m.test(readFileSync(join(root, 'src/content/issues', f), 'utf8')) }));
const published = ownIssues.filter((i) => !i.draft);

let site;
let original;

test('this site builds', () => {
  site = build('site');
  assert.ok(site.ok, site.log);
  for (const page of ['index.html', 'issues/index.html']) assert.ok(existsSync(join(site.dist, page)), `${page} is built`);
});

test('every finished issue is built and listed; drafts are left out', () => {
  const archive = html(site.dist, 'issues/');
  for (const { slug } of published) {
    assert.ok(existsSync(join(site.dist, 'issues', slug, 'index.html')), `${slug} is built`);
    assert.ok(archive.includes(`href="/issues/${slug}/"`), `${slug} is in the archive`);
  }
  for (const { slug } of ownIssues.filter((i) => i.draft)) {
    assert.ok(!existsSync(join(site.dist, 'issues', slug)), `draft ${slug} is not built`);
    assert.ok(!archive.includes(`/issues/${slug}/`), `draft ${slug} is not listed`);
  }
});

test('no page shows template text or broken placeholders', () => {
  for (const page of ['', 'issues/', ...published.map((i) => `issues/${i.slug}/`)]) {
    const words = text(html(site.dist, page));
    assert.ok(!words.includes('[['), `${page || 'home'} has no [[ ]]`);
    assert.ok(!/\{\w+\}/.test(words), `${page || 'home'} has no unfilled {count}`);
    assert.ok(!words.includes('undefined'), `${page || 'home'} has no "undefined"`);
  }
});

test('locked issues have not changed', () => {
  const locked = join(root, 'tests/reference/locked');
  const slugs = existsSync(locked) ? readdirSync(locked) : [];
  for (const slug of slugs) assertSamePage(join(locked, slug), site.dist, `issues/${slug}/`);
});

test('the design: issue 001 is exactly the original issue page (apart from the archive link)', () => {
  original = build('original', { issuesDir: join(fixtures, 'issues'), settingsFile: fixtureSettings });
  assert.ok(original.ok, original.log);
  assertSamePage(reference, original.dist, ISSUE_001, withArchiveLink);
});

test('the design: the home page is the original home page', () => {
  // With one issue there are no past issues, so the list's styles (moved into IssueList, rules unchanged) are unused.
  const evenPast = (page) => ({
    ...page,
    rules: page.rules.filter((r) => !r.includes('.past__all')).map((r) => (r.includes('.past__') ? r.replace(/cid\d+/g, 'cidX') : r)),
  });
  const before = evenPast(readPage(reference, ''));
  const now = evenPast(readPage(original.dist, ''));
  assert.equal(firstDifference(before.markup, now.markup), null);
  assert.deepEqual(ruleDifference(before.rules, now.rules), { missing: [], added: [] });
});

test('the archive lists the issue', () => {
  const archive = text(html(original.dist, 'issues/'));
  assert.match(archive, /Every issue, in one place\./);
  assert.match(archive, /Motherhood & Family Issue 001 · Oct 30 – Nov 6, 2026/);
  assert.match(archive, /November 2026/);
  assert.match(html(original.dist, 'issues/'), /href="\/issues\/001-motherhood-family\/"/);
});

test('with more issues: home, archive, each issue’s own words, drafts, and earlier issues unchanged', () => {
  const dir = issuesFolder('more', {
    '002-fitness-wellness.yaml': sampleIssue({
      number: 2,
      topic: 'Fitness & Wellness',
      start: '2026-11-07',
      end: '2026-11-13',
      audience: 'Just for Stride Talent fitness creators',
      nav: 'What runners are saying',
    }),
    '003-beauty.yaml': sampleIssue({ number: 3, topic: 'Beauty', start: '2026-12-29', end: '2027-01-04', audience: 'Just for Stride Talent creators', nav: 'What they’re asking' }),
    '004-food.yaml': sampleIssue({ number: 4, topic: 'Food', start: '2027-01-05', end: '2027-01-11', audience: 'x', nav: 'x', draft: true }),
  });

  const more = build('more', { issuesDir: dir, settingsFile: fixtureSettings });
  assert.ok(more.ok, more.log);

  // Drafts stay out.
  assert.ok(!existsSync(join(more.dist, 'issues/004-food')), 'the draft is not built');
  assert.ok(!text(html(more.dist, '')).includes('Food'), 'the draft is not listed');

  // Home: the newest issue on top, the others under "Past issues", and a link to all of them.
  const home = text(html(more.dist, ''));
  assert.match(home, /Beauty Issue 003 · Dec 29, 2026 – Jan 4, 2027 Read this week’s issue/);
  assert.match(home, /Past issues Fitness & Wellness Issue 002 · Nov 7 – Nov 13, 2026 Just for Stride Talent fitness creators Motherhood & Family Issue 001/);
  assert.match(home, /See all 3 issues/);
  assert.match(home, /Sample words/, 'the home line comes from the newest issue');
  assert.ok(!home.includes('What moms are talking about'), 'the old home line is gone');

  // Archive: grouped by month, newest first, with a chip per topic.
  const archivePage = html(more.dist, 'issues/');
  const archive = text(archivePage);
  assert.match(archive, /3 issues so far, newest first\./);
  assert.match(archive, /January 2027 Beauty .* November 2026 Fitness & Wellness .* Motherhood & Family/);
  for (const chip of ['data-topic-filter="all"', 'data-topic-filter="beauty"', 'data-topic-filter="fitness-wellness"', 'data-topic-filter="motherhood-family"'])
    assert.ok(archivePage.includes(chip), chip);

  // A new issue uses its own words, with the counts filled in, and nothing from issue 001.
  const fitnessPage = html(more.dist, 'issues/002-fitness-wellness/');
  const fitness = text(fitnessPage);
  assert.match(fitness, /What runners are saying/);
  assert.match(fitness, /12 ideas/);
  assert.match(fitness, /All 12/);
  assert.match(fitness, /Issue 002 · Nov 7 – Nov 13, 2026 Just for Stride Talent fitness creators/);
  assert.match(fitness, /Just for Stride Talent fitness creators\. Please keep this link to yourself\./);
  assert.match(fitnessPage, /data-issue="002"/, 'saved ideas are kept apart from other issues');
  for (const leftover of ['moms', 'Motherhood', 'MOM', 'shaydiazfit', 'Thanksgiving'])
    assert.ok(!fitness.includes(leftover), `issue 002 has no "${leftover}" from issue 001`);

  // Adding issues changes nothing on issue 001.
  assertSamePage(reference, more.dist, ISSUE_001, withArchiveLink);
});

test('an idea without a caption or brands shows neither', () => {
  const issue = sampleIssue({ number: 2, topic: 'Travel', start: '2026-11-07', end: '2026-11-13', audience: 'a', nav: 'b' })
    .replace(/(    - id: 1\n(?:      .*\n)*?)      caption: "Sample words"\n      brands: "Sample words"\n/, '$1');
  const idea1 = issue.split('    - id: 1\n')[1].split('    - id: 2\n')[0];
  assert.ok(!idea1.includes('caption:') && !idea1.includes('brands:'), 'idea 1 has no caption or brands in the sample');
  const dir = issuesFolder('optional', { '002-travel.yaml': issue });
  const result = build('optional', { issuesDir: dir, settingsFile: fixtureSettings });
  assert.ok(result.ok, result.log);
  const page = html(result.dist, 'issues/002-travel/');
  const first = page.slice(page.indexOf('id="idea-1"'), page.indexOf('id="idea-2"'));
  assert.ok(!first.includes('>Caption<') && !first.includes('>Could suit<'), 'idea 1 shows no Caption or Could suit');
  assert.ok(!/data-copy="[^"]*Caption:/.test(first), 'its copy text has no Caption line');
  const second = page.slice(page.indexOf('id="idea-2"'), page.indexOf('id="idea-3"'));
  assert.ok(second.includes('>Caption<') && second.includes('>Could suit<'), 'idea 2 still shows both');
});

test('a finished issue with template text left in stops the build, with a plain message', () => {
  const unfinished = sampleIssue({ number: 2, topic: 'Travel', start: '2026-11-07', end: '2026-11-13', audience: 'a', nav: 'b' }).replace(
    'lede: "Sample words"',
    'lede: "[[ Two sentences ]]"',
  );
  const result = build('unfinished', { issuesDir: issuesFolder('unfinished', { '002-travel.yaml': unfinished }), settingsFile: fixtureSettings });
  assert.ok(!result.ok, 'the build stops');
  assert.match(result.log, /still has template text/);
  assert.match(result.log, /lede/);
});

test('two issues with the same number stop the build', () => {
  const dir = issuesFolder('twice', { '001-copy.yaml': readFileSync(fixture001, 'utf8') });
  const result = build('twice', { issuesDir: dir, settingsFile: fixtureSettings });
  assert.ok(!result.ok, 'the build stops');
  assert.match(result.log, /both have number 1/);
});

test('npm run new-issue makes the next issue as a draft', () => {
  const dir = issuesFolder('new');
  const env = { ...process.env, ISSUES_DIR: rel(dir), SETTINGS_FILE: rel(fixtureSettings) };
  const run = () => spawnSync(process.execPath, [join(root, 'scripts/new-issue.mjs'), 'Fitness & Wellness'], { cwd: root, env, encoding: 'utf8' });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const made = readFileSync(join(dir, '002-fitness-wellness.yaml'), 'utf8');
  assert.match(made, /^# Issue 002: Fitness & Wellness\./);
  assert.match(made, /^number: 2$/m);
  assert.match(made, /^topic: "Fitness & Wellness"$/m);
  assert.match(made, /^start: 2026-11-07$/m);
  assert.match(made, /^end: 2026-11-13$/m);
  assert.match(made, /^draft: true$/m);
  assert.match(made, /^audience: "Just for Stride Talent creators"$/m);

  assert.equal(run().status, 0, 'a second one gets the next number instead of overwriting');
  assert.ok(existsSync(join(dir, '003-fitness-wellness.yaml')));
});
