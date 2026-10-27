export function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor((ms % 1000) / 100);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${d}`;
}
