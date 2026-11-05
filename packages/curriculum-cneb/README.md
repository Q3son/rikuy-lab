# @rikuy/curriculum-cneb

Subconjunto del Currículo Nacional (CNEB) de **Ciencia y Tecnología**, primaria (1.º a 6.º) y secundaria (1.º a 5.º), con:

- `ubicarCita(cita)`: busca, por coincidencia exacta, en qué desempeños oficiales aparece una cita.
- `citaLiteral(referencia)`: valida una `DesempenoRef` (nivel, grado, competencia, desempeño y cita).
- Grafo de conceptos (`conceptos.ts`): nodos, relaciones, vecinos a un salto y menciones por palabra completa.

## Fuente y crédito

Los textos vienen de **Hecze/supermentes** (<https://github.com/Hecze/supermentes>), archivos `packages/curriculo/data/primaria.json` y `secundaria.json`. Ese repositorio a su vez copia los programas curriculares del Ministerio de Educación del Perú:

- Primaria: Programa Curricular de Educación Primaria.
- Secundaria: Programa Curricular de Educación Secundaria, edición 2016 (RM 649-2016-MINEDU).

El repositorio de origen no incluye un archivo de licencia. La reutilización en este proyecto fue autorizada por el equipo. El crédito se mantiene en este README y en el campo `fuente` de `data/cneb-cyt.json`.

## Advertencia: el texto no está verificado contra el PDF oficial

Según la documentación de la fuente, la edición de secundaria es un PDF escaneado que se extrajo con **OCR** y se revisó contra las imágenes. Por tanto:

- **Cada cita debe contrastarse con el PDF oficial de MINEDU** antes de mostrarse a alumnos o usarse en un informe.
- El origen de primaria no está declarado en la fuente. Se trata igual hasta que se verifique.
- `data/cneb-cyt.json` lleva `verificacion.estado: "pendiente"`.

Citas usadas hoy en `content/practicas/`, pendientes de verificación:

| Práctica | Nivel y grado | Competencia y desempeño | Cita | Nota |
| --- | --- | --- | --- | --- |
| `pendulo.json` | secundaria 1 | C1 D1 | «Formula preguntas acerca de las variables que influyen en un hecho, fenómeno u objeto natural o tecnológico, y selecciona aquella que puede ser indagada científicamente.» | Por verificar contra PDF |
| `lactasa.json` | secundaria 2 | C1 D2 | «Propone procedimientos para observar, manipular la variable independiente, medir la variable dependiente y controlar la variable interviniente.» | Por verificar contra PDF |
| `respiratorio.json` | secundaria 2 | C2 D7 | «Describe cómo a través de los procesos de fotosíntesis y respiración se produce la energía que la célula utiliza para producir sustancias orgánicas.» | Por verificar. Ajuste débil: el desempeño trata de energía celular, no de altura. Revisión docente. |

## Datos

`data/cneb-cyt.json` lo genera `scripts/extraer-cyt.ts` a partir de los dos archivos fuente. Solo copia el texto oficial (`nombre`, `capacidades`, `estandar`, `desempenos`). Descarta los campos `temas`, que son editoriales. Registra el SHA-256 de cada archivo de origen y pesa unos 17 KB comprimidos (límite de la fase: 150 KB).

Regenerar desde el directorio de datos de Hecze/supermentes:

```sh
npm run extraer -w @rikuy/curriculum-cneb -- <ruta>/packages/curriculo/data
```

Con `CNEB_FUENTE_DIR=<ruta>/packages/curriculo/data npm test -w @rikuy/curriculum-cneb`, la prueba de reproducibilidad compara byte a byte la salida con el archivo versionado.

## Comandos

```sh
npm test -w @rikuy/curriculum-cneb
npm run typecheck -w @rikuy/curriculum-cneb
```
