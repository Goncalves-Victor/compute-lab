import { LevelDef } from '../engine/types';
import { world1 } from './world1';
import { world2 } from './world2';
import { world3 } from './world3';
import { world4 } from './world4';
import { world5 } from './world5';
import { world6 } from './world6';
import { world7 } from './world7';
import { world8 } from './world8';

export const LEVELS: LevelDef[] = [...world1, ...world2, ...world3, ...world4, ...world5, ...world6, ...world7, ...world8];

export interface WorldInfo {
  id: number;
  name: string;
  theme: string;
  levels: number[];
}

export const WORLDS: WorldInfo[] = [
  { id: 1, name: 'Primeiros Comandos', theme: 'Laboratório inicial de redstone', levels: [1, 2, 3, 4, 5] },
  { id: 2, name: 'Repetidores', theme: 'Corredores de túneis subterrâneos', levels: [6, 7, 8, 9, 10] },
  { id: 3, name: 'Decisões', theme: 'Caverna de sensores', levels: [11, 12, 13, 14, 15] },
  { id: 4, name: 'Engenharia Redstone', theme: 'Fábrica de circuitos', levels: [16, 17, 18, 19, 20] },
  { id: 5, name: 'Memória do Robô', theme: 'Centro de processamento', levels: [21, 22, 23, 24, 25] },
  { id: 6, name: 'Loops Avançados', theme: 'Sistema de automação', levels: [26, 27, 28, 29, 30] },
  { id: 7, name: 'Circuitos Dinâmicos', theme: 'Estação de mecanismos avançados', levels: [31, 32, 33, 34, 35] },
  { id: 8, name: 'O Núcleo da Redstone', theme: 'Laboratório subterrâneo final', levels: [36, 37, 38, 39, 40] },
];

export const levelById = (id: number) => LEVELS.find((l) => l.id === id)!;
