import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// This file runs in Node while building, so the environment is there. The tests use ISSUES_DIR and SETTINGS_FILE to
// build from tests/fixtures/ instead of the real issues.
declare const process: { env: Record<string, string | undefined> };

const link = z.object({ label: z.string(), url: z.url() });
const headline = z.array(z.string()).min(1);

// Every label the pages use. settings.yaml must give all of them; an issue's `labels:` may give any of them.
const labelGroups = {
  nav: z.object({
    week: z.string(),
    try: z.string(),
    talking: z.string(),
    ideas: z.string(),
    sound: z.string(),
    challenge: z.string(),
    originals: z.string(),
  }),
  home: z.object({ readLatest: z.string(), past: z.string(), seeAll: z.string() }),
  archive: z.object({
    title: z.string(),
    kicker: z.string(),
    headline,
    lead: z.string(),
    oneLead: z.string(),
    filterBy: z.string(),
    all: z.string(),
  }),
  cover: z.object({ figuresUnchecked: z.string(), draft: z.string() }),
  week: z.object({ tryThis: z.string() }),
  five: z.object({
    what: z.string(),
    careful: z.string(),
    hook: z.string(),
    ways: z.string(),
    brands: z.string(),
    copy: z.string(),
    copied: z.string(),
  }),
  ideas: z.object({
    filterBy: z.string(),
    all: z.string(),
    saved: z.string(),
    saveThis: z.string(),
    hook: z.string(),
    shots: z.string(),
    caption: z.string(),
    brands: z.string(),
    copy: z.string(),
    copied: z.string(),
    save: z.string(),
    isSaved: z.string(),
    emptyTitle: z.string(),
    emptyBody: z.string(),
    showAll: z.string(),
    filming: z.string(),
    careful: z.string(),
    download: z.string(),
  }),
  challenge: z.object({ caption: z.string(), copy: z.string(), copied: z.string(), more: z.string() }),
  originals: z.object({ pdf: z.string() }),
};

const labels = z.object(labelGroups).strict();
const labelOverrides = z
  .object(Object.fromEntries(Object.entries(labelGroups).map(([k, g]) => [k, g.partial().strict()])) as {
    [K in keyof typeof labelGroups]: ReturnType<(typeof labelGroups)[K]['partial']>;
  })
  .partial()
  .strict();

// The words shared by every page: src/content/settings.yaml.
const settings = defineCollection({
  loader: file(process.env.SETTINGS_FILE ?? './src/content/settings.yaml'),
  schema: z.object({
    brand: z.string(),
    reportName: z.string(),
    department: z.string(),
    audience: z.string(),
    keepPrivate: z.string(),
    homeLine: z.string(),
    labels,
  }),
});

// One YAML file per issue in src/content/issues/; the file name is the issue's address. A headline is a list of
// lines; *words* in a line are set in the serif accent. ISSUES_DIR lets the tests build from a scratch folder.
const issues = defineCollection({
  loader: glob({ pattern: '*.yaml', base: process.env.ISSUES_DIR ?? './src/content/issues' }),
  schema: z
    .object({
      number: z.number().int().positive(),
      topic: z.string(),
      start: z.coerce.date(),
      end: z.coerce.date(),
      /** True while it's being written: shows in `npm run dev` only, never in the finished site. */
      draft: z.boolean().default(false),
      /** False shows a notice on the issue that its figures still need checking against the research. */
      figuresChecked: z.boolean(),
      /** Who it's for, on the cover and in the footer. Leave it out to use the line in settings.yaml. */
      audience: z.string().optional(),
      /** The line under the headline on the home page while this is the latest issue. */
      homeLine: z.string().optional(),
      /** Different words for this issue only. Any line from `labels:` in settings.yaml. */
      labels: labelOverrides.optional(),
      headline,
      lede: z.string(),
      cover: z.object({ quote: z.string(), line: z.string() }),
      week: z.object({
        kicker: z.string(),
        headline,
        items: z.array(z.object({ title: z.string(), body: z.string() })),
        tryThis: z.string(),
        example: z.object({ body: z.string(), links: z.array(link) }),
        beats: z.object({
          title: z.string(),
          items: z.array(z.object({ name: z.string(), line: z.string() })),
          footer: z.string(),
        }),
      }),
      five: z.object({
        kicker: z.string(),
        headline,
        lead: z.string(),
        note: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            makeItYours: z.string(),
            what: z.string(),
            more: z.string(),
            hook: z.string(),
            ways: z.array(z.string()),
            careful: z.string().optional(),
            brands: z.string(),
            links: z.array(link),
          }),
        ),
      }),
      talking: z.object({
        /** The link to this section in the bar, e.g. "What moms are saying". */
        nav: z.string().optional(),
        kicker: z.string(),
        headline,
        lead: z.string(),
        questions: z.array(z.object({ text: z.string(), link: link.optional() })),
        turn: z.object({ title: z.string(), body: z.string() }),
        care: z.string(),
      }),
      ideas: z.object({
        kicker: z.string(),
        headline,
        lead: z.string(),
        filming: z.string(),
        careful: z.string(),
        segments: z.array(z.object({ id: z.string(), label: z.string() })),
        items: z.array(
          z.object({
            id: z.number().int(),
            segment: z.string(),
            stage: z.string(),
            title: z.string(),
            format: z.string(),
            time: z.string(),
            level: z.string(),
            hook: z.string(),
            shots: z.array(z.string()),
            /** Leave out if the research gives none; the idea then shows no caption. */
            caption: z.string().optional(),
            /** Leave out if no brand fits naturally. */
            brands: z.string().optional(),
          }),
        ),
      }),
      sound: z.object({
        kicker: z.string(),
        headline,
        lead: z.string(),
        insteadTitle: z.string(),
        instead: z.array(z.string()),
        planning: z.object({ value: z.string(), body: z.string(), note: z.string() }),
        brands: z.object({ title: z.string(), list: z.string(), line: z.string(), note: z.string() }),
      }),
      challenge: z.object({
        kicker: z.string(),
        headline,
        body: z.string(),
        steps: z.array(z.string()),
        versionsTitle: z.string(),
        versions: z.array(z.object({ who: z.string(), line: z.string() })),
        caption: z.string(),
        when: z.string(),
        check: z.string(),
        closer: z.string(),
        brief: z.string(),
      }),
      originals: z.object({
        kicker: z.string(),
        headline,
        notes: z.array(z.string()),
        groups: z.array(z.object({ title: z.string(), links: z.array(link) })),
      }),
    })
    .superRefine((d, ctx) => {
      if (d.end < d.start) ctx.addIssue({ code: 'custom', path: ['end'], message: '`end` is before `start`.' });
      const segments = new Set(d.ideas.segments.map((s) => s.id));
      const ids = new Set<number>();
      d.ideas.items.forEach((idea, i) => {
        if (!segments.has(idea.segment))
          ctx.addIssue({
            code: 'custom',
            path: ['ideas', 'items', i, 'segment'],
            message: `Idea "${idea.title}" uses segment "${idea.segment}", which isn't in ideas.segments (${[...segments].join(', ')}).`,
          });
        if (ids.has(idea.id))
          ctx.addIssue({ code: 'custom', path: ['ideas', 'items', i, 'id'], message: `Two ideas have id ${idea.id}. Each needs its own number.` });
        ids.add(idea.id);
      });
    }),
});

export const collections = { settings, issues };
