import { eventScene } from '../render/eventScenes';
import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../audio/sfx';
import { CUTSCENE_MAP, type CutLine } from '../data/cutsceneData';
import { fillName } from '../data/parentingData';
import { growthStage } from '../engine/room';
import { frameName } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { sceneBg } from './ActivitySceneView';

/** 성장 컷신: 화면을 누르면 다음 대사로 */
export function CutsceneModal({ id }: { id: string }) {
  const game = useGameStore((s) => s.game)!;
  const finish = useGameStore((s) => s.finishCutscene);
  // 지난 판에서 본 컷신은 건너뛸 수 있음 (2회차)
  const seenBefore = useGameStore((s) => s.seenEver.includes(id));
  const scene = CUTSCENE_MAP[id];
  // 대사는 컷신이 열린 순간의 상태로 고정
  const lines = useMemo<CutLine[]>(() => (scene ? scene.lines(game) : []), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const [morphed, setMorphed] = useState(false);
  const line = lines[i];
  const text = line ? fillName(line.text, game.childName, game.friend) : '';

  useEffect(() => {
    sfx('chime');
  }, []);
  useEffect(() => {
    setTyped(0);
    setMorphed(false);
    if (line?.kind === 'transform') {
      const t = setTimeout(() => {
        setMorphed(true);
        sfx('levelup');
      }, 900);
      return () => clearTimeout(t);
    }
  }, [i, line?.kind]);
  useEffect(() => {
    if (typed >= text.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 35);
    return () => clearTimeout(t);
  }, [typed, text]);

  if (!scene || !line) return null;
  // 변신 장면 전까지는 이전 모습으로
  const tIdx = lines.findIndex((l) => l.kind === 'transform');
  const tLine = tIdx >= 0 ? (lines[tIdx] as Extract<CutLine, { kind: 'transform' }>) : null;
  const stage = tLine && i < tIdx ? tLine.from : growthStage(game.age);
  const spriteName =
    line.kind === 'transform'
      ? frameName(morphed ? line.to : line.from, game.gender, 'stand')
      : frameName(stage, game.gender, line.kind === 'child' ? (line.pose ?? 'stand') : 'stand');
  const last = i >= lines.length - 1;
  const img = eventScene(id, game.gender);

  const next = () => {
    if (typed < text.length) {
      setTyped(text.length);
      return;
    }
    sfx('page');
    if (last) finish();
    else setI(i + 1);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: `linear-gradient(${scene.sky[0]}, ${scene.sky[1]})` }}
      onClick={next}
    >
      {seenBefore && (
        <button
          className="absolute top-3 right-3 z-10 rounded-full border-2 border-ink bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
        >
          ⏭ 이미 본 장면 건너뛰기
        </button>
      )}
      <p className="pop-in mt-6 text-center text-xs font-bold text-ink/60">
        {game.age}세 {game.month}월
      </p>
      <h2 className="pop-in text-center text-2xl font-bold text-ink drop-shadow-[2px_2px_0_#fff]">
        {scene.emoji} {scene.title}
      </h2>
      {img && line.kind !== 'transform' ? (
        <div className="flex flex-1 items-center justify-center px-3">
          <img src={img} alt="" className="pop-in aspect-video w-full rounded border-4 border-ink object-cover shadow-[4px_4px_0_rgba(0,0,0,.3)]" />
        </div>
      ) : (
      <div className="relative mx-3 mt-2 flex flex-1 items-end justify-center overflow-hidden rounded pb-4">
        {sceneBg(scene.id) ? (
          // 성장 컷신 장소 배경 (docs/bg2_requests.xlsx)
          <img src={sceneBg(scene.id)} alt="" className="pop-in absolute inset-0 h-full w-full rounded border-4 border-ink object-cover object-bottom" draggable={false} />
        ) : (
          <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[110px] leading-none opacity-30">{scene.emoji}</span>
        )}
        {line.kind === 'transform' && morphed && <div className="absolute inset-0 animate-ping bg-white/60" style={{ animationIterationCount: 1 }} />}
        <div key={spriteName} className="pop-in relative">
          <Sprite name={spriteName} scale={2.2} />
        </div>
      </div>
      )}
      <div className="m-3 min-h-28 rounded-lg border-3 border-ink bg-[#fffaf0] p-3 text-sm text-ink shadow-[4px_4px_0_rgba(0,0,0,.25)]">
        {line.kind === 'child' && <p className="mb-1 text-xs font-bold text-accent">{game.childName}</p>}
        <p className={line.kind === 'child' ? '' : 'italic opacity-80'}>
          {line.kind === 'child' ? '“' : ''}
          {text.slice(0, typed)}
          {line.kind === 'child' && typed >= text.length ? '”' : ''}
        </p>
        <p className="mt-2 text-right text-[10px] opacity-60">
          {typed < text.length ? '' : last ? '▶ 화면을 누르면 계속' : '▶ 다음'}
        </p>
      </div>
    </div>
  );
}
