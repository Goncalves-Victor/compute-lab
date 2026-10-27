import { LevelDef } from '../engine/types';
import { code, door, lamp, lever, torch, xor } from './helpers';

// MUNDO 5 — MEMÓRIA DO ROBÔ (centro de processamento)
export const world5: LevelDef[] = [
  {
    id: 21,
    world: 5,
    title: 'Primeira Variável',
    concept: 'Variável numérica',
    brief: 'Uma variável guarda um número que pode mudar durante o programa.',
    map: [
      '##########',
      '#,,,....X#',
      '#,,,.,,,,#',
      '#S...,,,,#',
      '#,,,.,,,,#',
      '#,,,.....#',
      '##########',
    ],
    legend: {},
    program: code(`
      energia ← 0
      REPITA 3 VEZES
        andar(direita)
        energia ← energia + 2
      FIM
      SE energia > 5 ENTÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
        REPITA 4 VEZES
          andar(direita)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 4 VEZES
          andar(direita)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { energia: 6 } },
    hint: 'O painel de variáveis só é atualizado depois de cada ação. Calcule energia mentalmente antes do SE.',
    explanation:
      'energia começou em 0 e ganhou 2 a cada volta: 2, 4, 6. No SE, 6 > 5 é VERDADEIRO, então o robô subiu. As atribuições são feitas pelo computador; você só executa os movimentos.',
  },
  {
    id: 22,
    world: 5,
    title: 'Bateria Limitada',
    concept: 'Contador decrescente',
    brief: 'Cada passo gasta bateria. Quando zera, o robô recarrega.',
    map: [
      '##########',
      '#,,,,....#',
      '#,,,R.,L,#',
      '#S....,,,#',
      '#,,,,.,,,#',
      '#,,,,...X#',
      '##########',
    ],
    legend: { R: lever('R'), L: lamp('L', 'R') },
    program: code(`
      bateria ← 3
      REPITA 4 VEZES
        andar(direita)
        bateria ← bateria - 1
        SE bateria = 0 ENTÃO
          acionar(R)
          bateria ← bateria + 3
        FIM
      FIM
      SE bateria > 2 ENTÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
        REPITA 3 VEZES
          andar(direita)
        FIM
      SENÃO
        REPITA 2 VEZES
          andar(baixo)
        FIM
        REPITA 3 VEZES
          andar(direita)
        FIM
      FIM
    `),
    goal: { reachExit: true, powered: ['L'], vars: { bateria: 2 } },
    hint: 'Faça uma tabela: volta → bateria depois do passo. Em qual volta ela chega a 0?',
    explanation:
      'Bateria: 3 → 2 → 1 → 0 nas três primeiras voltas. Na terceira, o SE recarrega (acionar R, bateria = 3). Na quarta volta ela cai para 2. Como 2 > 2 é FALSO, o caminho final é o de baixo.',
  },
  {
    id: 23,
    world: 5,
    title: 'Contador de Lâmpadas',
    concept: 'Contagem com variável',
    brief: 'Conte quantas lâmpadas estão acesas e use o resultado para se mover.',
    map: [
      '#########',
      '#,k,t,m,#',
      '#,abcde,#',
      '#S.....,#',
      '#,,,,,.,#',
      '#,,,,,.,#',
      '#,,,,,X,#',
      '#,,,,,.,#',
      '#,,,,,.,#',
      '#########',
    ],
    legend: {
      k: lever('K1', true),
      t: torch('T', 'K1'),
      m: lever('K2', true),
      a: lamp('L1', 'K1'),
      b: lamp('L2', 'T'),
      c: lamp('L3', 'T'),
      d: lamp('L4', 'K2'),
      e: lamp('L5', 'K2'),
    },
    program: code(`
      total ← 0
      REPITA 5 VEZES
        andar(direita)
        SE acesa(cima) ENTÃO
          total ← total + 1
        FIM
      FIM
      REPITA total VEZES
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true, vars: { total: 3 } },
    hint: 'acesa(cima) testa a lâmpada logo acima de você. O segundo laço repete "total" vezes.',
    explanation:
      'Passando sob as cinco lâmpadas, três estavam acesas (L1, L4 e L5): total = 3. O último REPITA usa a variável como quantidade de voltas, descendo exatamente 3 casas.',
  },
  {
    id: 24,
    world: 5,
    title: 'Estados Salvos',
    concept: 'Variável booleana',
    brief: 'Uma variável VERDADEIRO/FALSO lembra o que aconteceu antes.',
    map: [
      '##########',
      '#,,Ag,C,,#',
      '#S..D...X#',
      '#,,,,,.,,#',
      '#,,,,,...#',
      '##########',
    ],
    legend: { A: lever('A'), C: lever('C'), g: xor('G', 'A', 'C'), D: door('D', 'G') },
    program: code(`
      abriu ← FALSO
      REPITA 2 VEZES
        andar(direita)
      FIM
      SE NÃO aberta(D) ENTÃO
        acionar(A)
        abriu ← VERDADEIRO
      FIM
      REPITA 3 VEZES
        andar(direita)
      FIM
      SE abriu ENTÃO
        acionar(C)
      FIM
      SE abriu E NÃO aberta(D) ENTÃO
        REPITA 2 VEZES
          andar(direita)
        FIM
      SENÃO
        andar(baixo)
        andar(baixo)
        andar(direita)
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, unpowered: ['D'], vars: { abriu: true } },
    hint: 'A porta é controlada por um XOR de A e C. A variável abriu registra se VOCÊ precisou abrir a porta.',
    explanation:
      'A porta começou fechada, então A foi acionada e abriu ← VERDADEIRO. Depois de atravessar, o programa acionou C para fechar a porta (XOR de duas entradas ligadas = FALSO). A porta parece intocada, mas a variável lembra: abriu E NÃO aberta(D) é VERDADEIRO.',
  },
  {
    id: 25,
    world: 5,
    title: 'Memória e Decisão',
    concept: 'Duas variáveis + comparação',
    brief: 'Compare duas variáveis para escolher entre três caminhos.',
    map: [
      '##########',
      '#,tku.,,,#',
      '#,abc.,,,#',
      '#S......X#',
      '#,,,,.,,,#',
      '#,,,,.,,,#',
      '##########',
    ],
    legend: {
      t: torch('T1'),
      k: lever('K', false),
      u: torch('T2'),
      a: lamp('L1', 'T1'),
      b: lamp('L2', 'K'),
      c: lamp('L3', 'T2'),
    },
    program: code(`
      passos ← 0
      chaves ← 0
      REPITA 3 VEZES
        andar(direita)
        passos ← passos + 1
        SE acesa(cima) ENTÃO
          chaves ← chaves + 2
        SENÃO
          chaves ← chaves - 1
        FIM
      FIM
      andar(direita)
      SE chaves > passos ENTÃO
        REPITA chaves - passos VEZES
          andar(cima)
        FIM
      SENÃO SE chaves = passos ENTÃO
        REPITA chaves VEZES
          andar(direita)
        FIM
      SENÃO
        REPITA passos - chaves VEZES
          andar(baixo)
        FIM
      FIM
    `),
    goal: { reachExit: true, vars: { passos: 3, chaves: 3 } },
    hint: 'Lâmpada acesa: +2. Apagada: −1. Compare chaves com passos só no final.',
    explanation:
      'Lâmpadas: acesa, apagada, acesa → chaves = 2 − 1 + 2 = 3 e passos = 3. chaves > passos é FALSO, mas chaves = passos é VERDADEIRO: o robô anda 3 casas para a direita, até a saída.',
  },
];
