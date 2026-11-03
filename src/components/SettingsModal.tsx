import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PixelButton } from './ui';

/** ⚙️ 설정: 소리 · 오프닝/튜토리얼 다시 보기 · 저장 백업 · 초기화 */
export function SettingsModal({ onClose, onOpening }: { onClose: () => void; onOpening: () => void }) {
  const st = useGameStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const Row = ({ label, on, toggle }: { label: string; on: boolean; toggle: () => void }) => (
    <button onClick={toggle} className="flex w-full items-center justify-between rounded border-2 border-ink bg-white px-2 py-1.5 text-xs">
      <span className="font-bold">{label}</span>
      <span className={`rounded border-2 border-ink px-2 text-[10px] font-bold ${on ? 'bg-mint' : 'bg-stone-300'}`}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="pixel-box pop-in max-h-full w-full max-w-xs overflow-y-auto p-3 text-ink" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-base font-bold">⚙️ 설정</p>
          <button onClick={onClose} className="text-lg leading-none">✕</button>
        </div>

        <p className="mb-1 text-[11px] font-bold text-wood">소리</p>
        <div className="mb-3 flex flex-col gap-1.5">
          <Row label="🔊 효과음·전체 소리" on={!st.muted} toggle={st.toggleMute} />
          <Row label="🎵 배경음악" on={st.musicOn} toggle={st.toggleMusic} />
        </div>

        <p className="mb-1 text-[11px] font-bold text-wood">다시 보기</p>
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          <PixelButton color="bg-white" className="!text-xs" onClick={onOpening}>
            🎬 오프닝
          </PixelButton>
          <PixelButton
            color="bg-white"
            className="!text-xs"
            onClick={() => {
              st.setTutorialDone(false);
              useGameStore.setState({ tipsSeen: [] });
              setMsg('다음에 새로 키울 때 튜토리얼이 다시 나와요');
            }}
          >
            📘 튜토리얼
          </PixelButton>
        </div>

        <p className="mb-1 text-[11px] font-bold text-wood">저장 백업</p>
        <p className="mb-1 text-[10px] opacity-70">브라우저 기록을 지우면 저장이 사라져요. 코드를 복사해 두면 다른 기기에서도 이어서 할 수 있어요.</p>
        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
          <PixelButton
            color="bg-sky"
            className="!text-xs"
            onClick={async () => {
              const c = st.exportSave();
              setCode(c);
              try {
                await navigator.clipboard.writeText(c);
                setMsg('📋 저장 코드를 복사했어요! 메모장 등에 붙여 넣어 보관하세요');
              } catch {
                setMsg('아래 코드를 길게 눌러 복사해 주세요');
              }
            }}
          >
            📤 코드 만들기
          </PixelButton>
          <PixelButton
            color="bg-white"
            className="!text-xs"
            onClick={() => setMsg(st.importSave(code) ? '✅ 저장을 불러왔어요!' : '❌ 코드가 올바르지 않아요')}
          >
            📥 불러오기
          </PixelButton>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="저장 코드를 여기에 붙여 넣고 [불러오기]"
          className="mb-1 h-16 w-full border-2 border-ink bg-white p-1 text-[9px] break-all"
        />
        {msg && <p className="mb-2 text-[11px] font-bold text-accent">{msg}</p>}

        <p className="mb-1 text-[11px] font-bold text-wood">초기화</p>
        {!confirmReset ? (
          <PixelButton color="bg-white" className="w-full !text-xs" onClick={() => setConfirmReset(true)}>
            🗑️ 모든 기록 지우기
          </PixelButton>
        ) : (
          <div className="rounded border-2 border-accent bg-[#ffe0dc] p-2 text-[11px]">
            <p className="mb-1.5 font-bold">정말 지울까요? 키우던 아이, 엔딩 도감, 명예의 전당, 업적이 모두 사라져요.</p>
            <div className="grid grid-cols-2 gap-1.5">
              <PixelButton color="bg-white" className="!text-xs" onClick={() => setConfirmReset(false)}>
                취소
              </PixelButton>
              <PixelButton
                color="bg-accent !text-white"
                className="!text-xs"
                onClick={() => {
                  st.resetAll();
                  setConfirmReset(false);
                  setMsg('모든 기록을 지웠어요');
                }}
              >
                지우기
              </PixelButton>
            </div>
          </div>
        )}
        <p className="mt-3 text-center text-[10px] opacity-50">도트 드림 메이커 · 모든 그림과 음악은 이 게임을 위해 만들어졌어요</p>
      </div>
    </div>
  );
}
