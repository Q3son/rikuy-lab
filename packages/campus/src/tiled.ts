/**
 * Minimal Tiled JSON loader (1.3): orthogonal, finite maps with tile layers `suelo` (floor) and
 * `muros` (walls, any non-zero gid blocks) plus one object layer. Objects are converted to tile units.
 * Object types used by the museum: `puerta`, `zona`, `npc`, `interactivo`, `pedestal`, `aparicion`,
 * with properties `destino` (app route), `practicaId`, `retoId`, `salaId`, `slot`, `bloquea`.
 */

export type ValorPropiedad = string | number | boolean;

export interface ObjetoMapa {
  id: number;
  nombre: string;
  tipo: string;
  /** Tile units. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
  props: Record<string, ValorPropiedad>;
}

export interface MapaMundo {
  ancho: number;
  alto: number;
  tamTile: number;
  /** Floor gids, row-major, length ancho * alto (0 = void). */
  suelo: number[];
  /** Wall gids, row-major (0 = free). */
  muros: number[];
  objetos: ObjetoMapa[];
}

export class ErrorMapa extends Error {
  override name = 'ErrorMapa';
}

type Registro = Record<string, unknown>;

const esRegistro = (v: unknown): v is Registro => typeof v === 'object' && v !== null && !Array.isArray(v);

function numero(r: Registro, campo: string, donde: string): number {
  const v = r[campo];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ErrorMapa(`${donde}: "${campo}" must be a number`);
  return v;
}

function capaDeTiles(capas: Registro[], nombre: string, total: number, obligatoria: boolean): number[] {
  const capa = capas.find((c) => c.type === 'tilelayer' && c.name === nombre);
  if (!capa) {
    if (obligatoria) throw new ErrorMapa(`missing tile layer "${nombre}"`);
    return new Array<number>(total).fill(0);
  }
  const data = capa.data;
  if (!Array.isArray(data) || data.length !== total || !data.every((g) => typeof g === 'number')) {
    throw new ErrorMapa(`tile layer "${nombre}" must be a plain array of ${total} gids (no base64/compression)`);
  }
  return data as number[];
}

function propiedades(o: Registro): Record<string, ValorPropiedad> {
  const props: Record<string, ValorPropiedad> = {};
  if (!Array.isArray(o.properties)) return props;
  for (const p of o.properties) {
    if (!esRegistro(p) || typeof p.name !== 'string') continue;
    const v = p.value;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') props[p.name] = v;
  }
  return props;
}

export function cargarMapaTiled(json: unknown): MapaMundo {
  if (!esRegistro(json)) throw new ErrorMapa('a Tiled map must be a JSON object');
  if (json.orientation !== undefined && json.orientation !== 'orthogonal') {
    throw new ErrorMapa(`only orthogonal maps are supported (got ${String(json.orientation)})`);
  }
  if (json.infinite === true) throw new ErrorMapa('infinite maps are not supported');
  const ancho = numero(json, 'width', 'map');
  const alto = numero(json, 'height', 'map');
  const tamTile = numero(json, 'tilewidth', 'map');
  if (!Array.isArray(json.layers)) throw new ErrorMapa('map: "layers" must be an array');
  const capas = json.layers.filter(esRegistro);
  const total = ancho * alto;
  const suelo = capaDeTiles(capas, 'suelo', total, true);
  const muros = capaDeTiles(capas, 'muros', total, false);

  const objetos: ObjetoMapa[] = [];
  for (const capa of capas) {
    if (capa.type !== 'objectgroup' || !Array.isArray(capa.objects)) continue;
    for (const o of capa.objects) {
      if (!esRegistro(o)) continue;
      const tipo = typeof o.type === 'string' && o.type ? o.type : typeof o.class === 'string' ? o.class : '';
      objetos.push({
        id: numero(o, 'id', 'object'),
        nombre: typeof o.name === 'string' ? o.name : '',
        tipo,
        x: numero(o, 'x', 'object') / tamTile,
        y: numero(o, 'y', 'object') / tamTile,
        ancho: (typeof o.width === 'number' ? o.width : tamTile) / tamTile,
        alto: (typeof o.height === 'number' ? o.height : tamTile) / tamTile,
        props: propiedades(o),
      });
    }
  }
  return { ancho, alto, tamTile, suelo, muros, objetos };
}

export function objetosDeTipo(mapa: MapaMundo, tipo: string): ObjetoMapa[] {
  return mapa.objetos.filter((o) => o.tipo === tipo);
}
