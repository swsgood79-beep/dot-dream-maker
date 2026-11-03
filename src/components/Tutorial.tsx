import { useLayoutEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { Sprite } from './Sprite';

interface TutStep {
  /** 강조할 요소: data-tut 값 (없으면 화면 가운데 안내) */
  target?: string;
  title: string;
  text: string;
}

const STEPS = (name: string): TutStep[] => [
  { title: '안녕하세요, 새내기 부모님!', text: `저는 이 집 고양이 '도트'예요. 오늘부터 ${name}의 12년을 함께할 거예요. 간단히 알려 드릴게냥!` },
  { target: 'stats', title: '아이의 6가지 능력', text: '지력·체력·감성·매력·도덕·기술. 매달 스케줄로 키우고, 스무 살이 되는 날 이 능력에 맞는 직업을 갖게 돼요.' },
  { target: 'stress', title: '스트레스를 조심해요', text: '50을 넘으면 효율이 떨어지고, 100이 되면 아프거나 가출해요! 공부만 시키지 말고 휴식을 꼭 섞어 주세요.' },
  { target: 'gold', title: '골드', text: '학원비와 가구에 써요. 매달 부모님 지원금이 들어오고, 모자라면 아르바이트로 벌 수 있어요.' },
  { target: 'schedule', title: '📅 스케줄', text: '한 달은 4주예요. 주마다 할 일을 고르고 [이번 달 진행하기]를 누르면 한 달이 지나가요.' },
  { target: 'room', title: '🛋️ 방꾸미기', text: '가구는 근처에서 공부·운동할 때 보너스를 줘요. 같은 세트 3개를 가까이 두면 콤보가 터져요!' },
  { target: 'talk', title: '🌳 외출·대화', text: '한 달에 한 번 대화·칭찬·타이르기를 할 수 있어요. 아이가 부탁을 하면 여기서 확인해요.' },
  { target: 'info', title: '❓ 내 아이', text: '능력치, 기질, 사진첩, 아이의 꿈까지 모두 여기서 볼 수 있어요.' },
  { target: 'canvas', title: '방 안의 아이', text: '아이와 저(고양이)를 눌러 보세요. 가끔 책상 위에 일기장이 놓이기도 해요... 몰래 볼지는 부모님 마음!' },
  { title: '준비 완료!', text: '정답은 없어요. 아이의 반응을 잘 살피면서 나만의 방식으로 키워 보세요. 그럼 첫 달 스케줄부터 짜 볼까요?' },
];

export function Tutorial({ name, onDone }: { name: string; onDone: () => void }) {
  const steps = STEPS(name);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [host, setHost] = useState<DOMRect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    const el = step.target ? document.querySelector(`[data-tut="${step.target}"]`) : null;
    const root = document.querySelector('[data-tut-root]');
    setRect(el ? el.getBoundingClientRect() : null);
    setHost(root ? root.getBoundingClientRect() : null);
  }, [i, step.target]);

  const box = rect && host ? { left: rect.left - host.left - 4, top: rect.top - host.top - 4, width: rect.width + 8, height: rect.height + 8 } : null;
  const below = !box || box.top + box.height / 2 < (host?.height ?? 800) / 2;
  const last = i >= steps.length - 1;

  return (
    <div className="absolute inset-0 z-[60]">
      {box ? <div className="tut-hole" style={box} /> : <div className="absolute inset-0 bg-[rgba(10,12,30,0.72)]" />}
      <div
        className="absolute inset-x-3 flex items-end gap-2"
        style={below ? { top: box ? box.top + box.height + 12 : '30%' } : { bottom: (host?.height ?? 800) - (box?.top ?? 0) + 12 }}
      >
        <div className="shrink-0">
          <Sprite name="CAT_sit" scale={1.2} />
        </div>
        <div className="pixel-box pop-in flex-1 p-2.5 text-ink" key={i}>
          <p className="mb-0.5 text-sm font-bold">{step.title}</p>
          <p className="text-xs leading-relaxed">{step.text}</p>
          <div className="mt-2 flex items-center justify-between">
            <button className="text-[10px] underline opacity-60" onClick={onDone}>
              건너뛰기
            </button>
            <span className="text-[10px] opacity-60">
              {i + 1} / {steps.length}
            </span>
            <button
              className="pixel-btn bg-gold px-3 py-1 text-xs font-bold"
              onClick={() => {
                sfx('page');
                if (last) onDone();
                else setI(i + 1);
              }}
            >
              {last ? '시작하기!' : '다음 ▶'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
