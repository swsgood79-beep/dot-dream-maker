import { sfx } from '../audio/sfx';
import { ACTING_INFO, type ActingKind } from '../engine/psyche';
import { growthStage } from '../engine/room';
import { frameName, hasFrame } from '../render/spriteCharacter';
import { useGameStore } from '../store/useGameStore';
import { Sprite } from './Sprite';
import { PixelButton } from './ui';
import { sceneBg } from './ActivitySceneView';

/** 관찰 장면 배경 (있으면): src/assets/scenes/REC_*.webp (scripts/build-scenes.py, scene-s8·s9 시트)
 * where: alert = 안내 창(방문 잠금은 닫힌 문 앞 복도), view = 카메라 화면, after = 황금 처방 뒤 화해 장면 */
export function recBg(kind: ActingKind, where: 'alert' | 'view' | 'after' = 'view'): string | undefined {
  if (where === 'after') return sceneBg(kind === 'LOCKED' ? 'REC_LETTER' : 'REC_WARM') ?? sceneBg(`REC_${kind}`);
  if (where === 'alert' && kind === 'LOCKED') return sceneBg('REC_DOOR') ?? sceneBg('REC_LOCKED');
  return sceneBg(`REC_${kind}`);
}

/** 이상행동이 처음 보였을 때: 무슨 일인지 · 왜 · 그냥 두면 어떻게 되는지 알려 주고 관찰 카메라로 안내 */
export function ActingAlertModal({ onWatch, onLater }: { onWatch: () => void; onLater: () => void }) {
  const game = useGameStore((s) => s.game)!;
  const act = game.acting;
  if (!act) return null;
  const info = ACTING_INFO[act.kind];
  const stage = growthStage(game.age);
  const pose = hasFrame(`${stage}_${game.gender}_${info.pose}`) ? info.pose : 'stand';
  const bg = recBg(act.kind, 'alert');
  const name = game.childName;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3">
      <div className="pixel-box pop-in max-h-full w-full overflow-y-auto p-3 text-sm">
        <p className="text-center text-[10px] font-bold tracking-wider text-accent">
          <span className="rec-blink">●</span> 아이에게 변화가 생겼어요
        </p>
        <p className="mb-2 text-center text-lg font-bold">
          {info.emoji} {info.title}
        </p>
        {/* 장면: 배경 그림이 있으면 그 위에, 없으면 어두운 방 */}
        <div className="relative mb-2 flex h-40 items-end justify-center overflow-hidden border-3 border-ink" style={{ background: bg ? undefined : 'linear-gradient(#3a3f5c, #23263a)' }}>
          {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0_3px,rgba(0,0,0,.12)_3px_4px)]" />
          <div className="relative mb-2">
            <Sprite name={frameName(stage, game.gender, pose)} scale={1.7} />
          </div>
        </div>
        <p className="mb-2 rounded border-2 border-ink bg-white p-2 text-xs leading-relaxed">{info.story.split('{name}').join(name)}</p>
        <div className="mb-2 grid gap-1.5 text-[11px] leading-snug">
          <p className="rounded border-2 border-ink bg-[#fff1c2] px-2 py-1">
            <b>🤔 왜 그럴까요?</b> {info.cause(game)}
          </p>
          <p className="rounded border-2 border-ink bg-[#ffe3e3] px-2 py-1">
            <b>⚠️ 그냥 두면</b> {info.risk}
          </p>
          <p className="rounded border-2 border-ink bg-[#dbe8ff] px-2 py-1">
            <b>🔴 관찰 카메라</b> 겉으로 하는 말 뒤에 숨은 <b>속마음</b>을 볼 수 있어요. 속마음을 알면 그 마음에 꼭 맞는 <b>✨ 황금 처방</b>이 열려요.
          </p>
        </div>
        <PixelButton
          className="mb-1.5 w-full"
          color="bg-[#ff5b5b] !text-white"
          onClick={() => {
            sfx('page');
            onWatch();
          }}
        >
          🔴 관찰 카메라 켜기
        </PixelButton>
        <button className="w-full py-1 text-[11px] underline opacity-70" onClick={onLater}>
          나중에 볼게요 (방 왼쪽 위 [🔍 관찰하기]로 언제든)
        </button>
      </div>
    </div>
  );
}
