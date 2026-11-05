import { Outlet } from 'react-router';

/** Minimal app frame. F1 replaces it with the real shell (tabs, role, PWA banner). */
export function Shell() {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <Outlet />
    </div>
  );
}
