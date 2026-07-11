import { useEffect, useState } from 'react';
import { Avatar } from '../components/icons/Avatar';
import { apiClient } from '../api/ApiClient';
import { toggleTheme, useTheme } from '../stores/ThemeStore';
import { logout, updateDisplayName, useAuth } from '../stores/AuthStore';

type ConnectionStatus = 'checking' | 'ok' | 'error';

function SettingsScreen() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [notify, setNotify] = useState(true);
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  const openEditModal = () => {
    setDisplayNameInput(user?.displayName ?? '');
    setSaveError(null);
    setEditing(true);
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateDisplayName(trimmed);
      setEditing(false);
    } catch {
      setSaveError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <section className="scr">
        <header className="appbar">
          <span>
            <span className="mark">■</span>設定
          </span>
        </header>
        <div className="body">読み込み中...</div>
      </section>
    );
  }

  return (
    <section className="scr">
      <header className="appbar">
        <span>
          <span className="mark">■</span>設定
        </span>
      </header>
      <div className="body">
        <div className="setrow" onClick={openEditModal} style={{ cursor: 'pointer' }}>
          <Avatar seed={user.handle} size={30} />
          <div>
            <div style={{ fontWeight: 700 }}>{user.displayName}</div>
            <div className="lbl">@{user.handle}</div>
          </div>
          <div className="r">編集 ▸</div>
        </div>
        <div className="setrow" onClick={openEditModal} style={{ cursor: 'pointer' }}>
          表示名・ユーザーID<div className="r">▸</div>
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
          ダークモード
          <button
            type="button"
            className={theme === 'dark' ? 'toggle on' : 'toggle'}
            onClick={toggleTheme}
            aria-label="ダークモードの切り替え"
          />
        </div>
        <div className="setrow">
          credit<div className="r">B班:DotGuys</div>
        </div>
        <div
          className="setrow"
          onClick={logout}
          style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}
        >
          ログアウト<div className="r" style={{ color: 'var(--accent)' }}>▸</div>
        </div>

        <p className="lbl" style={{ marginTop: 16 }}>
          [開発用] backend接続: {status}
        </p>
      </div>

      {editing && (
        <div className="modal-scrim" onClick={() => setEditing(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h4>表示名・ユーザーID</h4>
            <p className="hint">ユーザーIDは変更できません</p>
            <div className="setrow">
              <div className="lbl">ユーザーID</div>
              <div className="r">@{user.handle}</div>
            </div>
            <label className="lbl" style={{ display: 'block', marginTop: 12 }}>
              表示名
            </label>
            <input
              className="field-in"
              style={{ width: '100%', marginTop: 4 }}
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
            />
            {saveError && (
              <p className="lbl" style={{ color: 'var(--accent)', marginTop: 8 }}>
                {saveError}
              </p>
            )}
            <button
              type="button"
              className="btn cta"
              style={{ marginTop: 12, width: '100%' }}
              onClick={handleSaveDisplayName}
              disabled={saving || !displayNameInput.trim()}
            >
              {saving ? '保存中…' : '保存する'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default SettingsScreen;
