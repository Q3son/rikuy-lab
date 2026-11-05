# Contract proposals from F1 (Shell, UI and PWA)

F1 does not edit `packages/contracts`. These are the additive changes it needs, for the Sprint 0 owner.

## 1. Routes (`packages/contracts/src/rutas.ts`)

The shell owns these tab roots. They are not in `RUTAS` today, so `apps/web/src/shell/navegacion.ts`
declares them locally. Please add them so museum doors and features agree on the same strings:

| Key | Path | Why |
|---|---|---|
| `hoy` | `/hoy` | Teacher home "Mi clase de hoy" (T-01) |
| `evidencia` | `/evidencia` | Teacher tab Evidencia (= Cierre) |
| `reportes` | `/reportes` | Teacher tab Reportes |
| `lab` | `/lab` | Student tab Lab, home of the tab (E-22). `laboratorio` (`/lab/:practicaId`) stays |
| `quipu` | `/quipu` | Student tab Quipu (E-15) |
| `yo` | `/yo` | Student tab Yo (E-23) |
| `entrar` | `/entrar` | Join by class code and nickname (E-00) |

`RUTAS.docente` (`/docente`) stays free for the sub-screens of F6.

## 2. Audio manifest entry (F9 hands it to F1)

The narrator (`apps/web/src/shell/accesibilidad/narrador.ts`) plays a recording when the manifest has one
for the key and the active language. It needs, per entry:

```ts
{ clave: string; lengua: Lengua; sha256: string; bytes: number; url?: string; estado: 'borrador' | 'grabado' | 'revisado' }
```

- F1 resolves the URL as `./audio/<sha256>.opus` when `url` is missing (content addressed, precached in the
  `clase` group).
- Only `estado: 'revisado'` entries must be registered with `registrarManifiestoAudio()`; a draft is never played.
  Today `contracts` has `Practica.audio` without `url` or `estado`; please add `estado` (the review state of
  FUNCIONES_EXTRA 4.3).

## 3. Level of support (`Clase`, optional)

FUNCIONES_EXTRA function 3 says the teacher can set a default level. Proposed additive field:

```ts
nivelPorDefecto: z.enum(['apoyo', 'normal', 'desafio']).default('normal')
```

It is a class setting, never a student attribute, and it must not reach the Brain nor any report.

## 4. Feature flags (`apps/web/src/app/flags.ts`)

The file was listed as Sprint 0 work (ARQUITECTURA 5.3 item 4) but did not exist. F1 created it with the five
flags (`senales`, `gestos`, `webrtc`, `iaLocal`, `iaNube`, all off). Please adopt or replace it; nothing else depends
on its shape yet.

## 5. Playwright (`playwright.config.ts`)

The preview uses a self-signed certificate. `ignoreHTTPSErrors` does not cover the service worker script fetch in
Chromium, so the worker never installed and the `avion` project could not pass. F1 added
`launchOptions: { args: ['--ignore-certificate-errors'] }` to `use`. This is a harness fix, listed here because the
file belongs to the Sprint 0 root.

## 6. Dependencies

- `axe-core` was added as a root dev dependency (commit `build: add axe-core ...`) for the accessibility tests the
  coordinator asked for. It changes `package-lock.json`; the integrator may re-lock.
- `packages/ui` tests use `@testing-library/*`, `jsdom` and `axe-core` from the root `node_modules` without declaring them
  in `packages/ui/package.json` (declaring them would change the lock). Declare them when the lock is regenerated.
