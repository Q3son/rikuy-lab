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
