// Prefix an internal path with the configured base (handles GitHub Pages
// project-page deploys where base is '/repo-name'). BASE_URL may or may not
// carry a trailing slash, so normalize to exactly one separator.
export function withBase(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${p.replace(/^\//, '')}`;
}
