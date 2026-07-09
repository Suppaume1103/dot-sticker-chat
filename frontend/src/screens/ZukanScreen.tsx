import { useState } from 'react';
import PixelCanvas from '../components/PixelCanvas';
import { MOCK_COLLECTED, MOCK_CREATED, type ZukanCell } from './zukanMock';

type ZukanTab = 'collected' | 'created';

function ZukanScreen() {
  const [tab, setTab] = useState<ZukanTab>('collected');
  const cells = tab === 'collected' ? MOCK_COLLECTED : MOCK_CREATED;
  const collectedCount = MOCK_COLLECTED.filter((c) => !c.locked).length;

  return (
    <section className="scr">
      <header className="appbar">
        図鑑 <span className="sub">集めた {collectedCount} / {MOCK_COLLECTED.length}</span>
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
        <div className="zgrid">
          {cells.map((cell) => (
            <ZukanCellView key={cell.id} cell={cell} />
          ))}
        </div>
        <p className="lbl" style={{ marginTop: 8 }}>
          斜線=未入手 / グレー=失効（永続表示・保存数つき）
        </p>
      </div>
    </section>
  );
}

function ZukanCellView({ cell }: { cell: ZukanCell }) {
  const className = ['zcell', cell.locked && 'locked', cell.expired && 'exp'].filter(Boolean).join(' ');
  return (
    <div className={className}>
      {!cell.locked && cell.pixels && cell.pixels.length > 0 && (
        <PixelCanvas pixels={cell.pixels} size={80} />
      )}
      {cell.saveCount !== undefined && <div className="cnt">{cell.saveCount}</div>}
    </div>
  );
}

export default ZukanScreen;
