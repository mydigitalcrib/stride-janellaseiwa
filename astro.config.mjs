import { defineConfig } from 'astro/config';

// A plain static site. No sitemap on purpose: nothing should help anyone find it.
// SITE_BASE is set only by the GitHub Pages publish step (.github/workflows/pages.yml), where the site lives under
// /stride-janellaseiwa/. On this computer and in the tests it's unset, so every page is exactly as before.
export default defineConfig({
  output: 'static',
  base: process.env.SITE_BASE || '/',
  server: { port: 4430 },
  devToolbar: { enabled: false },
});
