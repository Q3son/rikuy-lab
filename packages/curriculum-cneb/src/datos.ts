import datos from '../data/cneb-cyt.json';
import type { SubconjuntoCyT } from './extraccion.ts';

/** Official CNEB science and technology subset, loaded once from data/cneb-cyt.json. */
export const subconjunto = datos as SubconjuntoCyT;
