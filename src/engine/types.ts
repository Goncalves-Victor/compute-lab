// Tipos centrais do motor do Compute-lab. Nada aqui depende de React ou do canvas.

export type Dir = 'cima' | 'baixo' | 'esquerda' | 'direita';
export const DIRS: Dir[] = ['cima', 'baixo', 'esquerda', 'direita'];
export const DIR_DELTA: Record<Dir, [number, number]> = {
  cima: [0, -1],
  baixo: [0, 1],
  esquerda: [-1, 0],
  direita: [1, 0],
};

export type DeviceType =
  | 'lever' // alavanca: estado persistente
  | 'button' // botão: ativo por `duration` ticks
  | 'plate' // placa de pressão: ativa enquanto o jogador está sobre ela
  | 'clock' // relógio de pulsos: ativo quando (tick + phase) mod period < on
  | 'lamp' // lâmpada: acesa quando alimentada
  | 'door' // porta de ferro: aberta quando alimentada
  | 'piston' // pistão: empurra um bloco quando alimentado
  | 'torch' // tocha de redstone: inverte a entrada (NOT)
  | 'repeater' // repetidor: copia a entrada com `delay` ticks de atraso
  | 'and'
  | 'or'
  | 'xor'
  | 'core'; // núcleo da redstone (alvo final)

export interface DeviceDef {
  id: string;
  type: DeviceType;
  inputs?: string[];
  /** alavanca: estado inicial */
  initial?: boolean;
  /** botão: quantos ticks fica ativo */
  duration?: number;
  /** repetidor: atraso em ticks */
  delay?: number;
  /** relógio */
  period?: number;
  on?: number;
  phase?: number;
  /** pistão: direção para onde empurra */
  dir?: Dir;
  /** rótulo exibido (padrão = id) */
  label?: string;
}

export interface Goal {
  /** o jogador deve terminar sobre a célula marcada com X */
  reachExit?: boolean;
  /** dispositivos que devem estar alimentados/ativos ao final */
  powered?: string[];
  /** dispositivos que devem estar desligados ao final */
  unpowered?: string[];
  /** valores finais esperados de variáveis */
  vars?: Record<string, number | boolean>;
}

export interface LevelDef {
  id: number;
  world: number;
  title: string;
  /** conceito ensinado (aparece no menu) */
  concept: string;
  /** descrição curta do objetivo */
  brief: string;
  /**
   * Mapa em texto. '#' parede, '.' piso, ',' fosso de circuitos (não caminhável),
   * ' ' vazio, 'S' início, 'X' saída. Outras letras/dígitos são dispositivos do `legend`.
   */
  map: string[];
  legend: Record<string, DeviceDef>;
  vars?: Record<string, number | boolean>;
  program: string;
  goal: Goal;
  hint: string;
  explanation: string;
  /** direção inicial do jogador (padrão: direita) */
  facing?: Dir;
}

// ---------------- AST ----------------

export type Expr =
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'var'; name: string }
  | { k: 'call'; fn: string; args: string[] }
  | { k: 'not'; e: Expr }
  | { k: 'neg'; e: Expr }
  | { k: 'bin'; op: BinOp; a: Expr; b: Expr };

export type BinOp = 'E' | 'OU' | '=' | '≠' | '<' | '>' | '≤' | '≥' | '+' | '-' | '*' | 'MOD';

export type Stmt =
  | { k: 'move'; dir: Dir; line: number }
  | { k: 'act'; target: string; line: number }
  | { k: 'wait'; line: number }
  | { k: 'assign'; name: string; e: Expr; line: number }
  | { k: 'if'; cond: Expr; then: Stmt[]; else: Stmt[]; line: number; elseLine?: number; endLine: number }
  | { k: 'repeat'; count: Expr; body: Stmt[]; line: number; endLine: number }
  | { k: 'while'; cond: Expr; body: Stmt[]; line: number; endLine: number };

export interface Program {
  body: Stmt[];
  lines: string[];
}

// ---------------- Ações do jogador ----------------

export type PlayerAction = { type: 'move'; dir: Dir } | { type: 'interact' } | { type: 'wait' };

export function describeAction(a: PlayerAction): string {
  if (a.type === 'move') return `andar(${a.dir})`;
  if (a.type === 'wait') return 'esperar()';
  return 'interagir (E)';
}
