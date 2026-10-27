import { LevelDef } from '../engine/types';
import { and, code, door, lamp, lever, or, torch, xor } from './helpers';

// MUNDO 4 — ENGENHARIA REDSTONE (fábrica de circuitos)
export const world4: LevelDef[] = [
  {
    id: 16,
    world: 4,
    title: 'Porta AND',
    concept: 'E lógico',
    brief: 'A porta AND só liga quando as DUAS entradas estão ligadas.',
    map: [
      '############',
      '#,,,,,,,,,,#',
      '#,A,B,,G,,,#',
      '#S......D.X#',
      '#,,,,,.,,,.#',
      '#,,,,,.....#',
      '############',
    ],
    legend: { A: lever('A', true), B: lever('B', false), G: and('G', 'A', 'B'), D: door('D', 'G') },
    program: code(`
      andar(direita)
      acionar(A)
      REPITA 2 VEZES
        andar(direita)
      FIM
      acionar(B)
      SE ativo(G) ENTÃO
        REPITA 6 VEZES
          andar(direita)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 4 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
    `),
    goal: { reachExit: true },
    hint: 'Anote o estado de cada alavanca depois dos dois acionamentos. AND = as duas ligadas.',
    explanation:
      'A começou ligada e foi desligada; B começou desligada e foi ligada. G = A AND B = desligada AND ligada = FALSO. A porta D continua fechada e o programa segue pelo desvio.',
  },
  {
    id: 17,
    world: 4,
    title: 'Porta OR',
    concept: 'OU lógico',
    brief: 'A porta OR liga quando PELO MENOS UMA entrada está ligada.',
    map: [
      '#########',
      '#,,,L,,,#',
      '#,A,O,B,#',
      '#,..S..,#',
      '#,.,.,.,#',
      '#,.,.,.,#',
      '#,.,.,X,#',
      '#########',
    ],
    legend: { A: lever('A', false), B: lever('B', true), O: or('O', 'A', 'B'), L: lamp('L', 'O') },
    program: code(`
      REPITA 2 VEZES
        andar(esquerda)
      FIM
      acionar(A)
      REPITA 4 VEZES
        andar(direita)
      FIM
      acionar(B)
      SE acesa(L) ENTÃO
        REPITA 3 VEZES
          andar(baixo)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(esquerda)
        FIM
        REPITA 3 VEZES
          andar(baixo)
        FIM
      FIM
    `),
    goal: { reachExit: true, powered: ['L'] },
    hint: 'Desligar B não basta para apagar L se A estiver ligada.',
    explanation:
      'Primeiro A foi ligada (L já estava acesa por causa de B). Depois B foi desligada, mas A continua ligada: A OR B = VERDADEIRO. L segue acesa e o programa desce pelo poço da direita.',
  },
  {
    id: 18,
    world: 4,
    title: 'Porta NOT',
    concept: 'NÃO lógico',
    brief: 'A tocha de redstone é um inversor: o operador NÃO faz o mesmo no código.',
    map: [
      '##########',
      '#,,A,,,,,#',
      '#,,....D.#',
      '#S..,,,,X#',
      '#,,....E.#',
      '#,,,T,,,,#',
      '##########',
    ],
    legend: { A: lever('A', false), D: door('D1', 'A'), T: torch('T', 'A'), E: door('D2', 'T') },
    program: code(`
      REPITA 2 VEZES
        andar(direita)
      FIM
      andar(cima)
      SE NÃO ligada(A) ENTÃO
        acionar(A)
      FIM
      SE NÃO aberta(D2) ENTÃO
        REPITA 5 VEZES
          andar(direita)
        FIM
        andar(baixo)
      SENÃO
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 5 VEZES
          andar(direita)
        FIM
        andar(cima)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'D1 recebe o sinal de A diretamente; D2 recebe o sinal invertido pela tocha T. Exatamente uma das duas fica aberta.',
    explanation:
      'NÃO ligada(A) era VERDADEIRO (A desligada), então A foi ligada. Com isso D1 abriu e a tocha T apagou, fechando D2. NÃO aberta(D2) = NÃO FALSO = VERDADEIRO: o caminho é o de cima, por D1.',
  },
  {
    id: 19,
    world: 4,
    title: 'Porta XOR',
    concept: 'OU exclusivo',
    brief: 'XOR liga quando exatamente UMA das entradas está ligada.',
    map: [
      '#########',
      '#,S,,,,,#',
      '#A.,,,,,#',
      '#,.,,,,,#',
      '#B.....,#',
      '#,.,,,.,#',
      '#G.,,,.,#',
      '#,D,,,.,#',
      '#,X....,#',
      '#########',
    ],
    legend: { A: lever('A', true), B: lever('B', true), G: xor('G', 'A', 'B'), D: door('D', 'G') },
    facing: 'baixo',
    program: code(`
      andar(baixo)
      SE ligada(A) E ligada(B) ENTÃO
        acionar(A)
      FIM
      REPITA 2 VEZES
        andar(baixo)
      FIM
      acionar(B)
      SE ativo(G) ENTÃO
        REPITA 4 VEZES
          andar(baixo)
        FIM
      SENÃO
        REPITA 4 VEZES
          andar(direita)
        FIM
        REPITA 4 VEZES
          andar(baixo)
        FIM
        REPITA 4 VEZES
          andar(esquerda)
        FIM
      FIM
    `),
    goal: { reachExit: true },
    hint: 'Depois do primeiro acionamento a porta abre (só B ligada). Mas o programa ainda aciona B…',
    explanation:
      'As duas começam ligadas (XOR = FALSO). A condição E é verdadeira, então A é desligada: agora só B está ligada e a porta abre. Em seguida B também é desligada: nenhuma entrada ligada → XOR = FALSO, porta fechada, desvio pela direita.',
  },
  {
    id: 20,
    world: 4,
    title: 'O Circuito Composto',
    concept: 'AND + OR + NOT',
    brief: 'Saída = (A AND B) OR (NOT C). Acompanhe cada entrada.',
    map: [
      '#############',
      '#,,,&,,|,,L,#',
      '#,,,,,,t,,,,#',
      '#,,A,B,C,,,,#',
      '#S.......D.X#',
      '#,,,,,,,.,,.#',
      '#,,,,,,,....#',
      '#############',
    ],
    legend: {
      A: lever('A', false),
      B: lever('B', true),
      C: lever('C', false),
      '&': and('G1', 'A', 'B'),
      t: torch('T', 'C'),
      '|': or('G2', 'G1', 'T'),
      L: lamp('L', 'G2'),
      D: door('D', 'G2'),
    },
    program: code(`
      REPITA 2 VEZES
        andar(direita)
      FIM
      SE NÃO ligada(A) ENTÃO
        acionar(A)
      FIM
      REPITA 2 VEZES
        andar(direita)
      FIM
      SE ativo(G1) ENTÃO
        acionar(B)
      FIM
      REPITA 2 VEZES
        andar(direita)
      FIM
      acionar(C)
      SE aberta(D) ENTÃO
        REPITA 4 VEZES
          andar(direita)
        FIM
      SENÃO
        andar(direita)
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 3 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
    `),
    goal: { reachExit: true, unpowered: ['L'] },
    hint: 'Monte uma tabela: A, B, C, G1 = A AND B, T = NOT C, G2 = G1 OR T. Atualize depois de cada acionar.',
    explanation:
      'A é ligada (G1 = 1 AND 1 = 1), então B é desligada (G1 = 0). Por fim C é ligada e a tocha T apaga. G2 = G1 OR T = 0 OR 0 = FALSO: a porta fecha e o caminho é o desvio por baixo.',
  },
];
