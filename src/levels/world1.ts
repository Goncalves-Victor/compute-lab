import { LevelDef } from '../engine/types';
import { code, door, lamp, lever } from './helpers';

// MUNDO 1 — PRIMEIROS COMANDOS (laboratório inicial de redstone)
export const world1: LevelDef[] = [
  {
    id: 1,
    world: 1,
    title: 'Primeiro Movimento',
    concept: 'Leitura sequencial',
    brief: 'Execute o programa linha por linha, como um computador faria.',
    map: [
      '########',
      '#,,,,,,#',
      '#.S..X.#',
      '#......#',
      '########',
    ],
    legend: {},
    program: code(`
      andar(direita)
      andar(direita)
      andar(direita)
    `),
    goal: { reachExit: true },
    hint: 'Cada linha é uma instrução. A linha destacada é a próxima a ser executada: use a seta → para cada andar(direita).',
    explanation:
      'Um computador executa as instruções em ordem, de cima para baixo, uma de cada vez. Foram três passos para a direita, exatamente o que o programa mandava, nem mais nem menos.',
  },
  {
    id: 2,
    world: 1,
    title: 'A Alavanca',
    concept: 'Interação com dispositivos',
    brief: 'Caminhe até a alavanca A e acione-a para acender a lâmpada L.',
    map: [
      '#########',
      '#,,,,,L,#',
      '#,,,,A,,#',
      '#S....,,#',
      '#########',
    ],
    legend: { A: lever('A'), L: lamp('L', 'A') },
    program: code(`
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
      acionar(A)
    `),
    goal: { powered: ['L'] },
    hint: 'acionar(A) só funciona quando você está ao lado da alavanca A. Aperte E para acioná-la.',
    explanation:
      'Depois de quatro passos você ficou logo abaixo da alavanca. acionar(A) mudou o estado da alavanca para LIGADA, e a redstone levou o sinal até a lâmpada L.',
  },
  {
    id: 3,
    world: 1,
    title: 'Mudança de Direção',
    concept: 'Comandos em direções diferentes',
    brief: 'Siga o caminho em L até a saída.',
    map: [
      '########',
      '#S...,,#',
      '#.,,.,,#',
      '#.,,.,,#',
      '#...X..#',
      '########',
    ],
    legend: {},
    program: code(`
      andar(direita)
      andar(direita)
      andar(direita)
      andar(baixo)
      andar(baixo)
      andar(baixo)
    `),
    goal: { reachExit: true },
    hint: 'Existem dois caminhos até a saída, mas só um deles corresponde ao programa. Leia a direção de cada linha.',
    explanation:
      'O programa primeiro vai três vezes para a direita e só depois três vezes para baixo. Descer primeiro também chegaria à saída, mas não seria a execução deste programa.',
  },
  {
    id: 4,
    world: 1,
    title: 'Ordem das Operações',
    concept: 'Sequência importa',
    brief: 'Acione as alavancas na ordem exata do programa.',
    map: [
      '##########',
      '#,,,P,Q,,#',
      '#,,,A,B,,#',
      '#S......X#',
      '##########',
    ],
    legend: { A: lever('A'), B: lever('B'), P: lamp('LA', 'A'), Q: lamp('LB', 'B') },
    program: code(`
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
      acionar(B)
      andar(esquerda)
      andar(esquerda)
      acionar(A)
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
    `),
    goal: { reachExit: true, powered: ['LA', 'LB'] },
    hint: 'Você passa pela alavanca A primeiro, mas o programa só manda acioná-la depois de B. Não se adiante!',
    explanation:
      'O computador não "pula" instruções: mesmo passando por A no caminho, a primeira alavanca acionada é B (linha 6). Só então o programa volta duas casas e aciona A.',
  },
  {
    id: 5,
    world: 1,
    title: 'A Primeira Porta',
    concept: 'Movimento + mecanismo',
    brief: 'Abra a porta de ferro com a alavanca e chegue à saída.',
    map: [
      '###########',
      '#,,,A,,,,,#',
      '#S.....D.X#',
      '###########',
    ],
    legend: { A: lever('A'), D: door('D', 'A') },
    program: code(`
      andar(direita)
      andar(direita)
      andar(direita)
      acionar(A)
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
      andar(direita)
    `),
    goal: { reachExit: true },
    hint: 'Portas de ferro só abrem quando recebem sinal de redstone. A alavanca A alimenta a porta D.',
    explanation:
      'A porta D estava fechada porque não recebia sinal. Ao acionar A, a redstone energizou a porta, que abriu e liberou os cinco passos finais até a saída.',
  },
];
