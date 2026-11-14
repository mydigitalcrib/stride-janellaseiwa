import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Issue = CollectionEntry<'issues'>;
export type IssueData = Issue['data'];
export type Settings = CollectionEntry<'settings'>['data'];
export type Labels = Settings['labels'];

/** The shared words from src/content/settings.yaml. */
export const getSettings = async (): Promise<Settings> => {
  const entry = await getEntry('settings', 'site');
  if (!entry) throw new Error('src/content/settings.yaml needs a `site:` block.');
  return entry.data;
};

/** A published issue still holding a "[[ ... ]]" from the new-issue template, with where it is. */
const leftovers = (value: unknown, path = ''): string[] => {
  if (typeof value === 'string') return value.includes('[[') ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => leftovers(v, `${path}[${i}]`));
  if (value && typeof value === 'object' && !(value instanceof Date))
    return Object.entries(value).flatMap(([k, v]) => leftovers(v, path ? `${path}.${k}` : k));
  return [];
};

/**
 * Every issue, newest first. Drafts appear while previewing (`npm run dev`) and are left out of the finished site
 * (`npm run build`). Stops the build with a plain message if two issues share a number or a finished issue still has
 * template text in it.
 */
export const getIssues = async () => {
  const all = (await getCollection('issues')).sort((a, b) => b.data.number - a.data.number);

  const seen = new Map<number, string>();
  for (const issue of all) {
    const other = seen.get(issue.data.number);
    if (other) throw new Error(`Issues "${other}" and "${issue.id}" both have number ${issue.data.number}. Give one the next free number.`);
    seen.set(issue.data.number, issue.id);
  }

  const shown = import.meta.env.PROD ? all.filter((i) => !i.data.draft) : all;
  for (const issue of shown) {
    if (issue.data.draft) continue;
    const left = leftovers(issue.data);
    if (left.length)
      throw new Error(
        `Issue "${issue.id}" still has template text ("[[ ... ]]") in: ${left.join(', ')}. ` +
          'Replace it, or set `draft: true` while you are still writing.',
      );
  }
  return shown;
};

export const issueNo = (data: IssueData) => String(data.number).padStart(3, '0');

const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const month = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Oct 30 – Nov 6, 2026" (or "Dec 28, 2026 – Jan 3, 2027" across a new year). */
export const issueDates = (data: IssueData) =>
  data.start.getUTCFullYear() === data.end.getUTCFullYear()
    ? `${day.format(data.start)} – ${day.format(data.end)}, ${data.end.getUTCFullYear()}`
    : `${day.format(data.start)}, ${data.start.getUTCFullYear()} – ${day.format(data.end)}, ${data.end.getUTCFullYear()}`;

/** "November 2026": the archive groups issues by the month their week ends in. */
export const issueMonth = (data: IssueData) => month.format(data.end);

/**
 * A path inside this site with the address it's published under in front: "/issues/" stays "/issues/" on this
 * computer, and becomes "/stride-janellaseiwa/issues/" on GitHub Pages (the publish step sets SITE_BASE).
 */
export const withBase = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;

export const issuePath = (issue: Issue) => withBase(`/issues/${issue.id}/`);

/** "Motherhood & Family" -> "motherhood-family", for the archive's topic filter. */
export const topicId = (topic: string) =>
  topic
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** "All {count}" + { count: 12 } -> "All 12". */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));

/** The words for one issue: settings.yaml, with the issue's own `labels:` on top. */
export const labelsFor = (settings: Settings, data?: IssueData): Labels => {
  const own = data?.labels ?? {};
  return Object.fromEntries(
    Object.entries(settings.labels).map(([group, words]) => [group, { ...words, ...(own[group as keyof Labels] ?? {}) }]),
  ) as Labels;
};

/** Who an issue is for: its own `audience:`, or the one in settings.yaml. */
export const audienceOf = (settings: Settings, data?: IssueData) => data?.audience ?? settings.audience;

type Idea = IssueData['ideas']['items'][number];
type Thing = IssueData['five']['items'][number];

/** What "Copy this idea" and "Download my saved ideas" hand over: something you could read while filming. */
export const ideaBrief = (data: IssueData, i: Idea, t: Labels) =>
  [
    i.title,
    `${i.format} · ${i.time}`,
    '',
    `${t.ideas.hook}: “${i.hook}”`,
    '',
    `${t.ideas.shots}:`,
    ...i.shots.map((s, n) => `${n + 1}. ${s}`),
    '',
    ...(i.caption ? [`${t.ideas.caption}: ${i.caption}`, ''] : []),
    `${t.ideas.filming}: ${data.ideas.filming}`,
  ].join('\n');

export const thingBrief = (th: Thing, t: Labels) =>
  [th.title, th.makeItYours, '', `${t.five.hook}: “${th.hook}”`, '', `${t.five.ways}:`, ...th.ways.map((w) => `- ${w}`)].join('\n');
