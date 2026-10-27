import { describe, expect, it } from 'vitest';
import { parseProgram, ParseError } from '../src/engine/parser';
import { initialExec, loadLevel, submit, currentLine, loopStack, ExecState, Ctx } from '../src/engine/interpreter';
import { LevelDef, PlayerAction } from '../src/engine/types';
import { button, clock, door, lamp, lever, piston, repeater, torch, and, or, xor } from '../src/levels/helpers';

const W: PlayerAction = { type: 'wait' };
const E: PlayerAction = { type: 'interact' };
const R: PlayerAction = { type: 'move', dir: 'direita' };

function mk(partial: Partial<LevelDef>): Ctx {
  return loadLevel({
    id: 0, world: 0, title: 't', concept: 'c', brief: 'b', hint: 'h', explanation: 'e',
    map: ['#####', '#S..#', '#####'], legend: {}, program: 'esperar()', goal: {}, ...partial,
  });
}
function run(ctx: Ctx, actions: PlayerAction[]): ExecState {
  let st = initialExec(ctx);
  for (const a of actions) {
    const r = submit(ctx, st, a);
    if (!r.ok) throw new Error(r.message);
    st = r.state;
  }
  return st;
}

describe('parser', () => {
  it('entende blocos aninhados, SENÃO SE e expressões', () => {
    const p = parseProgram(`x ← 1 + 2 * 3
SE x = 7 E NÃO (x < 0) ENTÃO
  REPITA 2 VEZES
    andar(direita)
  FIM
SENÃO SE x > 100 ENTÃO
  esperar()
SENÃO
  ENQUANTO livre(cima) FAÇA
    andar(cima)
  FIM
FIM`);
    expect(p.body.map((s) => s.k)).toEqual(['assign', 'if']);
    const iff = p.body[1] as Extract<(typeof p.body)[number], { k: 'if' }>;
    expect(iff.then[0].k).toBe('repeat');
    expect(iff.else[0].k).toBe('if');
  });
  it('acusa blocos sem FIM e instruções desconhecidas', () => {
    expect(() => parseProgram('REPITA 2 VEZES\n andar(cima)')).toThrow(ParseError);
    expect(() => parseProgram('pular()')).toThrow(ParseError);
    expect(() => parseProgram('andar(frente)')).toThrow(ParseError);
  });
});

describe('interpretador', () => {
  it('atribuições são automáticas e só aparecem depois da próxima ação', () => {
    const ctx = mk({ program: 'x ← 5\nandar(direita)\nx ← x * 2\nandar(direita)' });
    let st = initialExec(ctx);
    expect(currentLine(st)).toBe(0);
    st = submit(ctx, st, R).state;
    expect(st.vars.x).toBe(5);
    expect(currentLine(st)).toBe(2);
    st = submit(ctx, st, R).state;
    expect(st.vars.x).toBe(10);
    expect(st.finished).toBe(true);
  });
  it('mostra a pilha de laços', () => {
    const ctx = mk({ map: ['#######', '#S....#', '#######'], program: 'REPITA 2 VEZES\n  REPITA 2 VEZES\n    andar(direita)\n  FIM\nFIM' });
    const st = run(ctx, [R]);
    expect(loopStack(st).map((f) => f.text)).toEqual(['REPITA — volta 1 de 2', 'REPITA — volta 1 de 2']);
  });
  it('detecta laço infinito sem ações', () => {
    const ctx = mk({ program: 'ENQUANTO VERDADEIRO FAÇA\n  x ← 1\nFIM' });
    const r = submit(ctx, initialExec(ctx), W);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/infinito/);
  });
  it('não deixa andar para uma casa bloqueada', () => {
    const ctx = mk({ program: 'andar(cima)' });
    expect(submit(ctx, initialExec(ctx), { type: 'move', dir: 'cima' }).message).toMatch(/bloqueado/);
  });
});

describe('redstone', () => {
  it('botão fica ativo exatamente `duração` ticks', () => {
    const ctx = mk({ map: ['#B###', '#S..#', '#####'], legend: { B: button('B', 3) }, program: 'acionar(B)\nREPITA 4 VEZES\n esperar()\nFIM' });
    const seq: boolean[] = [];
    let st = initialExec(ctx);
    for (const a of [E, W, W, W, W]) {
      st = submit(ctx, st, a).state;
      seq.push(st.world.signals.B);
    }
    expect(seq).toEqual([true, true, true, false, false]);
  });
  it('repetidor atrasa a subida e a descida do sinal', () => {
    const ctx = mk({
      map: ['#A###', '#S.R#', '#####'],
      legend: { A: lever('A'), R: repeater('R', 'A', 2) },
      program: 'acionar(A)\nesperar()\nacionar(A)\nesperar()\nesperar()\nesperar()',
    });
    const seq: boolean[] = [];
    let st = initialExec(ctx);
    for (const a of [E, W, E, W, W, W]) {
      st = submit(ctx, st, a).state;
      seq.push(st.world.signals.R);
    }
    // entrada: 1,1,0,0,0,0  → saída (atraso 2): 0,0,1,1,0,0
    expect(seq).toEqual([false, false, true, true, false, false]);
  });
  it('relógio segue (tick + fase) mod período < ligado', () => {
    const ctx = mk({ map: ['#C###', '#S..#', '#####'], legend: { C: clock('C', 3, 1, 1) }, program: 'REPITA 6 VEZES\n esperar()\nFIM' });
    const seq: boolean[] = [];
    let st = initialExec(ctx);
    for (let i = 0; i < 6; i++) {
      st = submit(ctx, st, W).state;
      seq.push(st.world.signals.C);
    }
    expect(seq).toEqual([false, true, false, false, true, false]);
  });
  it('portas lógicas e tocha', () => {
    const ctx = mk({
      map: ['#abcdefg#', '#S......#', '#########'],
      legend: {
        a: lever('A', true), b: lever('B', false),
        c: and('G1', 'A', 'B'), d: or('G2', 'A', 'B'), e: xor('G3', 'A', 'B'), f: torch('T', 'A'), g: lamp('L', 'G3'),
      },
    });
    const s = initialExec(ctx).world.signals;
    expect([s.G1, s.G2, s.G3, s.T, s.L]).toEqual([false, true, true, false, true]);
  });
  it('porta só abre alimentada e pistão bloqueia a casa empurrada', () => {
    const ctx = mk({
      map: ['#A#p#', '#S.D.', '#...#', '#####'],
      legend: { A: lever('A'), D: door('D', 'A'), p: piston('P', 'baixo', 'A') },
      program: 'acionar(A)',
    });
    const st0 = initialExec(ctx);
    expect(st0.world.signals.D).toBe(false);
    const st1 = run(ctx, [E]);
    expect(st1.world.signals.D).toBe(true);
    expect(st1.world.pistons.P).toBe(true);
  });
  it('é preciso se virar quando há duas alavancas ao alcance', () => {
    const ctx = mk({ map: ['##A##', '#.S.#', '##B##'], legend: { A: lever('A'), B: lever('B') }, program: 'acionar(B)' });
    const st = initialExec(ctx);
    expect(submit(ctx, st, E).message).toMatch(/Vire-se/);
    const turned = submit(ctx, st, { type: 'move', dir: 'cima' });
    expect(turned.turned).toBe(true);
    expect(submit(ctx, turned.state, E).message).toMatch(/acionou A/);
    const down = submit(ctx, st, { type: 'move', dir: 'baixo' }).state;
    expect(submit(ctx, down, E).ok).toBe(true);
  });
});
