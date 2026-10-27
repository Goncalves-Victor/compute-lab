import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio';
import { ExecState, StepResult, TraceEntry, currentLine, initialExec, loadLevel, submit } from '../engine/interpreter';
import { LevelDef, PlayerAction } from '../engine/types';
import { WORLDS } from '../levels';
import { WorldRenderer } from '../render/renderer';
import { THEMES } from '../render/theme';
import { Progress } from '../storage';
import CodePanel from './CodePanel';
import StatePanel from './StatePanel';
import { fmtTime } from './format';

interface Props {
  level: LevelDef;
  progress: Progress;
  onUpdate: (p: Partial<Progress>) => void;
  onComplete: (id: number, timeMs?: number) => void;
  onMenu: () => void;
  onNext?: () => void;
}

export default function Game({ level, progress, onUpdate, onComplete, onMenu, onNext }: Props) {
  const game = useMemo(() => loadLevel(level), [level]);
  const theme = THEMES[level.world];
  const world = WORLDS[level.world - 1];
  const renderer = useMemo(() => new WorldRenderer(game, theme), [game, theme]);
  const challenge = progress.mode === 'desafio';

  const [hist, setHist] = useState<ExecState[]>(() => [initialExec(game)]);
  const st = hist[hist.length - 1];
  const [fail, setFail] = useState<StepResult | null>(null);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [won, setWon] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [hint, setHint] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [, setClock] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  // cronômetro do modo desafio
  useEffect(() => {
    if (!challenge || startedAt === null || won) return;
    const t = setInterval(() => setClock((c) => c + 1), 100);
    return () => clearInterval(t);
  }, [challenge, startedAt, won]);

  const restart = useCallback(() => {
    const s0 = initialExec(game);
    setHist([s0]);
    setFail(null);
    setTrace([]);
    setWon(false);
    setShowWin(false);
    setStartedAt(null);
    setFinalTime(null);
    renderer.snap(s0);
  }, [game, renderer]);

  const dismissError = useCallback(() => {
    if (fail && !challenge) setFail(null);
  }, [fail, challenge]);

  const act = useCallback(
    (a: PlayerAction) => {
      if (won || fail) return;
      const r = submit(game, st, a);
      if (!r.ok) {
        setFail(r);
        sfx.error();
        renderer.shake();
        setShakeKey((k) => k + 1);
        return;
      }
      if (r.turned) {
        sfx.turn();
        setHist((h) => [...h.slice(0, -1), r.state]);
        return;
      }
      if (startedAt === null) setStartedAt(performance.now());
      const before = st.world;
      const after = r.state.world;
      setHist((h) => [...h, r.state]);
      setTrace(r.trace);
      setFlashKey((k) => k + 1);

      if (a.type === 'move') {
        sfx.step();
        renderer.burst(before.player.x, before.player.y + 0.35, theme.floor[2], 4, 0.8, 2);
      } else if (a.type === 'wait') sfx.wait();
      else if (r.activated) {
        const d = game.sw.byId[r.activated];
        (d.def.type === 'button' ? sfx.button : sfx.lever)();
        renderer.burst(d.x, d.y, '#ff4a3a', 12);
      }
      for (const d of game.sw.devices) {
        if (d.def.type === 'door' && before.signals[d.def.id] !== after.signals[d.def.id]) sfx.door();
        if (d.def.type === 'piston' && before.pistons[d.def.id] !== after.pistons[d.def.id]) sfx.piston();
        if (d.def.type === 'lamp' && !before.signals[d.def.id] && after.signals[d.def.id]) renderer.burst(d.x, d.y - 0.3, '#ffd36a', 8, 1.5, 1);
      }

      if (r.won) {
        const time = challenge ? performance.now() - (startedAt ?? performance.now()) : undefined;
        setWon(true);
        setFinalTime(time ?? null);
        onComplete(level.id, time);
        if (level.id === 40) {
          sfx.core();
          renderer.finale();
        } else {
          sfx.win();
          renderer.flash();
          renderer.burst(after.player.x, after.player.y, '#5dff8a', 30, 3);
        }
        setTimeout(() => setShowWin(true), level.id === 40 ? 2800 : 700);
      }
    },
    [won, fail, game, st, renderer, startedAt, theme, challenge, onComplete, level.id],
  );

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      const map: Record<string, PlayerAction> = {
        ArrowUp: { type: 'move', dir: 'cima' },
        ArrowDown: { type: 'move', dir: 'baixo' },
        ArrowLeft: { type: 'move', dir: 'esquerda' },
        ArrowRight: { type: 'move', dir: 'direita' },
        ' ': { type: 'wait' },
        e: { type: 'interact' },
        E: { type: 'interact' },
      };
      if (map[k]) {
        e.preventDefault();
        if (!e.repeat) act(map[k]);
      } else if (k === 'r' || k === 'R') restart();
      else if (k === 'u' || k === 'U') dismissError();
      else if (k === 'h' || k === 'H') setHint((h) => !h);
      else if (k === 'Enter' && showWin && onNext) onNext();
      else if (k === 'Escape') {
        if (showWin) setShowWin(false);
        else if (fail) dismissError();
        else onMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, restart, dismissError, showWin, onNext, onMenu, fail]);

  const flash = useMemo(() => new Set(trace.map((t) => t.line)), [trace]);
  const elapsed = finalTime ?? (startedAt !== null ? performance.now() - startedAt : 0);

  return (
    <div className="flex min-h-full flex-col lg:h-full" style={{ background: theme.bg }}>
      {/* barra superior */}
      <header className="flex flex-wrap items-center gap-2 border-b-4 border-black bg-panel px-3 py-2">
        <button className="px-btn bg-panel-2 px-3 py-1.5" onClick={onMenu} aria-label="Voltar ao menu">
          ◀ Menu
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-pixel truncate text-[9px] uppercase" style={{ color: theme.accent }}>
            Mundo {world.id} · {world.name}
          </div>
          <h1 className="truncate text-lg leading-6">
            <span className="font-pixel mr-2 text-xs text-muted">{String(level.id).padStart(2, '0')}</span>
            {level.title}
          </h1>
        </div>
        {challenge && (
          <span className="font-pixel px-frame bg-black/50 px-2 py-1.5 text-[11px] tabular-nums" aria-label="Cronômetro">
            ⏱ {fmtTime(elapsed)}
          </span>
        )}
        <button className={`px-btn px-3 py-1.5 ${hint ? 'bg-[#ffd54a] text-black' : 'bg-panel-2'}`} onClick={() => setHint((h) => !h)} aria-pressed={hint}>
          💡 Dica
        </button>
        <button className="px-btn bg-panel-2 px-3 py-1.5" onClick={restart}>
          ↺ Reiniciar
        </button>
        <button
          className="px-btn bg-panel-2 px-3 py-1.5"
          onClick={() => onUpdate({ mode: challenge ? 'educativo' : 'desafio' })}
          title="Trocar o modo reinicia a fase"
        >
          {challenge ? 'Modo: Desafio' : 'Modo: Educativo'}
        </button>
        <button className="px-btn bg-panel-2 px-2.5 py-1.5" onClick={() => onUpdate({ sound: !progress.sound })} aria-label={progress.sound ? 'Desligar som' : 'Ligar som'}>
          {progress.sound ? '🔊' : '🔇'}
        </button>
      </header>

      <div className="grid flex-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        {/* esquerda: mundo */}
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div className="px-frame bg-panel p-3">
            <p className="text-base">
              <span className="font-pixel mr-2 text-[9px] uppercase" style={{ color: theme.accent }}>
                {level.concept}
              </span>
              {level.brief}
            </p>
            {hint && <p className="pop mt-2 border-l-4 border-[#ffd54a] bg-black/30 px-3 py-2 text-[#ffe9a6]">💡 {level.hint}</p>}
          </div>
          <div key={shakeKey} className={`relative h-[min(62vh,600px)] lg:h-auto lg:min-h-0 lg:flex-1 ${shakeKey ? 'shake' : ''}`}>
            <WorldView renderer={renderer} game={game} st={st} />
            {fail && (
              <FailOverlay fail={fail} challenge={challenge} onUndo={dismissError} onRestart={restart} />
            )}
            {showWin && (
              <WinOverlay
                level={level}
                st={st}
                time={finalTime}
                onNext={onNext}
                onReplay={restart}
                onMenu={onMenu}
                onClose={() => setShowWin(false)}
              />
            )}
          </div>
          <TouchControls onAct={act} onRestart={restart} disabled={won || !!fail} />
        </div>

        {/* direita: programa e estado */}
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0 lg:overflow-auto">
          <section className="px-frame flex min-h-0 flex-col overflow-hidden bg-panel lg:max-h-[58%] lg:shrink-0">
            <div className="flex items-center justify-between border-b-2 border-black px-3 py-2">
              <h2 className="font-pixel text-[10px] uppercase text-muted">Programa</h2>
              <span className="text-xs text-muted">▶ = próxima instrução</span>
            </div>
            <CodePanel lines={game.program.lines} current={won ? null : currentLine(st)} errorLine={fail?.line ?? null} flash={flash} flashKey={flashKey} />
          </section>
          <StatePanel game={game} st={st} prev={hist[hist.length - 2]} trace={trace} />
        </div>
      </div>
    </div>
  );
}

function WorldView({ renderer, game, st }: { renderer: WorldRenderer; game: ReturnType<typeof loadLevel>; st: ExecState }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stRef = useRef(st);
  stRef.current = st;
  const [size, setSize] = useState({ T: 32, D: 10, width: 0, height: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const maxH = Math.max(220, el.clientHeight || window.innerHeight * 0.55);
      setSize(WorldRenderer.layout(game, el.clientWidth, maxH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [game]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !size.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size.width * dpr;
    cv.height = size.height * dpr;
    const c = cv.getContext('2d')!;
    let raf = 0;
    const loop = (now: number) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.draw(c, stRef.current, size.T, size.D, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [renderer, size]);

  return (
    <div ref={wrap} className="absolute inset-0 grid place-items-center overflow-hidden">
      <canvas
        ref={canvas}
        className="pixel px-frame"
        style={{ width: size.width, height: size.height }}
        role="img"
        aria-label="Cenário da fase"
      />
    </div>
  );
}

function FailOverlay({ fail, challenge, onUndo, onRestart }: { fail: StepResult; challenge: boolean; onUndo: () => void; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/55 p-3">
      <div className="px-frame pop max-h-full w-full max-w-md overflow-auto bg-[#2a1416] p-4" role="alertdialog" aria-labelledby="fail-title">
        <h2 id="fail-title" className="font-pixel text-xs text-rs">
          ✖ Execução incorreta
        </h2>
        <p className="mt-3 text-base">{fail.message}</p>
        {fail.trace.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-muted">O computador avaliou antes desta ação:</p>
            <ol className="mt-1 font-code text-[12px] text-[#ffd9a0]">
              {fail.trace.map((t, i) => (
                <li key={i}>
                  L{t.line + 1}: {t.text}
                </li>
              ))}
            </ol>
          </div>
        )}
        {fail.expected && (
          <p className="mt-3 text-sm">
            Instrução correta: <code className="font-code text-[#7fdbca]">{fail.expected}</code>
            {fail.line !== null && <span className="text-muted"> (linha {fail.line + 1})</span>}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!challenge && (
            <button className="px-btn bg-panel-2 px-3 py-2" onClick={onUndo} autoFocus>
              ↶ Voltar ao passo anterior (U)
            </button>
          )}
          <button className="px-btn bg-rs-dark px-3 py-2" onClick={onRestart} autoFocus={challenge}>
            ↺ Reiniciar (R)
          </button>
        </div>
        {challenge && <p className="mt-2 text-xs text-muted">No modo desafio, um erro exige recomeçar a fase.</p>}
      </div>
    </div>
  );
}

function WinOverlay(props: {
  level: LevelDef;
  st: ExecState;
  time: number | null;
  onNext?: () => void;
  onReplay: () => void;
  onMenu: () => void;
  onClose: () => void;
}) {
  const { level, st, time, onNext, onReplay, onMenu, onClose } = props;
  const final = level.id === 40;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 p-3">
      <div
        className={`px-frame pop max-h-full w-full max-w-lg overflow-auto p-5 ${final ? 'bg-[linear-gradient(160deg,#4a0d12,#160509)]' : 'bg-[#13261a]'}`}
        role="dialog"
        aria-labelledby="win-title"
      >
        <h2 id="win-title" className={`font-pixel leading-6 ${final ? 'text-base text-[#ff6a6a]' : 'text-xs text-[#5dff8a]'}`}>
          {final ? '★ NÚCLEO DA REDSTONE ATIVADO ★' : '✔ Fase concluída!'}
        </h2>
        {final && (
          <p className="mt-3 text-base text-[#ffd0d0]">
            Você executou os 40 algoritmos do laboratório, instrução por instrução. Sequência, repetição, decisão, variáveis, laços e circuitos: você pensou como um computador.
          </p>
        )}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="ações" value={st.actions} />
          <Stat label="operações" value={st.ops} />
          <Stat label={time !== null ? 'tempo' : 'ticks'} value={time !== null ? fmtTime(time) : st.world.tick} />
        </dl>
        <h3 className="font-pixel mt-4 text-[9px] uppercase text-muted">Como o programa foi executado</h3>
        <p className="mt-1 text-base leading-snug">{level.explanation}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {onNext && (
            <button className="px-btn bg-[#2f7d43] px-3 py-2" onClick={onNext} autoFocus>
              Próxima fase ▶ (Enter)
            </button>
          )}
          <button className="px-btn bg-panel-2 px-3 py-2" onClick={onReplay}>
            ↺ Jogar de novo
          </button>
          <button className="px-btn bg-panel-2 px-3 py-2" onClick={onMenu} autoFocus={!onNext}>
            Menu de fases
          </button>
          <button className="px-btn bg-panel-2 px-3 py-2" onClick={onClose}>
            Ver cenário
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-frame bg-black/30 p-2">
      <dd className="font-pixel text-sm">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}

function TouchControls({ onAct, onRestart, disabled }: { onAct: (a: PlayerAction) => void; onRestart: () => void; disabled: boolean }) {
  const btn = 'px-btn grid h-12 min-w-12 place-items-center bg-panel-2 px-3 text-lg select-none disabled:opacity-40 touch-manipulation';
  return (
    <div className="flex flex-wrap items-center justify-center gap-4" aria-label="Controles na tela">
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        <button className={btn} disabled={disabled} onClick={() => onAct({ type: 'move', dir: 'cima' })} aria-label="andar para cima">
          ▲
        </button>
        <span />
        <button className={btn} disabled={disabled} onClick={() => onAct({ type: 'move', dir: 'esquerda' })} aria-label="andar para a esquerda">
          ◀
        </button>
        <button className={btn} disabled={disabled} onClick={() => onAct({ type: 'move', dir: 'baixo' })} aria-label="andar para baixo">
          ▼
        </button>
        <button className={btn} disabled={disabled} onClick={() => onAct({ type: 'move', dir: 'direita' })} aria-label="andar para a direita">
          ▶
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <button className={`${btn} bg-rs-dark text-base`} disabled={disabled} onClick={() => onAct({ type: 'interact' })}>
          E · Acionar
        </button>
        <button className={`${btn} text-base`} disabled={disabled} onClick={() => onAct({ type: 'wait' })}>
          ⏳ Esperar (Espaço)
        </button>
      </div>
      <button className={`${btn} text-base`} onClick={onRestart}>
        ↺ R
      </button>
    </div>
  );
}
