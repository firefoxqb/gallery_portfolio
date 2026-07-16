// Central site configuration — edit these to make the portfolio yours.
export const site = {
  name: 'Sameer Maharjan',
  role: 'Photographer',
  // Short tagline shown in the masthead / hero.
  tagline: 'Light, place, and the moments in between.',
  // Longer intro used on the About page (one paragraph per array item).
  intro: [
    'I take photos as a hobby — mostly places and the quiet in between: landscapes, streets, and the small scenes that usually go unnoticed.',
    'This is an evolving archive of personal work. Prints and collaborations on request.',
  ],
  location: 'Kathmandu / Tokyo',
  email: 'sameer.maharjan@schemeverge.com',
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'Email', href: 'mailto:sameer.maharjan@schemeverge.com' },
  ],
  // Formspree form id, e.g. 'xmyzabcd' → https://formspree.io/f/xmyzabcd
  // Leave empty to fall back to a mailto: contact link.
  formspreeId: '',
};

export type SiteConfig = typeof site;
