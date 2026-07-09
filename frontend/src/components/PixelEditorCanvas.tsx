import { useRef } from 'react';
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

  return (
    <div
      className="pixel-canvas editable"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${GRID}, 1fr)`,
        gridTemplateRows: `repeat(${GRID}, 1fr)`,
      }}
      onMouseDown={() => {
        isPaintingRef.current = true;
      }}
      onMouseUp={() => {
        isPaintingRef.current = false;
      }}
      onMouseLeave={() => {
        isPaintingRef.current = false;
      }}
    >
      {Array.from({ length: GRID * GRID }, (_, i) => (
        <div
          key={i}
          style={{ background: PALETTE[pixels[i] ?? 1] }}
          onMouseDown={() => !disabled && onPaint(i)}
          onMouseEnter={() => !disabled && isPaintingRef.current && onPaint(i)}
        />
      ))}
    </div>
  );
}

export default PixelEditorCanvas;
