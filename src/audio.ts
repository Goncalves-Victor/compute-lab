// Efeitos sonoros sintetizados com WebAudio (nenhum arquivo externo).
let ac: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ctx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ac) ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slide?: number) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq = 1200, delay = 0) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  step: () => noise(0.07, 0.25, 700),
  turn: () => tone(520, 0.04, 'square', 0.04),
  lever: () => {
    noise(0.05, 0.4, 2500);
    tone(300, 0.06, 'square', 0.06, 0.01, 180);
  },
  button: () => {
    noise(0.04, 0.35, 3200);
    tone(660, 0.05, 'square', 0.05);
  },
  wait: () => {
    tone(880, 0.03, 'triangle', 0.06);
    tone(660, 0.03, 'triangle', 0.05, 0.12);
  },
  door: () => tone(110, 0.18, 'sawtooth', 0.06, 0, 70),
  piston: () => {
    noise(0.12, 0.35, 400);
    tone(90, 0.12, 'square', 0.05);
  },
  error: () => {
    tone(220, 0.16, 'square', 0.08, 0, 110);
    tone(160, 0.22, 'square', 0.07, 0.12, 80);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.06, i * 0.09)),
  core: () => {
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.07, i * 0.12));
    tone(65, 1.6, 'sawtooth', 0.06, 0, 130);
  },
};
