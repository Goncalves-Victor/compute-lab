import { useEffect, useState } from 'react';
import { setSoundEnabled } from '../audio';
import { LEVELS } from '../levels';
import { Progress, isUnlocked, loadProgress, saveProgress } from '../storage';
import Game from './Game';
import Menu from './Menu';

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [levelId, setLevelId] = useState<number | null>(null);

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => setSoundEnabled(progress.sound), [progress.sound]);

  const update = (p: Partial<Progress>) => setProgress((cur) => ({ ...cur, ...p }));

  const complete = (id: number, timeMs?: number) =>
    setProgress((cur) => {
      const best = { ...cur.best };
      if (timeMs !== undefined && (best[id] === undefined || timeMs < best[id])) best[id] = timeMs;
      return { ...cur, completed: cur.completed.includes(id) ? cur.completed : [...cur.completed, id], best };
    });

  if (levelId !== null) {
    const level = LEVELS[levelId - 1];
    const next = levelId < 40 ? levelId + 1 : null;
    return (
      <Game
        key={`${levelId}-${progress.mode}`}
        level={level}
        progress={progress}
        onUpdate={update}
        onComplete={complete}
        onMenu={() => setLevelId(null)}
        onNext={next ? () => setLevelId(next) : undefined}
      />
    );
  }
  return (
    <Menu
      progress={progress}
      onUpdate={update}
      onReset={() => setProgress((cur) => ({ ...cur, completed: [], best: {} }))}
      onPlay={(id) => isUnlocked(progress, id) && setLevelId(id)}
    />
  );
}
