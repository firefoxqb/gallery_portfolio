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
    items: ['Sony α7 IV', 'Fujifilm X100V'],
  },
  {
    category: 'Lenses',
    items: [
      'Sony FE 24–70mm f/2.8 GM',
      'Sony FE 35mm f/1.4 GM',
      'Sony FE 85mm f/1.8',
    ],
  },
  {
    category: 'Accessories',
    items: ['Peak Design Travel Tripod', 'K&F Variable ND', 'Peak Design Everyday Backpack'],
  },
];
