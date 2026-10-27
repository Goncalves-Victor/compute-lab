import { DeviceDef, Dir } from '../engine/types';

// Construtores curtos para descrever os dispositivos de cada fase.
export const lever = (id: string, initial = false): DeviceDef => ({ id, type: 'lever', initial });
export const button = (id: string, duration: number): DeviceDef => ({ id, type: 'button', duration });
export const plate = (id: string): DeviceDef => ({ id, type: 'plate' });
export const clock = (id: string, period: number, on: number, phase = 0): DeviceDef => ({ id, type: 'clock', period, on, phase });
export const lamp = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'lamp', inputs });
export const door = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'door', inputs });
export const torch = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'torch', inputs });
export const repeater = (id: string, input: string, delay: number): DeviceDef => ({ id, type: 'repeater', inputs: [input], delay });
export const and = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'and', inputs });
export const or = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'or', inputs });
export const xor = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'xor', inputs });
export const piston = (id: string, dir: Dir, ...inputs: string[]): DeviceDef => ({ id, type: 'piston', dir, inputs });
export const core = (id: string, ...inputs: string[]): DeviceDef => ({ id, type: 'core', inputs });

/** Remove a indentação comum de um bloco de pseudocódigo. */
export function code(src: string): string {
  const lines = src.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(ind)).join('\n');
}
