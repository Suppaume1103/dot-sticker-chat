import { Link } from 'react-router-dom';
import PixelCanvas from './PixelCanvas';
import type { Prompt } from '../types';
import type { MockField } from '../screens/plazaMock';
import type { FieldSticker } from '../types';

type PlazaFieldState = 'active' | 'grace';

interface PlazaFieldProps {
  prompt: Prompt;
  stickers: (FieldSticker & MockField)[];
  state: PlazaFieldState;
  presenceCount: number;
  countdownLabel: string;
}

const TIER_PX: Record<1 | 2 | 4 | 10, number> = { 1: 15, 2: 27, 4: 50, 10: 120 };

function PlazaField({ prompt, stickers, state, presenceCount, countdownLabel }: PlazaFieldProps) {
  return (
    <div className="field">
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

      {stickers.map((sticker) => {
        const px = TIER_PX[sticker.tier];
        return (
          <Link
            key={sticker.id}
            to={`/sticker/${sticker.id}`}
            className={`art t${sticker.tier}`}
            style={{ left: sticker.left, top: sticker.top, width: px, height: px }}
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
