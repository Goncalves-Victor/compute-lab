import { DIR_DELTA, DeviceDef, Dir, LevelDef } from './types';

// Mundo em grade + simulação simplificada de redstone em ticks discretos.
//
// Modelo de tempo:
//  - Cada ação física (andar, acionar, esperar) avança exatamente 1 tick.
//  - Instruções automáticas (atribuições, SE, laços) não consomem ticks.
//  - Alavanca: estado persistente.
//  - Botão apertado no tick p: ativo nos ticks p .. p+duração-1 (desliga após `duração` ações).
//  - Repetidor de atraso d: saída(t) = entrada(t - d).
//  - Relógio: ativo quando (tick + fase) mod período < ligado.
//  - Tocha: NOT. Portas lógicas AND/OR/XOR. Lâmpada, porta, pistão e núcleo: OR das entradas.
//  - Pistão alimentado empurra o bloco à frente uma casa (e não estende se o jogador estiver no caminho).

export type Cell = 'wall' | 'floor' | 'pit' | 'void';

export interface PlacedDevice {
  def: DeviceDef;
  x: number;
  y: number;
}

export interface StaticWorld {
  w: number;
  h: number;
  cells: Cell[][];
  devices: PlacedDevice[];
  byId: Record<string, PlacedDevice>;
  start: { x: number; y: number };
  exit: { x: number; y: number } | null;
}

export interface WorldState {
  tick: number;
  player: { x: number; y: number; facing: Dir };
  levers: Record<string, boolean>;
  /** tick em que o botão foi apertado */
  buttons: Record<string, number | null>;
  pistons: Record<string, boolean>;
  /** histórico da ENTRADA de cada repetidor, indexado por tick */
  repHist: Record<string, boolean[]>;
  /** valor estável da entrada antes do tick 0 */
  repInit: Record<string, boolean>;
  signals: Record<string, boolean>;
}

const WALKABLE_DEVICES = new Set(['plate', 'door']);
export const INTERACTABLE = new Set(['lever', 'button']);

export function buildStatic(level: LevelDef): StaticWorld {
  const h = level.map.length;
  const w = Math.max(...level.map.map((r) => r.length));
  const cells: Cell[][] = [];
  const devices: PlacedDevice[] = [];
  let start = { x: 0, y: 0 };
  let exit: { x: number; y: number } | null = null;
  for (let y = 0; y < h; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < w; x++) {
      const ch = level.map[y][x] ?? ' ';
      if (ch === '#') row.push('wall');
      else if (ch === ',') row.push('pit');
      else if (ch === ' ') row.push('void');
      else row.push('floor');
      if (ch === 'S') start = { x, y };
      if (ch === 'X') exit = { x, y };
      const def = level.legend[ch];
      if (def) devices.push({ def, x, y });
      else if (!'#,. SX'.includes(ch)) throw new Error(`Fase ${level.id}: caractere "${ch}" sem legenda`);
    }
    cells.push(row);
  }
  const byId: Record<string, PlacedDevice> = {};
  for (const d of devices) {
    if (byId[d.def.id]) throw new Error(`Fase ${level.id}: id duplicado ${d.def.id}`);
    byId[d.def.id] = d;
  }
  for (const d of devices)
    for (const inp of d.def.inputs ?? [])
      if (!byId[inp]) throw new Error(`Fase ${level.id}: ${d.def.id} usa entrada inexistente ${inp}`);
  return { w, h, cells, devices, byId, start, exit };
}

export function deviceAt(sw: StaticWorld, x: number, y: number): PlacedDevice | undefined {
  return sw.devices.find((d) => d.x === x && d.y === y);
}

/** Calcula o sinal de saída de todos os dispositivos no tick atual. */
export function computeSignals(sw: StaticWorld, st: WorldState, repOverride?: Record<string, boolean>): Record<string, boolean> {
  const memo: Record<string, boolean> = {};
  const visiting = new Set<string>();
  const get = (id: string): boolean => {
    if (id in memo) return memo[id];
    const d = sw.byId[id].def;
    if (d.type === 'repeater') {
      let v: boolean;
      if (repOverride) v = repOverride[id];
      else {
        const t = st.tick - (d.delay ?? 1);
        v = t < 0 ? st.repInit[id] : st.repHist[id][t];
      }
      return (memo[id] = !!v);
    }
    if (visiting.has(id)) throw new Error(`Circuito em laço sem repetidor em ${id}`);
    visiting.add(id);
    const ins = (d.inputs ?? []).map(get);
    let v = false;
    switch (d.type) {
      case 'lever':
        v = st.levers[id];
        break;
      case 'button': {
        const p = st.buttons[id];
        v = p !== null && st.tick - p < (d.duration ?? 1);
        break;
      }
      case 'plate':
        v = st.player.x === sw.byId[id].x && st.player.y === sw.byId[id].y;
        break;
      case 'clock': {
        const period = d.period ?? 2;
        v = (((st.tick + (d.phase ?? 0)) % period) + period) % period < (d.on ?? 1);
        break;
      }
      case 'torch':
        v = !ins[0];
        break;
      case 'and':
        v = ins.length > 0 && ins.every(Boolean);
        break;
      case 'xor':
        v = ins.filter(Boolean).length === 1;
        break;
      case 'piston':
        v = ins.some(Boolean);
        break;
      default: // or, lamp, door, core
        v = ins.some(Boolean);
    }
    visiting.delete(id);
    return (memo[id] = v);
  };
  for (const d of sw.devices) get(d.def.id);
  return memo;
}

function repeaterInput(sw: StaticWorld, id: string, sig: Record<string, boolean>): boolean {
  const inp = sw.byId[id].def.inputs?.[0];
  return inp ? sig[inp] : false;
}

export function pistonCells(sw: StaticWorld, id: string) {
  const p = sw.byId[id];
  const [dx, dy] = DIR_DELTA[p.def.dir ?? 'direita'];
  return { head: { x: p.x + dx, y: p.y + dy }, far: { x: p.x + 2 * dx, y: p.y + 2 * dy } };
}

/** Recalcula sinais, grava o histórico dos repetidores e atualiza os pistões no tick atual. */
export function settle(sw: StaticWorld, st: WorldState) {
  st.signals = computeSignals(sw, st);
  for (const d of sw.devices) {
    if (d.def.type === 'repeater') st.repHist[d.def.id][st.tick] = repeaterInput(sw, d.def.id, st.signals);
    if (d.def.type === 'piston') {
      const want = st.signals[d.def.id];
      const { far } = pistonCells(sw, d.def.id);
      const obstructed = st.player.x === far.x && st.player.y === far.y;
      if (want && !obstructed) st.pistons[d.def.id] = true;
      if (!want) st.pistons[d.def.id] = false;
    }
  }
}

export function initialWorld(sw: StaticWorld, facing: Dir = 'direita'): WorldState {
  const st: WorldState = {
    tick: 0,
    player: { ...sw.start, facing },
    levers: {},
    buttons: {},
    pistons: {},
    repHist: {},
    repInit: {},
    signals: {},
  };
  for (const d of sw.devices) {
    if (d.def.type === 'lever') st.levers[d.def.id] = !!d.def.initial;
    if (d.def.type === 'button') st.buttons[d.def.id] = null;
    if (d.def.type === 'piston') st.pistons[d.def.id] = false;
    if (d.def.type === 'repeater') {
      st.repHist[d.def.id] = [];
      st.repInit[d.def.id] = false;
    }
  }
  // estado estável dos repetidores antes do início (como se o circuito já estivesse ligado há muito tempo)
  for (let k = 0; k < 20; k++) {
    const sig = computeSignals(sw, st, st.repInit);
    let changed = false;
    for (const id of Object.keys(st.repInit)) {
      const v = repeaterInput(sw, id, sig);
      if (v !== st.repInit[id]) changed = true;
      st.repInit[id] = v;
    }
    if (!changed) break;
  }
  settle(sw, st);
  // pistões já começam na posição correspondente ao sinal inicial
  for (const d of sw.devices) if (d.def.type === 'piston') st.pistons[d.def.id] = st.signals[d.def.id];
  return st;
}

export function isWalkable(sw: StaticWorld, st: WorldState, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= sw.w || y >= sw.h) return false;
  if (sw.cells[y][x] !== 'floor') return false;
  const dev = deviceAt(sw, x, y);
  if (dev) {
    if (!WALKABLE_DEVICES.has(dev.def.type)) return false;
    if (dev.def.type === 'door' && !st.signals[dev.def.id]) return false;
  }
  for (const d of sw.devices) {
    if (d.def.type !== 'piston') continue;
    const { head, far } = pistonCells(sw, d.def.id);
    if (head.x === x && head.y === y) return false;
    if (st.pistons[d.def.id] && far.x === x && far.y === y) return false;
  }
  return true;
}

/** Dispositivos acionáveis ao alcance do jogador (vizinhos ortogonais). */
export function reachable(sw: StaticWorld, st: WorldState): PlacedDevice[] {
  const { x, y } = st.player;
  return sw.devices.filter((d) => INTERACTABLE.has(d.def.type) && Math.abs(d.x - x) + Math.abs(d.y - y) === 1);
}

/** Avança um tick e aplica o efeito da ação. */
export function advance(sw: StaticWorld, st: WorldState, effect: (st: WorldState) => void) {
  st.tick++;
  effect(st);
  settle(sw, st);
}

export function deviceName(sw: StaticWorld, id: string) {
  const d = sw.byId[id];
  return d?.def.label ?? id;
}
