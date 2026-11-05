import { useId, type SVGProps } from 'react';
import { cn } from '../lib/cn.ts';

/**
 * Lockup of the brand (docs/ecosistema/design/logo-rikuy.svg). The wordmark is drawn as paths, so it
 * needs no font; ink and lid follow the theme, the eye and knot keep the brand colours.
 * Minimum 20 px high for the symbol alone, 28 px for the lockup.
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 296 96"
      role="img"
      aria-label="Rikuy"
      className={cn('h-8 w-auto', className)}
      {...props}
    >
      <g fill="none" stroke="var(--rk-ink)" strokeLinecap="round" strokeLinejoin="round">
        <line x1="26" y1="4" x2="26" y2="26" strokeWidth="5" />
        <circle cx="26" cy="47" r="19" strokeWidth="6" fill="var(--rk-bg)" />
      </g>
      <circle cx="26" cy="14" r="5.5" fill="#F5B301" stroke="var(--rk-ink)" strokeWidth="2" />
      <circle cx="30" cy="46" r="12" fill="#19CBEE" />
      <circle cx="31" cy="45" r="5.5" fill="#0D2B33" />
      <circle cx="35" cy="40" r="2.4" fill="#FFFFFF" />
      <g transform="translate(76 0)" fill="none" stroke="var(--rk-ink)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 26 V70 M5 46 C5 33 13 26 27 26" />
        <path d="M45 26 V70" />
        <path d="M69 8 V70 M97 26 L69 52 M81 44 L99 70" />
        <path d="M117 26 V52 C117 64 123 70 133 70 C143 70 149 64 149 52 V26 M149 44 V70" />
        <path d="M165 26 L181 62 M197 26 L175 80" />
      </g>
      <circle cx="121" cy="10" r="6.5" fill="#19CBEE" />
    </svg>
  );
}

export type MascotEstado = 'curiosa' | 'piensa' | 'celebra' | 'sin-red';

const BODY = 'M120 92 C170 90 206 128 206 180 C206 234 168 276 118 276 C70 276 34 236 34 182 C34 130 72 94 120 92Z';
const DIAMONDS = Array.from({ length: 11 }, (_, i) => 34 + i * 16);

/**
 * Rikuy, the stone that looks (DESIGN.md 6). Four authored states only, always triggered by app
 * events (a question is due, a knot was earned, the network dropped), never by the camera.
 * The pendulum swing is the `.rk-swing` class, which theme.css switches off under reduced motion.
 */
export function Mascot({ estado = 'curiosa', size = 96, className, ...props }: { estado?: MascotEstado; size?: number } & Omit<SVGProps<SVGSVGElement>, 'children'>) {
  const clip = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 300"
      width={size}
      height={(size * 300) / 240}
      data-estado={estado}
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...props}
    >
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <g className="rk-swing">
        <line x1="120" y1="22" x2="120" y2="104" stroke="#F5B301" strokeWidth="5" strokeLinecap="round" />
        <circle cx="120" cy="66" r="7" fill="#F5B301" stroke="#8A5E00" strokeWidth="2.5" />
        <path d="M114 63 l12 6 M114 69 l12 -6" stroke="#8A5E00" strokeWidth="2" strokeLinecap="round" />
        <circle cx="120" cy="16" r="8" fill="#F5F6F1" stroke="#0D2B33" strokeWidth="3.5" />
        <path d={BODY} fill="#0B6574" />
        <g clipPath={`url(#${clip})`}>
          <path d="M30 98 L120 78 L152 132 L62 236 L28 204Z" fill="#12879A" />
          <path d="M210 146 L210 290 L88 290 L172 192Z" fill="#064550" />
          <rect x="30" y="244" width="180" height="18" fill="#064550" />
          {DIAMONDS.map((x) => (
            <path key={x} d={`M${x} 253 l8 -7 l8 7 l-8 7z`} fill="#F5B301" />
          ))}
        </g>
        <path d={BODY} fill="none" stroke="#052A31" strokeWidth="4" strokeLinejoin="round" />
        <Face estado={estado} />
      </g>
    </svg>
  );
}

function Face({ estado }: { estado: MascotEstado }) {
  const stroke = { fill: 'none', stroke: '#052A31', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  if (estado === 'celebra') {
    return (
      <g>
        <path d="M84 176 Q120 140 156 176" {...stroke} strokeWidth="8" />
        <path d="M96 222 Q120 246 144 222 Z" fill="#FFFFFF" stroke="#052A31" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M200 104 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4z" fill="#F5B301" />
        <path d="M30 120 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3z" fill="#F5B301" />
        <path d="M214 60 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3z" fill="#F5B301" />
      </g>
    );
  }
  const eye = (
    <>
      <circle cx="120" cy="176" r="42" fill="#FFFFFF" stroke="#052A31" strokeWidth="5" />
      {estado === 'piensa' ? (
        <>
          <circle cx="112" cy="168" r="24" fill="#19CBEE" />
          <circle cx="111" cy="167" r="11" fill="#0D2B33" />
          <circle cx="104" cy="159" r="5" fill="#FFFFFF" />
        </>
      ) : (
        <>
          <circle cx="128" cy="170" r="24" fill="#19CBEE" />
          <circle cx="129" cy="169" r="11" fill="#0D2B33" />
          <circle cx="136" cy="161" r="5" fill="#FFFFFF" />
          <circle cx="123" cy="177" r="2.5" fill="#FFFFFF" />
        </>
      )}
    </>
  );
  return (
    <g>
      {eye}
      {estado === 'sin-red' ? (
        <>
          <path d="M72 168 Q120 152 168 168 L168 150 Q120 134 72 150Z" fill="#0B6574" stroke="#052A31" strokeWidth="3" strokeLinejoin="round" />
          <path d="M104 232 Q120 242 136 232" {...stroke} strokeWidth="4.5" />
          <g transform="translate(176 96)" fill="none" stroke="#F5B301" strokeWidth="4" strokeLinecap="round">
            <path d="M0 14c8-8 20-8 28 0M6 21c5-5 11-5 16 0" />
            <circle cx="14" cy="28" r="1.6" fill="#F5B301" />
            <path d="M2 2l26 30" />
          </g>
        </>
      ) : null}
      {estado === 'curiosa' ? (
        <>
          <path d="M76 128 Q104 108 144 124" {...stroke} strokeWidth="8" />
          <path d="M106 229 Q120 237 134 229" {...stroke} strokeWidth="4.5" />
        </>
      ) : null}
      {estado === 'piensa' ? (
        <>
          <path d="M80 126 L148 126" {...stroke} strokeWidth="8" />
          <path d="M108 232 L132 232" {...stroke} strokeWidth="4.5" />
          <text x="186" y="112" fontSize="56" fontWeight="800" fill="#F5B301" stroke="#8A5E00" strokeWidth="1.5">
            ?
          </text>
        </>
      ) : null}
    </g>
  );
}
