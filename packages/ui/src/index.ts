/**
 * @rikuy/ui: shadcn/ui components, "Luz de Puna" tokens and presentational components
 * (props only, no domain, no i18n: labels arrive as props). Owned by F1.
 * Styles: import `@rikuy/ui/theme.css` in the app stylesheet.
 */
export const packageName = '@rikuy/ui' as const;

export { cn } from './lib/cn.ts';
export { Button, buttonVariants, type ButtonProps } from './components/ui/button.tsx';
export { Card, CardDescription, CardTitle, type CardProps } from './components/ui/card.tsx';
export { Chip, type ChipProps } from './components/ui/chip.tsx';
export { Field, SelectField, type SelectOption } from './components/ui/field.tsx';
export { Switch, type SwitchProps } from './components/ui/switch.tsx';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
export { Logo, Mascot, type MascotEstado } from './components/brand.tsx';
export { BottomTabs, type TabItem } from './components/bottom-tabs.tsx';
export { CameraPill } from './components/camera-pill.tsx';
export { ExhibitCard, type EstadoDescarga, type ExhibitCardProps, type FormatoExhibicion } from './components/exhibit-card.tsx';
export { HallSign, Plaque, type PlaqueProps } from './components/hall.tsx';
export { HallGlyph, KnotIcon, type KnotTipo, type SalaId } from './components/icons.tsx';
export { ConclusionCard, EvidenceQuoteCard, HypothesisCard, type EvidenceQuoteCardProps } from './components/inquiry-cards.tsx';
export { Stepper, type EstadoPaso, type Paso } from './components/stepper.tsx';
export { SyncChip, type EstadoSync } from './components/sync-chip.tsx';
export { TopBar } from './components/top-bar.tsx';
export { UpdateBanner } from './components/update-banner.tsx';
export { SpeakButton, type Narracion } from './components/speak-button.tsx';
export { LiveRegion, TutorLog, type MensajeTutor } from './components/live-region.tsx';
export { CaptionBar } from './components/caption-bar.tsx';
export { AudioWithTranscript } from './components/audio-with-transcript.tsx';
export { auditarContraste, contrastRatio, relativeLuminance, type InformeContraste, type ParContraste } from './a11y/contraste.ts';
export { ESCALAS_TEXTO, escalaSiguiente, normalizarEscala, porcentajeEscala, type EscalaTexto } from './a11y/escala.ts';
export { crearHaptica, PATRONES_HAPTICOS, type Haptica, type PatronHaptico } from './a11y/haptica.ts';
