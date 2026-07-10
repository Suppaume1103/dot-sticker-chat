type IconProps = {
  active?: boolean;
};

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinejoin: 'miter' as const,
  strokeLinecap: 'square' as const,
};

export function PlazaIcon({ active }: IconProps) {
  return (
    <svg {...base} strokeWidth={active ? 2 : 1.5}>
      <path d="M4 6V20L10 17L14 20L20 17V3L14 6L10 3L4 6Z" />
      <path d="M10 3V17 M14 6V20" />
    </svg>
  );
}

export function ChatIcon({ active }: IconProps) {
  return (
    <svg {...base} strokeWidth={active ? 2 : 1.5}>
      <path d="M4 5H20V15H14L10 19V15H4V5Z" />
      <path d="M8 10H16" />
    </svg>
  );
}

export function ZukanIcon({ active }: IconProps) {
  return (
    <svg {...base} strokeWidth={active ? 2 : 1.5}>
      <path d="M4 4H10V10H4V4Z M14 4H20V10H14V4Z M4 14H10V20H4V14Z M14 14H20V20H14V14Z" />
    </svg>
  );
}

export function SettingsIcon({ active }: IconProps) {
  return (
    <svg {...base} strokeWidth={active ? 2 : 1.5}>
      <path d="M4 7H20 M4 17H20" />
      <path d="M8 4V10 M16 14V20" />
    </svg>
  );
}
