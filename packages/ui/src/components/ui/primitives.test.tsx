import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button.tsx';
import { Card, CardTitle } from './card.tsx';
import { Chip } from './chip.tsx';
import { Field, SelectField } from './field.tsx';
import { Switch } from './switch.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.tsx';

describe('Button', () => {
  it('is a 48 px control by default and 56 px when large', () => {
    const { rerender } = render(<Button>Guardar medición</Button>);
    expect(screen.getByRole('button', { name: 'Guardar medición' }).className).toContain('h-12');
    rerender(<Button size="lg">Empezar la clase</Button>);
    expect(screen.getByRole('button', { name: 'Empezar la clase' }).className).toContain('h-14');
  });

  it('marks the variant and gives only the primary one a press edge', () => {
    const { rerender } = render(<Button variant="primary">Entrar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary');
    expect(screen.getByRole('button').className).toContain('press-edge');
    rerender(<Button variant="secondary">Entrar</Button>);
    expect(screen.getByRole('button').className).not.toContain('press-edge');
  });

  it('renders a secondary-language sublabel under the label', () => {
    render(<Button sublabel="Yachay wasi">Museo</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('MuseoYachay wasi');
    expect(screen.getByText('Yachay wasi').className).toContain('italic');
  });

  it('does not fire when disabled and can render as a link', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button disabled onClick={onClick}>Aprobar</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button asChild><a href="#/museo">Ir al museo</a></Button>);
    expect(screen.getByRole('link', { name: 'Ir al museo' })).toHaveAttribute('href', '#/museo');
  });
});

describe('Card', () => {
  it('uses the card radius, a 2 px border and tone data attribute', () => {
    render(<Card tone="hypothesis" data-testid="c"><CardTitle>Mi hipótesis</CardTitle></Card>);
    const card = screen.getByTestId('c');
    expect(card).toHaveAttribute('data-tone', 'hypothesis');
    expect(card.className).toContain('rounded-card');
    expect(card.className).toContain('border-2');
    expect(screen.getByRole('heading', { name: 'Mi hipótesis' })).toBeInTheDocument();
  });
});

describe('Chip', () => {
  it('is 32 px static and 48 px when tappable', () => {
    const { rerender } = render(<Chip variant="ok">Aprobada</Chip>);
    expect(screen.getByText('Aprobada').closest('[data-chip]')!.className).toContain('h-8');
    rerender(<Chip variant="ok" onClick={() => {}}>Aprobada</Chip>);
    const tappable = screen.getByRole('button', { name: 'Aprobada' });
    expect(tappable.className).toContain('min-h-12');
  });
});

describe('Switch', () => {
  it('states its value in words, never by colour alone', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Tutor" onLabel="Activo" offLabel="Apagado" checked={false} onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch', { name: 'Tutor' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Apagado')).toBeInTheDocument();
    await userEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe('Field', () => {
  it('shows a visible label and links the error text to the input', () => {
    render(<Field label="Código de la clase" error="Escribe 6 letras o números." />);
    const input = screen.getByLabelText('Código de la clase');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const err = screen.getByText('Escribe 6 letras o números.');
    expect(input.getAttribute('aria-describedby')).toContain(err.id);
  });

  it('offers a native select for closed lists', async () => {
    const onChange = vi.fn();
    render(<SelectField label="Apodo" value="" onChange={onChange} options={[{ value: 'Puma', label: 'Puma' }, { value: 'Condor', label: 'Cóndor' }]} placeholder="Elige uno" />);
    await userEvent.selectOptions(screen.getByLabelText('Apodo'), 'Condor');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Tabs', () => {
  it('switches panels with a tablist', async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Formatos">
          <TabsTrigger value="a">Holograma</TabsTrigger>
          <TabsTrigger value="b">Diagrama</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tablist', { name: 'Formatos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Holograma' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Diagrama' }));
    expect(screen.getByText('Panel B')).toBeVisible();
  });
});
