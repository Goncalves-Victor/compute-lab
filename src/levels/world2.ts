import { LevelDef } from '../engine/types';
import { code, door, lamp, lever } from './helpers';

// MUNDO 2 — REPETIDORES (corredores de túneis subterrâneos)
export const world2: LevelDef[] = [
  {
    id: 6,
    world: 2,
    title: 'Repetir Três Vezes',
    concept: 'REPITA',
    brief: 'O bloco dentro de REPITA é executado várias vezes.',
    map: [
      '#########',
      '#S,,,,,,#',
      '#...X...#',
      '#,,,,,,,#',
      '#########',
    ],
    legend: {},
    program: code(`
      andar(baixo)
      REPITA 3 VEZES
        andar(direita)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'REPITA 3 VEZES executa tudo que está entre ele e o FIM três vezes seguidas.',
    explanation:
      'Primeiro um passo para baixo. Depois o laço REPITA executou andar(direita) três vezes: em vez de escrever a mesma linha três vezes, o programa usa uma repetição.',
  },
  {
    id: 7,
    world: 2,
    title: 'Caminho em Zig-Zag',
    concept: 'Laço com dois comandos',
    brief: 'O corpo do laço tem duas instruções: execute as duas a cada volta.',
    map: [
      '#######',
      '#...X.#',
      '#.....#',
      '#.....#',
      '#S....#',
      '#######',
    ],
    legend: {},
    program: code(`
      REPITA 3 VEZES
        andar(direita)
        andar(cima)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'A cada volta: um passo para a direita e depois um para cima. Isso forma uma escada.',
    explanation:
      'O laço executou o par direita → cima três vezes: D, C, D, C, D, C. Ir três vezes para a direita e depois três para cima chegaria ao mesmo lugar, mas não é o que o programa faz.',
  },
  {
    id: 8,
    world: 2,
    title: 'Repetições Consecutivas',
    concept: 'Dois laços em sequência',
    brief: 'Um laço termina completamente antes do próximo começar.',
    map: [
      '##########',
      '#S.......#',
      '#..,..,..#',
      '#........#',
      '#....X...#',
      '##########',
    ],
    legend: {},
    program: code(`
      REPITA 4 VEZES
        andar(direita)
      FIM
      REPITA 3 VEZES
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'Conte as voltas: o primeiro REPITA faz 4 passos, só depois o segundo faz 3.',
    explanation:
      'O primeiro REPITA rodou 4 voltas (até a coluna 5). Quando ele terminou, a execução passou para o segundo REPITA, que rodou 3 voltas descendo até a saída.',
  },
  {
    id: 9,
    world: 2,
    title: 'Repetições Aninhadas',
    concept: 'Laço dentro de laço',
    brief: 'O laço interno roda completo a cada volta do laço externo.',
    map: [
      '#########',
      '#S......#',
      '#.,.....#',
      '#......X#',
      '#########',
    ],
    legend: {},
    program: code(`
      REPITA 2 VEZES
        REPITA 3 VEZES
          andar(direita)
        FIM
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'Volta 1 do laço externo: 3× direita e 1× baixo. Volta 2: de novo 3× direita e 1× baixo.',
    explanation:
      'O laço interno (3× direita) foi executado inteiro dentro de cada volta do externo. Ao todo: 2 × 3 = 6 passos para a direita e 2 para baixo, intercalados.',
  },
  {
    id: 10,
    world: 2,
    title: 'O Corredor Automatizado',
    concept: 'Laços + mecanismos',
    brief: 'Repita também as interações: cada acionamento inverte a alavanca.',
    map: [
      '###########',
      '#,,,,A,,,L#',
      '#S.....D.X#',
      '###########',
    ],
    legend: { A: lever('A'), D: door('D', 'A'), L: lamp('L', 'A') },
    program: code(`
      REPITA 4 VEZES
        andar(direita)
      FIM
      REPITA 3 VEZES
        acionar(A)
      FIM
      REPITA 4 VEZES
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, powered: ['D'] },
    hint: 'A porta abre já no primeiro acionamento, mas o programa manda acionar 3 vezes. Liga, desliga, liga…',
    explanation:
      'Cada acionar(A) inverte a alavanca: desligada → ligada → desligada → ligada. Como 3 é ímpar, a alavanca terminou ligada e a porta ficou aberta para os 4 passos finais.',
  },
];
