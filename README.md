# Photography Portfolio

A fast, image-first portfolio built with [Astro](https://astro.build). The home
page is a scrollable editorial feed of **albums** (shown as a single cover) and
**single photos**; albums open a scrolling list; any photo opens a lightbox with
an optional EXIF panel. Photos live in the repo and are optimized at build time —
no CDN, no accounts.

## Quick start

```sh
npm install
npm run dev        # http://localhost:4321
```

## Adding photos

Export web-ready photos to a folder under `import/` (git-ignored), then run the
ingest CLI. It resizes to ~2500px, reads EXIF from the originals (dropping GPS),
detects orientation, and generates the content file.

```sh
# An album
npm run photos:new-album -- --title "Iceland 2026" --dir ./import/iceland
#   optional: --description "…" --size large|medium|small|full --cover a.jpg

# A single photo
npm run photos:add-single -- --image ./import/kyoto.jpg --caption "Kyoto, blue hour"

# Run either with no flags for interactive prompts.
```

Then review the generated file in `src/content/`, tweak captions / `size` if you
like, and commit. Layout levers:

- `order` — higher floats up the feed (ties break newest-first). The CLI auto-assigns.
- `size` — `small | medium | large | full` tile emphasis in the feed.
- per-photo `size` — rhythm inside an album.

## Make it yours

- **Identity, socials, contact, tagline, intro** → `src/data/site.ts`
- **Gear list** (About page) → `src/data/gear.ts`
- **Headshot** → drop `src/assets/portrait.jpg` and follow the comment in `src/pages/about.astro`
- **Contact form** → set `formspreeId` in `src/data/site.ts` (free at [formspree.io](https://formspree.io)); otherwise a `mailto:` link is shown
- **Colours / type** → design tokens in `src/styles/global.css`

## Deploy to GitHub Pages

1. Create a GitHub repo and push this project to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.

The workflow assumes a **project page** (`https://<you>.github.io/<repo>`) and
sets `SITE`/`BASE` automatically. For a **user page** (`<you>.github.io`) or a
**custom domain**, set `BASE: "/"` (and `SITE` to your domain) in the workflow —
add a `public/CNAME` file for a custom domain.

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the production build |
| `npm run photos:new-album` | Ingest an album |
| `npm run photos:add-single` | Ingest a single photo |
