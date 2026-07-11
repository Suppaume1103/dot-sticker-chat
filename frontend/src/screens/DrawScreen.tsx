import { useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import PixelEditorCanvas from '../components/PixelEditorCanvas';
import { BucketIcon, EraserIcon, EyedropperIcon, PenIcon } from '../components/icons/ToolIcons';
import { PALETTE } from '../config/palette';
import { ApiError, apiClient } from '../api/ApiClient';
import { joinPlazaField, leavePlazaField, usePlaza } from '../stores/PlazaStore';
import { refreshTray } from '../stores/TrayStore';
import { refreshZukan } from '../stores/ZukanStore';

const GRID = 16;
const BLANK: number[] = new Array(GRID * GRID).fill(1);
const BG_INDEX = 1; // パレット1番=白を背景/消しゴム色として扱う

type Tool = 'pen' | 'eraser' | 'eyedropper' | 'bucket';

// フィールドの残り時間をフォーマットする関数（PlazaScreen.tsxと同じロジック）
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

const TOOL_META: Record<Tool, { label: string; Icon: ComponentType }> = {
  pen: { label: 'ペン', Icon: PenIcon },
  eraser: { label: '消し', Icon: EraserIcon },
  eyedropper: { label: 'スポイト', Icon: EyedropperIcon },
  bucket: { label: 'バケツ', Icon: BucketIcon },
};

function floodFill(pixels: number[], start: number, target: number, replacement: number): number[] {
  if (target === replacement) return pixels;
  const next = [...pixels];
  const stack = [start];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    if (next[i] !== target) continue;
    next[i] = replacement;
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    if (x > 0) stack.push(i - 1);
    if (x < GRID - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - GRID);
    if (y < GRID - 1) stack.push(i + GRID);
  }
  return next;
}

function DrawScreen() {
  const { prompt } = usePlaza();
  const [pixels, setPixels] = useState<number[]>(BLANK);
  const [history, setHistory] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [submitErrorMessage, setSubmitErrorMessage] = useState('送信に失敗しました');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // I10: 描画には広場への在室（field:join）が必要なため、PlazaScreenと同様にここでも在室登録する。
  useEffect(() => {
    if (!prompt) return;
    joinPlazaField(prompt.id);
    return () => leavePlazaField(prompt.id);
  }, [prompt]);

  const commit = (next: number[]) => {
    setHistory((h) => [...h, pixels]);
    setRedoStack([]);
    setPixels(next);
  };

  const handlePaint = (index: number) => {
    if (submitState === 'done') return;
    if (tool === 'eyedropper') {
      setSelectedColor(pixels[index]);
      setTool('pen');
      return;
    }
    if (tool === 'bucket') {
      commit(floodFill(pixels, index, pixels[index], selectedColor));
      return;
    }
    const color = tool === 'eraser' ? BG_INDEX : selectedColor;
    if (pixels[index] === color) return;
    const next = [...pixels];
    next[index] = color;
    commit(next);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, pixels]);
    setPixels(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, pixels]);
    setPixels(next);
  };

  const clearAll = () => {
    if (pixels.every((p) => p === BG_INDEX)) return;
    commit(new Array(GRID * GRID).fill(BG_INDEX));
  };

  const handleSubmit = async () => {
    if (!prompt) return;
    setSubmitState('submitting');
    try {
      await apiClient.submitSticker(prompt.id, pixels);
      setSubmitState('done');
      void refreshZukan();
      void refreshTray();
    } catch (err) {
      setSubmitErrorMessage(err instanceof ApiError ? err.message : '送信に失敗しました');
      setSubmitState('error');
    }
  };

  const locked = submitState === 'submitting' || submitState === 'done' || submitState === 'error';

  if (!prompt) {
    return (
      <section className="scr">
        <header className="appbar">
          <Link to="/">◂ 広場へ戻る</Link>
        </header>
        <div className="body">読み込み中...</div>
      </section>
    );
  }

  return (
    <section className="scr">
      <header className="appbar">
        <Link to="/">◂ 広場へ戻る</Link>
        <span className="sub">
          お題：{prompt.theme} 残り {formatCountdown(new Date(prompt.closesAt).getTime() - now)}
        </span>
      </header>
      <div className="body">
        <PixelEditorCanvas pixels={pixels} onPaint={handlePaint} disabled={locked} />

        <div className="palette">
          {PALETTE.map((color, i) => (
            <button
              type="button"
              key={color}
              className={i === selectedColor ? 'sel' : ''}
              style={{ background: color }}
              onClick={() => setSelectedColor(i)}
              aria-label={`色${i}`}
            />
          ))}
        </div>

        <div className="tools tools-icon">
          {(['pen', 'eraser', 'eyedropper', 'bucket'] as Tool[]).map((t) => {
            const { label, Icon } = TOOL_META[t];
            return (
              <button
                type="button"
                key={t}
                className={t === tool ? 'on' : ''}
                onClick={() => setTool(t)}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>
        <div className="tools">
          <button type="button" onClick={undo} disabled={history.length === 0}>
            ↩ Undo
          </button>
          <button type="button" onClick={redo} disabled={redoStack.length === 0}>
            ↪ Redo
          </button>
          <button type="button" onClick={clearAll}>
            全消去
          </button>
          <button type="button" className="btn-submit" onClick={handleSubmit} disabled={locked}>
            {submitState === 'submitting' ? '送信中…' : '保存（確定）'}
          </button>
        </div>

        {submitState === 'done' && <p className="lbl">投稿しました。1お題1枚・再投稿はできません。</p>}
        {submitState === 'error' && <p className="lbl">{submitErrorMessage}</p>}
      </div>
    </section>
  );
}

export default DrawScreen;
