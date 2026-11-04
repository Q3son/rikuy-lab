import '../style.css';
import { localStorageGet, localStorageSet } from '../net/bus.ts';

const sala = document.getElementById('sala') as HTMLInputElement;
sala.value = localStorageGet('rikuy.sala') ?? 'aula1';
document.querySelectorAll<HTMLAnchorElement>('[data-role]').forEach((a) => {
  a.href = '#';
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const v = sala.value.trim().toLowerCase() || 'aula1';
    localStorageSet('rikuy.sala', v);
    location.href = `/${a.dataset.role}?sala=${encodeURIComponent(v)}`;
  });
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
