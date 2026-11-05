import { Check, Eye, Lightbulb, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { Card } from './ui/card.tsx';
import { Chip } from './ui/chip.tsx';

/** Left rail shared by the inquiry cards: 10 px, role colour (DESIGN.md 11). */
const rail = 'relative overflow-hidden pl-7 before:absolute before:inset-y-0 before:left-0 before:w-2.5';

/** Hypothesis: Sol, lightbulb + "Mi hipótesis" + "Antes de medir" lock chip. Locked once measuring starts. */
export function HypothesisCard({ title, lockLabel, texto, className }: { title: string; lockLabel?: string; texto: string; className?: string }) {
  return (
    <Card tone="hypothesis" data-testid="hypothesis-card" className={cn(rail, 'before:bg-sol', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Lightbulb className="size-6 text-sol-ink" aria-hidden="true" />
        <h3 className="text-title-sm font-bold text-sol-ink">{title}</h3>
        {lockLabel ? (
          <Chip variant="warn" icon={<Lock />}>
            {lockLabel}
          </Chip>
        ) : null}
      </div>
      <p className="mt-2 text-body text-ink">{texto}</p>
    </Card>
  );
}

export interface EvidenceQuoteCardProps {
  /** Group name (alias, never a real student name). */
  grupo: string;
  chip?: string;
  /** The students words, verbatim. */
  quote?: string;
  /** One line saying which indicator the quote shows. */
  indicador?: string;
  /** No-evidence variant: dashed, "No evaluable". The app never grades. */
  noEvaluable?: { chip: string; frase: string };
  className?: string;
}

/** Evidence quote: Fotón, eye + group, "Frase literal" chip, verbatim quote in 19 px between typographic quotes. */
export function EvidenceQuoteCard({ grupo, chip, quote, indicador, noEvaluable, className }: EvidenceQuoteCardProps) {
  if (noEvaluable) {
    return (
      <Card tone="dashed" data-testid="evidence-card" className={className}>
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="size-6 text-ink-2" aria-hidden="true" />
          <h3 className="text-title-sm font-bold">{grupo}</h3>
          <Chip variant="dashed">{noEvaluable.chip}</Chip>
        </div>
        <p className="mt-2 text-body text-ink-2">{noEvaluable.frase}</p>
      </Card>
    );
  }
  return (
    <Card tone="evidence" data-testid="evidence-card" className={cn(rail, 'before:bg-foton', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="size-6 text-foton-ink" aria-hidden="true" />
        <h3 className="text-title-sm font-bold text-foton-ink">{grupo}</h3>
        {chip ? <Chip variant="sync">{chip}</Chip> : null}
      </div>
      <blockquote className="m-0 mt-2">
        <p data-testid="evidence-quote" className="text-body-lg font-semibold text-ink">{`«${quote ?? ''}»`}</p>
      </blockquote>
      {indicador ? <p className="mt-1 text-small text-ink-2">{indicador}</p> : null}
    </Card>
  );
}

/** Conclusion: Ichu, check + the group sentence. */
export function ConclusionCard({ title, texto, className, children }: { title: string; texto: string; className?: string; children?: ReactNode }) {
  return (
    <Card tone="conclusion" data-testid="conclusion-card" className={cn(rail, 'before:bg-ichu', className)}>
      <div className="flex items-center gap-2">
        <Check className="size-6 text-ichu-ink" aria-hidden="true" />
        <h3 className="text-title-sm font-bold text-ichu-ink">{title}</h3>
      </div>
      <p className="mt-2 text-body text-ink">{texto}</p>
      {children}
    </Card>
  );
}
