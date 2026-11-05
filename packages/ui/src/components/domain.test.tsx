import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomTabs } from './bottom-tabs.tsx';
import { CameraPill } from './camera-pill.tsx';
import { ConclusionCard, EvidenceQuoteCard, HypothesisCard } from './inquiry-cards.tsx';
import { ExhibitCard } from './exhibit-card.tsx';
import { HallSign, Plaque } from './hall.tsx';
import { HallGlyph, KnotIcon } from './icons.tsx';
import { Logo, Mascot } from './brand.tsx';
import { Stepper } from './stepper.tsx';
import { SyncChip } from './sync-chip.tsx';
import { TopBar } from './top-bar.tsx';
import { UpdateBanner } from './update-banner.tsx';

describe('SyncChip', () => {
  it.each([
    ['sin-red', 'off'],
    ['por-enviar', 'warn'],
    ['enviando', 'sync'],
    ['enviado', 'ok'],
    ['error', 'off'],
  ] as const)('state %s uses the %s chip variant and says where the data is', (estado, variant) => {
    render(<SyncChip estado={estado} label="Sin red, todo guardado" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Sin red, todo guardado');
    expect(status.querySelector('[data-chip]')).toHaveAttribute('data-variant', variant);
    expect(status.querySelector('svg')).not.toBeNull();
  });

  it('turns into a 48 px button that opens the queue when tappable', async () => {
    const onClick = vi.fn();
    render(<SyncChip estado="por-enviar" label="3 mediciones por enviar" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: '3 mediciones por enviar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('CameraPill', () => {
  it('names the camera and offers a 48 px power button that turns it off', async () => {
    const onApagar = vi.fn();
    render(<CameraPill label="Cámara activa" apagarLabel="Apagar la cámara" onApagar={onApagar} />);
    expect(screen.getByText('Cámara activa')).toBeInTheDocument();
    const off = screen.getByRole('button', { name: 'Apagar la cámara' });
    expect(off.className).toContain('size-12');
    await userEvent.click(off);
    expect(onApagar).toHaveBeenCalledOnce();
  });
});

describe('inquiry cards', () => {
  it('HypothesisCard shows lightbulb, the word and the lock before measuring', () => {
    render(<HypothesisCard title="Mi hipótesis" lockLabel="Antes de medir" texto="Si alargo la cuerda, tarda más." />);
    const card = screen.getByTestId('hypothesis-card');
    expect(card).toHaveAttribute('data-tone', 'hypothesis');
    expect(within(card).getByText('Antes de medir')).toBeInTheDocument();
    expect(within(card).getByText('Si alargo la cuerda, tarda más.')).toBeInTheDocument();
  });

  it('EvidenceQuoteCard shows the quote verbatim between typographic quotes', () => {
    render(
      <EvidenceQuoteCard
        grupo="Grupo Vizcacha"
        chip="Frase literal"
        quote="Tarda más porque la cuerda es más larga"
        indicador="Muestra: relaciona longitud y periodo"
      />,
    );
    const quote = screen.getByTestId('evidence-quote');
    expect(quote.textContent).toBe('«Tarda más porque la cuerda es más larga»');
    expect(screen.getByText('Grupo Vizcacha')).toBeInTheDocument();
  });

  it('EvidenceQuoteCard has a dashed "not evaluable" variant that never invents a quote', () => {
    render(<EvidenceQuoteCard grupo="Grupo Puma" noEvaluable={{ chip: 'No evaluable', frase: 'Todavía no hay una frase del grupo sobre esto.' }} />);
    expect(screen.queryByTestId('evidence-quote')).toBeNull();
    expect(screen.getByText('No evaluable')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-card')).toHaveAttribute('data-tone', 'dashed');
  });

  it('ConclusionCard carries the check and the group sentence', () => {
    render(<ConclusionCard title="Conclusión" texto="A más cuerda, más tiempo." />);
    expect(screen.getByTestId('conclusion-card')).toHaveAttribute('data-tone', 'conclusion');
  });
});

describe('quipu knots and glyphs', () => {
  it('draws three knot types that differ by shape, not colour', () => {
    const shapes = (['simple', 'largo', 'ocho'] as const).map((tipo) => {
      const { container, unmount } = render(<KnotIcon tipo={tipo} label={tipo} />);
      const html = container.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(shapes).size).toBe(3);
  });

  it('exposes a labelled role image when a label is given and hides decoration otherwise', () => {
    const { rerender } = render(<KnotIcon tipo="simple" label="Nudo simple" />);
    expect(screen.getByRole('img', { name: 'Nudo simple' })).toBeInTheDocument();
    rerender(<KnotIcon tipo="simple" />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('has a glyph for each of the four halls', () => {
    for (const sala of ['fisica', 'bio', 'quim', 'tierra'] as const) {
      const { container, unmount } = render(<HallGlyph sala={sala} />);
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });
});

describe('hall sign and plaque', () => {
  it('HallSign scopes the hall colour and shows glyph, name, Quechua sublabel and count', () => {
    render(<HallSign sala="fisica" nombre="Física" sublabel="Kallpa" contador="3 exhibiciones" />);
    const sign = screen.getByTestId('hall-sign');
    expect(sign).toHaveAttribute('data-hall', 'fisica');
    expect(within(sign).getByText('Física')).toBeInTheDocument();
    expect(within(sign).getByText('Kallpa').className).toContain('italic');
    expect(within(sign).getByText('3 exhibiciones')).toBeInTheDocument();
    expect(sign.querySelector('.trama')).not.toBeNull();
  });

  it('Plaque has the hall rail, a Socratic question, three knot slots and the entry action', async () => {
    const onEntrar = vi.fn();
    render(
      <Plaque
        sala="bio"
        salaNombre="Biología"
        titulo="Respiración en altura"
        pregunta="¿Qué cambia en tu cuerpo cuando subes?"
        chips={['Guardado, 0.4 MB', 'Gestos o toque']}
        nudos={['simple', null, null]}
        nudosLabel="Nudos ganados: 1 de 3"
        accion="Entrar a la exposición"
        onAccion={onEntrar}
      />,
    );
    const plaque = screen.getByTestId('plaque');
    expect(plaque).toHaveAttribute('data-hall', 'bio');
    expect(within(plaque).getByText('¿Qué cambia en tu cuerpo cuando subes?')).toBeInTheDocument();
    expect(within(plaque).getByRole('img', { name: 'Nudos ganados: 1 de 3' })).toBeInTheDocument();
    expect(plaque.querySelectorAll('[data-knot-slot]')).toHaveLength(3);
    expect(plaque.querySelectorAll('[data-knot-slot][data-earned="true"]')).toHaveLength(1);
    await userEvent.click(within(plaque).getByRole('button', { name: 'Entrar a la exposición' }));
    expect(onEntrar).toHaveBeenCalledOnce();
  });
});

describe('ExhibitCard', () => {
  it.each(['video', 'audio', 'diagrama', 'holograma', 'quiz'] as const)('renders the %s format with a badge, title and download state', (formato) => {
    render(
      <ExhibitCard
        formato={formato}
        formatoLabel={formato}
        titulo="El péndulo"
        descripcion="Mide cuánto tarda en ir y volver."
        tamano="0,4 MB"
        estado="guardado"
        estadoLabel="Guardado"
        accion="Abrir"
      />,
    );
    const card = screen.getByTestId('exhibit-card');
    expect(card).toHaveAttribute('data-formato', formato);
    expect(within(card).getByText(formato)).toBeInTheDocument();
    expect(within(card).getByText('Guardado')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Abrir' })).toBeInTheDocument();
  });

  it('the hologram format always renders in the holo theme', () => {
    render(<ExhibitCard formato="holograma" formatoLabel="Holograma" titulo="t" descripcion="d" tamano="1 MB" estado="en-clase" estadoLabel="Se descarga en la clase" accion="Abrir" />);
    expect(screen.getByTestId('exhibit-art')).toHaveAttribute('data-theme', 'holo');
  });
});

describe('BottomTabs', () => {
  const items = [
    { id: 'museo', label: 'Museo', href: '#/museo', icon: <svg /> },
    { id: 'lab', label: 'Lab', href: '#/lab', icon: <svg /> },
    { id: 'yo', label: 'Yo', href: '#/yo', icon: <svg /> },
  ];

  it('is a tablist where only the active item is selected', () => {
    render(<BottomTabs ariaLabel="Navegación principal" items={items} activeId="lab" />);
    expect(screen.getByRole('tablist', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lab' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Museo' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Lab' })).toHaveAttribute('href', '#/lab');
  });

  it('moves focus with the arrow keys', async () => {
    render(<BottomTabs ariaLabel="Navegación principal" items={items} activeId="museo" />);
    screen.getByRole('tab', { name: 'Museo' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Lab' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Yo' })).toHaveFocus();
  });
});

describe('Stepper', () => {
  it('shows four stages with their state in words and marks the current one', () => {
    render(
      <Stepper
        ariaLabel="Tu clase de hoy"
        pasos={[
          { id: 'preparar', label: 'Preparar', estado: 'hecho', estadoLabel: 'lista', href: '#/creador' },
          { id: 'museo', label: 'Museo', estado: 'ahora', estadoLabel: 'toca ahora', href: '#/clase' },
          { id: 'cierre', label: 'Cierre', estado: 'despues', estadoLabel: 'después', href: '#/evidencia' },
          { id: 'llevar', label: 'Llevar', estado: 'despues', estadoLabel: 'antes del 11 dic', href: '#/clase' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'Tu clase de hoy' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /Museo/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('link', { name: /Preparar/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('toca ahora')).toBeInTheDocument();
  });
});

describe('TopBar', () => {
  it('renders a 48 px back button only when deep, plus the status slot', async () => {
    const onBack = vi.fn();
    const { rerender } = render(<TopBar title="Museo" />);
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    rerender(
      <TopBar title="Sala Física" onBack={onBack} backLabel="Volver" trailing={<span>chip</span>} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText('chip')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sala Física' })).toBeInTheDocument();
  });
});

describe('UpdateBanner', () => {
  it('announces the new version politely and updates on demand', async () => {
    const onUpdate = vi.fn();
    const onDismiss = vi.fn();
    render(<UpdateBanner mensaje="Hay una versión nueva de Rikuy." accion="Actualizar" onAccion={onUpdate} descartar="Después" onDescartar={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva de Rikuy.');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(onUpdate).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Después' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('brand', () => {
  it('Logo has an accessible name and Mascot exposes its four authored states', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'Rikuy' })).toBeInTheDocument();
    for (const estado of ['curiosa', 'piensa', 'celebra', 'sin-red'] as const) {
      const { container, unmount } = render(<Mascot estado={estado} />);
      expect(container.querySelector('svg')).toHaveAttribute('data-estado', estado);
      unmount();
    }
  });

  it('Mascot swing is a CSS class so reduced motion can switch it off', () => {
    const { container } = render(<Mascot estado="curiosa" />);
    expect(container.querySelector('.rk-swing')).not.toBeNull();
  });
});
