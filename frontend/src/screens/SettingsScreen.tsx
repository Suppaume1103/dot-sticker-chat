import { useEffect, useState } from 'react';
import { apiClient } from '../api/ApiClient';

type ConnectionStatus = 'checking' | 'ok' | 'error';

// TODO: AuthStore実装後、モック値を実際のUser情報・ログアウト処理に置き換える
const MOCK_USER = { displayName: '酸っぱ梅', handle: 'suppa_ume' };

function SettingsScreen() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    apiClient
      .getHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <section className="scr">
      <header className="appbar">設定</header>
      <div className="body">
        <div className="setrow">
          <div className="avatar" style={{ width: 30, height: 30 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{MOCK_USER.displayName}</div>
            <div className="lbl">@{MOCK_USER.handle}</div>
          </div>
          <div className="r">編集 ▸</div>
        </div>
        <div className="setrow">
          表示名・ハンドル<div className="r">▸</div>
        </div>
        <div className="setrow">
          アバター<div className="r">▸</div>
        </div>
        <div className="setrow">
          通知
          <button
            type="button"
            className={notify ? 'toggle on' : 'toggle'}
            onClick={() => setNotify((v) => !v)}
            aria-label="通知の切り替え"
          />
        </div>
        <div className="setrow">
          このアプリについて<div className="r">▸</div>
        </div>
        <div className="setrow">
          チーム：DotGuys<div className="r">credit</div>
        </div>
        <div className="setrow" style={{ color: 'var(--accent)', fontWeight: 700 }}>
          ログアウト<div className="r" style={{ color: 'var(--accent)' }}>▸</div>
        </div>

        <p className="lbl" style={{ marginTop: 16 }}>
          [開発用] backend接続: {status}
        </p>
      </div>
    </section>
  );
}

export default SettingsScreen;
