import { PALETTE } from '../config/palette';

interface PixelCanvasProps {
  pixels: number[]; // 256要素のパレットindex配列(0-15)。0番は背景(白)扱い
  size?: number; // 一辺(px)
}

const GRID = 16;

function PixelCanvas({ pixels, size = 256 }: PixelCanvasProps) {
  return (
    <div
      className="pixel-canvas"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${GRID}, 1fr)`,
        gridTemplateRows: `repeat(${GRID}, 1fr)`,
      }}
    >
      {Array.from({ length: GRID * GRID }, (_, i) => (
        <div key={i} style={{ background: PALETTE[pixels[i] ?? 1] }} />
      ))}
    </div>
  );
}

export default PixelCanvas;
