import PixelCanvas from './PixelCanvas';
import type { TrayItem } from '../types';

interface StickerPickerSheetProps {
  tray: TrayItem[];
  onPick: (stickerId: string) => void;
  onClose: () => void;
}

function StickerPickerSheet({ tray, onPick, onClose }: StickerPickerSheetProps) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h4>シールを送る</h4>
        <p className="hint">いま使える札だけ表示（保存済み・期限内）</p>
        <div className="pickgrid">
          {tray.map((sticker) => (
            <button
              type="button"
              key={sticker.id}
              onClick={() => onPick(sticker.id)}
              aria-label={`シール${sticker.id}を送る`}
            >
              {sticker.pixels && sticker.pixels.length > 0 ? (
                <PixelCanvas pixels={sticker.pixels} size={64} />
              ) : null}
            </button>
          ))}
        </div>
        <p className="lbl" style={{ marginTop: 8 }}>失効・未所持は非表示</p>
      </div>
    </div>
  );
}

export default StickerPickerSheet;
