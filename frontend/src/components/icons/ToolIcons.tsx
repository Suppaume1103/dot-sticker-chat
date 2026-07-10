const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinejoin: 'miter' as const,
  strokeLinecap: 'square' as const,
};

export function PenIcon() {
  return (
    <svg {...base}>
      <path d="M18 4L20 6L8 18H6V16L18 4Z" />
      <path d="M15 7L17 9" />
    </svg>
  );
}

export function EraserIcon() {
  return (
    <svg {...base}>
      <rect x="5" y="9" width="14" height="8" transform="rotate(-18 12 13)" />
      <path d="M8 19H18" />
    </svg>
  );
}

export function EyedropperIcon() {
  return (
    <svg {...base}>
      <path d="M15 5L19 9L16 12L12 8L15 5Z" />
      <path d="M12 8L6 14V18H10L16 12" />
      <path d="M6 18L4 20" />
    </svg>
  );
}

export function BucketIcon() {
  return (
    <svg {...base}>
      <polygon points="7,10 17,10 15,20 9,20" />
      <path d="M5 10H19" />
      <path d="M9 10V6H15V10" />
      <path d="M19 13V15" />
    </svg>
  );
}
