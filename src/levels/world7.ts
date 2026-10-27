import { LevelDef } from '../engine/types';
import { and, button, clock, code, door, lamp, lever, piston, repeater, torch } from './helpers';

// MUNDO 7 — CIRCUITOS DINÂMICOS (estação de mecanismos avançados)
// Regra de tempo: cada ação física (andar, acionar, esperar) avança 1 tick.
export const world7: LevelDef[] = [
  {
    id: 31,
    world: 7,
    title: 'O Repetidor',
    concept: 'Atraso em ticks',
    brief: 'O repetidor entrega o sinal 3 ticks depois. Espere a porta abrir.',
    map: [
      '##########',
      '#AL,R,,,,#',
      '#S...D.X,#',
      '##########',
    ],
    legend: { A: lever('A'), L: lamp('L', 'A'), R: repeater('R', 'A', 3), D: door('D', 'R') },
    program: code(`
      acionar(A)
      espera ← 0
      ENQUANTO NÃO aberta(D) FAÇA
        esperar()
        espera ← espera + 1
      FIM
      REPITA espera + 3 VEZES
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, vars: { espera: 3 } },
    hint: 'A lâmpada L acende na hora, mas a porta só recebe o sinal 3 ticks depois do acionamento. Use Espaço (ou o botão Esperar) para esperar().',
    explanation:
      'A foi ligada no tick 1. O repetidor de atraso 3 só entregou o sinal no tick 4. Foram 3 esperas (ticks 2, 3 e 4), então espera = 3 e o REPITA final deu 3 + 3 = 6 passos.',
  },
  {
    id: 32,
    world: 7,
    title: 'O Botão Temporário',
    concept: 'Sinal com duração limitada',
    brief: 'O botão fica ativo por 4 ticks. Depois disso a porta fecha.',
    map: [
      '########',
      '#,B,,,,#',
      '#,S...,#',
      '#,,,,D,#',
      '#,,,,.,#',
      '#,,,,X,#',
      '########',
    ],
    legend: { B: button('B', 4), D: door('D', 'B') },
    program: code(`
      acionar(B)
      REPITA 3 VEZES
        andar(direita)
      FIM
      esperar()
      SE NÃO aberta(D) ENTÃO
        REPITA 3 VEZES
          andar(esquerda)
        FIM
        acionar(B)
        REPITA 3 VEZES
          andar(direita)
        FIM
      FIM
      REPITA 3 VEZES
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'Botão apertado no tick p fica ativo nos ticks p, p+1, p+2 e p+3. Conte as ações depois do aperto.',
    explanation:
      'Apertado no tick 1, o botão ficou ativo até o tick 4. A espera levou ao tick 5: sinal desligado, porta fechada, então o SE mandou voltar e apertar de novo (tick 9). Na volta, o passo para dentro da porta acontece com o estado do tick 12, ainda ativo.',
  },
  {
    id: 33,
    world: 7,
    title: 'Pulsos de Redstone',
    concept: 'Relógio de redstone',
    brief: 'Os relógios ligam e desligam em ciclos fixos. Conte os pulsos.',
    map: [
      '#########',
      '#,c,l,,,#',
      '#,S.,,,,#',
      '#,.,,,,,#',
      '#,.,,,,,#',
      '#,.DX,,,#',
      '#,.k,,m,#',
      '#########',
    ],
    legend: {
      c: clock('C', 4, 2, 0),
      l: lamp('L1', 'C'),
      k: clock('C2', 5, 1, 0),
      m: lamp('L2', 'C2'),
      D: door('D', 'C2'),
    },
    program: code(`
      pulsos ← 0
      REPITA 5 VEZES
        esperar()
        SE ativo(C) ENTÃO
          pulsos ← pulsos + 1
        FIM
      FIM
      REPITA pulsos VEZES
        andar(baixo)
      FIM
      ENQUANTO NÃO aberta(D) FAÇA
        esperar()
      FIM
      REPITA 2 VEZES
        andar(direita)
      FIM
    `),
    goal: { reachExit: true, vars: { pulsos: 3 } },
    hint: 'Relógio C: ciclo de 4 ticks, ligado nos 2 primeiros (ticks 0, 1, 4, 5, 8…). Relógio C2: ciclo de 5, ligado só no primeiro (0, 5, 10…).',
    explanation:
      'Nos ticks 1 a 5, C estava ativo em 1, 4 e 5: pulsos = 3. Três passos para baixo levaram ao tick 8. C2 só liga em múltiplos de 5, então foram 2 esperas (ticks 9 e 10) até a porta abrir.',
  },
  {
    id: 34,
    world: 7,
    title: 'O Pistão Escondido',
    concept: 'Caminhos que mudam',
    brief: 'Uma única alavanca move dois pistões: um abre caminho, o outro fecha (com atraso).',
    map: [
      '###########',
      '#,,,,p,,,,#',
      '#a,R,.,,,,#',
      '#S........#',
      '#,q..,,,,,#',
      '#,t,.....X#',
      '###########',
    ],
    legend: {
      a: lever('A'),
      R: repeater('R', 'A', 2),
      p: piston('P1', 'baixo', 'R'),
      t: torch('T', 'A'),
      q: piston('P2', 'direita', 'T'),
    },
    program: code(`
      acionar(A)
      ENQUANTO livre(direita) FAÇA
        andar(direita)
      FIM
      ENQUANTO livre(baixo) FAÇA
        andar(baixo)
      FIM
      ENQUANTO livre(direita) FAÇA
        andar(direita)
      FIM
    `),
    goal: { reachExit: true },
    hint: 'P2 é alimentado pela tocha (recolhe na hora). P1 recebe o sinal pelo repetidor de atraso 2: ele estende no tick 3, enquanto você ainda está andando.',
    explanation:
      'Ao ligar A (tick 1), a tocha apaga e P2 recolhe, liberando a descida. Dois ticks depois o repetidor estende P1, que empurra o bloco para o corredor. O primeiro ENQUANTO para em frente ao bloco, e o caminho segue pela passagem que P2 abriu.',
  },
  {
    id: 35,
    world: 7,
    title: 'Máquina de Estados',
    concept: 'Estados e transições',
    brief: 'A variável estado escolhe qual alavanca mudar a cada volta.',
    map: [
      '#########',
      '#,,,B,L,#',
      '#,,ASCt,#',
      '#,,gD,,,#',
      '#,,,.,,,#',
      '#,,,.,,,#',
      '#,,,X,,,#',
      '#,,,.,,,#',
      '#########',
    ],
    legend: {
      A: lever('A', true),
      B: lever('B', false),
      C: lever('C', true),
      t: torch('T', 'C'),
      L: lamp('L', 'T'),
      g: and('G', 'A', 'B', 'C'),
      D: door('D', 'G'),
    },
    program: code(`
      estado ← 0
      voltas ← 0
      ENQUANTO NÃO aberta(D) FAÇA
        SE estado = 0 ENTÃO
          acionar(A)
          estado ← 1
        SENÃO SE estado = 1 ENTÃO
          SE acesa(L) ENTÃO
            acionar(B)
          FIM
          estado ← 2
        SENÃO
          acionar(C)
          estado ← 0
        FIM
        voltas ← voltas + 1
      FIM
      REPITA voltas - 2 VEZES
        andar(baixo)
      FIM
    `),
    goal: { reachExit: true, vars: { voltas: 6 } },
    hint: 'A está à esquerda, B acima e C à direita: vire-se antes de cada E. L é a tocha de C: acesa quando C está desligada. A porta abre com A, B e C ligadas.',
    explanation:
      'Estados (A,B,C): 101 → 001 (A) → 001 (L apagada, nada) → 000 (C) → 100 (A) → 110 (L acesa, B) → 111 (C). Seis voltas até a porta AND abrir, então o robô desce 6 − 2 = 4 casas.',
  },
];
