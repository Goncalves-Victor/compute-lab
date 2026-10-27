import { BinOp, DIRS, Dir, Expr, Program, Stmt } from './types';

// Parser do pseudocódigo em português. Cada linha contém uma instrução ou um delimitador de bloco.
//
//   andar(direita)          acionar(A)          esperar()
//   x ← x + 1
//   SE cond ENTÃO ... SENÃO SE cond ENTÃO ... SENÃO ... FIM
//   REPITA n VEZES ... FIM
//   ENQUANTO cond FAÇA ... FIM

export class ParseError extends Error {
  constructor(msg: string, public line: number) {
    super(`Linha ${line + 1}: ${msg}`);
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string, line: number): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j])) j++;
      out.push({ t: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[\p{L}_]/u.test(c)) {
      let j = i;
      while (j < src.length && /[\p{L}\p{N}_]/u.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    const twoMap: Record<string, string> = { '<-': '←', '<=': '≤', '>=': '≥', '!=': '≠', '<>': '≠', '==': '=' };
    if (twoMap[two]) {
      out.push({ t: 'op', v: twoMap[two] });
      i += 2;
      continue;
    }
    if ('()+-*=<>≤≥≠←,'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new ParseError(`símbolo inesperado "${c}"`, line);
  }
  return out;
}

class ExprParser {
  i = 0;
  constructor(private toks: Tok[], private line: number) {}
  peek() {
    return this.toks[this.i];
  }
  isKw(kw: string) {
    const t = this.peek();
    return t && t.t === 'id' && norm(t.v) === kw;
  }
  isOp(op: string) {
    const t = this.peek();
    return t && t.t === 'op' && t.v === op;
  }
  expectOp(op: string) {
    if (!this.isOp(op)) throw new ParseError(`esperava "${op}"`, this.line);
    this.i++;
  }
  done() {
    return this.i >= this.toks.length;
  }
  parse(): Expr {
    return this.or();
  }
  or(): Expr {
    let a = this.and();
    while (this.isKw('OU')) {
      this.i++;
      a = { k: 'bin', op: 'OU', a, b: this.and() };
    }
    return a;
  }
  and(): Expr {
    let a = this.not();
    while (this.isKw('E')) {
      this.i++;
      a = { k: 'bin', op: 'E', a, b: this.not() };
    }
    return a;
  }
  not(): Expr {
    if (this.isKw('NAO')) {
      this.i++;
      return { k: 'not', e: this.not() };
    }
    return this.cmp();
  }
  cmp(): Expr {
    const a = this.sum();
    for (const op of ['=', '≠', '<', '>', '≤', '≥']) {
      if (this.isOp(op)) {
        this.i++;
        return { k: 'bin', op: op as BinOp, a, b: this.sum() };
      }
    }
    return a;
  }
  sum(): Expr {
    let a = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.peek() as { v: string }).v as BinOp;
      this.i++;
      a = { k: 'bin', op, a, b: this.term() };
    }
    return a;
  }
  term(): Expr {
    let a = this.unary();
    while (this.isOp('*') || this.isKw('MOD')) {
      const op: BinOp = this.isOp('*') ? '*' : 'MOD';
      this.i++;
      a = { k: 'bin', op, a, b: this.unary() };
    }
    return a;
  }
  unary(): Expr {
    if (this.isOp('-')) {
      this.i++;
      return { k: 'neg', e: this.unary() };
    }
    return this.primary();
  }
  primary(): Expr {
    const t = this.peek();
    if (!t) throw new ParseError('expressão incompleta', this.line);
    if (t.t === 'num') {
      this.i++;
      return { k: 'num', v: t.v };
    }
    if (this.isOp('(')) {
      this.i++;
      const e = this.parse();
      this.expectOp(')');
      return e;
    }
    if (t.t === 'id') {
      const n = norm(t.v);
      if (n === 'VERDADEIRO') {
        this.i++;
        return { k: 'bool', v: true };
      }
      if (n === 'FALSO') {
        this.i++;
        return { k: 'bool', v: false };
      }
      this.i++;
      if (this.isOp('(')) {
        this.i++;
        const args: string[] = [];
        while (!this.isOp(')')) {
          const a = this.peek();
          if (!a || a.t === 'op') throw new ParseError('argumento inválido', this.line);
          args.push(String(a.v));
          this.i++;
          if (this.isOp(',')) this.i++;
        }
        this.i++;
        return { k: 'call', fn: t.v, args };
      }
      return { k: 'var', name: t.v };
    }
    throw new ParseError(`símbolo inesperado "${t.v}"`, this.line);
  }
}

function parseExpr(src: string, line: number): Expr {
  const p = new ExprParser(tokenize(src, line), line);
  const e = p.parse();
  if (!p.done()) throw new ParseError('sobrou texto na expressão', line);
  return e;
}

/** Remove a palavra-chave inicial e final de um cabeçalho de bloco. */
function between(text: string, startKw: RegExp, endKw: RegExp, line: number): string {
  const m = text.replace(startKw, '');
  const e = m.replace(endKw, '');
  if (e === m) throw new ParseError('cabeçalho de bloco incompleto', line);
  return e.trim();
}

const RE = {
  se: /^SE\s+/i,
  senaoSe: /^SEN[ÃA]O\s+SE\s+/i,
  senao: /^SEN[ÃA]O$/i,
  entao: /\s+ENT[ÃA]O$/i,
  fim: /^FIM(\s+\S+)?$/i,
  repita: /^REPITA\s+/i,
  vezes: /\s+VEZES$/i,
  enquanto: /^ENQUANTO\s+/i,
  faca: /\s+FA[ÇC]A$/i,
  move: /^andar\s*\(\s*([\p{L}]+)\s*\)$/iu,
  act: /^acionar\s*\(\s*([\p{L}\p{N}_]+)\s*\)$/iu,
  wait: /^esperar\s*\(\s*\)$/i,
  assign: /^([\p{L}_][\p{L}\p{N}_]*)\s*(←|<-)\s*(.+)$/u,
};

export function parseProgram(source: string): Program {
  const lines = source.replace(/^\n+|\s+$/g, '').split('\n');
  const clean = lines.map((l) => l.replace(/\/\/.*$/, '').trim());
  let i = 0;

  type Term = 'FIM' | 'SENAO' | 'SENAOSE' | 'EOF';
  const termOf = (t: string): Term | null => {
    if (RE.fim.test(t)) return 'FIM';
    if (RE.senaoSe.test(t)) return 'SENAOSE';
    if (RE.senao.test(t)) return 'SENAO';
    return null;
  };

  function parseIfRest(cond: Expr, line: number): Stmt {
    const then = block();
    const t = termOf(clean[i] ?? '');
    if (t === 'FIM') {
      const endLine = i++;
      return { k: 'if', cond, then, else: [], line, endLine };
    }
    if (t === 'SENAO') {
      const elseLine = i++;
      const els = block();
      if (termOf(clean[i] ?? '') !== 'FIM') throw new ParseError('SENÃO sem FIM', elseLine);
      const endLine = i++;
      return { k: 'if', cond, then, else: els, line, elseLine, endLine };
    }
    if (t === 'SENAOSE') {
      const elseLine = i;
      const txt = clean[i];
      const c2 = parseExpr(between(txt, RE.senaoSe, RE.entao, i), i);
      i++;
      const nested = parseIfRest(c2, elseLine) as Extract<Stmt, { k: 'if' }>;
      return { k: 'if', cond, then, else: [nested], line, elseLine, endLine: nested.endLine };
    }
    throw new ParseError('SE sem FIM', line);
  }

  function statement(): Stmt {
    const line = i;
    const t = clean[i];
    let m: RegExpMatchArray | null;
    if (RE.se.test(t) && !RE.senaoSe.test(t)) {
      const cond = parseExpr(between(t, RE.se, RE.entao, line), line);
      i++;
      return parseIfRest(cond, line);
    }
    if (RE.repita.test(t)) {
      const count = parseExpr(between(t, RE.repita, RE.vezes, line), line);
      i++;
      const body = block();
      if (termOf(clean[i] ?? '') !== 'FIM') throw new ParseError('REPITA sem FIM', line);
      return { k: 'repeat', count, body, line, endLine: i++ };
    }
    if (RE.enquanto.test(t)) {
      const cond = parseExpr(between(t, RE.enquanto, RE.faca, line), line);
      i++;
      const body = block();
      if (termOf(clean[i] ?? '') !== 'FIM') throw new ParseError('ENQUANTO sem FIM', line);
      return { k: 'while', cond, body, line, endLine: i++ };
    }
    if ((m = t.match(RE.move))) {
      const dir = m[1].toLowerCase() as Dir;
      if (!DIRS.includes(dir)) throw new ParseError(`direção desconhecida "${m[1]}"`, line);
      i++;
      return { k: 'move', dir, line };
    }
    if ((m = t.match(RE.act))) {
      i++;
      return { k: 'act', target: m[1], line };
    }
    if (RE.wait.test(t)) {
      i++;
      return { k: 'wait', line };
    }
    if ((m = t.match(RE.assign))) {
      i++;
      return { k: 'assign', name: m[1], e: parseExpr(m[3], line), line };
    }
    throw new ParseError(`instrução desconhecida "${t}"`, line);
  }

  function block(): Stmt[] {
    const out: Stmt[] = [];
    while (i < clean.length) {
      if (clean[i] === '') {
        i++;
        continue;
      }
      if (termOf(clean[i])) break;
      out.push(statement());
    }
    return out;
  }

  const body = block();
  if (i < clean.length) throw new ParseError(`"${clean[i]}" sem bloco correspondente`, i);
  return { body, lines };
}

/** Reconstrói uma expressão como texto (usado no rastro de execução). */
export function exprToString(e: Expr): string {
  switch (e.k) {
    case 'num':
      return String(e.v);
    case 'bool':
      return e.v ? 'VERDADEIRO' : 'FALSO';
    case 'var':
      return e.name;
    case 'call':
      return `${e.fn}(${e.args.join(', ')})`;
    case 'not':
      return `NÃO ${exprToString(e.e)}`;
    case 'neg':
      return `-${exprToString(e.e)}`;
    case 'bin':
      return `${exprToString(e.a)} ${e.op} ${exprToString(e.b)}`;
  }
}
