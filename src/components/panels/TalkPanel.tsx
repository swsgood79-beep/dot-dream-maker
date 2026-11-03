import { FirstTip } from '../FirstTip';
import { useGameStore } from '../../store/useGameStore';
import { Sprite } from '../Sprite';
import { frameName } from '../../render/spriteCharacter';
import { growthStage } from '../../engine/room';
import { WISH_MAP } from '../../data/parentingData';
import { PixelButton } from '../ui';

type Stage = ReturnType<typeof growthStage>;

/** 나이대·기분별 아이의 한마디 */
function childLine(stage: Stage, stress: number, affection: number, delinquency: number) {
  if (delinquency >= 60) return stage === 'CHILD' ? '...몰라. 말하기 싫어.' : '...신경 쓰지 마. 내가 알아서 할게.';
  if (stress >= 80) return '너무 힘들어... 좀 쉬고 싶어요.';
  if (stress >= 50) return stage === 'YOUTH' ? '요즘 머리가 터질 것 같아...' : '요즘 조금 피곤해요.';
  if (affection < 40) return stage === 'TEEN' ? '...왜. 할 말 있어?' : '...응, 그냥 그래요.';
  if (affection >= 85)
    return stage === 'CHILD' ? '엄마 아빠 최고! 오늘도 고마워요 💕' : stage === 'TEEN' ? '(쑥스럽게) ...고마워. 항상.' : '나중에 꼭 효도할게. 진짜로.';
  return stage === 'CHILD' ? '오늘 학교에서 재밌는 일이 있었어요!' : stage === 'TEEN' ? '오늘 급식 맛있었어. 그게 다야.' : '요즘 진로 때문에 생각이 많아.';
}

export function TalkPanel() {
  const game = useGameStore((s) => s.game)!;
  const talk = useGameStore((s) => s.talk);
  const give = useGameStore((s) => s.giveAllowance);
  const { stress, affection, delinquency } = game.status;
  const stage = growthStage(game.age);
  const wish = game.wish ? WISH_MAP[game.wish.id] : null;
  const done = game.talkedThisMonth;
  return (
    <div className="text-sm">
      <div className="mb-3 flex items-start gap-3">
        <Sprite name={frameName(stage, game.gender, affection >= 85 ? 'cheer' : stress >= 60 ? 'tired' : 'stand')} />
        <div className="pixel-box flex-1 self-center p-2 text-xs">“{childLine(stage, stress, affection, delinquency)}”</div>
      </div>

      {wish && <FirstTip id="wish" text="아이의 부탁은 3달 안에 들어줘야 해요. 적힌 방법대로 스케줄을 넣거나 가구를 놓으면 돼요. 자꾸 무시하면 마음을 닫아요." />}
      {wish && (
        <div className="mb-3 rounded border-2 border-ink bg-[#fff1c2] p-2 text-xs">
          <p className="font-bold">
            {wish.emoji} 아이의 부탁: “{wish.text}”
          </p>
          <p className="mt-0.5 text-[10px] opacity-80">
            들어주는 방법: {wish.hint} · 남은 기간 {game.wish!.left}달 · 진행 {game.wish!.progress}/
            {wish.kind === 'action' ? (wish.count ?? 1) : 1}
          </p>
        </div>
      )}

      {game.doorLocked && <p className="mb-1 rounded border-2 border-ink bg-[#e3e8f5] px-2 py-1 text-[11px]">🔒 방문이 잠겨 있어요. 문 너머로만 이야기할 수 있어 효과가 절반이에요. 방에서 [🔍 관찰하기]가 보이면 눌러 보세요.</p>}
      <p className="mb-1 text-[11px] font-bold text-wood">이번 달 이야기 나누기 {done && '(완료)'}</p>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        <PixelButton color="bg-mint" onClick={() => talk('talk')} disabled={done}>
          💬 대화
        </PixelButton>
        <PixelButton color="bg-gold" onClick={() => talk('praise')} disabled={done}>
          👏 칭찬
        </PixelButton>
        <PixelButton color="bg-sky" onClick={() => talk('scold')} disabled={done}>
          ☝️ 타이르기
        </PixelButton>
      </div>
      <p className="mb-3 text-[10px] opacity-70">
        대화: 친밀도↑ 스트레스↓ · 칭찬: 친밀도↑ 자존감↑ · 타이르기: 비행↓ 도덕↑ 대신 친밀도·자존감↓ (한 달에 한 번) · 한 번도 이야기하지 않은 달은 📦 방임으로 쌓여요
      </p>
      <PixelButton className="w-full" onClick={give} disabled={game.gold < 100}>
        💸 용돈 주기 (100G · 친밀도 +2)
      </PixelButton>
      <p className="mt-3 text-[10px] opacity-70">
        시내 특수 장소(백화점·서점·과학관·오락실·고대 유적·뒷골목) 외출은 📅 스케줄의 '외출/탐험'에서 배치할 수 있어요. 장소마다 숨겨진 이벤트 플래그가 있어요!
      </p>
    </div>
  );
}
