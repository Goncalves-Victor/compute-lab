// Progresso salvo no navegador. Toda leitura/escrita é protegida: o jogo funciona mesmo sem armazenamento.
const KEY = 'compute-lab:v1';

export type Mode = 'educativo' | 'desafio';

export interface Progress {
  completed: number[];
  /** melhor tempo (ms) no modo desafio */
  best: Record<number, number>;
  sound: boolean;
  mode: Mode;
}

const EMPTY: Progress = { completed: [], best: {}, sound: true, mode: 'educativo' };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw);
    return {
      completed: Array.isArray(p.completed) ? p.completed.filter((n: unknown) => typeof n === 'number') : [],
      best: p.best && typeof p.best === 'object' ? p.best : {},
      sound: p.sound !== false,
      mode: p.mode === 'desafio' ? 'desafio' : 'educativo',
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* armazenamento indisponível: o progresso vale só nesta sessão */
  }
}

export const isUnlocked = (p: Progress, id: number) => id === 1 || p.completed.includes(id - 1) || p.completed.includes(id);
