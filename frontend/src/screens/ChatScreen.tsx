import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PixelCanvas from '../components/PixelCanvas';
import StickerPickerSheet from '../components/StickerPickerSheet';
import { Avatar } from '../components/icons/Avatar';
import { useAuth } from '../stores/AuthStore';
import {
  refreshMessages,
  sendText as sendTextMessage,
  sendSticker as sendStickerMessage,
  useChat,
} from '../stores/ChatStore';
import { usePlaza } from '../stores/PlazaStore';
import { useTray } from '../stores/TrayStore';

function ChatScreen() {
  const { user } = useAuth();
  const { messages } = useChat();
  const { tray } = useTray();
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // ChatStoreはアプリ起動時（未ログイン状態）に既にimportされ得るため、
  // モジュールロード時の初回取得がtoken未セットのまま失敗している場合がある。
  // 画面を開くたびに再取得することで、新規ユーザーの初回訪問でも確実に履歴を表示する。
  useEffect(() => {
    void refreshMessages();
  }, []);

  const sendText = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    void sendTextMessage(body);
  };

  const sendSticker = (stickerId: string) => {
    setPickerOpen(false);
    void sendStickerMessage(stickerId);
  };

  return (
    <section className="scr">
      <header className="appbar">
        <span>
          <span className="mark">■</span>チャット
        </span>
        <span className="sub">ログイン中の全員</span>
      </header>
      <div className="body chat-body">
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={mine ? 'msg me' : 'msg'}>
              {!mine && <Avatar seed={m.senderId} size={26} />}
              <div className="msg-content">
                {!mine && <div className="lbl" style={{ marginBottom: 2 }}>{m.senderDisplayName}</div>}
                {m.kind === 'text' && <div className="bub">{m.body}</div>}
                {m.kind === 'sticker' && <StickerBubble stickerId={m.stickerId} />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="composer">
        <button type="button" className="ic" onClick={() => setPickerOpen(true)}>
          シール
        </button>
        <input
          className="field-in"
          placeholder="メッセージ…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendText();
          }}
        />
      </div>
      {pickerOpen && (
        <StickerPickerSheet tray={tray} onPick={sendSticker} onClose={() => setPickerOpen(false)} />
      )}
    </section>
  );
}

function StickerBubble({ stickerId }: { stickerId?: string }) {
  const { stickers } = usePlaza();
  const sticker = stickers.find((s) => s.id === stickerId);
  const isExpired = !sticker;

  const body = (
    <div>
      <div className={isExpired ? 'stk exp' : 'stk'}>
        {sticker?.pixels && sticker.pixels.length > 0 && <PixelCanvas pixels={sticker.pixels} size={64} />}
        {!isExpired && <span className="save">保存</span>}
      </div>
      {isExpired && (
        <div className="lbl" style={{ alignSelf: 'flex-end' }}>
          失効済み
          <br />
          保存不可
        </div>
      )}
    </div>
  );

  return isExpired ? body : <Link to={`/sticker/${stickerId}?via=chat`}>{body}</Link>;
}

export default ChatScreen;
