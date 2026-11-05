/** Placeholder home ("Mi clase de hoy" will live here, F1). Keeps the classic hologram reachable. */
export function Inicio() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">Rikuy</h1>
      <p className="text-neutral-400">Museo Rikuy en construcción.</p>
      <nav className="flex flex-col gap-2">
        <a className="rounded-lg border border-neutral-700 p-3" href="./clasico.html">
          Laboratorio holográfico (versión clásica)
        </a>
      </nav>
    </main>
  );
}
