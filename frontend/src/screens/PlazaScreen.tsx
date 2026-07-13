import { useEffect, useState } from 'react';
import PlazaField from '../components/PlazaField';
import { joinPlazaField, leavePlazaField, usePlaza } from '../stores/PlazaStore';

// フィールドの残り時間をフォーマットする関数
function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

// 広場画面のコンポーネント
function PlazaScreen() {
  const { prompt, state, stickers, presenceCount, error, loading } = usePlaza();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!prompt) {
      return;
    }
    joinPlazaField(prompt.id);
    return () => leavePlazaField(prompt.id);
  }, [prompt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) {
    return (
      <section className="scr">
        <header className="appbar">
          <span>
            <span className="mark">■</span>広場
          </span>
        </header>
        <div className="body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {error === '現在開催中のお題はありません' ? '現在開催中のお題はありません。' : error}
        </div>
      </section>
    );
  }

  if (loading || !prompt || !state) {
    return (
      <section className="scr">
        <header className="appbar">
          <span>
            <span className="mark">■</span>広場
          </span>
        </header>
        <div className="body">読み込み中...</div>
      </section>
    );
  }

  const countdownLabel =
    state === 'active'
      ? `⏱ ${formatCountdown(new Date(prompt.closesAt).getTime() - now)} / 描ける`
      : `作画終了 / 失効まで ${formatCountdown(new Date(prompt.expiresAt).getTime() - now)}`;

  return (
    <section className="scr">
      <header className="appbar">
        <span>
          <span className="mark">■</span>広場
        </span>
        <span className="sub">
          {prompt.theme}・{state === 'active' ? '開催中' : '描画期間終了・鑑賞保存可能'}
        </span>
      </header>
      <div className="body" style={{ padding: 0 }}>
        <PlazaField
          prompt={prompt}
          stickers={stickers}
          state={state === 'grace' ? 'grace' : 'active'}
          presenceCount={presenceCount}
          countdownLabel={countdownLabel}
        />
      </div>
    </section>
  );
}

export default PlazaScreen;
