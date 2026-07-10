import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import PixelEditorCanvas from '../components/PixelEditorCanvas';
import { BucketIcon, EraserIcon, EyedropperIcon, PenIcon } from '../components/icons/ToolIcons';
import { PALETTE } from '../config/palette';
import { apiClient } from '../api/ApiClient';
import { MOCK_PROMPT } from './plazaMock';

const GRID = 16;
const BLANK: number[] = new Array(GRID * GRID).fill(1);
const BG_INDEX = 1; // パレット1番=白を背景/消しゴム色として扱う

type Tool = 'pen' | 'eraser' | 'eyedropper' | 'bucket';

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
  const [pixels, setPixels] = useState<number[]>(BLANK);
  const [history, setHistory] = useState<number[][]>([]);
  const [redoStack, setRedoStack] = useState<number[][]>([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [tool, setTool] = useState<Tool>('pen');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

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
    setSubmitState('submitting');
    try {
      // TODO: 認証実装後、AuthStoreのトークンをApiClientへ設定してから呼ぶ
      await apiClient.submitSticker(MOCK_PROMPT.id, pixels);
      setSubmitState('done');
    } catch {
      // backend未接続でも編集内容の確認はできるよう、ローカルではロックだけ行う
      setSubmitState('error');
    }
  };

  const locked = submitState === 'submitting' || submitState === 'done' || submitState === 'error';

  return (
    <section className="scr">
      <header className="appbar">
        <Link to="/">◂ 広場へ戻る</Link>
        <span className="sub">
          お題：{MOCK_PROMPT.theme} 残り 02:14
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
        {submitState === 'error' && (
          <p className="lbl">backend未接続のため送信できませんでした（見た目確認のみ・入力はロック済み）</p>
        )}
      </div>
    </section>
  );
}

export default DrawScreen;
