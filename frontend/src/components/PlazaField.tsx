import { useRef } from 'react';
import { Link } from 'react-router-dom';
import PixelCanvas from './PixelCanvas';
import { avoidReservedZone, blockToPixel } from '../config/fieldConfig';
import type { FieldSticker, Prompt } from '../types';

type PlazaFieldState = 'active' | 'grace';

interface PlazaFieldProps {
  prompt: Prompt;
  stickers: FieldSticker[];
  state: PlazaFieldState;
  presenceCount: number;
  countdownLabel: string;
}

const TIER_PX: Record<1 | 2 | 4 | 10, number> = { 1: 15, 2: 27, 4: 50, 10: 120 };

function PlazaField({ prompt, stickers, state, presenceCount, countdownLabel }: PlazaFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null); // フィールドのサイズを取得するための参照

  return (
    <div className="field" ref={rootRef}>
      <div className={state === 'grace' ? 'cd warn' : 'cd'}>{countdownLabel}</div>
      <div className="hud">
        {state === 'active' ? `◎ ${presenceCount}人 在室` : `作品 ${stickers.length}枚`}
      </div>
      <div className="zoom">
        <div>+</div>
        <div>−</div>
      </div>
      <div className="center">
        <div className="o">THEME{state === 'grace' ? '(終了)' : ''}</div>
        <div className="th">{prompt.theme}</div>
      </div>

      {stickers.map((sticker) => { // ステッカーの位置を計算して表示
        const px = TIER_PX[sticker.tier];
        const fieldWidth = rootRef.current?.clientWidth ?? 0;
        const fieldHeight = rootRef.current?.clientHeight ?? 0;
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
            to={`/sticker/${sticker.id}`}
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

      {state === 'active' && (
        <Link to="/draw" className="fab">
          描く
        </Link>
      )}
    </div>
  );
}

export default PlazaField;
