import { useState } from 'react';
import PixelCanvas from '../components/PixelCanvas';
import { useZukan } from '../stores/ZukanStore';
import type { CollectedSticker, CreatedSticker } from '../types';

type ZukanTab = 'collected' | 'created';

interface ZukanCell {
  id: string;
  pixels: number[];
  saveCount?: number;
  expired: boolean;
}

function toCell(sticker: CollectedSticker | CreatedSticker): ZukanCell {
  return {
    id: sticker.id,
    pixels: sticker.pixels,
    saveCount: 'saveCount' in sticker ? sticker.saveCount : undefined,
    expired: sticker.expired,
  };
}

function ZukanScreen() {
  const [tab, setTab] = useState<ZukanTab>('collected');
  const { collected, created } = useZukan();
  const cells = (tab === 'collected' ? collected : created).map(toCell);

  return (
    <section className="scr">
      <header className="appbar">
        <span>
          <span className="mark">■</span>図鑑
        </span>
        <span className="sub">集めた {collected.length}枚</span>
      </header>
      <div className="body">
        <div className="tabs">
          <div className={tab === 'collected' ? 'on' : ''} onClick={() => setTab('collected')}>
            集めた
          </div>
          <div className={tab === 'created' ? 'on' : ''} onClick={() => setTab('created')}>
            描いた
          </div>
        </div>
        {cells.length === 0 ? (
          <p className="lbl">まだ{tab === 'collected' ? '集めた' : '描いた'}シールがありません</p>
        ) : (
          <div className="zgrid">
            {cells.map((cell) => (
              <ZukanCellView key={cell.id} cell={cell} />
            ))}
          </div>
        )}
        <p className="lbl" style={{ marginTop: 8 }}>
          グレー=失効（永続表示・保存数つき）
        </p>
      </div>
    </section>
  );
}

function ZukanCellView({ cell }: { cell: ZukanCell }) {
  const className = ['zcell', cell.expired && 'exp', !cell.expired && 'got'].filter(Boolean).join(' ');
  return (
    <div className={className}>
      {cell.pixels && cell.pixels.length > 0 && <PixelCanvas pixels={cell.pixels} size={80} />}
      {cell.saveCount !== undefined && <div className="cnt">{cell.saveCount}</div>}
    </div>
  );
}

export default ZukanScreen;
