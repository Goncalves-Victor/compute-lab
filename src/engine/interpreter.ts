import { parseProgram, exprToString } from './parser';
import { DIR_DELTA, Dir, Expr, LevelDef, PlayerAction, Program, Stmt, describeAction } from './types';
import {
  INTERACTABLE,
  PlacedDevice,
  StaticWorld,
  WorldState,
  advance,
  buildStatic,
  deviceAt,
  deviceName,
  initialWorld,
  isWalkable,
  reachable,
} from './world';

// Interpretador passo a passo. As instruções automáticas (atribuições, testes de SE/REPITA/ENQUANTO)
// são executadas pelo motor; as físicas (andar, acionar, esperar) só avançam quando o jogador
// realiza exatamente a ação correspondente.

export type Value = number | boolean;

export type Frame =
  | { k: 'block'; stmts: Stmt[]; i: number }
  | { k: 'repeat'; node: Extract<Stmt, { k: 'repeat' }>; total: number; iter: number }
  | { k: 'while'; node: Extract<Stmt, { k: 'while' }>; iter: number };

export interface TraceEntry {
  line: number;
  text: string;
}

export interface ExecState {
  world: WorldState;
  vars: Record<string, Value>;
  stack: Frame[];
  ops: number;
  actions: number;
  finished: boolean;
}

export interface Ctx {
  level: LevelDef;
  sw: StaticWorld;
  program: Program;
}

export class RuntimeError extends Error {
  constructor(msg: string, public line: number) {
    super(msg);
  }
}

const MAX_AUTO_STEPS = 5000;

export function loadLevel(level: LevelDef): Ctx {
  return { level, sw: buildStatic(level), program: parseProgram(level.program) };
}

export function initialExec(ctx: Ctx): ExecState {
  return {
    world: initialWorld(ctx.sw, ctx.level.facing),
    vars: { ...(ctx.level.vars ?? {}) },
    stack: [{ k: 'block', stmts: ctx.program.body, i: 0 }],
    ops: 0,
    actions: 0,
    finished: false,
  };
}

const clone = <T>(x: T): T => structuredClone(x);
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------- Expressões ----------------

const SIGNAL_FNS = new Set(['ligada', 'ligado', 'acesa', 'aceso', 'aberta', 'aberto', 'ativo', 'ativa', 'energizado', 'energizada', 'estendido']);

export function evalExpr(ctx: Ctx, st: ExecState, e: Expr, line: number): Value {
  switch (e.k) {
    case 'num':
      return e.v;
    case 'bool':
      return e.v;
    case 'var': {
      if (!(e.name in st.vars)) throw new RuntimeError(`Variável "${e.name}" não foi definida`, line);
      return st.vars[e.name];
    }
    case 'not':
      return !asBool(evalExpr(ctx, st, e.e, line), line);
    case 'neg':
      return -asNum(evalExpr(ctx, st, e.e, line), line);
    case 'call':
      return callFn(ctx, st, e.fn, e.args, line);
    case 'bin': {
      if (e.op === 'E') return asBool(evalExpr(ctx, st, e.a, line), line) && asBool(evalExpr(ctx, st, e.b, line), line);
      if (e.op === 'OU') return asBool(evalExpr(ctx, st, e.a, line), line) || asBool(evalExpr(ctx, st, e.b, line), line);
      const a = evalExpr(ctx, st, e.a, line);
      const b = evalExpr(ctx, st, e.b, line);
      switch (e.op) {
        case '=':
          return a === b;
        case '≠':
          return a !== b;
        case '<':
          return asNum(a, line) < asNum(b, line);
        case '>':
          return asNum(a, line) > asNum(b, line);
        case '≤':
          return asNum(a, line) <= asNum(b, line);
        case '≥':
          return asNum(a, line) >= asNum(b, line);
        case '+':
          return asNum(a, line) + asNum(b, line);
        case '-':
          return asNum(a, line) - asNum(b, line);
        case '*':
          return asNum(a, line) * asNum(b, line);
        case 'MOD': {
          const m = asNum(b, line);
          return ((asNum(a, line) % m) + m) % m;
        }
      }
    }
  }
}

function asBool(v: Value, line: number): boolean {
  if (typeof v !== 'boolean') throw new RuntimeError(`Esperava VERDADEIRO/FALSO, obteve ${v}`, line);
  return v;
}
function asNum(v: Value, line: number): number {
  if (typeof v !== 'number') throw new RuntimeError(`Esperava um número, obteve ${fmt(v)}`, line);
  return v;
}

export function fmt(v: Value) {
  return typeof v === 'boolean' ? (v ? 'VERDADEIRO' : 'FALSO') : String(v);
}

function callFn(ctx: Ctx, st: ExecState, fn: string, args: string[], line: number): Value {
  const f = fold(fn);
  if (f === 'livre') {
    const dir = fold(args[0] ?? '') as Dir;
    if (!(dir in DIR_DELTA)) throw new RuntimeError(`livre() precisa de uma direção`, line);
    const [dx, dy] = DIR_DELTA[dir];
    const p = st.world.player;
    return isWalkable(ctx.sw, st.world, p.x + dx, p.y + dy);
  }
  if (f === 'tempo') return st.world.tick;
  if (SIGNAL_FNS.has(f)) {
    const id = args[0];
    const asDir = fold(id ?? '') as Dir;
    if (asDir in DIR_DELTA) {
      // sensor relativo: dispositivo vizinho ao jogador naquela direção
      const [dx, dy] = DIR_DELTA[asDir];
      const p = st.world.player;
      const d = deviceAt(ctx.sw, p.x + dx, p.y + dy);
      if (!d) return false;
      return d.def.type === 'piston' ? st.world.pistons[d.def.id] : st.world.signals[d.def.id];
    }
    const dev = ctx.sw.byId[id];
    if (!dev) throw new RuntimeError(`Dispositivo "${id}" não existe`, line);
    if (dev.def.type === 'piston') return st.world.pistons[id];
    return st.world.signals[id];
  }
  throw new RuntimeError(`Função desconhecida "${fn}"`, line);
}

// ---------------- Execução ----------------

function normalize(st: ExecState) {
  while (st.stack.length) {
    const top = st.stack[st.stack.length - 1];
    if (top.k === 'block' && top.i >= top.stmts.length) st.stack.pop();
    else return;
  }
}

export type Unit =
  | { kind: 'end' }
  | { kind: 'physical'; stmt: Extract<Stmt, { k: 'move' | 'act' | 'wait' }> }
  | { kind: 'auto'; line: number };

/** Próxima unidade a ser executada, sem modificar o estado. */
export function peekUnit(st: ExecState): Unit {
  const s = { stack: st.stack.slice() } as ExecState;
  // normalize sem mutar os frames originais
  while (s.stack.length) {
    const top = s.stack[s.stack.length - 1];
    if (top.k === 'block' && top.i >= top.stmts.length) s.stack.pop();
    else break;
  }
  if (!s.stack.length) return { kind: 'end' };
  const top = s.stack[s.stack.length - 1];
  if (top.k !== 'block') return { kind: 'auto', line: top.node.line };
  const stmt = top.stmts[top.i];
  if (stmt.k === 'move' || stmt.k === 'act' || stmt.k === 'wait') return { kind: 'physical', stmt };
  return { kind: 'auto', line: stmt.line };
}

/** Linha atual (instrução que será executada a seguir). */
export function currentLine(st: ExecState): number | null {
  const u = peekUnit(st);
  if (u.kind === 'end') return null;
  return u.kind === 'physical' ? u.stmt.line : u.line;
}

/** Executa uma unidade automática. Retorna o registro do rastro. Muta `st`. */
function stepAuto(ctx: Ctx, st: ExecState): TraceEntry {
  normalize(st);
  const top = st.stack[st.stack.length - 1];
  st.ops++;
  if (top.k === 'repeat') {
    if (top.iter < top.total) {
      top.iter++;
      st.stack.push({ k: 'block', stmts: top.node.body, i: 0 });
      return { line: top.node.line, text: `REPITA: volta ${top.iter} de ${top.total}` };
    }
    st.stack.pop();
    return { line: top.node.line, text: `REPITA concluído (${top.total} voltas)` };
  }
  if (top.k === 'while') {
    const c = asBool(evalExpr(ctx, st, top.node.cond, top.node.line), top.node.line);
    if (c) {
      top.iter++;
      st.stack.push({ k: 'block', stmts: top.node.body, i: 0 });
      return { line: top.node.line, text: `ENQUANTO ${exprToString(top.node.cond)} → VERDADEIRO (volta ${top.iter})` };
    }
    st.stack.pop();
    return { line: top.node.line, text: `ENQUANTO ${exprToString(top.node.cond)} → FALSO: sai do laço` };
  }
  const stmt = top.stmts[top.i];
  top.i++;
  switch (stmt.k) {
    case 'assign': {
      const v = evalExpr(ctx, st, stmt.e, stmt.line);
      st.vars[stmt.name] = v;
      return { line: stmt.line, text: `${stmt.name} ← ${fmt(v)}` };
    }
    case 'if': {
      const c = asBool(evalExpr(ctx, st, stmt.cond, stmt.line), stmt.line);
      st.stack.push({ k: 'block', stmts: c ? stmt.then : stmt.else, i: 0 });
      return { line: stmt.line, text: `SE ${exprToString(stmt.cond)} → ${c ? 'VERDADEIRO' : 'FALSO'}` };
    }
    case 'repeat': {
      const n = asNum(evalExpr(ctx, st, stmt.count, stmt.line), stmt.line);
      st.stack.push({ k: 'repeat', node: stmt, total: n, iter: 0 });
      st.ops--; // o teste da primeira volta é contado no próprio frame
      return stepAuto(ctx, st);
    }
    case 'while':
      st.stack.push({ k: 'while', node: stmt, iter: 0 });
      st.ops--;
      return stepAuto(ctx, st);
    default:
      throw new RuntimeError('Instrução física tratada como automática', stmt.line);
  }
}

/** Executa instruções automáticas até chegar numa física ou no fim. Muta `st`. */
type StopUnit = Exclude<Unit, { kind: 'auto' }>;

export function runToPhysical(ctx: Ctx, st: ExecState): { unit: StopUnit; trace: TraceEntry[] } {
  const trace: TraceEntry[] = [];
  for (let n = 0; n < MAX_AUTO_STEPS; n++) {
    const u = peekUnit(st);
    if (u.kind !== 'auto') {
      normalize(st);
      return { unit: u, trace };
    }
    trace.push(stepAuto(ctx, st));
  }
  throw new RuntimeError('Laço infinito: instruções automáticas demais sem nenhuma ação', currentLine(st) ?? 0);
}

export interface StepResult {
  ok: boolean;
  state: ExecState;
  trace: TraceEntry[];
  /** linha da instrução que foi (ou deveria ter sido) executada */
  line: number | null;
  message?: string;
  /** o que o programa esperava (exibido só depois de um erro) */
  expected?: string;
  won?: boolean;
  /** dispositivo acionado com sucesso */
  activated?: string;
  /** o jogador apenas se virou para um dispositivo */
  turned?: boolean;
}

function physicalText(ctx: Ctx, stmt: Extract<Stmt, { k: 'move' | 'act' | 'wait' }>) {
  if (stmt.k === 'move') return `andar(${stmt.dir})`;
  if (stmt.k === 'wait') return 'esperar()';
  return `acionar(${deviceName(ctx.sw, stmt.target)})`;
}

/** Valida e aplica uma ação do jogador. Nunca muta o estado recebido. */
/** Dispositivo que o E acionaria: o que está à frente, ou o único ao alcance. */
export function interactTarget(sw: StaticWorld, w: WorldState): { device?: PlacedDevice; ambiguous: boolean } {
  const near = reachable(sw, w);
  const [dx, dy] = DIR_DELTA[w.player.facing];
  const front = near.find((d) => d.x === w.player.x + dx && d.y === w.player.y + dy);
  if (front) return { device: front, ambiguous: false };
  if (near.length === 1) return { device: near[0], ambiguous: false };
  return { ambiguous: near.length > 1 };
}

/** Seta na direção de uma alavanca/botão vizinho: o jogador só se vira (não é instrução, não gasta tick). */
function turnTarget(sw: StaticWorld, w: WorldState, action: PlayerAction): Dir | null {
  if (action.type !== 'move') return null;
  const [dx, dy] = DIR_DELTA[action.dir];
  const d = deviceAt(sw, w.player.x + dx, w.player.y + dy);
  return d && INTERACTABLE.has(d.def.type) ? action.dir : null;
}

export function submit(ctx: Ctx, prev: ExecState, action: PlayerAction): StepResult {
  const sw = ctx.sw;
  const turn = prev.finished ? null : turnTarget(sw, prev.world, action);
  if (turn) {
    const st = clone(prev);
    st.world.player.facing = turn;
    return { ok: true, state: st, trace: [], line: currentLine(prev), turned: true };
  }
  const st = clone(prev);
  let trace: TraceEntry[] = [];
  let unit: StopUnit;
  try {
    ({ unit, trace } = runToPhysical(ctx, st));
  } catch (e) {
    const err = e as RuntimeError;
    return { ok: false, state: prev, trace, line: err.line ?? null, message: err.message };
  }
  if (unit.kind === 'end') return { ok: false, state: prev, trace, line: null, message: 'O programa já terminou.' };
  const stmt = unit.stmt;
  const expected = physicalText(ctx, stmt);
  const fail = (message: string): StepResult => ({ ok: false, state: prev, trace, line: stmt.line, message, expected });
  const w = st.world;

  if (stmt.k === 'move') {
    if (action.type !== 'move' || action.dir !== stmt.dir) {
      return fail(`Você fez ${describeAction(action)}, mas a instrução executada na linha ${stmt.line + 1} era ${expected}.`);
    }
    const [dx, dy] = DIR_DELTA[stmt.dir];
    const nx = w.player.x + dx;
    const ny = w.player.y + dy;
    if (!isWalkable(sw, w, nx, ny)) return fail(`O caminho para ${stmt.dir} está bloqueado.`);
    advance(sw, w, (s) => {
      s.player = { x: nx, y: ny, facing: stmt.dir };
    });
  } else if (stmt.k === 'wait') {
    if (action.type !== 'wait')
      return fail(`Você fez ${describeAction(action)}, mas a instrução executada na linha ${stmt.line + 1} era esperar().`);
    advance(sw, w, () => {});
  } else {
    if (action.type !== 'interact')
      return fail(`Você fez ${describeAction(action)}, mas a instrução executada na linha ${stmt.line + 1} era ${expected}.`);
    const { device: target, ambiguous } = interactTarget(sw, w);
    if (ambiguous)
      return fail(`Há mais de um dispositivo ao seu alcance. Vire-se para o correto com as setas antes de apertar E. A instrução era ${expected}.`);
    if (!target) return fail(`Não há nada para acionar aqui. A instrução era ${expected}.`);
    if (target.def.id !== stmt.target)
      return fail(`Você acionou ${deviceName(sw, target.def.id)}, mas a instrução era ${expected}.`);
    const id = target.def.id;
    const facing = facingTo(w.player, target);
    advance(sw, w, (s) => {
      if (target.def.type === 'lever') s.levers[id] = !s.levers[id];
      else s.buttons[id] = s.tick;
      s.player.facing = facing;
    });
  }
  // conclui a instrução física
  const top = st.stack[st.stack.length - 1] as Extract<Frame, { k: 'block' }>;
  top.i++;
  st.ops++;
  st.actions++;
  trace.push({ line: stmt.line, text: expected });

  // se só restam instruções automáticas, o programa termina agora
  const look = clone(st);
  let tail: { unit: StopUnit; trace: TraceEntry[] };
  try {
    tail = runToPhysical(ctx, look);
  } catch (e) {
    const err = e as RuntimeError;
    return { ok: false, state: prev, trace, line: err.line, message: err.message };
  }
  let won = false;
  let finalState = st;
  if (tail.unit.kind === 'end') {
    look.finished = true;
    finalState = look;
    trace = trace.concat(tail.trace);
    won = goalMet(ctx, look);
    if (!won)
      return {
        ok: false,
        state: prev,
        trace,
        line: stmt.line,
        message: 'O programa terminou, mas o objetivo da fase não foi cumprido.',
      };
  }
  return {
    ok: true,
    state: finalState,
    trace,
    line: stmt.line,
    won,
    activated: stmt.k === 'act' ? stmt.target : undefined,
  };
}

function facingTo(p: { x: number; y: number; facing: Dir }, d: { x: number; y: number }): Dir {
  if (d.x > p.x) return 'direita';
  if (d.x < p.x) return 'esquerda';
  if (d.y > p.y) return 'baixo';
  if (d.y < p.y) return 'cima';
  return p.facing;
}

export function goalMet(ctx: Ctx, st: ExecState): boolean {
  const g = ctx.level.goal;
  const w = st.world;
  if (g.reachExit) {
    const ex = ctx.sw.exit;
    if (!ex || w.player.x !== ex.x || w.player.y !== ex.y) return false;
  }
  for (const id of g.powered ?? []) if (!w.signals[id]) return false;
  for (const id of g.unpowered ?? []) if (w.signals[id]) return false;
  for (const [k, v] of Object.entries(g.vars ?? {})) if (st.vars[k] !== v) return false;
  return true;
}

/** Ação correta segundo o interpretador (usada pelos testes e pela explicação). */
export function expectedAction(ctx: Ctx, st: ExecState): PlayerAction | null {
  const look = clone(st);
  const { unit } = runToPhysical(ctx, look);
  if (unit.kind === 'end') return null;
  const s = unit.stmt;
  if (s.k === 'move') return { type: 'move', dir: s.dir };
  if (s.k === 'wait') return { type: 'wait' };
  const { device } = interactTarget(ctx.sw, look.world);
  const want = ctx.sw.byId[s.target];
  if (device?.def.id !== s.target && want) {
    const p = look.world.player;
    // precisa se virar antes de acionar
    const dir = (Object.keys(DIR_DELTA) as Dir[]).find((d) => p.x + DIR_DELTA[d][0] === want.x && p.y + DIR_DELTA[d][1] === want.y);
    if (dir) return { type: 'move', dir };
  }
  return { type: 'interact' };
}

/** Executa a solução completa seguindo o próprio programa. */
export function solve(ctx: Ctx, limit = 2000): { actions: PlayerAction[]; state: ExecState; won: boolean; error?: string } {
  let st = initialExec(ctx);
  const actions: PlayerAction[] = [];
  for (let n = 0; n < limit; n++) {
    const a = expectedAction(ctx, st);
    if (!a) return { actions, state: st, won: false, error: 'programa terminou sem vitória' };
    const r = submit(ctx, st, a);
    if (!r.ok) return { actions, state: st, won: false, error: r.message };
    if (r.turned && r.state.world.player.facing === st.world.player.facing)
      return { actions, state: st, won: false, error: 'giro sem efeito' };
    actions.push(a);
    st = r.state;
    if (r.won) return { actions, state: st, won: true };
  }
  return { actions, state: st, won: false, error: 'limite de ações' };
}

/** Pilha de laços ativa, para exibição. */
export function loopStack(st: ExecState): { line: number; text: string }[] {
  return st.stack
    .filter((f): f is Exclude<Frame, { k: 'block' }> => f.k !== 'block')
    .map((f) =>
      f.k === 'repeat'
        ? { line: f.node.line, text: `REPITA — volta ${f.iter} de ${f.total}` }
        : { line: f.node.line, text: `ENQUANTO — volta ${f.iter}` },
    );
}
