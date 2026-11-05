import type { SVGProps } from 'react';
import { cn } from '../lib/cn.ts';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Without a label the icon is decorative (aria-hidden). */
  label?: string;
  size?: 24 | 32 | number;
};

function Svg({ label, size = 24, className, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      {...props}
    >
      {children}
    </svg>
  );
}

export type KnotTipo = 'simple' | 'largo' | 'ocho';

/**
 * Quipu knots (DESIGN.md 5). They differ by SHAPE, not colour, so they survive grayscale:
 * simple = one turn (finished an exhibit), largo = several turns (explained to another group),
 * ocho = two loops (solved together).
 */
export function KnotIcon({ tipo, ...props }: IconProps & { tipo: KnotTipo }) {
  return (
    <Svg data-knot={tipo} {...props}>
      {tipo === 'simple' ? (
        <>
          <path d="M12 2v5" />
          <circle cx="12" cy="11" r="4" />
          <path d="M12 15v7" />
        </>
      ) : null}
      {tipo === 'largo' ? (
        <>
          <path d="M12 2v2.5" />
          <ellipse cx="12" cy="7" rx="4" ry="2.5" />
          <ellipse cx="12" cy="12" rx="4" ry="2.5" />
          <ellipse cx="12" cy="17" rx="4" ry="2.5" />
          <path d="M12 19.5V22" />
        </>
      ) : null}
      {tipo === 'ocho' ? (
        <>
          <path d="M12 2v2" />
          <circle cx="12" cy="8" r="4" />
          <circle cx="12" cy="16" r="4" />
          <path d="M12 20v2" />
        </>
      ) : null}
    </Svg>
  );
}

export type SalaId = 'fisica' | 'bio' | 'quim' | 'tierra';

/** Hall glyphs: orbit, leaf, flask, mountain with sun. Never colour alone (DESIGN.md 2). */
export function HallGlyph({ sala, ...props }: IconProps & { sala: SalaId }) {
  return (
    <Svg data-glyph={sala} {...props}>
      {sala === 'fisica' ? (
        <>
          <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
        </>
      ) : null}
      {sala === 'bio' ? (
        <>
          <path d="M5 19C5 10 10 5 20 4c0 10-5 15-13 15" />
          <path d="M5 19c2-5 5-8 9-10" />
        </>
      ) : null}
      {sala === 'quim' ? (
        <>
          <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4A1.5 1.5 0 0 0 19.5 19L14 9V3" />
          <path d="M7.5 15h9" />
          <circle cx="11" cy="18" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="14" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {sala === 'tierra' ? (
        <>
          <path d="M2 20l7-12 4.5 7 2.5-4L22 20z" />
          <circle cx="17" cy="6" r="2" />
        </>
      ) : null}
    </Svg>
  );
}

export { Svg as IconBase };
export type { IconProps };
