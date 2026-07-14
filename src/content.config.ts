import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Tile emphasis in the feed / rhythm inside an album.
const sizeEnum = z.enum(['small', 'medium', 'large', 'full']).default('medium');
const orientationEnum = z.enum(['portrait', 'landscape', 'square']).optional();

// Camera/exposure metadata captured at ingest time by scripts/photos.mjs.
// GPS is intentionally never stored. Every field is optional so partial EXIF
// still renders and photos with none simply hide the panel.
const exifSchema = z
  .object({
    camera: z.string().optional(),
    lens: z.string().optional(),
    focal: z.string().optional(),
    aperture: z.string().optional(),
    shutter: z.string().optional(),
    iso: z.union([z.number(), z.string()]).optional(),
    date: z.string().optional(),
  })
  .optional();

const albums = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/albums' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().default(''),
      date: z.coerce.date(),
      cover: image(),
      order: z.number().default(0),
      size: sizeEnum,
      photos: z
        .array(
          z.object({
            src: image(),
            alt: z.string().default(''),
            caption: z.string().default(''),
            size: sizeEnum,
            orientation: orientationEnum,
            exif: exifSchema,
          }),
        )
        .default([]),
    }),
});

const singles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/singles' }),
  schema: ({ image }) =>
    z.object({
      image: image(),
      alt: z.string().default(''),
      caption: z.string().default(''),
      date: z.coerce.date(),
      order: z.number().default(0),
      size: sizeEnum,
      orientation: orientationEnum,
      exif: exifSchema,
    }),
});

export const collections = { albums, singles };
