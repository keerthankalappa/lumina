import { useId } from "react";
import { DECK_ART } from "../lib/palettes";

/** Deterministic generative cover art — each deck gets an editorial landscape in its own palette. */
export function DeckArt({ palette, className = "" }: { palette: string; className?: string }) {
  const art = DECK_ART[palette] ?? DECK_ART["earth-dawn"]!;
  const uid = useId().replace(/:/g, "");
  const [l0, l1, l2, l3] = art.layers as [string, string, string, string];

  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={art.sky[0]} />
          <stop offset="1" stopColor={art.sky[1]} />
        </linearGradient>
        <radialGradient id={`glow${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={art.sun ?? "#fff"} stopOpacity="0.95" />
          <stop offset="1" stopColor={art.sun ?? "#fff"} stopOpacity="0" />
        </radialGradient>
        <filter id={`grain${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="400" height="260" fill={`url(#sky${uid})`} />

      {art.motif === "hills" && (
        <g>
          <circle cx="290" cy="90" r="70" fill={`url(#glow${uid})`} />
          <path d="M0 150 C80 110 140 160 220 128 S340 100 400 130 V260 H0Z" fill={l0} opacity="0.85" />
          <path d="M0 175 C70 150 160 196 250 160 S360 150 400 170 V260 H0Z" fill={l1} opacity="0.9" />
          <path d="M0 205 C90 180 170 220 260 196 S350 190 400 205 V260 H0Z" fill={l2} />
          <path d="M0 232 C110 212 210 246 300 226 S370 222 400 230 V260 H0Z" fill={l3} />
        </g>
      )}
      {art.motif === "ribbons" && (
        <g fill="none" strokeLinecap="round">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M-20 ${150 + i * 10} C 80 ${60 + i * 18}, 160 ${220 - i * 12}, 250 ${120 + i * 6} S 380 ${70 + i * 14}, 430 ${110 + i * 8}`}
              stroke={art.layers[i % 4]}
              strokeWidth={10 - i * 1.5}
              opacity={0.75 - i * 0.1}
            />
          ))}
        </g>
      )}
      {art.motif === "sun" && (
        <g>
          {Array.from({ length: 18 }, (_, i) => (
            <rect key={i} x="198" y="20" width="4" height="110" fill={l0} opacity="0.35" transform={`rotate(${i * 20} 200 130)`} />
          ))}
          <circle cx="200" cy="130" r="95" fill={`url(#glow${uid})`} />
          <circle cx="200" cy="130" r="42" fill={l0} />
          <polygon points="60,230 160,110 250,230" fill={l2} opacity="0.7" />
          <polygon points="170,240 270,120 360,240" fill={l1} opacity="0.6" />
          <rect x="0" y="210" width="400" height="50" fill={l3} opacity="0.9" />
        </g>
      )}
      {art.motif === "forest" && (
        <g>
          {[0, 1, 2].map((i) => (
            <polygon key={i} points={`${150 + i * 50},0 ${190 + i * 50},0 ${110 + i * 90},260 ${40 + i * 90},260`} fill={l3} opacity={0.18 - i * 0.04} />
          ))}
          {Array.from({ length: 11 }, (_, i) => {
            const x = i * 40 - 10;
            const h = 150 + ((i * 53) % 70);
            return (
              <g key={i} fill={i % 2 ? l1 : l2}>
                <rect x={x + 16} y={260 - h * 0.35} width="6" height={h * 0.35} />
                <polygon points={`${x + 19},${260 - h} ${x - 6},${260 - h * 0.3} ${x + 44},${260 - h * 0.3}`} />
              </g>
            );
          })}
          <rect x="0" y="240" width="400" height="20" fill={l0} />
        </g>
      )}
      {art.motif === "lake" && (
        <g>
          <circle cx="300" cy="70" r="16" fill={art.sun} />
          <circle cx="300" cy="70" r="50" fill={`url(#glow${uid})`} opacity="0.5" />
          <path d="M0 140 C60 120 120 132 200 124 S320 110 400 128 V150 H0Z" fill={l2} />
          <rect x="0" y="148" width="400" height="112" fill={l1} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={40 + ((i * 97) % 300)} y={165 + i * 10} width={60 + ((i * 31) % 80)} height="1.5" rx="1" fill={l3} opacity="0.5" />
          ))}
        </g>
      )}
      {art.motif === "bloom" && (
        <g transform="translate(200 120)">
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-48" rx="24" ry="50" fill={i % 2 ? l0 : l1} opacity="0.75" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="22" fill={l2} />
          <path d="M0 40 C 4 90, -6 120, 0 150" stroke={l3} strokeWidth="4" fill="none" />
        </g>
      )}
      {art.motif === "stones" && (
        <g>
          <rect x="0" y="200" width="400" height="60" fill={l3} opacity="0.5" />
          {[
            [200, 205, 62, 22],
            [200, 168, 50, 18],
            [200, 136, 40, 15],
            [200, 109, 30, 12],
            [200, 87, 20, 9],
          ].map(([cx, cy, rx, ry], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={art.layers[i % 3]} />
          ))}
        </g>
      )}
      <rect width="400" height="260" filter={`url(#grain${uid})`} />
    </svg>
  );
}
