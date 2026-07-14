#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Photo ingest CLI
//
//   npm run photos:new-album  -- --title "Iceland 2026" --dir ./import/iceland
//   npm run photos:add-single -- --image ./import/kyoto.jpg --caption "Kyoto"
//
// Run either without flags for interactive prompts. For each image it:
//   1. resizes to ~2500px long edge (sharp) into src/assets/photos/<slug>/
//   2. reads EXIF from the ORIGINAL (exifr), dropping GPS
//   3. detects orientation from real dimensions
//   4. generates the content .md with everything filled in
//
// Raw originals stay in the git-ignored import/ folder; only resized files land
// in the repo. Review the generated file, tweak captions/size, then git push.
// ─────────────────────────────────────────────────────────────────────────────
import { readdir, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import sharp from 'sharp';
import exifr from 'exifr';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const PHOTOS_DIR = path.join(ROOT, 'src', 'assets', 'photos');
const ALBUMS_DIR = path.join(ROOT, 'src', 'content', 'albums');
const SINGLES_DIR = path.join(ROOT, 'src', 'content', 'singles');
const MAX_EDGE = 2500;
const IMAGE_RE = /\.(jpe?g|png|webp|tiff?|avif)$/i;

// ── helpers ──────────────────────────────────────────────────────────────────
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

const pad = (n) => String(n).padStart(2, '0');

/** Quote a value safely for our hand-written YAML. */
function yamlStr(v) {
  if (v === undefined || v === null || v === '') return '""';
  return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const fmtDate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  // Local components (EXIF dates carry no timezone; avoid UTC off-by-one).
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
};

/** Extract the fields we surface, dropping GPS. Returns {} when nothing useful. */
async function readExif(file) {
  let raw;
  try {
    raw = await exifr.parse(file, {
      gps: false,
      pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'DateTimeOriginal'],
    });
  } catch {
    return {};
  }
  if (!raw) return {};
  const out = {};
  if (raw.Model) out.camera = [raw.Make, raw.Model].filter(Boolean).join(' ').replace(/(\b\w+\b)\s+\1/i, '$1');
  else if (raw.Make) out.camera = raw.Make;
  if (raw.LensModel) out.lens = raw.LensModel;
  if (raw.FocalLength) out.focal = `${Math.round(raw.FocalLength)}mm`;
  if (raw.FNumber) out.aperture = `f/${raw.FNumber}`;
  if (raw.ExposureTime) {
    out.shutter = raw.ExposureTime < 1 ? `1/${Math.round(1 / raw.ExposureTime)}` : `${raw.ExposureTime}s`;
  }
  if (raw.ISO) out.iso = raw.ISO;
  const d = fmtDate(raw.DateTimeOriginal);
  if (d) out.date = d;
  return out;
}

function serializeExif(exif, indent) {
  const keys = Object.keys(exif);
  if (keys.length === 0) return '';
  const lines = keys.map((k) => {
    const val = k === 'iso' ? exif[k] : yamlStr(exif[k]);
    return `${indent}  ${k}: ${val}`;
  });
  return `\n${indent}exif:\n${lines.join('\n')}`;
}

/** Resize an original into dest, returning {orientation, exif, date}. */
async function ingestImage(srcFile, destFile) {
  const [meta, exif] = await Promise.all([sharp(srcFile).rotate().metadata(), readExif(srcFile)]);
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const orientation = w === h ? 'square' : w > h ? 'landscape' : 'portrait';
  await sharp(srcFile)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destFile);
  return { orientation, exif };
}

async function listImages(dir) {
  const entries = await readdir(dir);
  return entries.filter((f) => IMAGE_RE.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Highest `order:` currently used across albums + singles. */
async function maxOrder() {
  let max = 0;
  for (const dir of [ALBUMS_DIR, SINGLES_DIR]) {
    let files = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
    } catch {
      continue;
    }
    for (const f of files) {
      const txt = await readFile(path.join(dir, f), 'utf8');
      const m = txt.match(/^order:\s*(\d+)/m);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max;
}

async function prompt(rl, q, def = '') {
  const suffix = def ? ` (${def})` : '';
  const ans = (await rl.question(`${q}${suffix}: `)).trim();
  return ans || def;
}

// ── commands ─────────────────────────────────────────────────────────────────
async function newAlbum(opts) {
  let { title, dir, description = '', date, cover, size = 'large' } = opts;

  if (!title || !dir) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    title ||= await prompt(rl, 'Album title');
    dir ||= await prompt(rl, 'Folder of images (under import/)', './import');
    description = description || (await prompt(rl, 'Description'));
    size = (await prompt(rl, 'Cover tile size [small|medium|large|full]', size)) || size;
    rl.close();
  }

  const srcDir = path.resolve(ROOT, dir);
  const files = await listImages(srcDir);
  if (files.length === 0) throw new Error(`No images found in ${srcDir}`);

  const slug = slugify(title);
  const destDir = path.join(PHOTOS_DIR, slug);
  await mkdir(destDir, { recursive: true });

  const rel = `../../assets/photos/${slug}`;
  const photos = [];
  let coverRel = null;

  console.log(`\nIngesting ${files.length} image(s) → ${destDir}`);
  for (let i = 0; i < files.length; i++) {
    const srcFile = path.join(srcDir, files[i]);
    const base = `${pad(i + 1)}-${slugify(path.parse(files[i]).name)}.jpg`;
    const destFile = path.join(destDir, base);
    const { orientation, exif } = await ingestImage(srcFile, destFile);
    const srcRel = `${rel}/${base}`;
    if ((cover && files[i] === cover) || (!cover && i === 0)) coverRel = srcRel;
    photos.push({ src: srcRel, orientation, exif });
    console.log(`  ✔ ${files[i]} → ${base} [${orientation}]`);
  }

  const order = (await maxOrder()) + 1;
  const takenDate = date || photos.find((p) => p.exif.date)?.exif.date || fmtDate(new Date());

  const photoBlock = photos
    .map(
      (p) =>
        `  - src: ${yamlStr(p.src)}\n` +
        `    orientation: ${yamlStr(p.orientation)}\n` +
        `    size: "medium"\n` +
        `    caption: ""` +
        serializeExif(p.exif, '    '),
    )
    .join('\n');

  const md =
    `---\n` +
    `title: ${yamlStr(title)}\n` +
    `description: ${yamlStr(description)}\n` +
    `date: ${takenDate}\n` +
    `cover: ${yamlStr(coverRel)}\n` +
    `order: ${order}\n` +
    `size: ${yamlStr(size)}\n` +
    `photos:\n${photoBlock}\n` +
    `---\n`;

  await mkdir(ALBUMS_DIR, { recursive: true });
  const outFile = path.join(ALBUMS_DIR, `${slug}.md`);
  await writeFile(outFile, md, 'utf8');
  console.log(`\n✅ Wrote ${path.relative(ROOT, outFile)} (order ${order}). Review it, then commit + push.`);
}

async function addSingle(opts) {
  let { image, caption = '', date, size = 'medium', title } = opts;

  if (!image) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    image = await prompt(rl, 'Image path (under import/)');
    caption = caption || (await prompt(rl, 'Caption'));
    size = (await prompt(rl, 'Tile size [small|medium|large|full]', size)) || size;
    rl.close();
  }

  const srcFile = path.resolve(ROOT, image);
  await stat(srcFile); // throws if missing
  const slug = slugify(title || caption || path.parse(srcFile).name);

  const destDir = path.join(PHOTOS_DIR, 'singles');
  await mkdir(destDir, { recursive: true });
  const base = `${slug}.jpg`;
  const destFile = path.join(destDir, base);
  const { orientation, exif } = await ingestImage(srcFile, destFile);
  console.log(`  ✔ ${path.basename(srcFile)} → singles/${base} [${orientation}]`);

  const order = (await maxOrder()) + 1;
  const takenDate = date || exif.date || fmtDate(new Date());
  const srcRel = `../../assets/photos/singles/${base}`;

  const md =
    `---\n` +
    `image: ${yamlStr(srcRel)}\n` +
    `caption: ${yamlStr(caption)}\n` +
    `date: ${takenDate}\n` +
    `order: ${order}\n` +
    `size: ${yamlStr(size)}\n` +
    `orientation: ${yamlStr(orientation)}` +
    serializeExif(exif, '') +
    `\n---\n`;

  await mkdir(SINGLES_DIR, { recursive: true });
  const outFile = path.join(SINGLES_DIR, `${slug}.md`);
  await writeFile(outFile, md, 'utf8');
  console.log(`\n✅ Wrote ${path.relative(ROOT, outFile)} (order ${order}). Review it, then commit + push.`);
}

// ── entry ────────────────────────────────────────────────────────────────────
const [, , cmd, ...rest] = process.argv;

const options = {
  title: { type: 'string' },
  dir: { type: 'string' },
  image: { type: 'string' },
  caption: { type: 'string' },
  description: { type: 'string' },
  date: { type: 'string' },
  cover: { type: 'string' },
  size: { type: 'string' },
};

try {
  const { values } = parseArgs({ args: rest, options, allowPositionals: true });
  if (cmd === 'new-album') await newAlbum(values);
  else if (cmd === 'add-single') await addSingle(values);
  else {
    console.error('Usage:\n  node scripts/photos.mjs new-album  --title "…" --dir ./import/xyz\n  node scripts/photos.mjs add-single --image ./import/x.jpg --caption "…"');
    process.exit(1);
  }
} catch (err) {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
}
