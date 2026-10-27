// Identidade visual de cada mundo: paletas das texturas pixeladas e cores da interface.

export type Pattern = 'noise' | 'tiles' | 'bricks' | 'planks' | 'ore' | 'veins';

export interface Theme {
  id: number;
  floor: string[];
  floorPattern: Pattern;
  wall: string[];
  wallPattern: Pattern;
  pit: string[];
  /** cor de destaque da interface */
  accent: string;
  /** fundo da página */
  bg: string;
  /** escuridão do cenário (0 = nenhuma). Lâmpadas e o jogador iluminam. */
  darkness: number;
  /** veios de redstone pulsando nas paredes */
  veins: boolean;
  /** cor dos minérios/veios */
  ore?: string;
}

export const THEMES: Record<number, Theme> = {
  1: {
    id: 1,
    floor: ['#a9a9a9', '#b4b4b4', '#9c9c9c', '#bdbdbd'],
    floorPattern: 'tiles',
    wall: ['#7b7b7b', '#868686', '#6d6d6d', '#555555'],
    wallPattern: 'bricks',
    pit: ['#2a2526', '#322c2d', '#241f20'],
    accent: '#e8262b',
    bg: '#17151a',
    darkness: 0,
    veins: false,
  },
  2: {
    id: 2,
    floor: ['#6b4f36', '#7a5b3f', '#5e452f', '#856445'],
    floorPattern: 'noise',
    wall: ['#4a4a50', '#55555c', '#3d3d42', '#2e2e33'],
    wallPattern: 'ore',
    pit: ['#1f1915', '#271f1a', '#1a1512'],
    accent: '#f29b38',
    bg: '#15110e',
    darkness: 0,
    veins: false,
    ore: '#d7894a',
  },
  3: {
    id: 3,
    floor: ['#3e4652', '#46505d', '#373e48', '#4f5967'],
    floorPattern: 'noise',
    wall: ['#2a2f37', '#323842', '#22272e', '#1b1f25'],
    wallPattern: 'ore',
    pit: ['#11141a', '#161a21', '#0e1015'],
    accent: '#5fd3c4',
    bg: '#0c0e12',
    darkness: 0.62,
    veins: false,
    ore: '#3fb8a8',
  },
  4: {
    id: 4,
    floor: ['#d9d4cb', '#e4e0d8', '#cbc5ba', '#efebe4'],
    floorPattern: 'tiles',
    wall: ['#a7acb1', '#b8bdc2', '#959a9f', '#80858a'],
    wallPattern: 'tiles',
    pit: ['#2b2a26', '#35332d', '#242320'],
    accent: '#f5c518',
    bg: '#16171a',
    darkness: 0,
    veins: false,
  },
  5: {
    id: 5,
    floor: ['#5fa69b', '#6bb3a7', '#539489', '#78c0b3'],
    floorPattern: 'tiles',
    wall: ['#2f5f63', '#376c70', '#285457', '#1f4446'],
    wallPattern: 'bricks',
    pit: ['#0f2426', '#132c2f', '#0b1d1f'],
    accent: '#53e0f0',
    bg: '#0b1719',
    darkness: 0,
    veins: false,
  },
  6: {
    id: 6,
    floor: ['#c06d43', '#cc7a4e', '#b05f39', '#d88a5c'],
    floorPattern: 'planks',
    wall: ['#4f8e78', '#5a9c85', '#43806b', '#3a705d'],
    wallPattern: 'tiles',
    pit: ['#2a1a12', '#331f16', '#22150f'],
    accent: '#ff8c42',
    bg: '#17110d',
    darkness: 0,
    veins: false,
  },
  7: {
    id: 7,
    floor: ['#a77aa7', '#b386b3', '#996c99', '#bf93bf'],
    floorPattern: 'tiles',
    wall: ['#2a1f3a', '#33264a', '#221a30', '#1a1426'],
    wallPattern: 'noise',
    pit: ['#140f1c', '#1a1424', '#100c16'],
    accent: '#d66bff',
    bg: '#120d18',
    darkness: 0,
    veins: false,
  },
  8: {
    id: 8,
    floor: ['#3a3438', '#433c41', '#332e32', '#4b4449'],
    floorPattern: 'bricks',
    wall: ['#231e22', '#2b252a', '#1c181b', '#151214'],
    wallPattern: 'veins',
    pit: ['#140708', '#1b0a0b', '#0f0506'],
    accent: '#ff3b3b',
    bg: '#0e090b',
    darkness: 0.25,
    veins: true,
    ore: '#ff2a2a',
  },
};
