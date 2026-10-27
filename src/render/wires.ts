import { StaticWorld, deviceAt } from '../engine/world';

// Traça a "poeira de redstone" entre cada dispositivo e suas entradas.
// Puramente visual: o sinal real vem do motor. Prefere passar pelos fossos de circuito.

export interface Wire {
  source: string;
  cells: [number, number][];
}

export function routeWires(sw: StaticWorld): Wire[] {
  const used = new Map<string, number>();
  const wires: Wire[] = [];
  for (const dev of sw.devices) {
    for (const src of dev.def.inputs ?? []) {
      const from = sw.byId[src];
      const path = dijkstra(sw, [from.x, from.y], [dev.x, dev.y], used);
      if (!path) continue;
      for (const [x, y] of path.slice(1, -1)) used.set(`${x},${y}`, (used.get(`${x},${y}`) ?? 0) + 1);
      wires.push({ source: src, cells: path });
    }
  }
  return wires;
}

function dijkstra(sw: StaticWorld, a: [number, number], b: [number, number], used: Map<string, number>) {
  const W = sw.w;
  const H = sw.h;
  const dist = new Array(W * H).fill(Infinity);
  const prev = new Array(W * H).fill(-1);
  const idx = (x: number, y: number) => y * W + x;
  dist[idx(a[0], a[1])] = 0;
  const open: number[] = [idx(a[0], a[1])];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    const cx = cur % W;
    const cy = Math.floor(cur / W);
    if (cx === b[0] && cy === b[1]) break;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const isEnd = nx === b[0] && ny === b[1];
      const cell = sw.cells[ny][nx];
      if (!isEnd) {
        if (cell === 'wall' || cell === 'void') continue;
        if (deviceAt(sw, nx, ny)) continue;
      }
      let cost = cell === 'pit' ? 1 : 5;
      cost += (used.get(`${nx},${ny}`) ?? 0) * 6;
      const ni = idx(nx, ny);
      if (dist[cur] + cost < dist[ni]) {
        if (dist[ni] === Infinity) open.push(ni);
        dist[ni] = dist[cur] + cost;
        prev[ni] = cur;
      }
    }
  }
  const end = idx(b[0], b[1]);
  if (dist[end] === Infinity) return null;
  const path: [number, number][] = [];
  for (let c = end; c !== -1; c = prev[c]) path.unshift([c % W, Math.floor(c / W)]);
  return path;
}
