import { useEffect, useRef } from 'react';

const KW = /^(SE|SENÃO|SENAO|ENTÃO|ENTAO|FIM|REPITA|VEZES|ENQUANTO|FAÇA|FACA|E|OU|NÃO|NAO|MOD)$/;
const LIT = /^(VERDADEIRO|FALSO)$/;
const ACT = /^(andar|acionar|esperar)$/;
const FN = /^(acesa|aceso|ligada|ligado|aberta|aberto|ativo|ativa|livre|estendido|tempo|energizado|energizada)$/;

function highlight(line: string) {
  return line.split(/([\p{L}\p{N}_]+|←)/u).map((t, i) => {
    let cls = '';
    if (KW.test(t)) cls = 'text-[#ff7a59] font-bold';
    else if (LIT.test(t)) cls = 'text-[#c792ea]';
    else if (ACT.test(t)) cls = 'text-[#7fdbca] font-bold';
    else if (FN.test(t)) cls = 'text-[#82aaff]';
    else if (/^\d+$/.test(t)) cls = 'text-[#f78c6c]';
    else if (t === '←') cls = 'text-[#ffcb6b]';
    return cls ? (
      <span key={i} className={cls}>
        {t}
      </span>
    ) : (
      t
    );
  });
}

interface Props {
  lines: string[];
  current: number | null;
  errorLine: number | null;
  flash: Set<number>;
  flashKey: number;
}

export default function CodePanel({ lines, current, errorLine, flash, flashKey }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = box.current;
    const el = c?.querySelector<HTMLElement>('[data-current="true"]');
    if (!el || !c) return;
    const top = el.offsetTop;
    if (top < c.scrollTop + 20 || top > c.scrollTop + c.clientHeight - 40) c.scrollTo({ top: top - c.clientHeight / 3, behavior: 'smooth' });
  }, [current]);
  return (
    <div ref={box} className="relative max-h-[46vh] min-h-0 overflow-auto bg-[#141117] py-2 font-code text-[13px] leading-6 lg:max-h-none lg:flex-1">
      {lines.map((ln, i) => {
        const cur = i === current;
        const err = i === errorLine;
        return (
          <div
            key={`${i}-${flash.has(i) ? flashKey : 0}`}
            data-current={cur}
            className={`flex whitespace-pre pr-3 ${flash.has(i) && !cur ? 'flash-line' : ''} ${cur ? 'bg-[#ffd54a]/15' : ''} ${err ? 'bg-rs/30' : ''}`}
          >
            <span className={`w-6 shrink-0 text-center ${cur ? 'text-[#ffd54a]' : 'text-transparent'}`} aria-hidden>
              ▶
            </span>
            <span className="w-7 shrink-0 select-none pr-2 text-right text-[#5b5462]">{i + 1}</span>
            <span className={cur ? 'text-white' : 'text-[#cfc6d6]'}>{highlight(ln)}</span>
          </div>
        );
      })}
      {current === null && <div className="px-4 pt-2 text-[#5dff8a]">■ fim do programa</div>}
    </div>
  );
}
