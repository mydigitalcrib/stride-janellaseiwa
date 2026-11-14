// What runs on every page: the background, the light, the entrances, the menu.
import { initArchive } from './archive';
import { initBackdrop } from './backdrop';
import { initIssue } from './issue';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The soft light follows the pointer. */
function initAmbient() {
  const el = document.querySelector<HTMLElement>('[data-ambient]');
  if (!el || reduced()) return;
  let queued = false;
  let x = 0;
  let y = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        el.style.setProperty('--mx', `${x.toFixed(0)}px`);
        el.style.setProperty('--my', `${y.toFixed(0)}px`);
        el.style.setProperty('--spot', '1');
      });
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => el.style.setProperty('--spot', '0'), { passive: true });
}

/** One-shot entrances: [data-reveal] gets .is-revealed the first time it comes into view. */
function initReveal() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-revealed');
      io.unobserve(e.target);
    }
  });
  els.forEach((el) => io.observe(el));
}

// `js` goes back on here because the layout's 3-second fallback takes it off on a slow connection, and the
// open-and-close layouts depend on it once the scripts have arrived.
document.documentElement.classList.add('js', 'motion-ready');
initBackdrop();
initAmbient();
initReveal();
initIssue();
initArchive();
