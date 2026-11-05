import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectSinViolacionesGraves } from '../testing/axe.ts';
import { AudioWithTranscript } from './audio-with-transcript.tsx';
import { BottomTabs } from './bottom-tabs.tsx';
import { CameraPill } from './camera-pill.tsx';
import { CaptionBar } from './caption-bar.tsx';
import { ExhibitCard } from './exhibit-card.tsx';
import { HallSign, Plaque } from './hall.tsx';
import { ConclusionCard, EvidenceQuoteCard, HypothesisCard } from './inquiry-cards.tsx';
import { LiveRegion, TutorLog } from './live-region.tsx';
import { SpeakButton, type Narracion } from './speak-button.tsx';
import { Stepper } from './stepper.tsx';
import { SyncChip } from './sync-chip.tsx';
import { TopBar } from './top-bar.tsx';
import { UpdateBanner } from './update-banner.tsx';
import { Card } from './ui/card.tsx';
import { Switch } from './ui/switch.tsx';
import { Field } from './ui/field.tsx';

const narracion = (over: Partial<Narracion> = {}): Narracion => ({
  hablando: false,
  onToggle: vi.fn(),
  hablarLabel: 'Escuchar',
  detenerLabel: 'Detener',
  ...over,
});

describe('SpeakButton', () => {
  it('is a 48 px button that says what it does and swaps its label while speaking', async () => {
    const n = narracion();
    const { rerender } = render(<SpeakButton {...n} />);
    const button = screen.getByRole('button', { name: 'Escuchar' });
    expect(button.className).toContain('size-12');
    await userEvent.click(button);
    expect(n.onToggle).toHaveBeenCalledOnce();
    rerender(<SpeakButton {...n} hablando />);
    expect(screen.getByRole('button', { name: 'Detener' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escuchar' })).toBeNull();
  });

  it('can be disabled with a reason that is read by assistive tech', () => {
    render(<SpeakButton {...narracion({ disabled: true, motivo: 'Sin audio revisado' })} />);
    const button = screen.getByRole('button', { name: /Escuchar/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Sin audio revisado');
  });
});

describe('speak / stop button on every card and plaque', () => {
  it('Card, Plaque, ExhibitCard and the three inquiry cards all carry it', async () => {
    const n = narracion();
    render(
      <div>
        <Card narracion={n}>Una tarjeta</Card>
        <Plaque sala="fisica" salaNombre="Física" titulo="Péndulo" pregunta="¿De qué depende?" accion="Entrar" narracion={n} />
        <ExhibitCard formato="audio" formatoLabel="Audio" titulo="Voz" descripcion="d" tamano="1 MB" estado="guardado" estadoLabel="Guardado" accion="Abrir" narracion={n} />
        <HypothesisCard title="Mi hipótesis" texto="Más cuerda, más tiempo." narracion={n} />
        <EvidenceQuoteCard grupo="Puma" quote="Tarda más" narracion={n} />
        <ConclusionCard title="Conclusión" texto="A más cuerda más tiempo." narracion={n} />
      </div>,
    );
    expect(screen.getAllByRole('button', { name: 'Escuchar' })).toHaveLength(6);
    await userEvent.click(within(screen.getByTestId('plaque')).getByRole('button', { name: 'Escuchar' }));
    expect(n.onToggle).toHaveBeenCalled();
  });

  it('renders no button when narration is not offered', () => {
    render(<Card>Sin audio</Card>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('live regions', () => {
  it('LiveRegion is a polite status by default and an alert when assertive', () => {
    const { rerender } = render(<LiveRegion mensaje="Medición guardada. Sigue en este celular." />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Medición guardada. Sigue en este celular.');
    rerender(<LiveRegion mensaje="Se cortó la cámara." urgencia="assertive" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Se cortó la cámara.');
  });

  it('keeps the region mounted when the message is empty so later messages are announced', () => {
    render(<LiveRegion mensaje="" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('TutorLog is a labelled log that appends tutor messages politely', () => {
    const { rerender } = render(<TutorLog etiqueta="Mensajes de Rikuy" mensajes={[{ id: '1', texto: '¿Qué crees que pasará?' }]} />);
    const log = screen.getByRole('log', { name: 'Mensajes de Rikuy' });
    expect(log).toHaveAttribute('aria-live', 'polite');
    rerender(<TutorLog etiqueta="Mensajes de Rikuy" mensajes={[{ id: '1', texto: '¿Qué crees que pasará?' }, { id: '2', texto: '¿Cómo lo mediste?' }]} />);
    expect(within(log).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('captions and transcripts', () => {
  it('CaptionBar shows the text being narrated and nothing otherwise', () => {
    const { rerender } = render(<CaptionBar etiqueta="Subtítulos" texto={null} />);
    expect(screen.queryByText(/Tarda/)).toBeNull();
    rerender(<CaptionBar etiqueta="Subtítulos" texto="Tarda más con la cuerda larga." />);
    expect(screen.getByRole('region', { name: 'Subtítulos' })).toHaveTextContent('Tarda más con la cuerda larga.');
  });

  it('AudioWithTranscript always renders the transcript next to the player and a captions track', () => {
    const { container } = render(
      <AudioWithTranscript
        titulo="Rikuy pregunta"
        src="./audio/abc.opus"
        transcript="¿Cuánto más tardará si la cuerda mide el doble?"
        transcriptLabel="Transcripción"
        captionsSrc="./audio/abc.vtt"
        captionsLang="es"
        captionsLabel="Español"
      />,
    );
    expect(screen.getByText('¿Cuánto más tardará si la cuerda mide el doble?')).toBeVisible();
    expect(screen.getByText('Transcripción')).toBeInTheDocument();
    const track = container.querySelector('track');
    expect(track).toHaveAttribute('kind', 'captions');
    expect(container.querySelector('audio')).toHaveAttribute('preload', 'none');
    expect(container.querySelector('audio')).not.toHaveAttribute('autoplay');
  });
});

describe('axe: no serious violations in the shared components', () => {
  it('cards, plaques, exhibit formats and inquiry cards', async () => {
    const n = narracion();
    const { container } = render(
      <main>
        <h1>Museo</h1>
        <HallSign sala="bio" nombre="Biología" sublabel="Kawsay" contador="2 exhibiciones" />
        <Plaque sala="bio" salaNombre="Biología" titulo="Respiración en altura" pregunta="¿Qué cambia?" nudos={['simple', null, null]} nudosLabel="Nudos ganados: 1 de 3" accion="Entrar a la exposición" narracion={n} />
        {(['video', 'audio', 'diagrama', 'holograma', 'quiz'] as const).map((f) => (
          <ExhibitCard key={f} formato={f} formatoLabel={f} titulo={`Formato ${f}`} descripcion="d" tamano="1 MB" estado="guardado" estadoLabel="Guardado" accion={`Abrir ${f}`} narracion={n} />
        ))}
        <HypothesisCard title="Mi hipótesis" lockLabel="Antes de medir" texto="Más cuerda, más tiempo." narracion={n} />
        <EvidenceQuoteCard grupo="Grupo Puma" chip="Frase literal" quote="Tarda más" indicador="Relaciona longitud y periodo" narracion={n} />
        <EvidenceQuoteCard grupo="Grupo Condor" noEvaluable={{ chip: 'No evaluable', frase: 'Todavía no hay una frase.' }} />
        <ConclusionCard title="Conclusión" texto="A más cuerda, más tiempo." narracion={n} />
      </main>,
    );
    await expectSinViolacionesGraves(container);
  });

  it('chrome: top bar, tabs, stepper, chips, camera pill, banner, switch and field', async () => {
    const { container } = render(
      <div>
        <UpdateBanner mensaje="Hay una versión nueva." accion="Actualizar" onAccion={() => {}} descartar="Después" onDescartar={() => {}} />
        <TopBar title="Hoy" onBack={() => {}} backLabel="Volver" trailing={<SyncChip estado="sin-red" label="Sin red, todo guardado" />} />
        <main>
          <CameraPill label="Cámara activa" apagarLabel="Apagar la cámara" onApagar={() => {}} />
          <Stepper
            ariaLabel="Tu clase de hoy"
            pasos={[
              { id: 'a', label: 'Preparar', estado: 'hecho', estadoLabel: 'lista', href: '#/a' },
              { id: 'b', label: 'Museo', estado: 'ahora', estadoLabel: 'toca ahora', href: '#/b' },
              { id: 'c', label: 'Cierre', estado: 'despues', estadoLabel: 'después', href: '#/c' },
              { id: 'd', label: 'Llevar', estado: 'despues', estadoLabel: 'más tarde', href: '#/d' },
            ]}
          />
          <Switch label="Tutor" onLabel="Activo" offLabel="Apagado" checked onCheckedChange={() => {}} />
          <Field label="Código de la clase" hint="Seis letras o números" />
          <TutorLog etiqueta="Mensajes de Rikuy" mensajes={[{ id: '1', texto: '¿Qué crees que pasará?' }]} />
          <CaptionBar etiqueta="Subtítulos" texto="Hola" />
          <AudioWithTranscript titulo="Audio" src="./a.opus" transcript="Hola" transcriptLabel="Transcripción" />
        </main>
        <BottomTabs ariaLabel="Navegación principal" activeId="a" items={[{ id: 'a', label: 'Museo', href: '#/museo', icon: <svg /> }, { id: 'b', label: 'Lab', href: '#/lab', icon: <svg /> }]} />
        <LiveRegion mensaje="Listo" />
      </div>,
    );
    await expectSinViolacionesGraves(container);
  });
});
