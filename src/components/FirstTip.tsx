import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

/** 처음 보는 창에 한 번만 뜨는 고양이 도움말 */
export function FirstTip({ id, text }: { id: string; text: string }) {
  const seen = useGameStore((s) => (s.tipsSeen ?? []).includes(id));
  const seeTip = useGameStore((s) => s.seeTip);
  const [show] = useState(!seen);
  useEffect(() => {
    if (show) seeTip(id);
  }, [show, id, seeTip]);
  if (!show) return null;
  return (
    <p className="pop-in mb-2 rounded border-2 border-dashed border-ink/60 bg-[#e8f4ff] px-2 py-1 text-left text-[10px] leading-snug text-ink">
      🐱 <b>처음이죠?</b> {text}
    </p>
  );
}
