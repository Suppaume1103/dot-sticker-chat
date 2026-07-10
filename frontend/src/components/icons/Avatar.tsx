const FACE_COLORS = ['#3d8ce0', '#5db85d', '#7b5cff', '#e07ab5', '#f3a23d', '#2f6b4f', '#1c3d6b'];

function hash(seed: string | number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ドット絵アプリのプレースホルダー用8bit顔アイコン。senderId/handle等のseedから決定的に色と表情を生成する
export function Avatar({ seed, size = 32 }: { seed: string | number; size?: number }) {
  const h = hash(seed);
  const bg = FACE_COLORS[h % FACE_COLORS.length];
  const mouthOpen = (h >> 3) % 2 === 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      style={{ border: '1.5px solid var(--ink)' }}
    >
      <rect width="16" height="16" fill={bg} />
      <rect x="4" y="6" width="2" height="2" fill="var(--on-accent)" />
      <rect x="10" y="6" width="2" height="2" fill="var(--on-accent)" />
      {mouthOpen ? (
        <rect x="6" y="10" width="4" height="2" fill="var(--on-accent)" />
      ) : (
        <rect x="5" y="10" width="6" height="1" fill="var(--on-accent)" />
      )}
    </svg>
  );
}
