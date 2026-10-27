import { Pattern } from './theme';

// Texturas 16×16 geradas proceduralmente (originais), com sementes fixas para ficarem estáveis.

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export const hash2 = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 997;

const cache = new Map<string, HTMLCanvasElement>();

export function texture(key: string, palette: string[], pattern: Pattern, variant: number, ore?: string): HTMLCanvasElement {
  const k = `${key}|${pattern}|${variant}|${palette.join()}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  const r = rng(variant * 7919 + palette.length * 31 + key.length * 17 + 1);
  const pick = () => palette[Math.floor(r() * Math.min(3, palette.length))];
  const darkest = palette[palette.length - 1];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      let col = pick();
      if (pattern === 'tiles' && (x === 0 || y === 0)) col = darkest;
      if (pattern === 'tiles' && (x === 15 || y === 15)) col = palette[1];
      if (pattern === 'bricks') {
        const row = Math.floor(y / 4);
        const off = row % 2 ? 4 : 0;
        if (y % 4 === 3 || (x + off) % 8 === 7) col = darkest;
      }
      if (pattern === 'planks') {
        if (y % 4 === 3) col = darkest;
        if ((x + Math.floor(y / 4) * 5) % 16 === 0 && y % 4 !== 3) col = darkest;
      }
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  if ((pattern === 'ore' || pattern === 'veins') && ore) {
    const n = pattern === 'ore' ? (variant % 3 === 0 ? 2 : 0) : 3;
    for (let i = 0; i < n; i++) {
      const cx = 2 + Math.floor(r() * 11);
      const cy = 2 + Math.floor(r() * 11);
      g.fillStyle = ore;
      for (let j = 0; j < 4; j++) g.fillRect(cx + Math.floor(r() * 3) - 1, cy + Math.floor(r() * 3) - 1, 1, 1);
    }
  }
  cache.set(k, c);
  return c;
}
