import axe, { type Result } from 'axe-core';

/**
 * Accessibility check for component tests (axe-core on jsdom).
 * - `color-contrast` is disabled because jsdom has no layout/paint; contrast is verified from the
 *   tokens instead (src/a11y/contraste.ts + tokens.json).
 * - `region` is disabled because a rendered fragment is not a full page.
 * A violation is "serious" when axe reports impact `serious` or `critical`.
 */
export async function violacionesGraves(contenedor: Element): Promise<Result[]> {
  const resultado = await axe.run(contenedor, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

/** Throws a readable message when the fragment has serious or critical violations. */
export async function expectSinViolacionesGraves(contenedor: Element): Promise<void> {
  const graves = await violacionesGraves(contenedor);
  if (graves.length > 0) {
    const resumen = graves
      .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.html).join('\n  ')}`)
      .join('\n');
    throw new Error(`Serious accessibility violations:\n${resumen}`);
  }
}
