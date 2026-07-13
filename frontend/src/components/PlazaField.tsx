import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { Link } from 'react-router-dom';
import PixelCanvas from './PixelCanvas';
import { avoidReservedZone, blockToPixel, CELL, GRID_BLOCKS } from '../config/fieldConfig';
import type { Tier } from '../config/fieldConfig';
import type { FieldSticker, Prompt } from '../types';

type PlazaFieldState = 'active' | 'grace';

interface PlazaFieldProps {
  prompt: Prompt;
  stickers: FieldSticker[];
  state: PlazaFieldState;
  presenceCount: number;
  countdownLabel: string;
}

const TIER_PX: Record<Tier, number> = { 4: 15, 6: 27, 8: 50, 10: 120 };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const CANVAS_SIZE = GRID_BLOCKS * CELL; // フィールド全体の一辺(px、zoom=1のとき)

interface PinchState {
  distance: number;
  midX: number;
  midY: number;
}

function getPinchState(pointers: Map<number, { x: number; y: number }>): PinchState {
  const [a, b] = Array.from(pointers.values());
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return { distance: Math.hypot(dx, dy), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
}

function PlazaField({ prompt, stickers, state, presenceCount, countdownLabel }: PlazaFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null); // フィールドのサイズを取得するための参照
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // 進行中のポインタ(ドラッグ/ピンチ)の直近座標(ブラウザ座標系)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // ピンチ中、直前フレームの2点間距離・中点を覚えておくための参照
  const pinchRef = useRef<PinchState | null>(null);

  // panをキャンバスがビューポート外に完全に出ないようクランプする
  const clampPan = useCallback((nextPan: { x: number; y: number }, currentZoom: number) => {
    const viewportWidth = rootRef.current?.clientWidth ?? 0;
    const viewportHeight = rootRef.current?.clientHeight ?? 0;
    const canvasSize = CANVAS_SIZE * currentZoom;
    const clampAxis = (value: number, viewportSize: number) => {
      if (canvasSize <= viewportSize) {
        return (viewportSize - canvasSize) / 2;
      }
      return Math.min(0, Math.max(viewportSize - canvasSize, value));
    };
    return { x: clampAxis(nextPan.x, viewportWidth), y: clampAxis(nextPan.y, viewportHeight) };
  }, []);

  // (screenX, screenY)が画面上で同じ点を指し続けるようpanを補正しつつズーム倍率をfactor倍する
  const applyZoomFactor = useCallback(
    (screenX: number, screenY: number, factor: number) => {
      setZoom((prevZoom) => {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * factor));
        if (nextZoom === prevZoom) return prevZoom;
        setPan((prevPan) => {
          const canvasX = (screenX - prevPan.x) / prevZoom;
          const canvasY = (screenY - prevPan.y) / prevZoom;
          return clampPan(
            { x: screenX - canvasX * nextZoom, y: screenY - canvasY * nextZoom },
            nextZoom,
          );
        });
        return nextZoom;
      });
    },
    [clampPan],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // シール・「描く」ボタンなどのリンク上ではpointer captureを行わない。
    // ここでcaptureすると、クリックの相手がリンクではなくこの要素にリダイレクトされ、
    // タップ/クリックしても画面遷移が起きなくなってしまうため。
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ポインタが既に無効化されている等でcaptureに失敗しても、Mapへの登録自体は続行する
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      pinchRef.current = getPinchState(pointersRef.current);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;

    if (pointersRef.current.size === 1) {
      const prev = pointersRef.current.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }, zoom));
      return;
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = rootRef.current?.getBoundingClientRect();
    if (pinchRef.current && rect) {
      const current = getPinchState(pointersRef.current);
      const scale = current.distance / pinchRef.current.distance;
      applyZoomFactor(current.midX - rect.left, current.midY - rect.top, scale);
      pinchRef.current = current;
    }
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = pointersRef.current.size >= 2 ? getPinchState(pointersRef.current) : null;
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = Math.exp(-e.deltaY * 0.001); // ホイール量を滑らかな倍率に変換
    applyZoomFactor(e.clientX - rect.left, e.clientY - rect.top, factor);
  };

  return (
    <div
      className="field"
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={handleWheel}
    >
      <div className={state === 'grace' ? 'cd warn' : 'cd'}>{countdownLabel}</div>
      <div className="hud">
        {state === 'active' ? `◎ ${presenceCount}人 在室` : `作品 ${stickers.length}枚`}
      </div>
      <div
        className="field-canvas"
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* 広場（世界座標）の中心に固定。パン/ズームの対象内に置くことで、画面をスクロールすると画面外にも出る */}
        <div className="center">
          <div className="o">THEME{state === 'grace' ? '(終了)' : ''}</div>
          <div className="th">{prompt.theme}</div>
        </div>

        {stickers.map((sticker) => { // ステッカーの位置を計算して表示
          const px = TIER_PX[sticker.tier];
          const fieldWidth = CANVAS_SIZE;
          const fieldHeight = CANVAS_SIZE;
          const rawPosition = blockToPixel(sticker.blockX, sticker.blockY);
          const { left, top } = avoidReservedZone(
            rawPosition.left,
            rawPosition.top,
            px,
            fieldWidth,
            fieldHeight,
          );
          return (
            <Link
              key={sticker.id}
              to={`/sticker/${sticker.id}?via=plaza`}
              className={`art t${sticker.tier}`}
              style={{ left, top, width: px, height: px }}
            >
              {sticker.pixels && sticker.pixels.length > 0 && (
                <PixelCanvas pixels={sticker.pixels} size={px} />
              )}
              <span className="sc">{sticker.saveCount}</span>
            </Link>
          );
        })}
      </div>

      {state === 'active' && (
        <Link to="/draw" className="fab">
          描く
        </Link>
      )}
    </div>
  );
}

export default PlazaField;
