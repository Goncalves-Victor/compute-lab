import { useState } from 'react';
import { LEVELS, WORLDS } from '../levels';
import { THEMES } from '../render/theme';
import { Progress, isUnlocked } from '../storage';
import { fmtTime } from './format';

interface Props {
  progress: Progress;
  onUpdate: (p: Partial<Progress>) => void;
  onReset: () => void;
  onPlay: (id: number) => void;
}

export default function Menu({ progress, onUpdate, onReset, onPlay }: Props) {
  const [help, setHelp] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const done = new Set(progress.completed);

  return (
    <div className="min-h-full bg-[#121013] pb-12">
      <header className="relative overflow-hidden border-b-4 border-black bg-[linear-gradient(180deg,#2a1215,#121013)] px-4 pt-8 pb-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-pixel text-3xl leading-tight text-rs drop-shadow-[4px_4px_0_#000] sm:text-5xl">COMPUTE-LAB</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Você é o computador. Leia o pseudocódigo, execute cada instrução no laboratório de redstone e ative o Núcleo.
          </p>

          <section aria-label="Progresso dos mundos" className="mt-6">
            <div className="mb-2 flex items-baseline justify-between text-sm text-muted">
              <span className="font-pixel text-[10px] uppercase">Progresso</span>
              <span>
                {done.size} / 40 fases
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {WORLDS.map((w) => {
                const n = w.levels.filter((id) => done.has(id)).length;
                return (
                  <div key={w.id} className="px-frame h-5 bg-black/60" title={`Mundo ${w.id}: ${n}/5`}>
                    <div className="h-full transition-all" style={{ width: `${(n / 5) * 100}%`, background: THEMES[w.id].accent }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 grid grid-cols-8 gap-1 text-center font-pixel text-[9px] text-muted">
              {WORLDS.map((w) => (
                <span key={w.id}>M{w.id}</span>
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="px-frame flex bg-black/40 p-1" role="radiogroup" aria-label="Modo de jogo">
              {(['educativo', 'desafio'] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={progress.mode === m}
                  onClick={() => onUpdate({ mode: m })}
                  className={`px-3 py-1.5 text-base capitalize ${progress.mode === m ? 'bg-rs text-white' : 'text-muted hover:text-ink'}`}
                >
                  {m === 'educativo' ? 'Educativo' : 'Desafio ⏱'}
                </button>
              ))}
            </div>
            <button className="px-btn bg-panel-2 px-3 py-2" onClick={() => onUpdate({ sound: !progress.sound })}>
              {progress.sound ? '🔊 Som ligado' : '🔇 Som desligado'}
            </button>
            <button className="px-btn bg-panel-2 px-3 py-2" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
              ❓ Como jogar
            </button>
            {confirmReset ? (
              <span className="flex items-center gap-2">
                <span className="text-sm text-muted">Apagar todo o progresso?</span>
                <button
                  className="px-btn bg-rs-dark px-3 py-2"
                  onClick={() => {
                    onReset();
                    setConfirmReset(false);
                  }}
                >
                  Sim, apagar
                </button>
                <button className="px-btn bg-panel-2 px-3 py-2" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </button>
              </span>
            ) : (
              <button className="px-btn bg-panel-2 px-3 py-2 text-muted" onClick={() => setConfirmReset(true)}>
                Reiniciar progresso
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">
            {progress.mode === 'educativo'
              ? 'Educativo: sem limite de tempo; depois de um erro você pode voltar ao passo anterior.'
              : 'Desafio: cronômetro ligado e qualquer erro exige recomeçar a fase. Seus melhores tempos ficam salvos.'}
          </p>

          {help && (
            <div className="px-frame pop mt-4 grid gap-3 bg-panel p-4 text-base sm:grid-cols-2">
              <div>
                <h2 className="font-pixel mb-2 text-xs text-rs">Controles</h2>
                <ul className="space-y-1 text-muted">
                  <li><b className="text-ink">Setas</b> — executar andar(direção)</li>
                  <li><b className="text-ink">E</b> — executar acionar(dispositivo)</li>
                  <li><b className="text-ink">Espaço</b> — executar esperar()</li>
                  <li><b className="text-ink">R</b> — reiniciar a fase</li>
                  <li><b className="text-ink">U</b> — voltar ao passo anterior após um erro (modo educativo)</li>
                  <li>No tablet, use os botões na tela.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-pixel mb-2 text-xs text-rs">Regras</h2>
                <ul className="space-y-1 text-muted">
                  <li>A seta ▶ marca a próxima instrução. Condições, laços e variáveis são calculados pelo computador; você só executa as ações físicas.</li>
                  <li>Cada ação física dura 1 tick. Botões, repetidores e relógios contam ticks.</li>
                  <li>Com duas alavancas ao alcance, aperte a seta na direção da correta para se virar antes do E.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto mt-6 grid max-w-6xl gap-5 px-4 md:grid-cols-2">
        {WORLDS.map((w) => {
          const th = THEMES[w.id];
          return (
            <section key={w.id} className="px-frame overflow-hidden bg-panel" aria-labelledby={`w${w.id}`}>
              <div className="flex items-center gap-3 border-b-2 border-black px-4 py-3" style={{ background: `linear-gradient(90deg, ${th.wall[0]}, ${th.pit[0]})` }}>
                <span className="font-pixel px-frame grid h-10 w-10 shrink-0 place-items-center text-sm text-black" style={{ background: th.accent }}>
                  {w.id}
                </span>
                <div className="min-w-0">
                  <h2 id={`w${w.id}`} className="font-pixel truncate text-[11px] leading-5 text-white drop-shadow-[2px_2px_0_#000]">
                    {w.name}
                  </h2>
                  <p className="text-sm text-white/75">{w.theme}</p>
                </div>
              </div>
              <ol className="grid gap-1.5 p-3">
                {w.levels.map((id) => {
                  const lv = LEVELS[id - 1];
                  const open = isUnlocked(progress, id);
                  const ok = done.has(id);
                  return (
                    <li key={id}>
                      <button
                        disabled={!open}
                        onClick={() => onPlay(id)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left ${open ? 'px-btn bg-panel-2 hover:brightness-125' : 'cursor-not-allowed bg-black/30 opacity-60'}`}
                      >
                        <span className="font-pixel w-8 shrink-0 text-xs" style={{ color: th.accent }}>
                          {String(id).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base">{lv.title}</span>
                          <span className="block truncate text-xs text-muted">{lv.concept}</span>
                        </span>
                        {progress.best[id] !== undefined && <span className="text-xs text-muted">⏱ {fmtTime(progress.best[id])}</span>}
                        <span className="w-6 text-center text-lg" aria-label={ok ? 'concluída' : open ? 'disponível' : 'bloqueada'}>
                          {ok ? '✔' : open ? '▶' : '🔒'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </main>
    </div>
  );
}
