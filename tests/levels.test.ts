import { describe, expect, it } from 'vitest';
import { LEVELS, WORLDS } from '../src/levels';
import { expectedAction, goalMet, initialExec, loadLevel, solve, submit } from '../src/engine/interpreter';
import { DIRS, PlayerAction, Stmt } from '../src/engine/types';

const ALL_ACTIONS: PlayerAction[] = [...DIRS.map((dir) => ({ type: 'move', dir }) as PlayerAction), { type: 'interact' }, { type: 'wait' }];
const same = (a: PlayerAction, b: PlayerAction) => JSON.stringify(a) === JSON.stringify(b);

function walk(stmts: Stmt[], f: (s: Stmt) => void) {
  for (const s of stmts) {
    f(s);
    if (s.k === 'if') {
      walk(s.then, f);
      walk(s.else, f);
    }
    if (s.k === 'repeat' || s.k === 'while') walk(s.body, f);
  }
}
const kinds = (lv: (typeof LEVELS)[number]) => {
  const out = new Set<string>();
  walk(loadLevel(lv).program.body, (s) => out.add(s.k));
  return out;
};

describe('estrutura das fases', () => {
  it('tem exatamente 40 fases numeradas de 1 a 40, 5 por mundo', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const w of WORLDS) expect(LEVELS.filter((l) => l.world === w.id).map((l) => l.id)).toEqual(w.levels);
  });

  it('cada fase tem mapa e programa únicos', () => {
    expect(new Set(LEVELS.map((l) => l.map.join('\n'))).size).toBe(40);
    expect(new Set(LEVELS.map((l) => l.program)).size).toBe(40);
  });

  it('cada fase tem textos de dica, explicação e objetivo', () => {
    for (const l of LEVELS) {
      expect(l.hint.length, `fase ${l.id}`).toBeGreaterThan(20);
      expect(l.explanation.length, `fase ${l.id}`).toBeGreaterThan(40);
      expect(l.title && l.brief && l.concept).toBeTruthy();
    }
  });

  it('os mundos introduzem as estruturas prometidas', () => {
    const byId = (id: number) => kinds(LEVELS[id - 1]);
    for (let id = 1; id <= 5; id++) expect([...byId(id)].every((k) => k === 'move' || k === 'act')).toBe(true);
    for (let id = 6; id <= 10; id++) expect(byId(id).has('repeat')).toBe(true);
    for (let id = 11; id <= 20; id++) expect(byId(id).has('if')).toBe(true);
    for (let id = 21; id <= 25; id++) expect(byId(id).has('assign')).toBe(true);
    for (let id = 26; id <= 30; id++) expect(byId(id).has('while')).toBe(true);
    for (const id of [31, 32, 33]) expect(byId(id).has('wait')).toBe(true);
    const finalKinds = byId(40);
    for (const k of ['move', 'act', 'wait', 'assign', 'if', 'repeat', 'while']) expect(finalKinds.has(k)).toBe(true);
  });

  it('a fase 9 tem REPITA aninhado e a fase 40 usa todos os tipos de dispositivo pedidos', () => {
    const nine = loadLevel(LEVELS[8]).program.body;
    expect(nine[0].k === 'repeat' && nine[0].body.some((s) => s.k === 'repeat')).toBe(true);
    const types = new Set(Object.values(LEVELS[39].legend).map((d) => d.type));
    for (const t of ['lever', 'lamp', 'door', 'piston', 'repeater', 'and', 'xor', 'torch', 'plate', 'button', 'core'])
      expect(types.has(t as never), t).toBe(true);
  });
});

describe.each(LEVELS.map((l) => [l.id, l.title, l] as const))('fase %i — %s', (_id, _t, level) => {
  const ctx = loadLevel(level);

  it('o objetivo não está cumprido no início', () => {
    expect(goalMet(ctx, initialExec(ctx))).toBe(false);
  });

  it('o algoritmo esperado pode ser executado até a vitória', () => {
    const r = solve(ctx);
    expect(r.error).toBeUndefined();
    expect(r.won).toBe(true);
    expect(r.state.finished).toBe(true);
    expect(goalMet(ctx, r.state)).toBe(true);
  });

  it('toda ação diferente da esperada é rejeitada sem alterar o estado', () => {
    let st = initialExec(ctx);
    for (let n = 0; n < 500; n++) {
      const good = expectedAction(ctx, st);
      if (!good) break;
      for (const a of ALL_ACTIONS) {
        if (same(a, good)) continue;
        const r = submit(ctx, st, a);
        if (r.turned) continue; // virar-se para uma alavanca não é instrução
        expect(r.ok, `fase ${level.id}, passo ${n}: ${JSON.stringify(a)} deveria falhar`).toBe(false);
        expect(r.state).toBe(st);
        expect(r.message).toBeTruthy();
      }
      const r = submit(ctx, st, good);
      expect(r.ok).toBe(true);
      st = r.state;
      if (r.won) return;
    }
    throw new Error('não terminou');
  });
});

describe('progressão de dificuldade', () => {
  it('o tamanho da solução cresce ao longo dos mundos', () => {
    const avg = (w: number) => {
      const ls = LEVELS.filter((l) => l.world === w);
      return ls.reduce((s, l) => s + solve(loadLevel(l)).actions.length, 0) / ls.length;
    };
    expect(avg(8)).toBeGreaterThan(avg(1));
    expect(avg(7)).toBeGreaterThan(avg(2));
  });
});
