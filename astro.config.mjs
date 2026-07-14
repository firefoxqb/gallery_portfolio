// @ts-check
import { defineConfig } from 'astro/config';

// ─────────────────────────────────────────────────────────────────────────────
// Deployment target (GitHub Pages)
//
//  • User/custom-domain site  → SITE = 'https://your-domain.com', BASE = '/'
//  • Project page             → SITE = 'https://<username>.github.io',
//                               BASE = '/<repo-name>'  (e.g. '/portfolio')
//
// Internal links/assets use import.meta.env.BASE_URL so changing BASE is enough.
// Override at build time with SITE / BASE env vars (the CI workflow does this).
// ─────────────────────────────────────────────────────────────────────────────
const SITE = process.env.SITE ?? 'https://example.github.io';
const BASE = process.env.BASE ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
});
