export type MascotVariant = "idle" | "searching" | "confused";

type Props = {
  variant?: MascotVariant;
  className?: string;
  /** Decorative by default. Pass a label when the mascot carries meaning. */
  label?: string;
};

const INK = "#0b0b0d";

/**
 * Tally-mark penguin with a magnifier. Animation is CSS (see globals.css) so it
 * stays crisp at any size and stops for people who prefer reduced motion.
 */
export function Mascot({ variant = "idle", className, label }: Props) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={`mascot mascot-${variant}${className ? ` ${className}` : ""}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g className="mascot-bob">
        {/* feet */}
        <ellipse cx="84" cy="226" rx="24" ry="9" fill="#fff" stroke={INK} strokeWidth="5" />
        <ellipse cx="138" cy="226" rx="24" ry="9" fill="#fff" stroke={INK} strokeWidth="5" />

        {/* body + left flipper */}
        <path
          d="M110 18C62 18 36 62 36 124c0 62 26 98 74 98s74-36 74-98c0-62-26-106-74-106Z"
          fill={INK}
        />
        <path d="M42 112c-22 18-24 56-10 76 14-18 18-46 20-70Z" fill={INK} />

        {/* belly with tally marks */}
        <ellipse cx="110" cy="168" rx="42" ry="52" fill="#fff" />
        <g stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M92 142v42M104 140v44M116 140v44M128 142v42" />
          <path d="M84 178 136 146" />
        </g>

        {/* raised flipper holding the magnifier */}
        <g className="mascot-arm">
          <path
            d="M176 112c14-6 20-22 18-40"
            stroke={INK}
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M194 74 202 54" stroke={INK} strokeWidth="8" strokeLinecap="round" />
          <circle cx="208" cy="34" r="22" fill="#fff" stroke={INK} strokeWidth="7" />
          <path d="M198 26c3-5 8-8 14-8" stroke="#cfd2d6" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>

        {/* head details */}
        <g className="mascot-head">
          <circle cx="86" cy="86" r="14" fill="#fff" />
          <circle cx="124" cy="84" r="14" fill="#fff" />
          <g className="mascot-pupils">
            <circle cx="86" cy="88" r="6.5" fill={INK} />
            <circle cx="124" cy="86" r="6.5" fill={INK} />
          </g>
          {/* one raised, one skeptical brow */}
          <path d="M70 66 98 74" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <path className="mascot-brow" d="M106 58q18-12 36 2" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* beak */}
          <path d="M98 101q12-8 24 0-5 14-12 16-7-2-12-16Z" fill="var(--lime)" />
        </g>

        {variant === "confused" && (
          <g fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round">
            <g transform="translate(26 50) scale(1.25)">
              <g className="mascot-q1">
                <path d="M-8-10c0-14 18-14 18-1 0 9-10 8-10 20" />
                <circle cx="0" cy="22" r="2.5" fill={INK} stroke="none" />
              </g>
            </g>
            <g transform="translate(214 124) scale(1)">
              <g className="mascot-q2">
                <path d="M-8-10c0-14 18-14 18-1 0 9-10 8-10 20" />
                <circle cx="0" cy="22" r="2.5" fill={INK} stroke="none" />
              </g>
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
