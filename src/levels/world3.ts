import { LevelDef } from '../engine/types';
import { code, door, lamp, lever, plate, torch } from './helpers';

// MUNDO 3 — DECISÕES (caverna de sensores)
export const world3: LevelDef[] = [
  {
    id: 11,
    world: 3,
    title: 'Luz ou Escuridão',
    concept: 'SE / SENÃO',
    brief: 'Avalie a condição e execute apenas um dos dois caminhos.',
    map: [
      '#########',
      '#K,.....#',
      '#,L.###.#',
      '#S..###X#',
      '#,,.###.#',
      '#,,.....#',
      '#########',
    ],
    legend: { K: lever('K', false), L: lamp('L', 'K') },
    program: code(`
      andar(direita)
      andar(direita)
      SE acesa(L) ENTÃO
        REPITA 2 VEZES
          andar(cima)
        FIM
        REPITA 4 VEZES
          andar(direita)
        FIM
        REPITA 2 VEZES
          andar(baixo)
        FIM
      SENÃO
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
    hint: 'Olhe a lâmpada L: ela está acesa? Se sim, execute o bloco do SE; se não, o bloco do SENÃO.',
    explanation:
      'A alavanca K (fora de alcance) está desligada, então L está apagada. A condição acesa(L) é FALSA e o computador pula o bloco do SE inteiro, executando só o SENÃO: o caminho de baixo.',
  },
  {
    id: 12,
    world: 3,
    title: 'A Tocha Invertida',
    concept: 'Inversão de sinal',
    brief: 'A tocha de redstone fica acesa quando NÃO recebe sinal.',
    map: [
      '#########',
      '#,A,T,L,#',
      '#.S.....#',
      '#.##,##.#',
      '#.##,##.#',
      '#...X...#',
      '#########',
    ],
    legend: { A: lever('A'), T: torch('T', 'A'), L: lamp('L', 'T') },
    program: code(`
      acionar(A)
      SE acesa(L) ENTÃO
        REPITA 5 VEZES
          andar(direita)
        FIM
        REPITA 3 VEZES
          andar(baixo)
        FIM
        REPITA 3 VEZES
          andar(esquerda)
        FIM
      SENÃO
        andar(esquerda)
        REPITA 3 VEZES
          andar(baixo)
        FIM
        REPITA 3 VEZES
          andar(direita)
        FIM
      FIM
    `),
    goal: { reachExit: true, unpowered: ['L'] },
    hint: 'Antes de começar, L está acesa porque A está desligada. O que acontece com a tocha quando A liga?',
    explanation:
      'Alavanca A ligada → a tocha T recebe sinal e APAGA → a lâmpada L, alimentada pela tocha, também apaga. Por isso acesa(L) foi FALSO depois do acionamento e o caminho foi o do SENÃO.',
  },
  {
    id: 13,
    world: 3,
    title: 'Porta Trancada',
    concept: 'Condição sobre uma porta',
    brief: 'Verifique se a porta está aberta antes de escolher o que fazer.',
    map: [
      '##########',
      '#,,A,T,,,#',
      '#,,.,,,,,#',
      '#S....D.X#',
      '##########',
    ],
    legend: { A: lever('A', true), T: torch('T', 'A'), D: door('D', 'T') },
    program: code(`
      andar(direita)
      andar(direita)
      SE aberta(D) ENTÃO
        REPITA 5 VEZES
          andar(direita)
        FIM
      SENÃO
        andar(cima)
        acionar(A)
        andar(baixo)
        REPITA 5 VEZES
          andar(direita)
        FIM
      FIM
    `),
    goal: { reachExit: true },
    hint: 'A porta D é alimentada pela tocha T, e a tocha depende da alavanca A, que começa LIGADA.',
    explanation:
      'A está ligada → T apagada → D sem sinal → fechada. aberta(D) é FALSO, então o programa entra no SENÃO: sobe, desliga A (a tocha acende e a porta abre) e segue em frente.',
  },
  {
    id: 14,
    world: 3,
    title: 'Sensor de Pressão',
    concept: 'Sinal que depende da posição',
    brief: 'A placa de pressão só envia sinal enquanto você está sobre ela.',
    map: [
      '#########',
      '#,,,....#',
      '#,L..,,,#',
      '#S.P.,,,#',
      '#,,,.,,,#',
      '#,,,...X#',
      '#########',
    ],
    legend: { P: plate('P'), L: lamp('L', 'P') },
    program: code(`
      andar(direita)
      andar(direita)
      SE acesa(L) ENTÃO
        andar(direita)
      SENÃO
        andar(cima)
      FIM
      SE acesa(L) ENTÃO
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
    goal: { reachExit: true },
    hint: 'A mesma condição acesa(L) aparece duas vezes. Onde você está em cada uma delas?',
    explanation:
      'No primeiro SE você está sobre a placa P, então L está acesa (VERDADEIRO) e você anda para a direita, saindo da placa. No segundo SE a placa já não está pressionada: L apagou, a condição é FALSA e o caminho é o de baixo.',
  },
  {
    id: 15,
    world: 3,
    title: 'Decisões em Sequência',
    concept: 'Uma decisão afeta a próxima',
    brief: 'Cada acionamento muda o estado usado pela condição seguinte.',
    map: [
      '###########',
      '#,,ALB,,,,#',
      '#S.....D.X#',
      '#,,,,.,,,.#',
      '#,,,,.....#',
      '###########',
    ],
    legend: { A: lever('A', false), L: lamp('L', 'A'), B: lever('B', true), D: door('D', 'B') },
    program: code(`
      andar(direita)
      andar(direita)
      SE ligada(A) ENTÃO
        andar(direita)
      SENÃO
        acionar(A)
        andar(direita)
      FIM
      andar(direita)
      SE acesa(L) ENTÃO
        acionar(B)
      FIM
      SE aberta(D) ENTÃO
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
        REPITA 2 VEZES
          andar(cima)
        FIM
      FIM
    `),
    goal: { reachExit: true },
    hint: 'A porta D começa aberta... mas será que continua aberta quando o último SE for avaliado?',
    explanation:
      'A começa desligada, então o primeiro SE vai para o SENÃO e liga A. Isso acende L, tornando o segundo SE verdadeiro: B é desligada e a porta D fecha. No último SE, aberta(D) é FALSO e o caminho é o desvio por baixo.',
  },
];
