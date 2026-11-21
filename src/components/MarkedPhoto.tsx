import { markHalfSize, xMarkSegments } from "@/lib/marks";
import type { Point } from "@/lib/schema";

type Props = {
  src: string;
  width: number;
  height: number;
  points: Point[];
  showMarks: boolean;
  alt: string;
  className?: string;
};

/** The user's photo with a lime X (dark outline for contrast on snow) on each penguin. */
export function MarkedPhoto({ src, width, height, points, showMarks, alt, className }: Props) {
  const half = markHalfSize(width, height);
  const stroke = half * 0.5;
  return (
    <div className={`relative mx-auto w-fit max-w-full overflow-hidden rounded-3xl bg-surface ${className ?? ""}`}>
      {/* A blob: URL from the user's own device; next/image has nothing to optimize here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} className="block h-auto max-h-[44dvh] w-auto max-w-full" />
      {showMarks && points.length > 0 && (
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          {points.map((p, i) => {
            const [a, b] = xMarkSegments(p, width, height);
            const delay = `${Math.min(i * 45, 1200)}ms`;
            return (
              <g key={i} className="mark" style={{ animationDelay: delay }} strokeLinecap="round">
                <g stroke="#0a0a0c" strokeWidth={stroke * 2.1}>
                  <line {...a} />
                  <line {...b} />
                </g>
                <g stroke="var(--lime)" strokeWidth={stroke}>
                  <line {...a} />
                  <line {...b} />
                </g>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
