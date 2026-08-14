/**
 * Issue screens reuse the app-wide neutral surfaces (`#F8FAFC` screen, white
 * cards, `#111827` ink) so they sit flush with the navigation header.
 *
 * A white card on `#F8FAFC` is only ~2% lighter than the screen, so cards are
 * separated by an explicit `border` rather than by fill alone. Surfaces nested
 * *inside* a white card (inputs, chips, buttons) use `fill` + `fillBorder`, and
 * hairlines within a card use the lighter `divider`.
 *
 * Text tokens are capped at `faint` (4.8:1 on white) so every label stays
 * legible at 12px; anything lighter is reserved for icons and chevrons.
 */
export const issueColors = {
  screen: '#F8FAFC',
  card: '#FFFFFF',
  border: '#D1D5DB',
  divider: '#E5E7EB',
  fill: '#F1F3F7',
  fillBorder: '#CFD6E0',

  ink: '#111827',
  body: '#374151',
  muted: '#4B5563',
  faint: '#6B7280',
  icon: '#9CA3AF',

  openBg: '#FDE68A',
  openFg: '#78350F',
  doneBg: '#BBF7D0',
  doneFg: '#14532D',
  flag: '#B45309',

  danger: '#B91C1C',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FCA5A5',
};

/** Soft lift so cards still read as raised where a border alone looks flat. */
export const issueCardShadow = {
  elevation: 1,
  shadowColor: '#0F172A',
  shadowOffset: { height: 1, width: 0 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
};
