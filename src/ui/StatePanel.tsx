import { ReactNode } from 'react';
import { Ctx, ExecState, TraceEntry, fmt, loopStack } from '../engine/interpreter';
import { DeviceType } from '../engine/types';

const TYPE_NAME: Record<DeviceType, string> = {
  lever: 'alavanca',
  button: 'botão',
  plate: 'placa',
  clock: 'relógio',
  lamp: 'lâmpada',
  door: 'porta',
  piston: 'pistão',
  torch: 'tocha',
  repeater: 'repetidor',
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  core: 'núcleo',
};

function stateText(type: DeviceType, on: boolean) {
  switch (type) {
    case 'lever':
      return on ? 'ligada' : 'desligada';
    case 'lamp':
    case 'torch':
      return on ? 'acesa' : 'apagada';
    case 'door':
      return on ? 'aberta' : 'fechada';
    case 'plate':
      return on ? 'pressionada' : 'livre';
    case 'piston':
      return on ? 'estendido' : 'recolhido';
    case 'core':
      return on ? 'ATIVO' : 'inativo';
    default:
      return on ? 'ligado (1)' : 'desligado (0)';
  }
}

interface Props {
  game: Ctx;
  st: ExecState;
  prev?: ExecState;
  trace: TraceEntry[];
}

export default function StatePanel({ game, st, prev, trace }: Props) {
  const vars = Object.entries(st.vars);
  const loops = loopStack(st);
  const w = st.world;
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <Box title="Variáveis">
        {vars.length === 0 ? (
          <p className="text-muted">nenhuma ainda</p>
        ) : (
          <table className="w-full font-code text-[13px]">
            <tbody>
              {vars.map(([k, v]) => (
                <tr key={k} className={prev && prev.vars[k] !== v ? 'text-[#ffd54a]' : ''}>
                  <td className="pr-2">{k}</td>
                  <td className="text-right font-bold">{fmt(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Box>
      <Box title="Sistema">
        <dl className="grid grid-cols-2 gap-x-2 font-code text-[13px]">
          <dt className="text-muted">tick</dt>
          <dd className="text-right">{w.tick}</dd>
          <dt className="text-muted">ações</dt>
          <dd className="text-right">{st.actions}</dd>
          <dt className="text-muted">operações</dt>
          <dd className="text-right">{st.ops}</dd>
          <dt className="text-muted">posição</dt>
          <dd className="text-right">
            ({w.player.x}, {w.player.y}) {w.player.facing}
          </dd>
        </dl>
      </Box>
      <Box title="Pilha de laços">
        {loops.length === 0 ? (
          <p className="text-muted">fora de laços</p>
        ) : (
          <ol className="font-code text-[12px]">
            {loops.map((l, i) => (
              <li key={i} style={{ paddingLeft: i * 10 }}>
                L{l.line + 1}: {l.text}
              </li>
            ))}
          </ol>
        )}
      </Box>
      <Box title="Dispositivos">
        <ul className="grid gap-0.5 font-code text-[12px]">
          {game.sw.devices.map((d) => {
            const on = d.def.type === 'piston' ? w.pistons[d.def.id] : w.signals[d.def.id];
            return (
              <li key={d.def.id} className="flex justify-between gap-2">
                <span>
                  <b>{d.def.id}</b> <span className="text-muted">{TYPE_NAME[d.def.type]}</span>
                </span>
                <span className={on ? 'text-[#ff5a4a]' : 'text-muted'}>{stateText(d.def.type, on)}</span>
              </li>
            );
          })}
          {game.sw.devices.length === 0 && <li className="text-muted">nenhum nesta fase</li>}
        </ul>
      </Box>
      <Box title="Rastro do último passo" wide>
        {trace.length === 0 ? (
          <p className="text-muted">execute uma ação para ver o que o computador avaliou</p>
        ) : (
          <ol className="font-code text-[12px]">
            {trace.map((t, i) => (
              <li key={i}>
                <span className="text-muted">L{t.line + 1}</span> {t.text}
              </li>
            ))}
          </ol>
        )}
      </Box>
    </div>
  );
}

function Box({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`px-frame bg-panel p-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <h3 className="font-pixel mb-2 text-[9px] uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}
