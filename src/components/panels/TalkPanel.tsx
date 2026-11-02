import { useGameStore } from '../../store/useGameStore';
import { PixelButton } from '../ui';

function childLine(stress: number, affection: number, delinquency: number) {
  if (delinquency >= 60) return '...신경 쓰지 마. 내가 알아서 할게.';
  if (stress >= 80) return '너무 힘들어... 좀 쉬고 싶어요.';
  if (stress >= 50) return '요즘 조금 피곤해요.';
  if (affection >= 85) return '엄마 아빠 최고! 오늘도 고마워요 💕';
  if (affection >= 60) return '오늘 학교에서 재밌는 일이 있었어요!';
  return '...응, 그냥 그래요.';
}

export function TalkPanel() {
  const game = useGameStore((s) => s.game)!;
  const talk = useGameStore((s) => s.talk);
  const give = useGameStore((s) => s.giveAllowance);
  const { stress, affection, delinquency } = game.status;
  return (
    <div className="text-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-4xl">{game.gender === 'SON' ? '👦' : '👧'}</span>
        <div className="pixel-box flex-1 p-2 text-xs">“{childLine(stress, affection, delinquency)}”</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PixelButton color="bg-mint" onClick={talk} disabled={game.talkedThisMonth}>
          💬 대화하기 {game.talkedThisMonth ? '(완료)' : ''}
        </PixelButton>
        <PixelButton onClick={give} disabled={game.gold < 100}>💸 용돈 주기 (100G)</PixelButton>
      </div>
      <p className="mt-3 text-[10px] opacity-70">
        시내 특수 장소(백화점·서점·과학관·오락실·고대 유적·뒷골목) 외출은 📅 스케줄의 '외출/탐험'에서 배치할 수 있어요. 장소마다 숨겨진 이벤트 플래그가 있어요!
      </p>
    </div>
  );
}
