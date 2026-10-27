import { LevelDef } from '../engine/types';
import { and, button, clock, code, core, door, lamp, lever, or, piston, plate, repeater, torch, xor } from './helpers';

// MUNDO 8 — O NÚCLEO DA REDSTONE (laboratório subterrâneo final)
export const world8: LevelDef[] = [
  {
    id: 36,
    world: 8,
    title: 'Circuitos Interdependentes',
    concept: 'Redes que se alimentam',
    brief: 'A rede de A alimenta a rede de B, e a rede de B volta para a de A.',
    map: [
      '###########',
      '#,,,,,,,,,#',
      '#,,,..D...#',
      '#b,a.,o,,.#',
      '#S...tgL,X#',
      '#,,,.,,,,.#',
      '#,,,..E...#',
      '###########',
    ],
    legend: {
      a: lever('A'),
      b: lever('B'),
      t: torch('T', 'A'),
      g: and('G', 'B', 'T'),
      L: lamp('L2', 'G'),
      o: or('O', 'A', 'L2'),
      D: door('D1', 'O'),
      E: door('D2', 'L2'),
    },
    program: code(`
      trocas ← 0
      acionar(B)
      REPITA 2 VEZES
        andar(direita)
      FIM
      ENQUANTO aberta(D2) OU trocas < 2 FAÇA
        acionar(A)
        trocas ← trocas + 1
      FIM
      SE aberta(D1) E NÃO aberta(D2) ENTÃO
        andar(direita)
        REPITA 2 VEZES
          andar(cima)
        FIM
        REPITA 5 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(baixo)
        FIM
      SENÃO
        andar(direita)
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 5 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { trocas: 3 } },
    hint: 'L2 = B AND (NÃO A). D2 abre com L2. D1 = A OU L2. Reavalie a condição do ENQUANTO depois de cada acionamento.',
    explanation:
      'Com B ligada, L2 depende só de A: A desligada → L2 acesa → D2 aberta. O laço inverte A até que D2 feche E trocas ≥ 2: liga (1), desliga (2, D2 reabre), liga (3). No fim D1 está aberta (A ligada) e D2 fechada: caminho de cima.',
  },
  {
    id: 37,
    world: 8,
    title: 'O Labirinto Lógico',
    concept: 'Condições aninhadas',
    brief: 'Cada cruzamento esconde uma decisão dentro de outra.',
    map: [
      '###########',
      '#S........#',
      '#.A.1.B.L.#',
      '#....p....#',
      '#.#.2.C.3.#',
      '#.........#',
      '#.#.#.#.#D#',
      '#........X#',
      '###########',
    ],
    legend: {
      A: lever('A', true),
      B: lever('B', false),
      C: lever('C', false),
      p: plate('P'),
      '1': and('G1', 'A', 'B'),
      '2': xor('G2', 'A', 'P'),
      '3': or('G3', 'G1', 'C'),
      L: lamp('L', 'G3'),
      D: door('D', 'G3'),
    },
    program: code(`
      chave ← 0
      REPITA 2 VEZES
        andar(direita)
      FIM
      SE ativo(G1) ENTÃO
        REPITA 2 VEZES
          andar(direita)
        FIM
      SENÃO
        andar(baixo)
        SE ligada(A) ENTÃO
          acionar(A)
          chave ← chave + 1
        SENÃO
          chave ← chave + 3
        FIM
        andar(baixo)
      FIM
      REPITA 2 VEZES
        andar(direita)
      FIM
      SE ativo(G2) ENTÃO
        SE chave ≥ 2 ENTÃO
          REPITA 2 VEZES
            andar(baixo)
          FIM
        SENÃO
          andar(direita)
          acionar(C)
          chave ← chave + 2
          andar(direita)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
      SE ativo(G3) ENTÃO
        SE chave MOD 2 = 1 ENTÃO
          REPITA 2 VEZES
            andar(direita)
          FIM
          REPITA 4 VEZES
            andar(baixo)
          FIM
        SENÃO
          REPITA 4 VEZES
            andar(baixo)
          FIM
          REPITA 2 VEZES
            andar(direita)
          FIM
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { chave: 3 } },
    hint: 'G1 = A AND B, G2 = A XOR P (P é a placa), G3 = G1 OR C. No cruzamento com B e C ao alcance, vire-se para a alavanca certa.',
    explanation:
      'G1 = 1 AND 0 = 0 → desce e desliga A (chave = 1). Sobre a placa, G2 = 0 XOR 1 = 1 e chave < 2 → liga C (chave = 3). G3 = 0 OR 1 = 1 e 3 é ímpar: direita, direita e descida pela porta D até a saída.',
  },
  {
    id: 38,
    world: 8,
    title: 'O Sistema Instável',
    concept: 'Estados que mudam sozinhos',
    brief: 'Três portas com relógios diferentes. O laço reavalia a passagem a cada tick.',
    map: [
      '###########',
      '#,,,,,,,,X#',
      '#,,k,m,n,.#',
      '#S.1.2.3..#',
      '#,,,,,,,,.#',
      '#,,,,,,,,.#',
      '###########',
    ],
    legend: {
      k: clock('K1', 4, 2, 2),
      m: clock('K2', 3, 1, 1),
      n: clock('K3', 5, 2, 0),
      '1': door('D1', 'K1'),
      '2': door('D2', 'K2'),
      '3': door('D3', 'K3'),
    },
    program: code(`
      pos ← 0
      esperas ← 0
      ENQUANTO pos < 8 FAÇA
        SE livre(direita) ENTÃO
          andar(direita)
          pos ← pos + 1
        SENÃO
          esperar()
          esperas ← esperas + 1
        FIM
      FIM
      SE esperas MOD 2 = 1 ENTÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(baixo)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { esperas: 5, pos: 8 } },
    hint: 'K1 abre nos ticks 2,3,6,7…; K2 nos ticks 2,5,8…; K3 nos ticks 0,1,5,6,10,11… O passo para dentro de uma porta usa o estado do tick atual.',
    explanation:
      'Esperas: 1 antes de D1 (tick 1 → 2), 1 antes de D2 (tick 4 → 5) e 3 antes de D3 (ticks 7 → 10). Total de 5 esperas, número ímpar: a saída é para cima.',
  },
  {
    id: 39,
    world: 8,
    title: 'O Grande Algoritmo',
    concept: 'Tudo junto',
    brief: 'Contagem, laço com decisão, porta XOR e um pistão que muda o caminho.',
    map: [
      '#############',
      '#,abcd,,,..X#',
      '#S.......D..#',
      '#,t,,A,,Bx.,#',
      '#,,,,,,u,gP,#',
      '#############',
    ],
    legend: {
      A: lever('A', false),
      B: lever('B', true),
      t: torch('T1', 'A'),
      u: torch('T2', 'B'),
      a: lamp('L1', 'T1'),
      b: lamp('L2', 'A'),
      c: lamp('L3', 'B'),
      d: lamp('L4', 'T1', 'B'),
      x: xor('X1', 'A', 'B'),
      D: door('D', 'X1'),
      g: and('G', 'A', 'T2'),
      P: piston('PI', 'cima', 'G'),
    },
    program: code(`
      energia ← 0
      REPITA 4 VEZES
        andar(direita)
        SE acesa(cima) ENTÃO
          energia ← energia + 2
        SENÃO
          energia ← energia - 1
        FIM
      FIM
      ENQUANTO energia > 0 FAÇA
        SE energia MOD 2 = 1 ENTÃO
          acionar(A)
        SENÃO
          esperar()
        FIM
        energia ← energia - 1
      FIM
      REPITA 3 VEZES
        andar(direita)
      FIM
      SE NÃO aberta(D) ENTÃO
        acionar(B)
      FIM
      passos ← 0
      ENQUANTO livre(direita) FAÇA
        andar(direita)
        passos ← passos + 1
      FIM
      SE passos ≥ 2 ENTÃO
        andar(cima)
      SENÃO
        andar(cima)
        REPITA 2 VEZES
          andar(direita)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { energia: 0, passos: 1 } },
    hint: 'Conte a energia antes de mexer em A: as lâmpadas mudam depois! O pistão PI estende quando A está ligada E B desligada.',
    explanation:
      'Lâmpadas: acesa, apagada, acesa, acesa → energia = 5. O laço alterna: 5 ímpar (aciona), 4 par (espera), 3 (aciona), 2 (espera), 1 (aciona): A termina ligada. Com A e B ligadas o XOR fecha a porta, então B é desligada; isso abre D e estende o pistão, bloqueando a segunda casa. passos = 1 → subida e duas casas à direita.',
  },
  {
    id: 40,
    world: 8,
    title: 'O Núcleo Final',
    concept: 'Desafio final',
    brief: 'Ative o Núcleo da Redstone: XOR das alavancas, pulso atrasado do botão e a placa de pressão, tudo ao mesmo tempo.',
    map: [
      '###############',
      '#,,,,,,N,,,,,,#',
      '#,,,,,,FRk,,,,#',
      '#,,,...P...,,,#',
      '#,,,.,,,,,..q,#',
      '#,,,.,,,,c.,g,#',
      '#,,,e,,,,,Dxt,#',
      '#,,,.,,,,b.,,,#',
      '#,,,.,,,,,.a,,#',
      '#,,,..S....,,,#',
      '#,,,,,123,,,,,#',
      '###############',
    ],
    legend: {
      a: lever('A', true),
      b: lever('B', false),
      c: lever('C', false),
      k: button('BT', 4),
      R: repeater('R', 'BT', 2),
      P: plate('P'),
      x: xor('XG', 'A', 'B'),
      D: door('D', 'XG'),
      e: door('D0'),
      t: torch('TC', 'C'),
      g: and('G2', 'B', 'TC'),
      q: piston('PI', 'esquerda', 'G2'),
      F: and('F', 'XG', 'R', 'P'),
      N: core('N', 'F'),
      '1': lamp('S1', 'A'),
      '2': lamp('S2', 'B'),
      '3': lamp('S3', 'TC'),
    },
    program: code(`
      carga ← 0
      REPITA 3 VEZES
        SE acesa(baixo) ENTÃO
          carga ← carga + 1
        FIM
        andar(direita)
      FIM
      andar(direita)
      andar(cima)
      SE carga ≥ 2 ENTÃO
        acionar(A)
      FIM
      andar(cima)
      tentativas ← 0
      ENQUANTO NÃO aberta(D) OU tentativas < carga FAÇA
        acionar(B)
        tentativas ← tentativas + 1
      FIM
      REPITA 2 VEZES
        andar(cima)
      FIM
      SE NÃO livre(cima) ENTÃO
        acionar(C)
        carga ← carga + tentativas
      SENÃO
        carga ← 0
      FIM
      ENQUANTO livre(cima) FAÇA
        andar(cima)
      FIM
      andar(esquerda)
      acionar(BT)
      SE carga > 4 ENTÃO
        esperar()
        esperar()
      FIM
      REPITA 2 VEZES
        andar(esquerda)
      FIM
    `),
    goal: { powered: ['N'], vars: { carga: 5, tentativas: 3 } },
    hint: 'O núcleo N precisa de F = XG AND R AND P. R é o botão BT atrasado 2 ticks; BT fica ativo 4 ticks. Calcule carga com cuidado: ela decide quantas vezes B é acionada e se haverá espera.',
    explanation:
      'Sensores: S1 e S3 acesos → carga = 2, então A é desligada. O ENQUANTO aciona B três vezes (porta fecha só quando tentativas ≥ 2 e D aberta). Com B ligada, G2 estende o pistão e bloqueia o poço: C é acionada (carga = 5) e o pistão recolhe. O botão é apertado no tick 17; com as 2 esperas você pisa na placa no tick 21, quando R ainda entrega o sinal do tick 19. XG = 0 XOR 1, R e P ligados: o Núcleo desperta!',
  },
];
