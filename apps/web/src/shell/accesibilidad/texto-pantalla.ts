/**
 * Text of a screen for the audio mode. Reads what a person would read: headings and paragraphs in
 * DOM order. Skips controls (the screen reader or the speak buttons cover them), navigation, hidden
 * content and anything marked `data-no-narrar`. Visually hidden text (`.sr-only`) IS read, because
 * it carries the state of icons and chips.
 */
const EXCLUIDOS = 'button, nav, [role="tablist"], [aria-hidden="true"], [hidden], [inert], [data-no-narrar], script, style, svg, audio, select, input, textarea';

export function textoDePantalla(raiz: Element, opciones: { maximo?: number } = {}): string {
  const { maximo = 600 } = opciones;
  const frases: string[] = [];
  const caminante = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  let nodo = caminante.nextNode();
  let bloque: Element | null = null;
  let acumulado = '';

  const cerrar = () => {
    const limpio = acumulado.replace(/\s+/g, ' ').trim();
    if (limpio) frases.push(/[.!?…:]$/.test(limpio) ? limpio : `${limpio}.`);
    acumulado = '';
  };

  while (nodo) {
    const padre = nodo.parentElement;
    if (padre && !padre.closest(EXCLUIDOS)) {
      const bloqueActual = padre.closest('h1, h2, h3, h4, p, li, blockquote, figcaption, summary, div, section, article, span') ?? padre;
      const contenedor = bloqueActual.closest('h1, h2, h3, h4, p, li, blockquote, figcaption, summary') ?? bloqueActual;
      if (bloque !== contenedor) {
        cerrar();
        bloque = contenedor;
      }
      acumulado += ` ${nodo.textContent ?? ''}`;
    }
    nodo = caminante.nextNode();
  }
  cerrar();

  const texto = frases.join(' ');
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const ultimoPunto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('.'));
  return ultimoPunto > maximo * 0.4 ? corte.slice(0, ultimoPunto + 1) : corte.trimEnd();
}
