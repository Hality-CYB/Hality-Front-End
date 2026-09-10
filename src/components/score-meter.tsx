type ScoreMeterProps = {
  score: number;
  color: string;
  size?: number;
};

/** Anel de progresso em SVG (0-100), usado para pontuações/confiança da IA. */
export function ScoreMeter({ score, color, size = 100 }: ScoreMeterProps) {
  const r = size * 0.42;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} className="block" style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={size * 0.07}
      />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.07}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
