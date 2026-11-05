/** Pure model of the take-home sheet (F-03 printed, F-02 web page): one source, no "lite" version. */
import type { Practica } from '@rikuy/contracts';
import { pictogramaDeMaterial, type PictoId } from '@rikuy/evidencia';

export interface Hoja {
  titulo: string;
  preguntaGuia: string;
  materiales: { nombre: string; picto: PictoId }[];
  pasos: { texto: string; picto: PictoId }[];
  tabla: { encabezados: [string, string]; filas: string[] };
  dibuja: string;
  /** Text the child shows the teacher on return (the QR on the sheet encodes it). */
  retorno: string;
  lenguaUsada: 'es' | 'quy';
  preguntaQuechua: string | null;
  avisoQuechua: string | null;
}

const MAX_FILAS = 6;
const lista = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function construirHoja(p: Practica, o: { lengua: 'es' | 'quy'; codigoClase: string }): Hoja {
  const v = p.variables[0];
  const pr = p.protocolo;
  const valores = pr.valoresIndependiente.slice(0, MAX_FILAS);
  const unidadV = v?.unidad ?? '';
  const pasos: Hoja['pasos'] = [
    { texto: `Prepara ${lista(p.materiales.map((m) => minuscula(m.nombre)))}.`, picto: p.materiales[0] ? pictogramaDeMaterial(p.materiales[0].nombre) : 'generico' },
    { texto: `Cambia ${minuscula(v?.etiqueta ?? 'lo que vas a probar')}: prueba con ${lista(valores.map((x) => `${x} ${unidadV}`.trim()))}.`, picto: 'medir' },
    { texto: 'Suelta suave y empieza a contar.', picto: 'soltar' },
    { texto: `Mide el ${pr.magnitud} en ${pr.unidad}. Repite ${pr.repeticiones} ${pr.repeticiones === 1 ? 'vez' : 'veces'}.`, picto: 'reloj' },
    { texto: 'Anota cada medida en la tabla.', picto: 'anotar' },
  ];

  const quy = p.textos?.quy;
  const quechuaListo = o.lengua === 'quy' && quy?.revisado === true;
  const avisoQuechua = o.lengua === 'quy' && !quechuaListo ? 'El texto en quechua aún no está revisado por una hablante, por eso esta hoja va en castellano.' : null;

  return {
    titulo: p.titulo,
    preguntaGuia: p.preguntaGuia,
    materiales: p.materiales.map((m) => ({ nombre: m.nombre, picto: pictogramaDeMaterial(m.nombre) })),
    pasos,
    tabla: { encabezados: [`${v?.etiqueta ?? 'Valor'} (${unidadV})`, `${pr.magnitud} (${pr.unidad})`], filas: valores.map((x) => `${x} ${unidadV}`.trim()) },
    dibuja: '¿Qué pasó cuando cambiaste el valor? Dibuja o escribe:',
    retorno: `RKR:${o.codigoClase}:${p.id}`,
    lenguaUsada: quechuaListo ? 'quy' : 'es',
    preguntaQuechua: quechuaListo && quy ? quy.preguntaGuia : null,
    avisoQuechua,
  };
}
