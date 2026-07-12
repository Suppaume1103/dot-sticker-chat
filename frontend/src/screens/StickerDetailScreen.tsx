import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PixelCanvas from '../components/PixelCanvas';
import { Avatar } from '../components/icons/Avatar';
import { apiClient, ApiError } from '../api/ApiClient';
import { joinPlazaField, leavePlazaField } from '../stores/PlazaStore';
import { refreshTray } from '../stores/TrayStore';
import { refreshZukan } from '../stores/ZukanStore';
import type { Prompt, StickerDetail } from '../types';

function StickerDetailScreen() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const via = searchParams.get('via') === 'chat' ? 'chat' : 'plaza';

  const [sticker, setSticker] = useState<StickerDetail | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isMine, setIsMine] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    apiClient
      .getSticker(id)
      .then(async (result) => {
        if (cancelled) return;
        setSticker(result.sticker);
        setIsMine(result.isMine);
        setSaved(result.alreadySaved);
        const { prompt: fetchedPrompt } = await apiClient.getPrompt(result.sticker.promptId);
        if (!cancelled) setPrompt(fetchedPrompt);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // I10: 広場保存(via=plaza)は在室(field:join)が必要。広場画面を経由して遷移すると
  // PlazaScreenのアンマウントで在室が外れてしまうため、ここでも在室を維持する。
  useEffect(() => {
    if (via !== 'plaza' || !sticker) return;
    joinPlazaField(sticker.promptId);
    return () => leavePlazaField(sticker.promptId);
  }, [via, sticker]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.saveSticker(id, via);
      setSaved(true);
      void refreshTray();
      void refreshZukan();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // 既に保存済み。表示上は成功と同じ扱いにする。
        setSaved(true);
        void refreshTray();
        void refreshZukan();
      } else if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="scr">
        <header className="appbar">
          <Link to="/">◂ 広場へ戻る</Link>
        </header>
        <div className="body">読み込み中...</div>
      </section>
    );
  }

  if (notFound || !sticker) {
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
          <Avatar seed={sticker.creatorId} size={32} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{sticker.creatorDisplayName}</div>
            {prompt && <div className="lbl">{prompt.theme}</div>}
          </div>
          <span className="pill" style={{ marginLeft: 'auto' }}>
            保存 {sticker.saveCount}
          </span>
        </div>
        {isMine ? (
          <p className="lbl" style={{ textAlign: 'center' }}>
            自分の作品は保存できません
          </p>
        ) : (
          <>
            <button type="button" className="btn cta" onClick={handleSave} disabled={saved || saving}>
              {saved ? '保存済み ✓' : 'このシールを保存（normal）'}
            </button>
            {saveError && (
              <p className="lbl" style={{ textAlign: 'center', color: 'var(--accent)' }}>
                {saveError}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default StickerDetailScreen;
