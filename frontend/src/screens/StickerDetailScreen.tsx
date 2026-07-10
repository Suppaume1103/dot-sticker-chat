import { Link, useParams } from 'react-router-dom';
import PixelCanvas from '../components/PixelCanvas';
import { Avatar } from '../components/icons/Avatar';
import { MOCK_PROMPT, MOCK_STICKERS } from './plazaMock';

function StickerDetailScreen() {
  const { id } = useParams();
  const sticker = MOCK_STICKERS.find((s) => String(s.id) === id);

  if (!sticker) {
    return (
      <section className="scr">
        <header className="appbar">
          <Link to="/">◂ 広場へ戻る</Link>
        </header>
        <div className="body">
          <p className="lbl">シールが見つかりません</p>
        </div>
      </section>
    );
  }

  return (
    <section className="scr">
      <header className="appbar">
        <Link to="/">◂ 広場へ戻る</Link>
        <span className="sub">拡大表示</span>
      </header>
      <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <PixelCanvas pixels={sticker.pixels ?? []} size={280} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar seed={sticker.creatorName ?? sticker.id} size={32} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{sticker.creatorName ?? '作者不明'}</div>
            <div className="lbl">
              第{MOCK_PROMPT.id}回・{MOCK_PROMPT.theme}
            </div>
          </div>
          <span className="pill" style={{ marginLeft: 'auto' }}>
            保存 {sticker.saveCount}
          </span>
        </div>
        {/* TODO: SaveService実装後、保存済み判定と POST /api/stickers/:id/save に接続 */}
        <button type="button" className="btn cta" disabled>
          このシールを保存（normal）
        </button>
        <p className="lbl" style={{ textAlign: 'center' }}>
          保存済みなら「保存済 ✓」/ 未保有・1枚まで
        </p>
      </div>
    </section>
  );
}

export default StickerDetailScreen;
