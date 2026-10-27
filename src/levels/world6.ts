import { LevelDef } from '../engine/types';
import { and, code, door, lamp, lever, plate, torch } from './helpers';

// MUNDO 6 — LOOPS AVANÇADOS (sistema de automação)
export const world6: LevelDef[] = [
  {
    id: 26,
    world: 6,
    title: 'Enquanto Houver Caminho',
    concept: 'ENQUANTO',
    brief: 'ENQUANTO repete o bloco até a condição ficar FALSA.',
    map: [
      '###########',
      '#S....#...#',
      '#.....#...#',
      '#.........#',
      '#....#...X#',
      '###########',
    ],
    legend: {},
    program: code(`
      ENQUANTO livre(direita) FAÇA
        andar(direita)
      FIM
      ENQUANTO livre(baixo) FAÇA
        andar(baixo)
      FIM
      ENQUANTO livre(direita) FAÇA
        andar(direita)
      FIM
      ENQUANTO livre(baixo) FAÇA
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'livre(direita) é VERDADEIRO quando a casa à sua direita pode ser pisada. Antes de cada volta, olhe a casa seguinte.',
    explanation:
      'Diferente do REPITA, o ENQUANTO não sabe quantas voltas dará: ele testa a condição antes de cada volta. Cada laço parou exatamente quando uma parede apareceu à frente.',
  },
  {
    id: 27,
    world: 6,
    title: 'Enquanto a Luz Estiver Apagada',
    concept: 'Laço até um sinal ativo',
    brief: 'Continue agindo enquanto o circuito ainda não respondeu.',
    map: [
      '##########',
      '#,,,l,,L,#',
      '#S..p..q.#',
      '#,,,,,a.t#',
      '#,,,,,,D,#',
      '#,,,,,,.,#',
      '#,,,,,,X,#',
      '##########',
    ],
    legend: {
      p: plate('P1'),
      q: plate('P2'),
      l: lamp('L1', 'P1'),
      L: lamp('L', 'P2'),
      a: lever('A', true),
      t: torch('T', 'A'),
      D: door('D', 'T'),
    },
    program: code(`
      ENQUANTO NÃO acesa(L) FAÇA
        andar(direita)
      FIM
      andar(baixo)
      ENQUANTO NÃO aberta(D) FAÇA
        acionar(A)
      FIM
      ENQUANTO livre(baixo) FAÇA
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'A placa P1 acende L1, não L. Só a placa P2 acende a lâmpada L que o laço está testando.',
    explanation:
      'O primeiro laço andou até você pisar em P2 (L acendeu). O segundo acionou A apenas uma vez: A desligou, a tocha acendeu e a porta abriu, encerrando o laço. O terceiro desceu até a parede.',
  },
  {
    id: 28,
    world: 6,
    title: 'Contador de Repetições',
    concept: 'ENQUANTO com variável',
    brief: 'O laço termina quando a soma atinge o limite.',
    map: [
      '#########',
      '#S......#',
      '#.......#',
      '#......,#',
      '#.,.....#',
      '#.......#',
      '#....X..#',
      '#.......#',
      '#########',
    ],
    legend: {},
    program: code(`
      i ← 1
      soma ← 0
      ENQUANTO soma < 10 FAÇA
        soma ← soma + i
        i ← i + 1
        andar(direita)
      FIM
      REPITA i VEZES
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true, vars: { soma: 10, i: 5 } },
    hint: 'Monte a tabela: soma = 0+1, +2, +3… Quando soma deixa de ser menor que 10? Quanto vale i nesse momento?',
    explanation:
      'soma: 1, 3, 6, 10 em quatro voltas (4 passos para a direita). Com soma = 10 a condição soma < 10 ficou FALSA. Nesse momento i = 5, então o REPITA final desceu 5 casas.',
  },
  {
    id: 29,
    world: 6,
    title: 'Condições Dentro de Loops',
    concept: 'SE dentro de ENQUANTO',
    brief: 'Um contador binário com duas alavancas: vire-se para a alavanca certa!',
    map: [
      '#########',
      '#,lAg,,,#',
      '#S..D.X,#',
      '#,mB,,,,#',
      '#########',
    ],
    legend: {
      A: lever('A'),
      B: lever('B'),
      l: lamp('L0', 'A'),
      m: lamp('L1', 'B'),
      g: and('G', 'A', 'B'),
      D: door('D', 'G'),
    },
    program: code(`
      REPITA 2 VEZES
        andar(direita)
      FIM
      voltas ← 0
      ENQUANTO NÃO aberta(D) FAÇA
        SE ligada(A) ENTÃO
          acionar(A)
          acionar(B)
        SENÃO
          acionar(A)
        FIM
        voltas ← voltas + 1
      FIM
      REPITA voltas VEZES
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, vars: { voltas: 3 } },
    hint: 'Com A e B ao seu alcance, use a seta para se virar (↑ para A, ↓ para B) antes de apertar E. A porta abre quando A AND B.',
    explanation:
      'O laço implementa um contador binário: 00 → 01 → 10 → 11. Volta 1: A liga. Volta 2: A desliga e B liga (o "vai um"). Volta 3: A liga. Agora A AND B abre a porta, o laço termina com voltas = 3 e o robô anda 3 casas.',
  },
  {
    id: 30,
    world: 6,
    title: 'Automação Completa',
    concept: 'Laços aninhados + variáveis',
    brief: 'O laço interno depende da variável do laço externo.',
    map: [
      '###########',
      '#.......#,#',
      '#.......#,#',
      '#.......DX#',
      '#S.....a#,#',
      '#.......#,#',
      '###########',
    ],
    legend: { a: lever('A'), D: door('D', 'A') },
    program: code(`
      linha ← 0
      total ← 0
      REPITA 3 VEZES
        linha ← linha + 1
        REPITA linha VEZES
          andar(direita)
          total ← total + linha
        FIM
        SE total MOD 2 = 0 ENTÃO
          andar(baixo)
        SENÃO
          andar(cima)
        FIM
      FIM
      SE total > 12 E NÃO aberta(D) ENTÃO
        acionar(A)
      FIM
      ENQUANTO livre(direita) FAÇA
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, vars: { total: 14, linha: 3 } },
    hint: 'MOD 2 dá o resto da divisão por 2: 0 se par, 1 se ímpar. Acompanhe total ao fim de cada volta externa.',
    explanation:
      'Volta 1: 1 passo, total = 1 (ímpar → cima). Volta 2: 2 passos, total = 5 (ímpar → cima). Volta 3: 3 passos, total = 14 (par → baixo). Como 14 > 12 e a porta estava fechada, A foi acionada, e o ENQUANTO atravessou a porta até a parede.',
  },
];
