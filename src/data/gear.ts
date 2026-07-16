// Your kit — grouped by type. Add/remove lines freely; the About page renders
// whatever is here. Keeping this as data (not markup) means updating your gear
// is a one-line edit.
export interface GearGroup {
  category: string;
  items: string[];
}

export const gear: GearGroup[] = [
  {
    category: 'Bodies',
    items: ['Sony α6400'],
  },
  {
    category: 'Lenses',
    items: [
      'Sony E 16–50mm f/3.5–5.6 kit',
      'Sigma 28–70mm f/2.8 DG DN',
    ],
  },
];
