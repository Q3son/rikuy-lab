import { createMemoryRepository } from './memoria.ts';
import { repositoryContract } from './testing/contrato-repositorio.ts';

repositoryContract('memory', async () => createMemoryRepository());
