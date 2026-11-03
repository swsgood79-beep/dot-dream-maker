/** 달에 따라 방 위로 흩날리는 계절 효과 (12~2월 눈, 4월 벚꽃, 10~11월 낙엽) */
export function SeasonFx({ month }: { month: number }) {
  const kind = month === 12 || month <= 2 ? '❄' : month === 4 ? '🌸' : month === 10 || month === 11 ? '🍂' : null;
  if (!kind) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="season-flake"
          style={{
            left: `${(i * 53) % 100}%`,
            fontSize: kind === '❄' ? 10 + (i % 3) * 3 : 12 + (i % 3) * 2,
            color: '#fff',
            textShadow: kind === '❄' ? '0 0 2px #9ec9ff' : undefined,
            animationDuration: `${7 + (i % 5) * 1.6}s`,
            animationDelay: `${-((i * 1.3) % 9)}s`,
          }}
        >
          {kind}
        </span>
      ))}
    </div>
  );
}
