// Pinned (prediction) card.
import { getItemProbability } from '../data/parser.js';
import { buildPredRow, el } from './rows.js';

const $ = (id) => document.getElementById(id);

export function initPinned({ collapsed, onToggle }) {
  const card = $('pinned-card');
  const toggle = $('pinned-toggle');
  const count = $('pinned-count');
  const body = $('pinned-body');

  card.classList.toggle('collapsed', collapsed);
  toggle.addEventListener('click', () => {
    const now = !card.classList.contains('collapsed');
    card.classList.toggle('collapsed', now);
    onToggle(now);
  });

  const isEmpty = (i) => (i.total_occurrences ?? 0) < 2 || !(i.estimated_next_timestamp ?? 0);

  return {
    root: body,
    /** Renders pinned rows; returns ETA refs for the ticker. */
    render(items, tracked, onUnpin) {
      body.innerHTML = '';
      const refs = [];
      const pinned = items
        .filter((i) => tracked.has(`${i.shop_type}:${i.item_id}`))
        .sort((a, b) => {
          const ae = isEmpty(a), be = isEmpty(b);
          if (ae !== be) return ae ? 1 : -1;
          return (getItemProbability(b) ?? -1) - (getItemProbability(a) ?? -1);
        });
      count.textContent = pinned.length ? `(${pinned.length})` : '';
      if (!pinned.length) {
        body.appendChild(el('div', 'empty-state', 'Click an item in History to pin it here.'));
        return refs;
      }
      const frag = document.createDocumentFragment();
      for (const item of pinned) {
        const { row, etaRef } = buildPredRow(item, `${item.shop_type}:${item.item_id}`, { onUnpin });
        frag.appendChild(row);
        if (etaRef) refs.push(etaRef);
      }
      frag.appendChild(el('div', 'pin-hint', 'Click ✕ to unpin an item.'));
      body.appendChild(frag);
      return refs;
    },
  };
}
