// The archive's topic chips: show only the issues on one topic, and hide any month left empty. Does nothing on
// other pages. Without scripts every issue simply shows.
export function initArchive() {
  const root = document.querySelector<HTMLElement>('[data-archive]');
  if (!root) return;
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-topic-filter]')];
  if (!chips.length) return;
  const items = [...root.querySelectorAll<HTMLElement>('[data-topic]')];
  const months = [...root.querySelectorAll<HTMLElement>('[data-archive-month]')];
  const status = root.querySelector<HTMLElement>('[data-archive-count]');

  const show = (topic: string) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.topicFilter === topic)));
    let shown = 0;
    items.forEach((item) => {
      const on = topic === 'all' || item.dataset.topic === topic;
      item.hidden = !on;
      if (on) shown++;
    });
    months.forEach((m) => (m.hidden = !m.querySelector('[data-topic]:not([hidden])')));
    if (status) status.textContent = `Showing ${shown} of ${items.length} issues`;
  };

  root.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest<HTMLButtonElement>('[data-topic-filter]');
    if (chip) show(chip.dataset.topicFilter ?? 'all');
  });
}
