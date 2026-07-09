import { useState } from 'react';
import PlazaField from '../components/PlazaField';
import { MOCK_PROMPT, MOCK_STICKERS } from './plazaMock';

type PlazaFieldState = 'active' | 'grace';

function PlazaScreen() {
  // TODO: PromptStateService/PlazaStore実装後、時間窓判定に置き換える
  const [state, setState] = useState<PlazaFieldState>('active');

  return (
    <section className="scr">
      <header className="appbar">
        広場
        <span className="sub">
          第7回お題・{state === 'active' ? '開催中' : '作画終了・鑑賞中'}
        </span>
      </header>
      <div className="body" style={{ padding: 0 }}>
        <PlazaField
          prompt={MOCK_PROMPT}
          stickers={MOCK_STICKERS}
          state={state}
          presenceCount={12}
          countdownLabel={state === 'active' ? '⏱ 02:14 / 描ける' : '作画終了 / 失効まで 3:20:00'}
        />
      </div>
      <button
        type="button"
        className="btn sm dev-toggle"
        onClick={() => setState((s) => (s === 'active' ? 'grace' : 'active'))}
      >
        [開発用] STATE切替: {state}
      </button>
    </section>
  );
}

export default PlazaScreen;
