// Starts a new issue from templates/new-issue.yaml, with the next number and the week after the newest issue.
//
//   npm run new-issue -- "Fitness & Wellness"
//   npm run new-issue -- "Beauty" --audience "Just for Stride Talent beauty creators" --start 2026-11-07
//
// The new file is a draft: it shows when you preview (npm run dev) and stays out of the finished site until you set
// `draft: false`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const issuesDir = process.env.ISSUES_DIR ? join(root, process.env.ISSUES_DIR) : join(root, 'src/content/issues');

const stop = (message) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

// Arguments: the topic, then optional --audience "..." and --start YYYY-MM-DD.
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = args[i + 1];
  if (!value || value.startsWith('--')) stop(`--${name} needs a value after it.`);
  args.splice(i, 2);
  return value;
};
const audienceArg = option('audience');
const startArg = option('start');
const topic = args.join(' ').trim();
if (!topic) stop('Say what the issue is about, for example:  npm run new-issue -- "Fitness & Wellness"');

/** "Fitness & Wellness" -> "fitness-wellness" (the same rule the archive uses). */
const slugOf = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// What's there already: each issue's number and the day its week ended.
const existing = readdirSync(issuesDir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => {
    const text = readFileSync(join(issuesDir, f), 'utf8');
    return {
      file: f,
      number: Number(text.match(/^number:\s*(\d+)/m)?.[1] ?? 0),
      end: text.match(/^end:\s*(\d{4}-\d{2}-\d{2})/m)?.[1],
    };
  });
const newest = existing.sort((a, b) => b.number - a.number)[0];
const number = (newest?.number ?? 0) + 1;

const day = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) stop(`"${iso}" isn't a date. Use YYYY-MM-DD, e.g. 2026-11-07.`);
  return new Date(`${iso}T00:00:00Z`);
};
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);

// The week: from --start, or the day after the newest issue ended, or the last seven full days.
const start = startArg ? day(startArg) : newest?.end ? addDays(day(newest.end), 1) : addDays(day(iso(new Date())), -7);
const end = addDays(start, 6);

const settings = readFileSync(process.env.SETTINGS_FILE ? join(root, process.env.SETTINGS_FILE) : join(root, 'src/content/settings.yaml'), 'utf8');
const audience = audienceArg ?? settings.match(/^\s+audience:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '') ?? '[[ Who this issue is for ]]';

const slug = `${String(number).padStart(3, '0')}-${slugOf(topic)}`;
const target = join(issuesDir, `${slug}.yaml`);
if (existsSync(target)) stop(`${relative(root, target)} already exists.`);

const yaml = (text) => JSON.stringify(text); // a double-quoted YAML string, safe for any characters
const template = readFileSync(join(root, 'templates/new-issue.yaml'), 'utf8');
const filled = template
  .replaceAll('{{no}}', String(number).padStart(3, '0'))
  .replaceAll('{{number}}', String(number))
  .replace('{{topic}}', topic) // the comment on the first line
  .replaceAll('{{topic}}', yaml(topic))
  .replaceAll('{{start}}', iso(start))
  .replaceAll('{{end}}', iso(end))
  .replaceAll('{{audience}}', yaml(audience));

writeFileSync(target, filled);

console.log(`
  Started issue ${String(number).padStart(3, '0')}: ${topic} (${iso(start)} to ${iso(end)})

  File:     ${relative(root, target)}
  Address:  /issues/${slug}/

  Next:
  1. Fill in every [[ ... ]] in that file (issue 001 is a finished example).
  2. Preview it:  npm run dev   then open http://localhost:4410/issues/${slug}/
  3. When it's ready, set  draft: false  and  figuresChecked: true , then run:  npm run build
`);
