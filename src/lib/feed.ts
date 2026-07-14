import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';

export interface FeedAlbum {
  kind: 'album';
  slug: string;
  title: string;
  description: string;
  cover: ImageMetadata;
  ar: number;
  order: number;
  date: Date;
  count: number;
  size: 'small' | 'medium' | 'large' | 'full';
}

export interface FeedSingle {
  kind: 'single';
  slug: string;
  image: ImageMetadata;
  ar: number;
  caption: string;
  alt: string;
  order: number;
  date: Date;
  size: 'small' | 'medium' | 'large' | 'full';
  exif?: Record<string, string | number>;
}

export type FeedItem = FeedAlbum | FeedSingle;

const aspect = (img: ImageMetadata) =>
  img.width && img.height ? +(img.width / img.height).toFixed(4) : 1;

/** Merged, sorted home feed. Higher `order` floats up; ties break newest-first. */
export async function getFeed(): Promise<FeedItem[]> {
  const [albums, singles] = await Promise.all([
    getCollection('albums'),
    getCollection('singles'),
  ]);

  const items: FeedItem[] = [
    ...albums.map((a): FeedAlbum => ({
      kind: 'album',
      slug: a.id,
      title: a.data.title,
      description: a.data.description,
      cover: a.data.cover,
      ar: aspect(a.data.cover),
      order: a.data.order,
      date: a.data.date,
      count: a.data.photos.length,
      size: a.data.size,
    })),
    ...singles.map((s): FeedSingle => ({
      kind: 'single',
      slug: s.id,
      image: s.data.image,
      ar: aspect(s.data.image),
      caption: s.data.caption,
      alt: s.data.alt || s.data.caption,
      order: s.data.order,
      date: s.data.date,
      size: s.data.size,
      exif: s.data.exif,
    })),
  ];

  items.sort((a, b) => b.order - a.order || b.date.getTime() - a.date.getTime());
  return items;
}
