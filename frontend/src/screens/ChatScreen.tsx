import { useState } from 'react';
import PixelCanvas from '../components/PixelCanvas';
import StickerPickerSheet from '../components/StickerPickerSheet';
import { Avatar } from '../components/icons/Avatar';
import { apiClient } from '../api/ApiClient';
import { MOCK_STICKERS } from './plazaMock';
import { MOCK_MESSAGES, MOCK_SELF_ID, MOCK_TRAY, type MockChatMessage } from './chatMock';

function nextId(messages: MockChatMessage[]): string {
  const maxId = Math.max(0, ...messages.map((m) => Number(m.id)));
  return String(maxId + 1);
}

function ChatScreen() {
  const [messages, setMessages] = useState<MockChatMessage[]>(MOCK_MESSAGES);
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const sendText = () => {
    const body = text.trim();
    if (!body) return;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(prev),
        senderId: MOCK_SELF_ID,
        senderName: '自分',
        kind: 'text',
        body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText('');
    // TODO: SocketClient配信を待たず楽観的更新。backend実装後は失敗時のロールバックを追加
    apiClient.sendMessage({ kind: 'text', body }).catch(() => {});
  };

  const sendSticker = (stickerId: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(prev),
        senderId: MOCK_SELF_ID,
        senderName: '自分',
        kind: 'sticker',
        stickerId,
        createdAt: new Date().toISOString(),
      },
    ]);
    setPickerOpen(false);
    apiClient.sendMessage({ kind: 'sticker', stickerId }).catch(() => {});
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
          const mine = m.senderId === MOCK_SELF_ID;
          return (
            <div key={m.id} className={mine ? 'msg me' : 'msg'}>
              {!mine && <Avatar seed={m.senderId} size={26} />}
              <div>
                {!mine && <div className="lbl" style={{ marginBottom: 2 }}>{m.senderName}</div>}
                {m.kind === 'text' && <div className="bub">{m.body}</div>}
                {m.kind === 'sticker' && <StickerBubble stickerId={m.stickerId} expired={m.expired} />}
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
        <StickerPickerSheet tray={MOCK_TRAY} onPick={sendSticker} onClose={() => setPickerOpen(false)} />
      )}
    </section>
  );
}

function StickerBubble({ stickerId, expired }: { stickerId?: string; expired?: boolean }) {
  const sticker = MOCK_STICKERS.find((s) => s.id === stickerId);
  const isExpired = expired || !sticker;

  return (
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
}

export default ChatScreen;
