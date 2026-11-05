import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router';
import { rutas } from './app/rutas.tsx';
import './index.css';

/** Hash routing: works the same on GitHub Pages, the local hub and the MINEDU kit (1.2). */
const router = createHashRouter(rutas);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
