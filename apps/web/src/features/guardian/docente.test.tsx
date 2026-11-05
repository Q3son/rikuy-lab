import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  agregarCurso,
  contieneEtiquetaEmocional,
  generarSugerencias,
  construirPedidoDeAyuda,
  type SugerenciaAcercamiento,
} from '@rikuy/senales';
import { DelCurso } from './DelCurso.tsx';
import { ParaAcercarse } from './ParaAcercarse.tsx';

afterEach(cleanup);

const ids = { e: '01JC0000000000000000000E01', c: '01JC0000000000000000000C01' };
const sug = (urgente: boolean): SugerenciaAcercamiento =>
  generarSugerencias(
    { senales: [], pedidos: [construirPedidoDeAyuda({ id: ids.e, estudianteId: ids.e, claseId: ids.c, destino: 'docente', urgente, hlc: '1762300800000-0000-docente1' })], autorreportes: [] },
    { ahora: 1762300800000 },
  ).sugerencias[0] as SugerenciaAcercamiento;

describe('ParaAcercarse (the only per-student view, teacher only)', () => {
  it('shows the reason in pedagogical language, a conversation guide and three decision buttons', async () => {
    const u = userEvent.setup();
    const onDecidir = vi.fn();
    render(<ParaAcercarse sugerencias={[sug(false)]} alias={() => 'E01'} onDecidir={onDecidir} />);
    expect(screen.getByText('E01')).toBeTruthy();
    expect(screen.getByText('Pidió hablar con usted.')).toBeTruthy();
    expect(screen.getByText(/Es una sugerencia con incertidumbre/)).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Ya conversé' }));
    expect(onDecidir).toHaveBeenCalledWith(expect.any(String), 'ya_converse');
    expect(screen.getByRole('button', { name: 'No era necesario' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No aplica' })).toBeTruthy();
  });

  it('never renders an emotion label, with or without escalation', () => {
    const { container } = render(<ParaAcercarse sugerencias={[sug(false), sug(true)]} alias={() => 'E01'} onDecidir={() => {}} />);
    expect(contieneEtiquetaEmocional(container.textContent)).toBe(false);
  });

  it('an escalation says to follow the SíseVe route', () => {
    render(<ParaAcercarse sugerencias={[sug(true)]} alias={() => 'E01'} onDecidir={() => {}} />);
    expect(screen.getAllByText(/ruta SíseVe/).length).toBeGreaterThan(0);
  });

  it('says plainly when there is nothing to do this week', () => {
    render(<ParaAcercarse sugerencias={[]} alias={() => ''} onDecidir={() => {}} />);
    expect(screen.getByText('Esta semana no hay sugerencias.')).toBeTruthy();
  });
});

describe('DelCurso (class aggregate, 5 or more)', () => {
  it('shows the suppression message below 5 participants', () => {
    render(<DelCurso agregado={agregarCurso({ participantes: ['a', 'b'], autorreportes: [], eventos: [], inicioClaseMs: 0, gruposTotal: 2 })} onApagarClase={() => {}} />);
    expect(screen.getByText('Muy pocos participantes para mostrar un resumen.')).toBeTruthy();
  });

  it('shows participation as a count, the sentence about instruction and a class-wide off button', async () => {
    const u = userEvent.setup();
    const onApagar = vi.fn();
    const agregado = {
      estado: 'visible' as const,
      participan: 18,
      pistasPorBin: [{ desdeMin: 20, hastaMin: 25, pedidos: 4, grupos: 4 }],
      oracion: 'Entre los minutos 20 y 25, 4 de 5 grupos pidieron pista en «medir». Revisa cómo se explica ese paso.',
    };
    render(<DelCurso agregado={agregado} totalClase={24} onApagarClase={onApagar} />);
    expect(screen.getByText('18 de 24 participan')).toBeTruthy();
    expect(screen.getByText(/Revisa cómo se explica ese paso/)).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Apagar para toda la clase' }));
    expect(onApagar).toHaveBeenCalled();
  });
});
