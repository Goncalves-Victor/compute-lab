import { Ctx, ExecState } from '../engine/interpreter';
import { DIR_DELTA } from '../engine/types';
import { PlacedDevice, pistonCells } from '../engine/world';
import { hash2, texture } from './textures';
import { Theme } from './theme';
import { Wire, routeWires } from './wires';

// Renderização em canvas, visão superior com blocos em 2,5D. Lê o estado do motor e nunca o altera.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
}

const GATE_SYMBOL: Record<string, string> = { and: '&', or: '≥1', xor: '=1' };

export class WorldRenderer {
  readonly wires: Wire[];
  private px: number;
  private py: number;
  private levers: Record<string, number> = {};
  private pist: Record<string, number> = {};
  private particles: Particle[] = [];
  private lastT = 0;
  private shakeUntil = 0;
  private finaleAt = 0;
  private flashAt = 0;
  private labels: Set<string>;
  private dark?: HTMLCanvasElement;

  constructor(
    private game: Ctx,
    private theme: Theme,
  ) {
    this.wires = routeWires(game.sw);
    this.px = game.sw.start.x;
    this.py = game.sw.start.y;
    const words = new Set(game.level.program.match(/[\p{L}\p{N}_]+/gu) ?? []);
    this.labels = new Set(game.sw.devices.filter((d) => words.has(d.def.id) || d.def.type === 'lever' || d.def.type === 'button').map((d) => d.def.id));
  }

  /** tamanho do bloco (px CSS) para caber no espaço disponível */
  static layout(game: Ctx, maxW: number, maxH: number) {
    const T = Math.max(16, Math.floor(Math.min(maxW / game.sw.w, maxH / (game.sw.h + 0.35), 64)));
    const D = Math.round(T * 0.3);
    return { T, D, width: T * game.sw.w, height: T * game.sw.h + D };
  }

  snap(st: ExecState) {
    this.px = st.world.player.x;
    this.py = st.world.player.y;
    this.particles = [];
    this.finaleAt = 0;
    for (const id in st.world.levers) this.levers[id] = st.world.levers[id] ? 1 : 0;
    for (const id in st.world.pistons) this.pist[id] = st.world.pistons[id] ? 1 : 0;
  }

  shake() {
    this.shakeUntil = performance.now() + 320;
  }
  finale() {
    this.finaleAt = performance.now();
  }
  flash() {
    this.flashAt = performance.now();
  }

  burst(cx: number, cy: number, color: string, n: number, speed = 2.2, grav = 3) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      const life = 0.4 + Math.random() * 0.6;
      this.particles.push({ x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life, max: life, color, size: 0.06 + Math.random() * 0.07, grav });
    }
  }

  draw(c: CanvasRenderingContext2D, st: ExecState, T: number, D: number, now: number) {
    const dt = Math.min(0.05, (now - (this.lastT || now)) / 1000);
    this.lastT = now;
    const { sw } = this.game;
    const w = st.world;
    const th = this.theme;
    const p = T / 16;

    // ---- animação ----
    const k = Math.min(1, dt * 16);
    this.px += (w.player.x - this.px) * k;
    this.py += (w.player.y - this.py) * k;
    if (Math.abs(w.player.x - this.px) + Math.abs(w.player.y - this.py) > 3) this.snap(st);
    for (const id in w.levers) this.levers[id] = (this.levers[id] ?? 0) + ((w.levers[id] ? 1 : 0) - (this.levers[id] ?? 0)) * k;
    for (const id in w.pistons) this.pist[id] = (this.pist[id] ?? 0) + ((w.pistons[id] ? 1 : 0) - (this.pist[id] ?? 0)) * Math.min(1, dt * 12);

    c.save();
    c.imageSmoothingEnabled = false;
    c.fillStyle = th.bg;
    c.fillRect(0, 0, T * sw.w, T * sw.h + D);
    if (now < this.shakeUntil) c.translate((Math.random() - 0.5) * p * 4, (Math.random() - 0.5) * p * 3);

    const X = (x: number) => x * T;
    const Y = (y: number) => y * T + D;
    const fr = (cx: number, cy: number, x: number, y: number, ww: number, hh: number, col: string) => {
      c.fillStyle = col;
      c.fillRect(X(cx) + x * p, Y(cy) + y * p, ww * p, hh * p);
    };
    const tex = (key: string, pal: string[], pat: Theme['floorPattern'], x: number, y: number) =>
      texture(key, pal, pat, hash2(x, y) % 4, th.ore);

    // ---- chão e fossos ----
    for (let y = 0; y < sw.h; y++)
      for (let x = 0; x < sw.w; x++) {
        const cell = sw.cells[y][x];
        if (cell === 'void' || cell === 'wall') continue;
        let pit = cell === 'pit';
        const dev = this.deviceAt(x, y);
        if (dev && !['plate', 'door'].includes(dev.def.type)) pit = this.pitNeighbors(x, y) >= 2;
        if (pit) {
          c.drawImage(tex('pit', th.pit, 'noise', x, y), X(x), Y(y), T, T);
          if (y > 0 && sw.cells[y - 1][x] !== 'pit') {
            c.fillStyle = 'rgba(0,0,0,0.45)';
            c.fillRect(X(x), Y(y), T, p * 3);
          }
        } else c.drawImage(tex('floor', th.floor, th.floorPattern, x, y), X(x), Y(y), T, T);
      }

    // ---- saída ----
    if (sw.exit) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      c.strokeStyle = `rgba(93,255,138,${0.5 + pulse * 0.5})`;
      c.lineWidth = p * 2;
      c.strokeRect(X(sw.exit.x) + p * 2, Y(sw.exit.y) + p * 2, T - p * 4, T - p * 4);
      c.fillStyle = `rgba(93,255,138,${0.12 + pulse * 0.12})`;
      c.fillRect(X(sw.exit.x) + p * 3, Y(sw.exit.y) + p * 3, T - p * 6, T - p * 6);
    }

    // ---- fios de redstone ----
    for (const wire of this.wires) {
      const on = w.signals[wire.source];
      c.strokeStyle = on ? '#ff2a1a' : '#5c1010';
      c.lineWidth = p * 2;
      c.lineCap = 'square';
      c.beginPath();
      wire.cells.forEach(([x, y], i) => {
        const cx = X(x) + T / 2;
        const cy = Y(y) + T / 2;
        if (i === 0) c.moveTo(cx, cy);
        else c.lineTo(cx, cy);
      });
      c.stroke();
      if (on && Math.random() < dt * wire.cells.length * 0.6) {
        const [x, y] = wire.cells[Math.floor(Math.random() * wire.cells.length)];
        this.particles.push({ x: x + 0.3 + Math.random() * 0.4, y: y + 0.4, vx: 0, vy: -0.4, life: 0.5, max: 0.5, color: '#ff4a2a', size: 0.05, grav: 0 });
      }
    }

    // ---- blocos, dispositivos e jogador, linha por linha ----
    const pistonBlocks = sw.devices
      .filter((d) => d.def.type === 'piston')
      .map((d) => {
        const { head, far } = pistonCells(sw, d.def.id);
        const e = this.pist[d.def.id] ?? 0;
        return { d, head, far, e, bx: head.x + (far.x - head.x) * e, by: head.y + (far.y - head.y) * e };
      });
    const playerRow = Math.round(this.py);
    for (let y = 0; y < sw.h; y++) {
      for (let x = 0; x < sw.w; x++) {
        if (sw.cells[y][x] === 'wall') this.drawWall(c, x, y, T, D, now);
        const dev = this.deviceAt(x, y);
        if (dev) this.drawDevice(c, dev, st, T, D, now, fr);
      }
      for (const pb of pistonBlocks) {
        if (Math.round(pb.by) !== y) continue;
        // braço do pistão
        if (pb.e > 0.02) {
          const [dx, dy] = DIR_DELTA[pb.d.def.dir ?? 'direita'];
          c.fillStyle = '#8a6a3c';
          const ax = X(pb.d.x) + T / 2 - p;
          const ay = Y(pb.d.y) + T / 2 - p;
          c.fillRect(Math.min(ax, ax + dx * T * pb.e), Math.min(ay, ay + dy * T * pb.e), Math.abs(dx * T * pb.e) + p * 2, Math.abs(dy * T * pb.e) + p * 2);
        }
        this.block(c, pb.bx, pb.by, T, D, '#c9b37a', '#a08a55', true);
      }
      if (y === playerRow) this.drawPlayer(c, st, T, D, now);
    }

    // ---- iluminação ----
    if (th.darkness > 0) this.drawDarkness(c, st, T, D);

    // ---- partículas ----
    this.particles = this.particles.filter((pt) => (pt.life -= dt) > 0);
    for (const pt of this.particles) {
      pt.vy += pt.grav * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      c.globalAlpha = Math.max(0, pt.life / pt.max);
      c.fillStyle = pt.color;
      const s = pt.size * T;
      c.fillRect(pt.x * T - s / 2, pt.y * T + D - s / 2, s, s);
    }
    c.globalAlpha = 1;

    // ---- rótulos ----
    const fs = Math.max(9, Math.round(T * 0.24));
    c.font = `700 ${fs}px 'Pixelify Sans', sans-serif`;
    c.textBaseline = 'top';
    for (const d of sw.devices) {
      if (!this.labels.has(d.def.id)) continue;
      const text = d.def.label ?? d.def.id;
      const tw = c.measureText(text).width + 6;
      const lx = X(d.x) + 1;
      const ly = Y(d.y) - D + 1;
      c.fillStyle = 'rgba(10,8,12,0.82)';
      c.fillRect(lx, ly, tw, fs + 4);
      c.fillStyle = '#fff6d8';
      c.fillText(text, lx + 3, ly + 2);
    }

    // ---- finais ----
    if (this.flashAt && now - this.flashAt < 500) {
      c.fillStyle = `rgba(255,255,255,${0.35 * (1 - (now - this.flashAt) / 500)})`;
      c.fillRect(0, 0, T * sw.w, T * sw.h + D);
    }
    if (this.finaleAt) this.drawFinale(c, T, D, now);
    c.restore();
  }

  private deviceAt(x: number, y: number) {
    return this.game.sw.devices.find((d) => d.x === x && d.y === y);
  }
  private pitNeighbors(x: number, y: number) {
    const sw = this.game.sw;
    let n = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const r = sw.cells[y + dy]?.[x + dx];
      if (r === 'pit' || r === 'wall') n++;
    }
    return n;
  }

  /** bloco em 2,5D: topo deslocado para cima e face frontal escurecida */
  private block(c: CanvasRenderingContext2D, x: number, y: number, T: number, D: number, top: string | HTMLCanvasElement, front: string, border = false) {
    const X = x * T;
    const Y = y * T + D;
    if (typeof top === 'string') {
      c.fillStyle = top;
      c.fillRect(X, Y - D, T, T);
    } else c.drawImage(top, X, Y - D, T, T);
    c.fillStyle = front;
    c.fillRect(X, Y + T - D, T, D);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(X, Y + T - D, T, D);
    if (border) {
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = Math.max(1, T / 16);
      c.strokeRect(X + 0.5, Y - D + 0.5, T - 1, T - 1);
    }
  }

  private drawWall(c: CanvasRenderingContext2D, x: number, y: number, T: number, D: number, now: number) {
    const th = this.theme;
    const t = texture('wall', th.wall, th.wallPattern, hash2(x, y) % 4, th.ore);
    this.block(c, x, y, T, D, t, th.wall[2]);
    if (th.veins && hash2(x, y) % 3 === 0) {
      const a = 0.25 + 0.25 * Math.sin(now / 420 + hash2(x, y));
      c.fillStyle = `rgba(255,40,40,${a})`;
      const p = T / 16;
      c.fillRect(x * T + p * 3, y * T + p * 4, p * 10, p);
      c.fillRect(x * T + p * 8, y * T + p * 4, p, p * 6);
    }
  }

  private drawDevice(
    c: CanvasRenderingContext2D,
    dev: PlacedDevice,
    st: ExecState,
    T: number,
    D: number,
    now: number,
    fr: (cx: number, cy: number, x: number, y: number, w: number, h: number, col: string) => void,
  ) {
    const { x, y } = dev;
    const id = dev.def.id;
    const w = st.world;
    const on = w.signals[id];
    const p = T / 16;
    const cx = x * T + T / 2;
    const cy = y * T + D + T / 2;
    const glow = (r: number, col: string, ox = 0, oy = 0) => {
      const g = c.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
    };
    switch (dev.def.type) {
      case 'lever': {
        fr(x, y, 4, 9, 8, 5, '#5e5e5e');
        fr(x, y, 4, 9, 8, 1, '#8c8c8c');
        const a = -0.7 + 1.4 * (this.levers[id] ?? 0);
        c.save();
        c.translate(cx, cy + p * 3);
        c.rotate(a);
        c.fillStyle = '#7b5a34';
        c.fillRect(-p, -p * 9, p * 2, p * 9);
        c.fillStyle = w.levers[id] ? '#ff3b2f' : '#3a1d10';
        c.fillRect(-p * 1.5, -p * 10, p * 3, p * 3);
        c.restore();
        if (w.levers[id]) glow(T * 0.5, 'rgba(255,60,40,0.35)', 0, p * 3);
        break;
      }
      case 'button': {
        const left = w.buttons[id] !== null && on ? (dev.def.duration ?? 1) - (w.tick - (w.buttons[id] as number)) : 0;
        fr(x, y, 3, 4, 10, 8, '#4d4d4d');
        fr(x, y, 5, on ? 7 : 6, 6, on ? 3 : 4, on ? '#d23b2f' : '#a5a5a5');
        for (let i = 0; i < (dev.def.duration ?? 1); i++) fr(x, y, 3 + i * 3, 13, 2, 2, i < left ? '#ff4a3a' : '#2c2c2c');
        if (on) glow(T * 0.6, 'rgba(255,60,40,0.35)');
        break;
      }
      case 'plate': {
        fr(x, y, 2, 2, 12, 12, on ? '#7d7d7d' : '#b5b5b5');
        fr(x, y, 2, 2, 12, 1, on ? '#666' : '#d6d6d6');
        if (on) glow(T * 0.7, 'rgba(255,60,40,0.3)');
        break;
      }
      case 'lamp': {
        if (on) glow(T * 1.8, 'rgba(255,200,90,0.35)', 0, -D / 2);
        this.block(c, x, y, T, D, on ? '#ffcf6a' : '#4a2c17', on ? '#d9902a' : '#2e1b0e', true);
        const col = on ? '#ff9b2e' : '#6d4423';
        for (const [a, b] of [
          [3, 3],
          [9, 3],
          [3, 9],
          [9, 9],
        ])
          c.fillStyle = col, c.fillRect(x * T + a * p, y * T + b * p, p * 4, p * 4);
        break;
      }
      case 'door': {
        const inside = w.player.x === x && w.player.y === y;
        if (on || inside) {
          fr(x, y, 0, 0, 3, 16, '#c9c9c9');
          fr(x, y, 0, 0, 1, 16, '#8a8a8a');
        } else {
          this.block(c, x, y, T, D, '#c9c9c9', '#8f8f8f', true);
          c.fillStyle = '#555';
          c.fillRect(x * T + p * 3, y * T + p * 3, p * 4, p * 4);
          c.fillRect(x * T + p * 9, y * T + p * 3, p * 4, p * 4);
          c.fillStyle = '#9a9a9a';
          c.fillRect(x * T + p * 7, y * T + p * 0, p * 2, p * 16);
        }
        break;
      }
      case 'torch': {
        fr(x, y, 7, 7, 2, 7, '#6b4a2b');
        fr(x, y, 6, 4, 4, 4, on ? '#ff3b2f' : '#45140f');
        if (on) {
          glow(T * 0.9, 'rgba(255,60,40,0.4)', 0, -p * 2);
          if (Math.random() < 0.05) this.particles.push({ x: x + 0.5, y: y + 0.2, vx: (Math.random() - 0.5) * 0.3, vy: -0.6, life: 0.6, max: 0.6, color: '#ff6a3a', size: 0.06, grav: 0 });
        }
        break;
      }
      case 'repeater': {
        const dl = dev.def.delay ?? 1;
        fr(x, y, 1, 3, 14, 10, '#a3a3a3');
        fr(x, y, 1, 3, 14, 1, '#c4c4c4');
        fr(x, y, 1, 12, 14, 1, '#6c6c6c');
        // sinais em trânsito: entrada dos últimos `delay` ticks (o mais antigo sai primeiro)
        for (let i = 0; i < dl; i++) {
          const t = w.tick - dl + 1 + i;
          const v = t < 0 ? w.repInit[id] : w.repHist[id][t];
          fr(x, y, 2 + i * Math.min(3, 12 / dl), 6, 2, 2, v ? '#ff3b2f' : '#4a1410');
        }
        fr(x, y, 12, 9, 2, 2, on ? '#ff3b2f' : '#4a1410');
        c.fillStyle = '#222';
        c.font = `700 ${Math.round(p * 4)}px 'Pixelify Sans', sans-serif`;
        c.textBaseline = 'top';
        c.fillText(`${dl}t`, x * T + p * 3, y * T + D + p * 8.5);
        if (on) glow(T * 0.5, 'rgba(255,60,40,0.3)');
        break;
      }
      case 'and':
      case 'or':
      case 'xor': {
        this.block(c, x, y, T, D, '#57505d', '#3a343f', true);
        c.fillStyle = on ? '#ff3b2f' : '#3d1512';
        c.fillRect(x * T + p * 11, y * T + p * 1, p * 4, p * 4);
        c.fillStyle = '#efe6d8';
        c.font = `700 ${Math.round(p * 6)}px 'Pixelify Sans', sans-serif`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText(GATE_SYMBOL[dev.def.type], x * T + T / 2, y * T + T / 2 + p);
        c.textAlign = 'left';
        if (on) glow(T * 0.6, 'rgba(255,60,40,0.25)', 0, -D);
        break;
      }
      case 'clock': {
        this.block(c, x, y, T, D, '#3c3442', '#28222d', true);
        const per = dev.def.period ?? 2;
        const pos = (((w.tick + (dev.def.phase ?? 0)) % per) + per) % per;
        const r = T * 0.32;
        for (let i = 0; i < per; i++) {
          const a = (i / per) * Math.PI * 2 - Math.PI / 2;
          c.fillStyle = i === pos ? '#ffffff' : i < (dev.def.on ?? 1) ? '#ff3b2f' : '#5a4a5f';
          c.fillRect(x * T + T / 2 + Math.cos(a) * r - p, y * T + T / 2 + Math.sin(a) * r - p, p * 2.2, p * 2.2);
        }
        c.fillStyle = on ? '#ff3b2f' : '#3d1512';
        c.fillRect(x * T + T / 2 - p * 1.5, y * T + T / 2 - p * 1.5, p * 3, p * 3);
        if (on) glow(T * 0.7, 'rgba(255,60,40,0.3)', 0, -D);
        break;
      }
      case 'piston': {
        const dir = dev.def.dir ?? 'direita';
        this.block(c, x, y, T, D, '#7a7a7a', '#555', true);
        const [dx, dy] = DIR_DELTA[dir];
        c.fillStyle = '#b08a55';
        const fx = dx === 1 ? 12 : dx === -1 ? 0 : 2;
        const fy = dy === 1 ? 12 : dy === -1 ? 0 : 2;
        c.fillRect(x * T + fx * p, y * T + fy * p, (dx ? 4 : 12) * p, (dy ? 4 : 12) * p);
        if (on) glow(T * 0.5, 'rgba(255,60,40,0.25)', 0, -D);
        break;
      }
      case 'core': {
        const pulse = 0.5 + 0.5 * Math.sin(now / (on ? 140 : 600));
        if (on) {
          glow(T * 3, `rgba(255,60,60,${0.35 + 0.2 * pulse})`, 0, -D);
          const g = c.createLinearGradient(0, y * T + D - T * 3, 0, y * T + D);
          g.addColorStop(0, 'rgba(255,90,90,0)');
          g.addColorStop(1, 'rgba(255,200,200,0.8)');
          c.fillStyle = g;
          c.fillRect(cx - p * 3, Math.max(0, y * T + D - T * 3), p * 6, Math.min(T * 3, y * T + D));
        }
        this.block(c, x, y, T, D, '#1d1027', '#120a18', true);
        c.fillStyle = on ? `rgb(255,${120 + 100 * pulse},${120 + 100 * pulse})` : `rgba(160,30,40,${0.5 + 0.3 * pulse})`;
        c.fillRect(x * T + p * 4, y * T + p * 4, p * 8, p * 8);
        c.fillStyle = on ? '#fff' : '#5a0d16';
        c.fillRect(x * T + p * 6, y * T + p * 6, p * 4, p * 4);
        break;
      }
    }
  }

  private drawPlayer(c: CanvasRenderingContext2D, st: ExecState, T: number, D: number, now: number) {
    const p = T / 16;
    const X = this.px * T;
    const moving = Math.abs(st.world.player.x - this.px) + Math.abs(st.world.player.y - this.py) > 0.05;
    const bob = moving ? Math.sin(now / 50) * p * 0.8 : Math.sin(now / 400) * p * 0.4;
    const Y = this.py * T + D - p * 3 + bob;
    const f = st.world.player.facing;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(this.px * T + T / 2, this.py * T + D + T - p * 2, p * 5, p * 2, 0, 0, Math.PI * 2);
    c.fill();
    const r = (x: number, y: number, w: number, h: number, col: string) => {
      c.fillStyle = col;
      c.fillRect(X + x * p, Y + y * p, w * p, h * p);
    };
    // pernas e corpo
    r(5, 13, 2, 3, '#2f3a4a');
    r(9, 13, 2, 3, '#2f3a4a');
    r(4, 7, 8, 7, '#3b78c4');
    r(4, 7, 8, 1, '#5b98e4');
    r(6, 9, 4, 3, '#244f86');
    r(7, 10, 2, 1, st.finished ? '#5dff8a' : '#ff3b2f');
    // cabeça
    r(3, 0, 10, 7, '#c8ccd2');
    r(3, 0, 10, 1, '#e6e9ee');
    r(3, 6, 10, 1, '#8e939a');
    r(7, -3, 2, 3, '#8e939a');
    r(7, -4, 2, 1, '#ff3b2f');
    // visor indica a direção
    if (f === 'baixo') r(4, 2, 8, 3, '#1b2430'), r(5, 3, 2, 1, '#53e0f0'), r(9, 3, 2, 1, '#53e0f0');
    if (f === 'direita') r(8, 2, 5, 3, '#1b2430'), r(10, 3, 2, 1, '#53e0f0');
    if (f === 'esquerda') r(3, 2, 5, 3, '#1b2430'), r(4, 3, 2, 1, '#53e0f0');
    if (f === 'cima') r(4, 2, 8, 2, '#a8adb4');
  }

  private drawDarkness(c: CanvasRenderingContext2D, st: ExecState, T: number, D: number) {
    const sw = this.game.sw;
    const W = T * sw.w;
    const H = T * sw.h + D;
    const off = (this.dark ??= document.createElement('canvas'));
    if (off.width !== W || off.height !== H) {
      off.width = W;
      off.height = H;
    }
    const g = off.getContext('2d')!;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(0,0,0,${this.theme.darkness})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const light = (x: number, y: number, r: number, a = 1) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    light(this.px * T + T / 2, this.py * T + D + T / 2, T * 3.2);
    for (const d of sw.devices) {
      const on = st.world.signals[d.def.id];
      const cx = d.x * T + T / 2;
      const cy = d.y * T + D + T / 2;
      if (d.def.type === 'lamp' && on) light(cx, cy, T * 4);
      else if (on) light(cx, cy, T * 1.6, 0.8);
      else light(cx, cy, T * 0.9, 0.5);
    }
    for (const wire of this.wires)
      if (st.world.signals[wire.source]) for (const [x, y] of wire.cells) light(x * T + T / 2, y * T + D + T / 2, T * 0.8, 0.45);
    if (sw.exit) light(sw.exit.x * T + T / 2, sw.exit.y * T + D + T / 2, T * 1.4, 0.8);
    c.drawImage(off, 0, 0);
  }

  private drawFinale(c: CanvasRenderingContext2D, T: number, D: number, now: number) {
    const core = this.game.sw.devices.find((d) => d.def.type === 'core');
    if (!core) return;
    const t = (now - this.finaleAt) / 1000;
    const cx = core.x * T + T / 2;
    const cy = core.y * T + D + T / 2 - D;
    for (let i = 0; i < 4; i++) {
      const rt = t - i * 0.35;
      if (rt < 0) continue;
      const r = (rt % 2.2) * T * 6;
      c.strokeStyle = `rgba(255,${80 + i * 40},80,${Math.max(0, 1 - (rt % 2.2) / 2.2)})`;
      c.lineWidth = T / 6;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
    }
    if (t < 3 && Math.random() < 0.9) this.burst(core.x, core.y - 0.3, Math.random() < 0.5 ? '#ff3b3b' : '#ffd36a', 4, 4, 1.5);
    if (t < 0.6) {
      c.fillStyle = `rgba(255,230,230,${0.7 * (1 - t / 0.6)})`;
      c.fillRect(0, 0, T * this.game.sw.w, T * this.game.sw.h + D);
    }
  }
}
