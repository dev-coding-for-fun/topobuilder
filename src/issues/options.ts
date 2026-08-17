export const ISSUE_TYPES = [
  { label: 'Bolts (#)', value: 'Bolts' },
  { label: 'All Bolts', value: 'All Bolts' },
  { label: 'Anchor', value: 'Anchor' },
  { label: 'Rock', value: 'Rock' },
] as const;

export const SUB_ISSUES_BY_TYPE: Record<string, string[]> = {
  Anchor: [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  Bolts: [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  'All Bolts': [
    'Loose nut',
    'Loose bolt',
    'Loose glue-in',
    'Rusted',
    'Outdated',
    'Worn',
    'Missing (bolt and hanger)',
    'Missing (hanger)',
    'Other',
  ],
  Rock: ['Loose block', 'Loose flake', 'Other'],
};
