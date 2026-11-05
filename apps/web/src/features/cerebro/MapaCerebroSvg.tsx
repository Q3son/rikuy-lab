import type { MapaCerebro, NodoMapa } from '@rikuy/cerebro';
import { ETIQUETA_ESTADO } from '@rikuy/cerebro';

export interface MapaCerebroSvgProps {
  mapa: MapaCerebro;
  seleccionado?: string;
  onSeleccionar(nodoId: string): void;
}

const radio = (n: NodoMapa) => (n.tipo === 'competencia' ? 24 : 15);
const TINTA = 'var(--rk-ink, #0d2b33)';

function Nodo({ n, activo, onSeleccionar }: { n: NodoMapa; activo: boolean; onSeleccionar(id: string): void }) {
  const r = radio(n);
  const etiqueta = `${n.etiqueta}: ${ETIQUETA_ESTADO[n.estado]}${n.preguntaAbierta ? ', con una pregunta abierta' : ''}`;
  return (
    <g
      data-nodo={n.id}
      role="button"
      tabIndex={0}
      aria-label={etiqueta}
      onClick={() => onSeleccionar(n.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSeleccionar(n.id);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {activo && <circle cx={n.x} cy={n.y} r={r + 8} fill="none" stroke={TINTA} strokeWidth={2} />}
      {n.estado === 'logrado' && <circle cx={n.x} cy={n.y} r={r + 5} fill="none" stroke="var(--rk-primary, #075e6c)" strokeWidth={1.5} opacity={0.4} />}
      {n.estado === 'en_camino' && (
        <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="var(--rk-sol-ink, #6b4300)" strokeWidth={3} strokeDasharray={`${Math.PI * (r + 4)} ${Math.PI * (r + 4)}`} />
      )}
      <circle
        data-cuerpo="true"
        cx={n.x}
        cy={n.y}
        r={r}
        fill={n.estado === 'logrado' ? 'var(--rk-primary, #075e6c)' : n.estado === 'sin_explorar' ? 'none' : n.estado === 'en_camino' ? 'var(--rk-sol-tint, #fff1cc)' : 'var(--rk-primary-tint, #dcebec)'}
        stroke={TINTA}
        strokeWidth={2}
        strokeDasharray={n.estado === 'sin_explorar' ? '4 3' : undefined}
      />
      {n.estado === 'logrado' && <path d={`M${n.x - r / 2} ${n.y} l${r / 3} ${r / 3} l${r * 0.65} ${-r * 0.65}`} fill="none" stroke="var(--rk-on-primary, #fff)" strokeWidth={3} strokeLinecap="round" />}
      {n.preguntaAbierta && (
        <g>
          <circle cx={n.x + r} cy={n.y - r} r={9} fill="var(--rk-surface, #fff)" stroke={TINTA} strokeWidth={2} />
          <text x={n.x + r} y={n.y - r + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={TINTA}>?</text>
        </g>
      )}
      <text x={n.x} y={n.y + r + 16} textAnchor="middle" fontSize={13} fontWeight={600} fill={TINTA}>{n.etiqueta}</text>
    </g>
  );
}

/** One static SVG: precomputed positions, no force simulation, no glow or particles. */
export function MapaCerebroSvg({ mapa, seleccionado, onSeleccionar }: MapaCerebroSvgProps) {
  const porId = new Map(mapa.nodos.map((n) => [n.id, n]));
  const iluminados = mapa.nodos.filter((n) => n.estado !== 'sin_explorar').length;
  return (
    <svg
      role="group"
      viewBox="0 0 800 600"
      width="100%"
      aria-label={`Mi Cerebro Rikuy: ${mapa.nodos.length} nodos, ${iluminados} con evidencia tuya. Hay una lista con lo mismo.`}
      style={{ background: 'var(--rk-surface, #fff)', border: '2px solid var(--rk-border, #d3d9cc)', borderRadius: 16 }}
    >
      {mapa.aristas.map((a, i) => {
        const d = porId.get(a.desde);
        const h = porId.get(a.hasta);
        if (!d || !h) return null;
        const fuerte = d.estado === 'logrado' && h.estado === 'logrado';
        return (
          <line key={i} x1={d.x} y1={d.y} x2={h.x} y2={h.y} stroke={fuerte ? TINTA : 'var(--rk-border-strong, #6a7568)'} strokeWidth={fuerte ? 3 : 1.5} strokeDasharray={a.tipo === 'depende_de' ? '6 4' : undefined} />
        );
      })}
      {mapa.nodos.map((n) => (
        <Nodo key={n.id} n={n} activo={seleccionado === n.id} onSeleccionar={onSeleccionar} />
      ))}
    </svg>
  );
}
