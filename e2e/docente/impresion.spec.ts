import { renderInforme } from '@rikuy/evidencia';
import { comoDocente, expect, test } from '../_arnes/avion.ts';

// The shell sends a device without a role to the entry screen.
test.beforeEach(({ page }) => comoDocente(page));

const paginasDelPdf = (pdf: Buffer): number => (pdf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;

test('the A4 take-home sheet prints on exactly one page', async ({ page }) => {
  await page.goto('./#/docente');
  await page.getByRole('button', { name: 'Usar la clase de ejemplo' }).click();
  await page.goto('./#/docente/clase/llevar');
  await expect(page.getByLabel('Hoja para llevar a casa')).toBeAttached();
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  expect(paginasDelPdf(pdf)).toBe(1);
});

const cap = (n: string, con: number, total: number) => ({ nombre: n, gruposConEvidencia: con, gruposTotal: total });
const CAPS = ['Problematiza situaciones', 'Diseña estrategias para hacer indagación', 'Genera y registra datos o información', 'Analiza datos e información', 'Evalúa y comunica el proceso y resultados de su indagación'];
const secciones = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ seccion: `${(i % 5) + 1}.º ${String.fromCharCode(65 + (i % 8))}${i}`, capacidades: CAPS.map((c) => cap(c, 6, 8)) }));
const base = {
  institucion: 'IE 40123 Santa Rosa de Chivay',
  mes: '2026-10',
  datosSimulados: true,
  sincronizacion: { aulasSincronizadas: 3, aulasTotal: 5, ultima: '2026-11-02' },
  cifras: { exhibicionesRealizadas: 14, seccionesActivas: 5, pctSesionesConEvidencia: 82, diasCierreCubiertos: 0, coberturaDatosPct: 60 },
  conceptos: Array.from({ length: 5 }, (_, i) => ({ concepto: `Concepto ${i}`, gruposAfectados: 9, gruposTotal: 18 })),
  continuidad: { diasCierre: 0, paquetesEnviados: 40, paquetesDevueltosQr: 22, porCanal: { qr: 18, whatsapp: 16, a4: 6 } },
  brechas: { sesionesSinRed: 11, horasAudioQuechua: 3.5 },
  ayuda: { pedidos: 12, cerrados: 10 },
};

test('the principal report fits in 4 A4 pages even with 30 sections', async ({ page }) => {
  const r = renderInforme({ ...base, alcance: 'director', cobertura: secciones(30) });
  await page.setContent(r.htmlImprimible);
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  expect(paginasDelPdf(pdf)).toBeLessThanOrEqual(r.paginasMax);
});

test('the UGEL report fits in 6 A4 pages with the largest allowed input', async ({ page }) => {
  const territorial = Array.from({ length: 80 }, (_, i) => ({ codigoModular: String(1000000 + i * 7), gruposConEvidencia: 12, gruposTotal: 20 }));
  const r = renderInforme({ ...base, alcance: 'ugel', institucion: 'UGEL Caylloma', cobertura: secciones(30), territorial });
  await page.setContent(r.htmlImprimible);
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
  expect(paginasDelPdf(pdf)).toBeLessThanOrEqual(r.paginasMax);
});
