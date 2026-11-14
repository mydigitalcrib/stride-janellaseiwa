# Janella's Weekly Trend Report (@janellaseiwa)

Janella Ihebuzor's own weekly trend reports from Stride Talent. Every issue is one text file; the design, layout,
animations, filters, saved ideas, copy buttons and Save as PDF are shared, so a new issue never needs design or code
changes. Every issue here is written for Janella, in UK English.

This site was made on 14 November 2026 from the Stride weekly report template (`weekly-trend-report/`, in the folder
above this one), with only Janella's issues in it. Its home on GitHub is
`github.com/mydigitalcrib/stride-janellaseiwa`, and every new Janella issue goes here.

## Open it

Double-click **`Start Janella Site.bat`** (in the folder above this one). Your browser opens at
http://localhost:4430. Keep the black window open while you look; close it when you're done.

Or, in a terminal in this folder:

```bash
npm install      # first time only
npm run dev      # preview at http://localhost:4430
```

## Add a new issue

1. Start it. In a terminal in this folder, with the week's topic in quotes:

   ```bash
   npm run new-issue -- "Motherhood & Family"
   ```

   This makes `src/content/issues/002-motherhood-family.yaml` with the next number and the week after the last
   issue. It's already marked as being for Janella. To pick the dates yourself, add `--start 2026-11-13`.

2. Fill it in. Replace every `[[ ... ]]` in that file. Issue 001
   (`src/content/issues/001-motherhood-family.yaml`) is a finished example of every section. Or ask Claude:
   *"Fill in Janella's issue 002 from this research"* and attach the research PDF.

3. Look at it at http://localhost:4430/issues/002-motherhood-family/ while `npm run dev` is running. New issues
   start as **drafts**: you can preview them, but they're not in the finished site yet.

4. Publish it. In the file, set `draft: false`, and `figuresChecked: true` once every number has been checked against
   the research. Then:

   ```bash
   npm run build    # the finished site, in dist/
   npm test         # checks nothing else changed
   npm run lock-issue -- 002-motherhood-family
   ```

5. Put it online. Commit and push to `main` on GitHub. The **Publish to GitHub Pages** step
   (`.github/workflows/pages.yml`) builds the site and updates the shareable link by itself, in about a minute. You
   can watch it in the repository's **Actions** tab.

   `lock-issue` saves a copy of the issue as it looks now, so a later change can't alter it by accident: `npm test`
   will warn if it does.

The new issue appears on the home page as this week's issue, and every earlier one moves to **Past issues** and the
archive by itself. Each issue keeps its own address forever (`/issues/<file name>/`), and its saved ideas are kept
separately in each reader's browser.

The build stops with a plain message if something's wrong: an issue still has `[[ ... ]]` in it, two issues share a
number, or an idea uses a filter group that doesn't exist.

## Writing an issue

- A headline is a list of lines. `*words*` in a line are set in the serif accent.
- Put text in "quotes" if it starts with a quote mark, an `@` or a `*`, or contains `: ` (a colon then a space).
- Write it for the audience, not as a report: plain words, talking to "you", short sentences. No scores, confidence
  labels, section numbers or charts. Keep the useful caution, in everyday words.
- Never invent creators, numbers, quotes or brand deals. Every figure needs a source under `originals` at the bottom,
  with the date you checked it. If there's no trending sound, say so (issue 001 does).
- The counts fill themselves in: "12 ideas" in the bar and "All 12" on the filter follow however many ideas there are.

## Use different words

The words that aren't part of an issue's content (the series name, who it's for, "Your hook", "How to film it",
"Could suit", button labels and so on) are in **`src/content/settings.yaml`**. Change a word there and it changes on
every page.

For one issue only, add a `labels:` block to its file with just the lines you want to change. For example, for an
audience that doesn't film:

```yaml
labels:
  ideas:
    shots: How to make it
    filming: Making tips
  nav:
    ideas: "{count} ideas to try"
```

Each issue also sets its own:

- `audience:` who it's for, on the cover and in the footer (leave it out for the usual line);
- `homeLine:` the line under the headline on the home page while it's the newest issue;
- `talking.nav:` the link to the audience section in the top bar, such as "What moms are saying".

## The archive

`/issues/` lists every issue, newest first, grouped by month. When there's more than one topic, buttons at the top
show one topic at a time. The home page shows this week's issue, the six before it, and a link to the archive. The
menu's **All issues** button opens the archive.

## How private it is

Access is by **hidden link only**. Anyone who has the address can read everything and can forward it. There is no
login.

What's in place so the address doesn't spread by accident:

- Search engines are told not to list any page or keep a copy (`<meta name="robots">`, and `X-Robots-Tag` in
  `public/_headers`).
- Archives, scrapers and AI crawlers are told to stay out (`public/robots.txt`).
- Clicking through to TikTok or Reddit doesn't reveal this site's address (`Referrer-Policy: no-referrer`, and
  `rel="noreferrer"` on every outside link).
- No analytics, no outside fonts or scripts, no share preview image, no sitemap: no third party ever sees the address.
- The footer asks readers not to forward the link.

What keeps the site itself safe:

- It's plain static pages: no logins, forms, cookies, database or server code. The only thing stored is which ideas
  someone starred, in their own browser.
- A security policy (`public/_headers`, and a `<meta>` tag in `src/layouts/Layout.astro`) lets pages load only their
  own files.
- It needs no API keys. `.gitignore` blocks `.env` and key files from ever being committed.

If you publish it one day: keep any repository **private**, never write the live address in it, run `npm audit`
first, use a host that reads `_headers` (Netlify or Cloudflare Pages) on a random-looking site name, and never link to
it from a public page. Don't publish it over the original Stride weekly report site.

This site is published with **GitHub Pages** from a **public** repository, so the hidden link is a light lock:
anyone who finds the repository can read every issue there, and the GitHub Pages address can be worked out from the
repository's name. The pages still tell search engines not to list them (`<meta name="robots">`), but GitHub Pages
doesn't read `public/_headers`, and its `robots.txt` isn't at the top of the address, so only the `<meta>` tags in
`src/layouts/Layout.astro` apply there.

Links inside the site go through `withBase()` in `src/lib/issues.ts`, because a GitHub Pages site lives under
`/stride-janellaseiwa/`. The publish step sets `SITE_BASE`; on this computer and in the tests it's unset, so the
pages are exactly as before.

## Where things live

| What | Where |
| --- | --- |
| Issues, one file each (the file name is the address) | `src/content/issues/` |
| Shared words and labels | `src/content/settings.yaml` |
| Blank issue | `templates/new-issue.yaml` |
| What an issue file may contain (checked on every build) | `src/content.config.ts` |
| Home, archive and issue pages | `src/pages/index.astro`, `src/pages/issues/index.astro`, `src/pages/issues/[slug].astro` |
| One component per report section | `src/components/issue/` |
| Opening things, filters, saved ideas, download, copy, PDF | `src/scripts/issue.ts` |
| Archive topic buttons | `src/scripts/archive.ts` |
| Colors, type, spacing (copied from the Stride website's design system) | `src/styles/tokens.css`, `src/scripts/backdrop.ts` |
| Logo | `public/stride-social-logo.png` |
| Start a new issue / lock a published one | `scripts/new-issue.mjs`, `scripts/lock-issue.mjs` |
| Tests | `tests/` |

## Tests

`npm test` builds the site several ways (about a minute) and checks that:

- the design hasn't changed: built from `tests/fixtures/original/` (the original site's first issue and settings), the
  issue and home pages come out exactly like the original site's, with the same markup and every style rule
  (`tests/reference/original-build/` is the original build). The one difference is on purpose: the menu's
  **All issues** button opens the archive instead of the home page;
- every finished issue of Janella's is built, listed in the archive and free of template text, and every locked
  issue is unchanged;
- with more issues, the home page, archive, filters and counts are right, each issue shows only its own words, drafts
  stay out, and earlier issues don't change;
- unfinished issues and repeated numbers stop the build;
- `npm run new-issue` makes the next issue correctly.

After changing code, run `npm run check`, `npm run build` and `npm test`.
