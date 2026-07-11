import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { PALETTE } from '../config/palette';

interface PixelEditorCanvasProps {
  pixels: number[]; // 256要素
  size?: number;
  onPaint: (index: number) => void;
  disabled?: boolean;
}

const GRID = 16;

function PixelEditorCanvas({ pixels, size = 320, onPaint, disabled }: PixelEditorCanvasProps) {
  const isPaintingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // タッチはドラッグ開始セルへ暗黙にcaptureされ、途中のセルではpointer系イベントが発火しないため、
  // 座標からelementFromPointで「今指/カーソルが乗っているセル」を毎回引き直す。
  const paintAtPoint = (clientX: number, clientY: number) => {
    if (disabled) return;
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !rootRef.current?.contains(el)) return;
    const indexAttr = (el as HTMLElement).dataset.index;
    if (indexAttr === undefined) return;
    onPaint(Number(indexAttr));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    isPaintingRef.current = true;
    paintAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPaintingRef.current) return;
    paintAtPoint(e.clientX, e.clientY);
  };

  const stopPainting = () => {
    isPaintingRef.current = false;
  };

  return (
    <div
      ref={rootRef}
      className="pixel-canvas editable"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${GRID}, 1fr)`,
        gridTemplateRows: `repeat(${GRID}, 1fr)`,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPainting}
      onPointerCancel={stopPainting}
      onPointerLeave={stopPainting}
    >
      {Array.from({ length: GRID * GRID }, (_, i) => (
        <div key={i} data-index={i} style={{ background: PALETTE[pixels[i] ?? 1] }} />
      ))}
    </div>
  );
}

export default PixelEditorCanvas;
