// What a mom can do on an issue: open things, pick ideas for her stage, save and download them, copy them, save the
// issue as a PDF. Saved ideas live in this browser only (no accounts on a hidden-link site).
import { refreshBackdrop, turnInk } from './backdrop';

const all = <T extends HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = window.matchMedia('(min-width: 1024px)');

/* ---------- Saying something happened ---------- */
let toastTimer = 0;
function say(message: string) {
  const el = document.querySelector<HTMLElement>('[data-toast]');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-showing');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-showing'), 2600);
}

/* ---------- Copying ---------- */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function initCopy() {
  document.addEventListener('click', async (e) => {
    const button = (e.target as Element).closest<HTMLElement>('[data-copy]');
    if (!button?.dataset.copy) return;
    say((await copy(button.dataset.copy)) ? (button.dataset.copied ?? 'Copied.') : 'Copying didn’t work in this browser.');
  });
}

/* ---------- Five things to try: each opens in place ---------- */
function initFolds() {
  all('[data-fold-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('[data-fold]');
      if (!item) return;
      button.setAttribute('aria-expanded', String(item.classList.toggle('is-open')));
    });
  });
}

/* ---------- The format in three beats: each lights as it reaches the middle of the screen, and stays lit ---------- */
function initBeats() {
  const beats = all('[data-beat]');
  if (!beats.length) return;
  if (reduced() || !('IntersectionObserver' in window)) {
    beats.forEach((b) => b.classList.add('is-lit'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle('is-lit', e.isIntersecting || e.boundingClientRect.top < 0);
    },
    { rootMargin: '0px 0px -45% 0px' },
  );
  beats.forEach((b) => io.observe(b));
}

/* ---------- The twelve ideas ---------- */
function initIdeas() {
  const root = document.querySelector<HTMLElement>('[data-ideas]');
  if (!root) return;
  const ideas = all('[data-idea]', root);
  const key = `stride-talent-saved-${root.dataset.issue}`;

  let saved = new Set<number>();
  try {
    saved = new Set((JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]).filter(Number.isInteger) as number[]);
  } catch {
    saved = new Set();
  }

  let segment = 'all';
  let onlySaved = false;

  const idOf = (el: HTMLElement) => Number(el.dataset.id);

  const setOpen = (el: HTMLElement, open: boolean) => {
    el.classList.toggle('is-open', open);
    el.querySelector('[data-idea-toggle]')?.setAttribute('aria-expanded', String(open));
  };

  // On desktop one idea always shows beside the list; on smaller screens they open under their titles.
  const keepOneOpen = () => {
    if (!desktop.matches) return;
    const shown = ideas.filter((el) => !el.hidden);
    const current = shown.find((el) => el.classList.contains('is-open'));
    ideas.forEach((el) => {
      if (el !== current) setOpen(el, false);
    });
    if (!current && shown[0]) setOpen(shown[0], true);
  };

  const apply = () => {
    let count = 0;
    ideas.forEach((el) => {
      const show = (segment === 'all' || el.dataset.segment === segment) && (!onlySaved || saved.has(idOf(el)));
      el.hidden = !show;
      if (show) count++;
    });
    const result = root.querySelector('[data-ideas-count]');
    if (result) result.textContent = `Showing ${count} of ${ideas.length} ideas`;
    const empty = root.querySelector<HTMLElement>('[data-ideas-empty]');
    if (empty) empty.hidden = count > 0;
    keepOneOpen();
  };

  const showSaved = () => {
    all('[data-save]', root).forEach((b) => b.setAttribute('aria-pressed', String(saved.has(Number(b.dataset.save)))));
    const count = root.querySelector('[data-saved-count]');
    if (count) count.textContent = String(saved.size);
  };

  root.addEventListener('click', (e) => {
    const target = e.target as Element;

    const toggle = target.closest<HTMLElement>('[data-idea-toggle]');
    if (toggle) {
      const el = toggle.closest<HTMLElement>('[data-idea]');
      if (!el) return;
      if (desktop.matches) ideas.forEach((other) => setOpen(other, other === el));
      else setOpen(el, !el.classList.contains('is-open'));
      return;
    }

    const save = target.closest<HTMLElement>('[data-save]');
    if (save) {
      const id = Number(save.dataset.save);
      const on = !saved.has(id);
      if (on) saved.add(id);
      else saved.delete(id);
      try {
        localStorage.setItem(key, JSON.stringify([...saved]));
      } catch {
        /* Saving is a convenience: the page still works without it. */
      }
      showSaved();
      say(on ? 'Saved for later.' : 'Removed from your saved ideas.');
      if (onlySaved) apply();
      return;
    }

    const chip = target.closest<HTMLElement>('[data-segment-filter]');
    if (chip) {
      segment = chip.dataset.segmentFilter ?? 'all';
      all('[data-segment-filter]', root).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      apply();
      return;
    }

    const savedToggle = target.closest<HTMLElement>('[data-ideas-saved]');
    if (savedToggle) {
      onlySaved = !onlySaved;
      savedToggle.setAttribute('aria-pressed', String(onlySaved));
      apply();
      return;
    }

    if (target.closest('[data-ideas-reset]')) {
      segment = 'all';
      onlySaved = false;
      all('[data-segment-filter]', root).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.segmentFilter === 'all')));
      root.querySelector('[data-ideas-saved]')?.setAttribute('aria-pressed', 'false');
      apply();
      return;
    }

    if (target.closest('[data-ideas-export]')) {
      const briefs = ideas.filter((el) => saved.has(idOf(el))).map((el) => el.querySelector<HTMLElement>('[data-copy]')?.dataset.copy ?? '');
      if (!briefs.length) {
        say('Tap the star on an idea first, then download it here.');
        return;
      }
      const file = new Blob([briefs.join(`\n\n${'-'.repeat(40)}\n\n`)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-saved-ideas-issue-${root.dataset.issue}.txt`;
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      say(`Downloaded ${briefs.length} idea${briefs.length === 1 ? '' : 's'}.`);
    }
  });

  desktop.addEventListener('change', keepOneOpen);
  showSaved();
  apply();
}

/* ---------- Where you are, in the top bar ---------- */
function initNav() {
  const links = all('[data-nav]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => {
          if (a.dataset.nav === e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  all('main section[id]').forEach((section) => io.observe(section));
}

/* ---------- The menu and Save as PDF ---------- */
function initChrome() {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  menu?.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a, [data-print]')) menu.hidePopover();
  });

  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-print]')) window.print();
  });
  window.addEventListener('beforeprint', () => {
    all<HTMLDetailsElement>('details').forEach((d) => (d.open = true));
    turnInk('light');
  });
  window.addEventListener('afterprint', refreshBackdrop);
}

export function initIssue() {
  initCopy();
  initFolds();
  initBeats();
  initIdeas();
  initNav();
  initChrome();
}
