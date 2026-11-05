---
name: Luz de Puna
description: Design system of Rikuy and Museo Rikuy, an offline-first science museum for Peruvian public and rural secondary schools. Legible in full sun, calm on low-end Android, hologram-ready.
colors:
  background: '#F5F6F1'
  surface: '#FFFFFF'
  surface-container-low: '#E9ECE4'
  surface-container: '#E9ECE4'
  on-surface: '#0D2B33'
  on-surface-variant: '#33494F'
  outline: '#6A7568'
  outline-variant: '#D3D9CC'
  primary: '#075E6C'
  on-primary: '#FFFFFF'
  primary-container: '#DCEBEC'
  on-primary-container: '#04474F'
  secondary: '#19CBEE'
  on-secondary: '#0D2B33'
  secondary-container: '#D9F4FA'
  on-secondary-container: '#00566A'
  tertiary: '#F5B301'
  on-tertiary: '#0D2B33'
  tertiary-container: '#FFF1CC'
  on-tertiary-container: '#6B4300'
  error: '#A8123B'
  on-error: '#FFFFFF'
  error-container: '#FBE6EA'
  on-error-container: '#96102F'
  success: '#14592D'
  on-success: '#FFFFFF'
  success-container: '#E3F2E6'
  hall-fisica: '#075E6C'
  hall-bio: '#435F0F'
  hall-quim: '#9E3206'
  hall-tierra: '#6E4A2F'
  holo-background: '#000000'
  holo-line: '#5FE3FF'
  holo-accent: '#FFC14D'
  night-background: '#0A1A1F'
  night-surface: '#112429'
  night-primary: '#3FD8F2'
typography:
  display:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  title:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 30px
  body:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  caption:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  numeral:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 56px
rounded:
  ctl: 12px
  card: 16px
  sheet: 24px
  chip: 999px
spacing:
  unit: 4px
  touch-min: 48px
  touch-primary: 56px
  tile: 32px
---

# Design System: Luz de Puna (Rikuy and Museo Rikuy)

**Version:** 0.2.0. **Source of truth for code:** `packages/ui/tokens/tokens.css` and `tokens.json` (generated from the same table as this document). **Review page:** `docs/ecosistema/design/moodboard.html` (self-contained, no network). **Brand art:** `design/mascota-rikuy.svg`, `design/logo-rikuy.svg`.

## 0. Product frame this system serves

- **Museo Rikuy** is a 2D, top-down, Gather-like science museum the student explores on a phone. Halls are curriculum areas (Física, Biología, Química, Tierra y ambiente). Exhibits are holograms the student manipulates by hand gesture (touch is always the fallback). The economy is a cooperative "quipu de logros": knots earned by helping.
- **The lab** is the heart: a science lab on the teacher's phone that works offline (stopwatch, measurement table, chart, hypothesis, evidence).
- **Around it:** Socratic tutor mascot Rikuy, contextual games, teacher panel, family take-home pack, Quechua and Aymara layer, optional "Rikuy Guardián", "Mi Cerebro Rikuy" knowledge map, and serious reports for school directors and UGEL.
- **Shell rule (the MyLEA lesson):** one home with tabs. Student tabs: Museo, Lab, Cerebro, Quipu, Llevar. Teacher tabs: Preparar, Clase, Cierre, Informe, Llevar. Same top bar, same tab bar, same cards, so every feature reads as a tab of one product.

## 1. Visual Theme and Atmosphere

**Direction name: Luz de Puna ("puna light").** The high-altitude light of the Andean plateau: hard, clear, shadows with edges. The interface is built like a mineral specimen under that light: flat planes, crisp boundaries, one vivid photon accent, everything legible at arm's length in a sunny classroom with a cracked screen.

**Brand essence.** *Rikuy* means "to look" in Quechua. The brand is about learning to look carefully: ask, guess, measure, say what you saw. Three commitments: (1) **Legible in full sun** (AAA body text, 3:1 control edges, nothing grey on grey). (2) **Honest offline** (connection and saved state are always visible and named). (3) **One cord, many knots** (the quipu is the structural metaphor: halls are cords, achievements are knots, helping adds knots for the whole group).

**What carries the identity** (one idea each, never stacked):
1. The **mascot**, a river stone hanging from a knotted cord. It is also the pendulum of the first experiment.
2. The **quipu** system: cord lines, pendant cords per hall, three knot types.
3. The **trama**, one stepped-diamond strip (16 x 12 px tile) used as a divider, corridor edge and hall-sign base. At most one per screen.
4. **Mineral grounds with a photon accent**: salt-flat white, lake ink, laguna teal, with Fotón cyan and Sol amber as the science light.

**Respectful Andean references.** Textile geometry (stepped diamonds, strict grids), quipu cord-and-knot logic, mountain light as flat hard-edged planes (the hero ridge), mineral and dye colors (azurite-teal laguna, cinnabar, clay, moss). **Never**: ponchos, llamas, pan flutes, fringe borders, rainbow "Andean" stripes, pseudo-Inca display fonts, mock-stone textures, folkloric characters. Cultural content (Quechua and Aymara words, textile motifs beyond the trama) is co-designed with EIB teachers and community members, not invented by the team.

**Atmosphere in one line.** A clean science museum drawn with the discipline of a textile grid and the contrast of high-altitude sun.

## 2. Color Palette and Roles

Three modes share the same token names (`--rk-*`). Switch with `data-theme="light|dark|holo"` on any element (they nest). Without the attribute the system preference is respected (dark or light).

| Mode | Use | Rule |
|---|---|---|
| **Luz (light)** | Default. Classroom with sun and glare. | Sal de Maras ground, Hoja cards, Tinta de lago ink. |
| **Noche (dark)** | Dim rooms, evenings at home. | Deep lake ground, lifted accents. No pure black. |
| **Holograma (holo)** | Display phone under the Pepper's-ghost pyramid. | Absolute black `#000000` (black does not reflect), line work only, no fills over 16 px except tints at 8 % or less. |

### Core tokens

| Token | Name | Luz | Noche | Holo |
|---|---|---|---|---|
| `bg` | Sal de Maras | `#F5F6F1` | `#0A1A1F` | `#000000` |
| `surface` | Hoja | `#FFFFFF` | `#112429` | `#000000` |
| `surface-2` | Piedra | `#E9ECE4` | `#183139` | `#04141A` |
| `border` | Veta | `#D3D9CC` | `#254049` | `#2A7587` |
| `border-strong` | Veta firme | `#6A7568` | `#7B979E` | `#5FE3FF` |
| `ink` | Tinta de lago | `#0D2B33` | `#EDF5F6` | `#F2FBFF` |
| `ink-2` | Tinta suave | `#33494F` | `#C3D6D9` | `#BFE9F5` |
| `muted` | Niebla honda | `#4D6368` | `#9FB8BC` | `#8FB5BF` |
| `primary` | Laguna | `#075E6C` | `#3FD8F2` | `#5FE3FF` |
| `primary-press` | Laguna honda | `#04474F` | `#2BB8D1` | `#A8F1FF` |
| `on-primary` | Sobre laguna | `#FFFFFF` | `#03222A` | `#000000` |
| `primary-tint` | Laguna clara | `#DCEBEC` | `#123A44` | `#031E25` |
| `foton` | Fotón | `#19CBEE` | `#3FD8F2` | `#5FE3FF` |
| `on-foton` | on-foton | `#0D2B33` | `#03222A` | `#000000` |
| `foton-ink` | Fotón en texto | `#00566A` | `#3FD8F2` | `#5FE3FF` |
| `foton-tint` | Fotón claro | `#D9F4FA` | `#0F3A44` | `#031E25` |
| `sol` | Sol de puna | `#F5B301` | `#FFC83D` | `#FFC14D` |
| `on-sol` | on-sol | `#0D2B33` | `#03222A` | `#000000` |
| `sol-ink` | Sol en texto | `#6B4300` | `#FFC83D` | `#FFC14D` |
| `sol-tint` | Sol claro | `#FFF1CC` | `#3A2E0B` | `#241A04` |
| `grana` | Grana | `#A8123B` | `#FF6B87` | `#FF7A6B` |
| `on-grana` | on-grana | `#FFFFFF` | `#03222A` | `#000000` |
| `grana-ink` | Grana en texto | `#96102F` | `#FF93A6` | `#FF7A6B` |
| `grana-tint` | Grana clara | `#FBE6EA` | `#3A1520` | `#260C08` |
| `ichu` | Ichu | `#14592D` | `#5BC47E` | `#3DFFC5` |
| `on-ichu` | on-ichu | `#FFFFFF` | `#04222A` | `#000000` |
| `ichu-ink` | Ichu en texto | `#14592D` | `#86DCA0` | `#3DFFC5` |
| `ichu-tint` | Ichu claro | `#E3F2E6` | `#12301E` | `#03261D` |
| `focus` | focus | `#0D2B33` | `#FFC83D` | `#FFC14D` |

### Semantic roles of the inquiry (color never works alone)

| Role | Color | Where | Always paired with |
|---|---|---|---|
| Hypothesis | Sol | Hypothesis card, "before measuring" lock | lightbulb icon + word |
| Evidence | Fotón | Evidence quote card, live readouts | eye icon + word |
| Measured data and action | Laguna | Data points, primary buttons, links | chart icon or label |
| Conclusion | Ichu | Conclusion card, completed state | check icon + word |
| Alert and offline | Grana | Offline chip, camera-active pill, errors | wifi-off, camera or info icon + sentence |

### Hall colors (wayfinding only)

Hall colors orient (signs, floors, cord colors, plaque rails). They **never** carry scientific meaning and are **never** used inside lab instruments. Every hall is also identified by a glyph and a name.

| Hall | Light fill | on-fill contrast | ink on tint | Noche | Holo | Quechua (provisional) | Glyph |
|---|---|---|---|---|---|---|---|
| Física | `#075E6C` | 7.4 | 8.5 | `#4FC3D9` | `#5FE3FF` | Kallpa | orbita |
| Biología | `#435F0F` | 7.3 | 7.5 | `#B7D95C` | `#B7F25A` | Kawsay | hoja |
| Química | `#9E3206` | 7.2 | 7.0 | `#FF9266` | `#FF9D5C` | Tikray | matraz |
| Tierra y ambiente | `#6E4A2F` | 7.8 | 8.3 | `#D9A877` | `#E0B48A` | Pacha | monte |

Full hall token set per mode:

| Token | Name | Luz | Noche | Holo |
|---|---|---|---|---|
| `hall-fisica` | Sala Laguna | `#075E6C` | `#4FC3D9` | `#5FE3FF` |
| `on-hall-fisica` | on-hall-fisica | `#FFFFFF` | `#03222A` | `#000000` |
| `hall-fisica-tint` | hall-fisica-tint | `#DCEBEC` | `#0A2A33` | `#031E25` |
| `hall-fisica-ink` | hall-fisica-ink | `#04474F` | `#4FC3D9` | `#5FE3FF` |
| `hall-bio` | Sala Qura | `#435F0F` | `#B7D95C` | `#B7F25A` |
| `on-hall-bio` | on-hall-bio | `#FFFFFF` | `#03222A` | `#000000` |
| `hall-bio-tint` | hall-bio-tint | `#E9F1D3` | `#26310C` | `#141E04` |
| `hall-bio-ink` | hall-bio-ink | `#3A5209` | `#B7D95C` | `#B7F25A` |
| `hall-quim` | Sala Cinabrio | `#9E3206` | `#FF9266` | `#FF9D5C` |
| `on-hall-quim` | on-hall-quim | `#FFFFFF` | `#03222A` | `#000000` |
| `hall-quim-tint` | hall-quim-tint | `#FBE4D8` | `#3A1D10` | `#261204` |
| `hall-quim-ink` | hall-quim-ink | `#8A2C05` | `#FF9266` | `#FF9D5C` |
| `hall-tierra` | Sala Barro | `#6E4A2F` | `#D9A877` | `#E0B48A` |
| `on-hall-tierra` | on-hall-tierra | `#FFFFFF` | `#03222A` | `#000000` |
| `hall-tierra-tint` | hall-tierra-tint | `#F1E6D8` | `#2A1F14` | `#211708` |
| `hall-tierra-ink` | hall-tierra-ink | `#5A3A20` | `#D9A877` | `#E0B48A` |

### Contrast ratios (computed from the tokens, WCAG 2.2)

Body text is AAA (7:1 or more) in every mode. Control edges meet 3:1. `muted` (5.9:1 in Luz) is the only AA-only text color and is limited to non-essential labels at 14 px or larger.

**Luz**

| Pair | Ratio | Level | Use |
|---|---|---|---|
| `ink` on `bg` | 13.71 | AAA | Texto de cuerpo |
| `ink` on `surface` | 14.89 | AAA | Texto en tarjeta |
| `ink-2` on `bg` | 8.76 | AAA | Texto secundario |
| `ink-2` on `surface-2` | 7.97 | AAA | Secundario sobre piedra |
| `muted` on `bg` | 5.86 | AA | Texto mínimo (AA), solo etiquetas |
| `on-primary` on `primary` | 7.43 | AAA | Botón principal |
| `primary` on `bg` | 6.84 | AA | Enlace o icono de acción |
| `border-strong` on `bg` | 4.44 | AA-UI | Borde de control (UI 3:1) |
| `on-foton` on `foton` | 7.67 | AAA | Texto sobre Fotón |
| `foton-ink` on `foton-tint` | 7.2 | AAA | Evidencia en tarjeta |
| `on-sol` on `sol` | 8.03 | AAA | Texto sobre Sol |
| `sol-ink` on `sol-tint` | 7.7 | AAA | Hipótesis en tarjeta |
| `on-grana` on `grana` | 7.46 | AAA | Texto sobre Grana |
| `grana-ink` on `grana-tint` | 7.3 | AAA | Alerta en tarjeta |
| `on-ichu` on `ichu` | 8.41 | AAA | Texto sobre Ichu |
| `ichu-ink` on `ichu-tint` | 7.25 | AAA | Conclusión en tarjeta |
| `focus` on `bg` | 13.71 | AAA | Anillo de foco |
| `on-hall-fisica` on `hall-fisica` | 7.43 | AAA | Rótulo de sala fisica |

**Noche**

| Pair | Ratio | Level | Use |
|---|---|---|---|
| `ink` on `bg` | 16.09 | AAA | Texto de cuerpo |
| `ink` on `surface` | 14.52 | AAA | Texto en tarjeta |
| `ink-2` on `bg` | 11.81 | AAA | Texto secundario |
| `ink-2` on `surface-2` | 9.07 | AAA | Secundario sobre piedra |
| `muted` on `bg` | 8.52 | AAA | Texto mínimo (AA), solo etiquetas |
| `on-primary` on `primary` | 9.73 | AAA | Botón principal |
| `primary` on `bg` | 10.43 | AAA | Enlace o icono de acción |
| `border-strong` on `bg` | 5.73 | AA | Borde de control (UI 3:1) |
| `on-foton` on `foton` | 9.73 | AAA | Texto sobre Fotón |
| `foton-ink` on `foton-tint` | 7.21 | AAA | Evidencia en tarjeta |
| `on-sol` on `sol` | 10.73 | AAA | Texto sobre Sol |
| `sol-ink` on `sol-tint` | 8.62 | AAA | Hipótesis en tarjeta |
| `on-grana` on `grana` | 6.09 | AA | Texto sobre Grana |
| `grana-ink` on `grana-tint` | 7.63 | AAA | Alerta en tarjeta |
| `on-ichu` on `ichu` | 7.61 | AAA | Texto sobre Ichu |
| `ichu-ink` on `ichu-tint` | 8.7 | AAA | Conclusión en tarjeta |
| `focus` on `bg` | 11.51 | AAA | Anillo de foco |
| `on-hall-fisica` on `hall-fisica` | 8.01 | AAA | Rótulo de sala fisica |

**Holograma**

| Pair | Ratio | Level | Use |
|---|---|---|---|
| `ink` on `bg` | 20.02 | AAA | Texto de cuerpo |
| `ink` on `surface` | 20.02 | AAA | Texto en tarjeta |
| `ink-2` on `bg` | 16.19 | AAA | Texto secundario |
| `ink-2` on `surface-2` | 14.45 | AAA | Secundario sobre piedra |
| `muted` on `bg` | 9.53 | AAA | Texto mínimo (AA), solo etiquetas |
| `on-primary` on `primary` | 13.92 | AAA | Botón principal |
| `primary` on `bg` | 13.92 | AAA | Enlace o icono de acción |
| `border-strong` on `bg` | 13.92 | AAA | Borde de control (UI 3:1) |
| `on-foton` on `foton` | 13.92 | AAA | Texto sobre Fotón |
| `foton-ink` on `foton-tint` | 11.44 | AAA | Evidencia en tarjeta |
| `on-sol` on `sol` | 12.99 | AAA | Texto sobre Sol |
| `sol-ink` on `sol-tint` | 10.61 | AAA | Hipótesis en tarjeta |
| `on-grana` on `grana` | 8.25 | AAA | Texto sobre Grana |
| `grana-ink` on `grana-tint` | 7.24 | AAA | Alerta en tarjeta |
| `on-ichu` on `ichu` | 16.31 | AAA | Texto sobre Ichu |
| `ichu-ink` on `ichu-tint` | 12.56 | AAA | Conclusión en tarjeta |
| `focus` on `bg` | 12.99 | AAA | Anillo de foco |
| `on-hall-fisica` on `hall-fisica` | 13.92 | AAA | Rótulo de sala fisica |

All 87 checked pairs across the three modes pass their stated minimum (hall sign and plaque pairs are 7:1 or more in every mode). Regenerate the report with `node` against `tokens.json > contrast`.

### Color rules

- Never convey state by color alone: pair with icon, shape or word (nodes use dashed ring, partial ring and solid disc; hall plaques carry glyphs).
- Fotón `#19CBEE` is a **fill** color with dark text (7.7:1). As text or a thin line on light grounds use `foton-ink`. Fotón on Sal is 1.8:1 and must never be a boundary.
- Never violet, never a gradient wash, never a drop-shadow glow. Light is drawn as flat planes.
- The QR code is always dark ink on near-white paper (`--rk-qr-ink`, `--rk-qr-paper`) in every mode, and is never shown on the pyramid display.

## 3. Typography Rules

**One family, chosen for legibility: Atkinson Hyperlegible Next** (SIL OFL), designed for low-vision readers, with distinct letterforms, full Latin Extended coverage (the ejective apostrophes and diacritics of Quechua and Aymara) and tabular figures. Self-host one variable woff2 of about 30 KB (`latin` + `latin-ext` subset) at `packages/ui/fonts/`; the CSS `@font-face` already declares `local()` sources and a commented `url()` to enable. No CDN, ever.

**Fallback stack (offline-safe):** `'Rikuy Sans', 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial, sans-serif`. The layout must survive any fallback: no fixed-width text boxes, no absolute-positioned labels.

| Token | Size | Line height | Weight | Letter spacing |
|---|---|---|---|---|
| `caption` | 14 px | 20 px | 400 | 0 |
| `small` | 15 px | 22 px | 400 | 0 |
| `body` | 17 px | 26 px | 400 | 0 |
| `body-lg` | 19 px | 28 px | 400 | 0 |
| `title-sm` | 20 px | 26 px | 700 | 0 |
| `title` | 24 px | 30 px | 800 | -0.005em |
| `headline` | 30 px | 36 px | 800 | -0.01em |
| `display` | 40 px | 44 px | 800 | -0.02em |
| `numeral` | 56 px | 56 px | 800 | 0 |
| `numeral-xl` | 72 px | 72 px | 800 | -0.01em |

- Body is **17 px** (not 16): glare and small screens. Never below 14 px; 12.5 to 13 px only inside the tab bar and chart axes.
- Line length: 62 characters maximum for prose (`max-width: 62ch`).
- Labels, chips and table heads are sentence case in the body face, **no tracked capitals, no eyebrows**.
- Numerals in instruments use `font-variant-numeric: tabular-nums lining-nums`. Format numbers with `Intl.NumberFormat('es-PE')`, never by hand; do not mix separators on one screen.
- **Quechua and Aymara strings run 30 to 40 % longer** than Spanish: every label allows two lines, never truncates with an ellipsis except tab labels (13 px, ellipsis as last resort), and never shrinks below the size floor. The secondary-language sublabel is 14 px, `muted`, italic, under the primary label.
- Emphasis is weight (600 or 800), not color and not italics (italics are reserved for the secondary-language sublabel).

## 4. Spacing, Radii, Elevation

**Spacing:** 4 px base: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--rk-space-*`). Phone gutters 12 to 16 px; section padding 72 px desktop, 48 px mobile. Compact phone components may use 2 px steps (10 px) where 360 px width demands it.

**Touch:** every interactive element is at least **48 x 48 px** (`--rk-hit`); primary actions 56 px; 8 px minimum gap between targets. Static status chips are 32 px high and are not interactive; any tappable chip is 48 px.

**Radii** (one per nesting level): `ctl` 12 px (buttons, inputs, signs), `card` 16 px (cards, plaques), `sheet` 24 px (bottom sheets, hero art), `chip` pill (chips and the camera pill only). The mascot has no radius token: it is a drawn shape.

**Elevation: edges, not blur.** Sunlight erases soft shadows.

| Level | Recipe | Use |
|---|---|---|
| 0 | none | Page ground |
| 1 | 2 px border `--rk-border` + `0 1px 0 0 var(--rk-border)` | Cards, plaques |
| Press | `0 3px 0 0 var(--rk-primary-press)`, translateY 2 px when pressed | Primary buttons |
| Sheet | `0 -8px 24px rgba(13,43,51,.22)` | Bottom sheets only |
| Holo | none; separation by 2 px line | Hologram mode |

No `backdrop-filter`, no blur, no glow filters anywhere (cost on low-end GPUs, and they reduce contrast).

## 5. Iconography

- **Grid** 24 x 24, **stroke** 2 px (stroke scales to 2 at 20 px and 32 px sizes), round caps and joins, no fills except tiny dots (fingertips, nuclei, bubbles). Single color via `currentColor`.
- **Always with a label** (icon-only buttons need an `aria-label` and a 48 px target). No emoji as icons.
- **Set shipped in the sprite** (`moodboard.html` and `tokens` package): navigation (museo, preparar, lab, cierre, bolsa, cerebro, quipu knots), status (wifioff, subir, check, info, lock, escudo, camara, apagar), instruments (timer, chart, qr, pin, pista, eye), formats (video, audio, diagrama, holograma, quiz, play), gestures (g-girar, g-pellizcar, g-palma, g-tocar), halls (orbita, hoja, matraz, monte), people (usuarios), report (imprimir).
- **Hall glyphs:** Física = orbit (nucleus and two ellipses), Biología = leaf, Química = flask, Tierra y ambiente = mountain with sun.
- **Gesture glyphs use fingertip dots** (filled circles) and arrows. No hand drawings, to stay cheap and culturally neutral.
- **Quipu knot icons** (achievements, 24 px and 32 px): *simple knot* (single turn: finished an exhibit), *long knot* (multiple turns: explained something to another group), *figure-eight knot* (two loops: solved together). The three differ by **shape**, not color, so they survive grayscale. On cords they take the hall color; the group cord is ink.

## 6. Illustration and the Mascot "Rikuy"

### Mascot concept

**Rikuy, the stone that looks.** A smooth river stone with one large eye, hanging from an amber cord with a knot. Hung from a peg, it is the pendulum of the first experiment; the eye is the verb. It asks, it does not tell (Socratic). It has no mouth to lecture with, only a small curve.

### Anatomy (SVG, viewBox 0 0 240 300)

| Part | Construction |
|---|---|
| Peg | circle r 8 at (120,16), fill Sal `#F5F6F1`, stroke `#0D2B33` 3.5 |
| Cord | line (120,22) to (120,104), stroke Sol `#F5B301` 5, round caps |
| Knot | circle r 7 at (120,66), fill Sol, stroke `#8A5E00` 2.5, two crossing wrap strokes |
| Body | one irregular egg path (172 x 184), fill `#0B6574`, outline `#052A31` 4 |
| Facets | two flat polygons clipped to the body: light `#12879A` (upper left) and shade `#064550` (lower right). Hard edges, no gradient |
| Band | strip at y 244 to 262, 11 Sol diamonds of 16 px (the trama) |
| Eye | sclera circle r 42 at (120,176), white, stroke 5; iris r 24 Fotón `#19CBEE`; pupil r 11 ink; highlights r 5 and r 2.5 |
| Brow | 8 px round stroke; the raised side signals curiosity |

Colors are fixed brand art (the same in every mode); the peg is light so it reads on dark grounds.

### Expressions (authored states, 4 only)

| State | Eye and brow | When |
|---|---|---|
| Curiosa | Pupil up-right, raised brow | Asks a question |
| Piensa | Pupil up-left, flat brow, Sol question mark | Offers a hint when asked or accepted |
| Celebra | Closed arc eye, open smile, three Sol sparkles | A knot was earned |
| Sin red | Half lid, calm smile, Sol wifi-off glyph | Offline mode (reassures: "I'm still here") |

**Hard rule:** expressions are triggered by **app events** (a question is due, a knot was earned, the network dropped). They are never driven by the camera and never mirror or interpret the student's face. Motion: a gentle pendulum swing, plus or minus 3 degrees, 4.2 s ease-in-out alternate, `transform` only, off under reduced motion.

### Usage

- Minimum size 48 px; 64 px beside speech bubbles; 128 px in galleries; hero 260 to 360 px. Clear space equals the knot diameter.
- Appears in: tutor bubbles, empty states, onboarding, consent, celebration toasts. **Does not appear** in reports for director or UGEL, in error states about data loss, or over the hologram.
- Speech bubble: surface fill, 2 px strong border, 16 px radius, tail on the mascot's side. One or two short sentences, a question whenever possible.

### Logo

Symbol: a ring-eye hanging from a knotted cord (pendulum). Wordmark: lowercase "rikuy", monoline 9 px stroke, round terminals, drawn as paths so it needs no font; the dot of the "i" is Fotón. The file adapts to dark via `prefers-color-scheme`. Minimum 20 px high for the symbol alone, 28 px for the lockup. Clear space equals the height of the "i" dot stem.

## 7. The Museum: wayfinding, world art, exhibits

### 7.1 Hall signage

- **Hall sign** (`.sign`): full-width block, hall fill, on-hall text, 48 px glyph tile with a 2 px outline, hall name (20 px, 800), Quechua name (14 px italic), exhibit count right-aligned, and the trama strip along the bottom edge. Height 72 px minimum. In holo mode the fill is dropped: 2 px hall-colored outline and hall-colored text.
- **Door lintels** on the 2D map repeat the hall color; each hall has a small sign inside the door with its glyph.
- **Naming:** Spanish first, Quechua sublabel (Kallpa, Kawsay, Tikray, Pacha, provisional), Aymara in the language switch.

### 7.2 Exhibit plaque (card)

`.plaque`: surface, 2 px border, **10 px left rail in the hall color**, hall glyph plus hall name (hall ink) in the first row, exhibit title (20 px, 800), one Socratic question (16 px), meta row: storage chip ("Guardado, 0.4 MB"), input chip ("Gestos o toque"), and three quipu-knot slots (earned slots solid, empty slots 35 % opacity). Primary action below: "Entrar a la exposición".

### 7.3 Multi-format exhibit cards

One card anatomy, five formats. Art area 132 px high on the hall tint, a format badge (icon + word) top-left on the art, title, one-line description, size chip, action.

| Format | Art | Budget | Rules |
|---|---|---|---|
| Video | Player frame, hall-colored play, scrubber, "CC" | 90 s max, 360p, 4 MB max, poster frame | Captions always (.vtt); no autoplay; tap to play |
| Audio | Static waveform bars (hall color, played part in grey) | Opus, 1 MB per minute | Transcript under the player; language switch Español, Quechua, Aymara; no autoplay |
| Diagram | Inline SVG with numbered steps | 20 KB max | Tap each step to open a one-line explanation; text alternative |
| Hologram | Wireframe on black (holo theme), gesture chip | 400 KB scene max | Touch fallback always; gesture hint on first two opens |
| Quiz | Three answer rows (48 px) | 50 KB | Rikuy answers a wrong choice with a question, not a correction |

Download state is always visible on the card ("Guardado" check or "Se descarga en la clase"). Every format works without network once saved.

### 7.4 2D world art direction (top-down, cheap)

- **Style:** flat vector-like tiles, top-down, hard edges, no gradients, no soft shadows, no particles. Same palette tokens as the UI, so day, night and hologram themes recolor the world for free.
- **Tile:** 16 px art, drawn at 32 px CSS (2x, `image-rendering: pixelated` if bitmap). Logical map is a grid; everything aligns to tiles. Camera is fixed top-down; at 360 x 640 about 11 x 14 tiles are visible and the map **crops**, it does not scale.
- **Floors:** a 2 x 2 tile checker where one tile carries 13 % of the hall color over the hall tint. Corridors are Hoja with a row of Sol diamonds on each edge (the trama).
- **Walls:** 1 tile thick, Ink-2. **Doors:** two tile gap with hall-colored lintels. **Plaza:** circular plaque with a hanging pendulum marker at the crossing of corridors.
- **Exhibits:** ring pedestal (hall-colored stroke, Fotón center dot). Touch area is 64 px; "near" is 2 tiles. Unseen new exhibits carry a Sol pin.
- **Player:** Rikuy as a 32 x 32 sprite, 4 walk frames, 2 directions (mirror for the others), no shadow beyond a 1-tile ellipse at 25 % ink.
- **Budget (low-end Android):** one atlas, 256 x 256 px, indexed palette, under 20 KB; at most 12 colors per hall; Canvas 2D, 30 fps cap, redraw only dirty rectangles; no blur, no partial alpha except the 25 % ellipse shadow; one 400 ms flash is the only effect (knot earned). Movement by tap-to-walk (path follows the grid) so no joystick overlay is needed.
- **Accessible alternative:** every hall also exists as a plain list of exhibits (same plaques), reachable from the Museo tab, for screen readers and for devices that cannot run the canvas.

### 7.5 Hologram exhibit frame

`.holo` frame, always `data-theme="holo"` even inside a light screen: black ground, 2 px Fotón corner brackets, a ruler of tick marks on the right edge, a pedestal ellipse beneath the object, the object as **line work only** (2.5 px stroke), a Sol title plaque (top-left) and a readout row of chips (bottom). Minimum text 18 px. The same frame, without chrome, feeds the display phone.

- **Pyramid display layout:** four views in a cross on absolute black; each view is the object rotated 0, 90, 180 and 270 degrees; a dashed Sol square marks the empty center. Mirror and flip options flip the whole canvas. No UI text except short amber labels; no QR; nothing near the center.
- **Brightness:** background `#000`, lines 2 px or thicker, strokes at least 13:1 contrast; large filled areas ghost on the acetate and are forbidden.

### 7.6 Gesture-hint overlay

Shown the first two times an exhibit opens (and on demand from a help button). A scrim (`--rk-overlay`) covers the frame; a card at the bottom lists three gestures, each with a 48 px circle icon, a Spanish instruction (17 px, 700) and the Quechua word in a switch (Muyuy, Hatunchay, Kutiy, provisional): **Gira con un dedo** (rotate), **Pellizca para acercar** (zoom), **Abre la mano para volver** (reset). One button "Entendido" (primary). Rules: never blocks the object for more than 5 seconds without a visible dismiss; dismiss on tap anywhere; **three 48 px fallback buttons (Girar, Acercar, Centrar) always sit below the frame**; the hint never depends on the camera.

## 8. Quipu de logros (cooperative achievements)

A horizontal top cord with five pendant cords: one per hall (hall colors) and one **Grupo** cord in ink. Knots hang on cords in the order earned.

- **Earn rules (design intent):** simple knot for finishing an exhibit, long knot for explaining something to another group, figure-eight knot for solving together. **Helping adds knots to the group cord for everyone in the group**, not a leaderboard rank.
- **No competition:** no rankings, no individual scores, no streak pressure, no loss states. Empty slots are dashed circles ("not yet"), never red.
- **Toast:** ink pill, 12 px radius, icon of the knot type plus one sentence ("Nuevo nudo largo en Física. Ayudaste al grupo 5."), live region polite, 4 seconds, with the Celebra mascot only on the first knot of a session. Earning animation: the knot drops 12 px and settles (320 ms), one flash.
- **Legend** always under the quipu (icon plus sentence per knot).

## 9. Mi Cerebro Rikuy (knowledge map)

A 2D, SVG, low-cost cousin of 3D "brain of knowledge" visualizations: **a map of what the student has actually learned**.

- **Nodes** are CNEB competencies (hubs, larger: *Indaga*, *Explica*, *Diseña*, abbreviations of the three Ciencia y Tecnología competencies) and concepts under them, colored by hall. **Edges** are prerequisite or related relations.
- **Lit only by real progress:** a node lights from saved **evidence** (a hypothesis before measuring, a measurement, a conclusion in the student's words, a completed exhibit), never from time spent or taps.
- **Three states by shape and color:** *sin explorar* = dashed hollow ring; *en camino* = tinted disc with a partial progress ring (fraction of evidence); *logrado* = solid hall disc, ink outline, check, and a faint outer ring. Edges between two achieved nodes thicken to 3 px in ink.
- **Silhouette:** one flat side-profile path with six fold strokes, filled Piedra. No glow, no blur, no particles. Budget: 13 to 60 nodes, 18 to 100 edges, one SVG, under 12 KB, static precomputed layout (no force simulation on device).
- **Interaction:** tap a node opens its plaque (what it is, what evidence exists, "Ir a la sala"); the mascot suggests the nearest unlit node as a question ("Fotosíntesis sigue apagada. ¿La exploramos?").
- **Accessible alternative:** the same data as a sorted list grouped by competency with the three states spelled out; the SVG has an `aria-label` summary.
- **Teacher and report versions** show only aggregate counts of nodes with evidence per competency, never per-student maps.

## 10. Rikuy Guardián (opt-in, ethical, transparent)

An optional companion for learning. Rikuy Guardián does not read the student: it offers help, takes the student's **voluntary check-in**, and suggests to the responsible teacher whom to talk with. It is designed as **supportive and reversible**: it exists to help, never to label.

### 10.1 Principles (binding)

1. **Off by default.** Never enabled by an update, a default setting or a dark pattern.
2. **Two consents, both required:** the student's assent and the guardian's consent. Neither implies the other. Each is renewed every school term and can be withdrawn at any time.
3. **Emotion words only where the student declares them.** The feature is called "Rikuy Guardián". Emotion words appear only inside the student's own check-in (10.8). There are no faces, emoji or emotion scores anywhere, and no screen, nudge or teacher view labels a student's emotional state (10.9). The only output the student sees is an offer of help.
4. **On-device only.** Level 1 uses no camera and no microphone. Events, check-ins and suggestions stay on the device and reach the responsible teacher's device without internet. No image, video, audio, embedding or per-student record is transmitted to a server. Only coarse, class-level counts (hint requests per 5-minute bin) leave the device.
5. **Always visible when active.** The "Guardián activo" indicator is on every screen while active. If the indicator cannot be drawn, Guardián stops.
6. **Reversible in one tap.** A kill-switch exists on every screen, for the student, the guardian and the teacher (class-wide).
7. **Nothing shown to classmates.** Nudges render only on the personal device, never on the shared display phone or the projector.
8. **Declining has no cost.** Everything works the same; the question is asked once per term.

### 10.2 Consent screens

- **Student screen:** Rikuy (Piensa) and one title; four promises with icons, each *what it uses*, *what it does not do*, *who sees something*, *when it stops*; a status chip "Falta el permiso de tu familia" until the guardian consents; two **equal-weight** buttons: "Sí, quiero probarla" and "No, gracias"; a reassurance line "Si dices que no, todo funciona igual." Reading level: primaria alta.
- **Guardian screen:** plain-language paragraph, fields "Nombre de quien autoriza" and "Código de la clase", buttons "Autorizo" and "No autorizo", a note that it works offline, can be signed on paper, and can be withdrawn. Consent is stored on the device and shown to the teacher only as a count.
- Both screens are available in Spanish, Quechua and Aymara, read aloud on tap, and never use pre-ticked options.

### 10.3 Guardián-active indicator

The **Guardián activo** pill: Grana tint fill, 2 px Grana border, icon, text "Guardián activo", and a round **power button** (36 px visible, 48 px target) that is the kill-switch. If Level 2 (camera and voice, outside the product) ever runs, the **cámara activa** pill is required as well, in the same place. It sits in the top bar of every screen while active, above sheets and overlays, in every theme including hologram. It is never an animation-only cue and never hides under the keyboard or a sheet. Height 48 px.

### 10.4 Supportive nudge

Rikuy (Piensa) bubble: "Esto cuesta un poco. ¿Te doy una pista?" with buttons "Sí, una pista" (primary) and "Ahora no". Rules: a chip "Solo se ve en este celular"; shown at most twice per exhibit; "Ahora no" snoozes 5 minutes; the pista text never reveals the answer; no counter, no log visible to anyone but aggregate bins; the nudge is also reachable by tapping the Rikuy hint button, so help never depends on detection.

### 10.5 Teacher group-level aggregate

A card "Guardián del grupo": participation as a count only ("18 de 24 participan"), a bar chart of hint requests per 5-minute bin with the peak bins outlined in Sol, and one actionable sentence about **instruction**, not students ("Entre los minutos 20 y 30, 4 de 5 grupos pidieron pista. Revisa cómo se explica contar diez oscilaciones."). Shown only with 5 or more participants; below that: "Muy pocos participantes para mostrar un resumen." No names, no per-student rows, no export, no grade use. A "Apagar para toda la clase" button (danger tonal) sits in the card.

### 10.6 Kill-switch

A settings toggle ("Activas" / "Apagadas") with 64 x 36 px switch and text state (never color alone), a large "Apagar ahora" danger button, and a confirmation toast: "Guardián apagado. No se guardó ninguna imagen." Turning off stops every Guardián process immediately, clears in-memory buffers and removes the indicator.

### 10.7 Review gates

Legal review for minors' data (for example, Peru's Ley 29733 on personal data protection) and ethics review with UGEL and families come before any pilot. The prototype is labeled "Prototipo" in the pitch. Guardián outputs are **not** used for grading, discipline or comparison, and the mascot's expressions never reflect them.

### 10.8 Voluntary check-in

The check-in is the only place where emotions enter the system, and only because the student declares them.

- **When:** after a step or an activity, takes 10 to 15 seconds, at most one per session, always skippable. A skipped check-in does not come back for that step. The student can tap **"Necesito hablar"** at any time, without passing through the grid.
- **Anchored to the exact step:** the card names it ("en: medir 10 oscilaciones") and asks the question "¿Cómo vas con esto?".
- **Grid:** energy (low to high) by agrado (unpleasant to pleasant). Multi-select: the student taps one or more cells. Each cell has a word and a shape; never color alone. Each selected cell asks for intensity: **poco / medio / mucho**. The word list follows ECOSISTEMA 2.14 (learning emotions, body words such as "me duele el cuerpo" or "sin fuerzas", and relationship words such as "me sentí solo/a").
- **Escape options:** "No sé" and "Prefiero no decir" sit beside the grid as buttons of equal size and weight to every other option.
- **Next question:** "¿Qué te ayudaría ahora?" with the choices "una pista", "ir más despacio", "una pausa", "hablar con alguien" and "nada". Free text is optional and never analyzed automatically.
- **Visibility:** at that moment the student chooses "solo yo" (feeds only aggregates) or "compartir con mi profe" (the teacher may see the content).
- **Confidentiality:** before the first check-in the screen says that confidentiality is not absolute. If the student reports that someone is hurting them or that they are in danger, the teacher must activate the school's safeguarding route.
- Declining, skipping or choosing "nada" has no cost.

### 10.9 Teacher language

Everything the teacher sees is written in **pedagogical language** about the activity and the request, never about a student's emotional state.

- **Allowed:** "lleva 3 sesiones sin avanzar en la habilidad X", "pidió hablar con usted", "pidió una pista tres veces seguidas".
- **Never:** "triste", "frustrado", "ansioso", "aburrido", "en riesgo", or any other emotion label attached to a student.
- **Student text:** a check-in's words appear only when the student chose "compartir con mi profe".
- **"Para acercarse" view:** the only per-student view. It shows at most **3 suggestions per week per tutor**, each with its reason and a short conversation guide. The teacher decides with one of three buttons: "ya conversé", "no era necesario" or "no aplica".
- **Aggregates (10.5):** class-level only, with 5 or more responses, and never per student.

## 11. Component Inventory

All components consume tokens only. States for every interactive component: default, hover (pointer only), pressed (translateY 2 px), focus-visible (3 px outline, 2 px offset, `--rk-focus`), disabled (Piedra fill, muted text, no shadow, still readable), loading, error.

| Component | Spec |
|---|---|
| **Button** | Height 48 px (primary large 56), 12 px radius, 2 px border, label 17 px 600, optional icon 24 px. *Primary*: Laguna fill, white text 7.4:1, 3 px press edge. *Secondary*: Hoja fill, strong border. *Tonal*: Laguna tint fill, Laguna border. *Danger*: Grana tint, Grana border and ink. Label states what happens ("Guardar medición"). Secondary-language sublabel optional (14 px). Holo: outline only |
| **Tabs (bottom nav)** | 64 px bar, 4 or 5 items, 24 px icon over a 13 px label, selected = ink + 800 weight + 36 x 5 px indicator bar + Laguna icon. Role-aware item sets. Labels are translatable and may ellipsize last |
| **Top bar** | 64 px: title (19 px, 800) left, status chip or camera pill right, back button (48 px) when deep |
| **Card** | Hoja, 2 px Veta border, 16 px radius, 16 px padding. One idea per card; never nest cards |
| **Chips** | Static 32 px, tappable 48 px. Variants: ok (Ichu), off (Grana), sync (Fotón), warn (Sol), hall. Icon + word, 14 px 600 |
| **Offline and sync status chip** | States: *Sin red* (Grana, wifi-off, "Sin red"), *Por enviar* (Sol, upload, "3 mediciones por enviar"), *Enviando* (Fotón, rotating upload, off under reduced motion), *Enviado* (Ichu, check, "Enviado hace 2 minutos"), *Error* (Grana, info, "No se pudo enviar. Sigue en este celular."). Always says where the data is. Tap opens the queue |
| **Stopwatch** | Readout 56 px numerals tabular; "Oscilación 7 de 10" chip; **ten-knot cord** progress (done = Laguna disc, current = larger Sol disc, pending = hollow); "Contar oscilación" 56 px primary (the whole tap target is the primary action); Reiniciar and Parar secondary. `role="timer"` |
| **Measurement table** | Real `<table>` with visually hidden caption; columns Cuerda, Tu periodo, Teoría, Error; tabular numerals, right-aligned; row heads bold; error in Ichu ink; 2 px row rules; never sortable or paginated on phone |
| **Chart** | SVG, 320 x 196 viewBox, direct labels ("Teoría", "Tus datos"), theory = dashed ink line, data = filled Laguna dots with 2.5 px Hoja halo, grid Veta, axis labels 12.5 px ink-2, an `aria-label` summarizing the finding. Never color-only series: shape and dash differ |
| **Hypothesis card** | Sol tint, 2 px Sol border, 10 px Sol left rail, lightbulb + "Mi hipótesis" (Sol ink), chip "Antes de medir" with lock, student text 17 px. Locked once measuring starts |
| **Evidence quote card** | Fotón tint, 2 px Fotón-ink border, 10 px left rail, eye + group name, chip "Frase literal", the quote verbatim in 19 px between typographic quotes, one line saying which indicator it shows. **No evidence variant:** Hoja, dashed border, chip "No evaluable", sentence "Todavía no hay una frase del grupo sobre esto. La docente decide cómo seguir." (the app never grades) |
| **Conclusion card** | Ichu tint, Ichu border, check + the group's sentence |
| **QR relay sheet** | Bottom sheet, 24 px top radius, 44 x 5 px handle, title "Muestra este código a tu docente", 208 px QR (3 px ink frame, always dark on paper), five-knot cord ("Parte 3 de 5") for the animated multi-part code, instruction "Mantén el celular quieto", primary "Ya lo leyó". Not shown on the pyramid display |
| **Campus (museum) map pin** | Teardrop, Sol fill, 2 px ink outline, ink dot; variants: *nuevo* (Sol), *en camino* (hall ring half), *logrado* (hall fill with check), *bloqueado* (dashed, lock). Hit area 64 px. Paired with a plaque on tap |
| **Game card** | 16 px radius card, title, hall chip, 72 px art block on the hall tint, one sentence of the goal and duration ("Dura 5 minutos"), tonal "Jugar" button. Games are contextual to the exhibit, work offline and never show timers that create pressure beyond the stated duration |
| **Hall sign, plaque, exhibit format cards, gesture overlay, hologram frame, quipu, brain map** | See sections 6 to 9 |
| **Toggle and switch** | 56 px row, 64 x 36 px switch, text state beside it |
| **Fields** | 48 px high, 2 px strong border, visible label above (never placeholder-only), error text below naming the fix |
| **Report page** | See section 12 |

## 12. Reports for Director and UGEL

Serious, printable (A4 portrait), legible in black and white, and honest.

- **Chrome:** logo lockup top-left, title 24 px 800, institution and period in 17 px ink-2, a heavy 3 px ink rule. **No mascot, no gamification language, no hall colors as decoration.**
- **KPIs** in a four-cell band: big tabular numerals (40 px) with the denominator ("41 de 46") and a plain-language label. No sparkline decoration.
- **Charts:** horizontal bars with direct value labels, a 2 px ink frame on each track, **hatch patterns per hall** (solid, diagonal, vertical, reverse diagonal) so they work in grayscale; hall glyph beside the label; no gradients, no 3D, axes start at zero.
- **Tables:** CNEB competency and "grupos con evidencia" counts, tabular numerals, 2 px row rules.
- **Provenance footer** always: "Datos guardados en cada celular, sincronizados el [date]. El informe no incluye nombres de estudiantes ni imágenes." and, in prototypes, a visible "Datos de ejemplo" chip.
- **Privacy:** aggregates only, minimum cell size 5, no per-student maps, no Guardián data except the class-level counts defined in 10.5 when explicitly included by the teacher.
- Print stylesheet: Luz theme forced, white paper, ink text, no shadows, page-break avoid on KPI band and each chart.

## 13. Voice and Tone

**Voice:** a close, calm teacher. Short sentences, plain verbs, sentence case, no filler, no promises, no sarcasm. Rikuy **asks before it tells**. Errors say what happened and how to continue, and never apologize. Empty states are invitations. The interface never says "intelligence", "AI-powered" or "gamified" to the student.

**Spanish (default).** Buttons: verb plus object ("Guardar medición", "Empezar la clase", "Entrar a la exposición"). Same action, same name along the flow ("Guardar medición" then "Medición guardada"). Use "tú" with students and "usted" in family and UGEL documents.

| Situation | Spanish | Avoid |
|---|---|---|
| Tutor question | "¿Qué crees que pasa con el tiempo si alargas la cuerda?" | "Incorrecto. La respuesta es..." |
| Hint offer | "Esto cuesta un poco. ¿Te doy una pista?" | Any label about the student's state |
| Empty | "Aún no hay mediciones. Cuenta diez oscilaciones para empezar." | "No data" |
| Save | "Medición guardada. Sigue en este celular." | "Success!" |
| Error | "No se pudo guardar. Libera espacio y vuelve a intentarlo. Tu medición sigue aquí." | "Error 500" |
| Offline | "Sin red, todo guardado." | "Connection lost" |

**Quechua and Aymara layer** (provisional: every string must be validated with EIB teachers and native speakers before release; speaker audio is preferred over TTS). Quechua follows the standardized southern alphabet; Aymara the official alphabet. Ejective apostrophes and accents must render in full.

| Spanish | Quechua (sureño) | Aymara |
|---|---|---|
| ver, mirar | Rikuy | Uñjaña |
| medir | Tupuy | Tupuña |
| aprender | Yachay | Yatiqaña |
| preguntar | Tapuy | Jiskt'aña |
| ayudar | Yanapay | Yanapaña |
| llevar | Apay | Apaña |
| luz | K'anchay | Qhana |
| piedra | Rumi | Qala |
| fuerza (sala Física) | Kallpa | (to define) |
| vida (sala Biología) | Kawsay | Jakaña |
| cambio (sala Química) | Tikray | (to define) |
| mundo, tiempo (sala Tierra) | Pacha | Pacha |
| quipu | Khipu | Khipu |
| idea, pensamiento (Mi hipótesis, Cerebro) | Yuyay | Amuyt'aña |
| museo, casa de aprender (tab Museo) | Yachay wasi | Yatiña uta |

**Layering rule.** Language switch (Castellano, Quechua, Aymara) swaps labels; a secondary-language sublabel (14 px italic) may sit under a Spanish label for bilingual teaching. Strings are never machine-translated in production, never truncated, and always have room for 40 % growth.

## 14. Motion

Quiet, cheap, informative. Motion answers an action or shows what changed; it never decorates.

| Token | Value | Use |
|---|---|---|
| `--rk-dur-fast` | 120 ms | Press feedback (translateY 2 px) |
| `--rk-dur` | 200 ms | State changes, sheet and card entry |
| `--rk-dur-slow` | 320 ms | Knot earned, sheet open |
| `--rk-dur-swing` | 4200 ms | Mascot pendulum swing |
| `--rk-ease` | cubic-bezier(0.2, 0, 0, 1) | Default |

- Animate **only `transform` and `opacity`**. Never width, height, top, left, blur, or box-shadow. No `transition: all`. Color changes are instant.
- One ambient motion per screen at most (the mascot swing). One celebration at most per event (knot drop plus a 400 ms flash). No scroll-linked effects, no page-load stagger, no parallax.
- Exit faster than enter. Sheets slide 100 percent in 200 ms; scrims fade.
- **Reduced motion:** all durations collapse to near zero; the mascot is still; spinners become a static icon with text ("Enviando"); content is fully visible without any animation.
- World: 30 fps cap, redraw dirty rectangles, pause when the tab is hidden.

## 15. Accessibility and Performance

**Accessibility (WCAG 2.2 AA minimum, AAA for body)**

- Contrast: body 7:1, UI boundaries 3:1, focus ring 3:1 against adjacent colors (ink in Luz, Sol in Noche and Holo).
- Targets 48 px minimum with 8 px gaps; primary 56 px; no hover-only affordance; gestures always have buttons.
- Focus visible on every control, instantly (no transition), never removed. Logical order; the tab bar is a `tablist` with `aria-selected`.
- Every state has icon, shape and word. Never color only.
- Charts and maps have text alternatives (a summary sentence plus the underlying table or list). The museum map has a list alternative; the brain map has a sorted list.
- Live regions (`role="status"`, polite) for saves, knots and sync. The timer uses `role="timer"`.
- Text resizes to 200 % without loss; layouts tolerate Quechua and Aymara length; no horizontal scroll at 360 px.
- Respect `prefers-reduced-motion`, `prefers-color-scheme` (when no explicit theme) and `forced-colors` (borders become `ButtonText`).
- Audio and video: captions, transcripts, no autoplay. Language switch for audio.

**Performance budgets (low-end Android, 2 GB RAM, bright classroom)**

- Shell JS under 150 KB gzipped before Three.js and MediaPipe (loaded only on a hologram exhibit). Fonts: one 30 KB woff2 or system fallback. Total first load under 400 KB excluding exhibits.
- Icons from one inline sprite; illustrations as inline SVG; no raster in the shell. The mascot is about 3 KB.
- No blur, backdrop-filter, filter drop-shadow or full-screen gradients. Layers limited: one scrolling container per screen.
- Exhibits are saved on first use and show their size on the card. Everything measured is written to the device first; sync is an upload, never a dependency.

## 16. Do and Don't

**Do**

- Use one home with tabs: the same top bar and tab bar on every screen.
- Name every state with an icon, a shape and a word.
- Show where the data is ("Sin red, todo guardado").
- Let the mascot ask a question before it explains.
- Keep hall colors for wayfinding and role colors for science.
- Give every gesture a button and every map a list.
- Put the Quechua or Aymara label under the Spanish one without shrinking either.
- Design reports as plain, printable documents.

**Don't**

- Don't decorate with ponchos, llamas, fringes, rainbow stripes or fake Inca lettering.
- Don't show any emotion label, face or score, or anything about a student to classmates.
- Don't use gray on gray, text under 14 px, hover-only controls or color-only status.
- Don't use blur, glow, soft shadows, gradients as decoration, or scroll-triggered animation.
- Don't add leaderboards, streak pressure or loss states to the quipu.
- Don't use the mascot on reports, data-loss errors or over the hologram.
- Don't load anything from a CDN at runtime.

## 17. Design System Notes for Stitch Generation

**Language to use.** "Hard high-altitude light, flat mineral planes, salt-flat white ground, lake-ink text, laguna teal actions, photon-cyan highlights, sun-amber hypotheses, quipu cords and knots as structure, a single stepped-diamond strip, a stone-with-one-eye mascot."

**Color references.** Sal de Maras `#F5F6F1` ground; Hoja `#FFFFFF` cards; Tinta de lago `#0D2B33` text; Laguna `#075E6C` primary; Fotón `#19CBEE` accent fill; Sol de puna `#F5B301` hypothesis; Grana `#A8123B` alert; Ichu `#14592D` conclusion; halls Laguna `#075E6C`, Qura `#435F0F`, Cinabrio `#9E3206`, Barro `#6E4A2F`; hologram on `#000000` with `#5FE3FF` and `#FFC14D`.

**Component prompts.**
1. "A 360 x 640 mobile screen, top-down 2D museum map with four rooms around a plaza, hall signs with glyphs and a bottom plaque card with a teal primary button, bottom tab bar with five labeled icons."
2. "Lab screen: a tutor bubble with a one-eyed stone mascot asking a question, an amber hypothesis card with a lock chip, a large stopwatch with a ten-knot cord progress, a four-column measurement table."
3. "Hologram exhibit frame on absolute black with cyan corner brackets, a wireframe pendulum, an amber title plaque, and a bottom gesture hint card with three fingertip-dot icons."

**Incremental iteration.** Change one axis at a time (color role, then density, then language length). Always re-check contrast with the computed table and keep touch targets at 48 px.

## 18. Open Items

- Atkinson Hyperlegible Next woff2 must be added to `packages/ui/fonts` (not bundled by this pass; the moodboard renders with the system face).
- All Quechua and Aymara strings are provisional; validation with EIB teachers is required, plus audio recording.
- Rikuy Guardián needs legal and ethics review before any classroom pilot.
- The 2D tile atlas, sprite sheet and the brain layout generator are specified here but not yet drawn as production assets.
