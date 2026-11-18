/* Navigation à la télécommande (app Google TV).
   Les flèches déplacent le focus vers l'élément le plus proche dans leur direction.
   Sur les pages de lecture, quand rien n'est à portée à l'écran, elles font défiler le texte.
   OK valide, Retour ferme ce qui est ouvert puis revient en arrière (géré par l'app). */
(() => {
  'use strict';
  if (!window.AminTV) return;

  const SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const TEXT_INPUT = /^(text|search|email|number|tel|url|password)$/;

  // Zone active : une fenêtre ouverte (réglages, sommaire…), l'alerte, le volume, sinon toute la page.
  function scope() {
    const dlg = [...document.querySelectorAll('dialog[open]')].pop();
    if (dlg) return dlg;
    const alertBox = document.getElementById('alertBox');
    if (alertBox && !alertBox.hidden) return alertBox;
    const vol = document.querySelector('.vol-pop:not([hidden])');
    if (vol) return vol;
    return document.body;
  }

  // Une case à cocher masquée se repère par son libellé.
  function rectOf(el) {
    let r = el.getBoundingClientRect();
    if ((r.width < 4 || r.height < 4) && el.labels && el.labels[0]) r = el.labels[0].getBoundingClientRect();
    return r;
  }

  function usable(el) {
    if (el.disabled || el.closest('[hidden], [inert]')) return null;
    const r = rectOf(el);
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    return r;
  }

  function candidates(root) {
    const out = [];
    for (const el of root.querySelectorAll(SEL)) {
      const r = usable(el);
      if (r) out.push({ el, r });
    }
    return out;
  }

  function scrollerOf(el) {
    for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return document.scrollingElement || document.documentElement;
  }

  function viewOf(sc) {
    if (sc === document.scrollingElement || sc === document.documentElement) return { top: 0, bottom: innerHeight, left: 0, right: innerWidth, height: innerHeight };
    const r = sc.getBoundingClientRect();
    return { top: Math.max(0, r.top), bottom: Math.min(innerHeight, r.bottom), left: r.left, right: r.right, height: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) };
  }

  const inView = (r, v) => r.bottom > v.top + 4 && r.top < v.bottom - 4;

  function score(dir, from, r) {
    const fx = (from.left + from.right) / 2, fy = (from.top + from.bottom) / 2;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    let main, cross;
    if (dir === 'down' || dir === 'up') {
      if (dir === 'down' ? !(cy > fy + 2 && r.top >= from.top + 2) : !(cy < fy - 2 && r.bottom <= from.bottom - 2)) return Infinity;
      main = dir === 'down' ? Math.max(0, r.top - from.bottom) : Math.max(0, from.top - r.bottom);
      const overlap = Math.min(r.right, from.right) - Math.max(r.left, from.left);
      cross = overlap > 0 ? 0 : -overlap;
      return main + cross * 2.5 + Math.abs(cx - fx) * 0.02;
    }
    if (dir === 'right' ? !(cx > fx + 2 && r.left >= from.left + 2) : !(cx < fx - 2 && r.right <= from.right - 2)) return Infinity;
    main = dir === 'right' ? Math.max(0, r.left - from.right) : Math.max(0, from.left - r.right);
    const overlap = Math.min(r.bottom, from.bottom) - Math.max(r.top, from.top);
    cross = overlap > 0 ? 0 : -overlap;
    return main + cross * 3 + Math.abs(cy - fy) * 0.02;
  }

  function focusEl(el, view) {
    el.focus({ preventScroll: true });
    const r = rectOf(el);
    const margin = 24;
    if (r.top < view.top + margin || r.bottom > view.bottom - margin || r.left < 0 || r.right > innerWidth) {
      el.scrollIntoView({ block: r.height > view.height * 0.7 ? 'start' : 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }

  function canScroll(sc, dir) {
    if (dir === 'down') return sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2;
    if (dir === 'up') return sc.scrollTop > 2;
    return false;
  }

  function move(dir) {
    const root = scope();
    const active = document.activeElement;
    let cur = active && active !== document.body && root.contains(active) && active.matches(SEL) ? active : null;
    const sc = scrollerOf(cur || root.querySelector(SEL) || root);
    const view = viewOf(sc);
    if (cur && !inView(rectOf(cur), view)) cur = null; // la page a défilé : on repart de l'écran

    const list = candidates(root).filter(c => c.el !== cur);
    if (!list.length) {
      if (canScroll(sc, dir)) sc.scrollBy({ top: (dir === 'down' ? 1 : -1) * view.height * 0.6, behavior: 'smooth' });
      return true;
    }

    // Rien de sélectionné : on prend le premier élément visible, depuis le bord concerné.
    const from = cur ? rectOf(cur)
      : dir === 'up' ? { top: view.bottom + 1, bottom: view.bottom + 1, left: view.left, right: view.right }
      : dir === 'down' ? { top: view.top - 1, bottom: view.top - 1, left: view.left, right: view.right }
      : null;
    let best = null, bestScore = Infinity;
    if (from) {
      for (const c of list) {
        const s = score(dir, from, c.r);
        if (s < bestScore) { bestScore = s; best = c; }
      }
    } else {
      best = list.filter(c => inView(c.r, view)).sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)[0] || null;
    }
    // Premier appui sans rien de sélectionné : on part du premier élément visible, dans l'ordre de lecture.
    if (!cur && (dir === 'down' || dir === 'up')) {
      const seen = list.filter(c => inView(c.r, view));
      const row = c => Math.round(c.r.top / 24);
      seen.sort((a, b) => row(a) - row(b) || a.r.left - b.r.left);
      if (seen.length) best = dir === 'down' ? seen[0] : seen[seen.length - 1];
    }

    if (dir === 'down' || dir === 'up') {
      const reach = view.height * 0.4;
      const near = best && (dir === 'down' ? best.r.top <= view.bottom + reach : best.r.bottom >= view.top - reach);
      if (!near && canScroll(sc, dir)) {
        sc.scrollBy({ top: (dir === 'down' ? 1 : -1) * view.height * 0.6, behavior: 'smooth' });
        return true;
      }
    }
    if (best) { focusEl(best.el, view); return true; }
    return false;
  }

  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const tag = t && t.tagName;
    if (e.key === 'Enter' && tag === 'INPUT' && /^(checkbox|radio)$/.test(t.type)) {
      e.preventDefault();
      t.click();
      return;
    }
    const dir = DIRS[e.key];
    if (!dir) return;
    if (tag === 'INPUT' && t.type === 'range' && (dir === 'left' || dir === 'right')) return; // le curseur se règle avec ← →
    if ((tag === 'TEXTAREA' || (tag === 'INPUT' && TEXT_INPUT.test(t.type))) && (dir === 'left' || dir === 'right') && t.value) return;
    if (move(dir)) e.preventDefault();
  });

  // Sur la télé, le Coran s'ouvre directement en plein écran : le livre occupe tout l'écran.
  function bookFullScreen() {
    setTimeout(() => {
      const b = document.getElementById('qImmersive');
      if (b && document.body.dataset.view === 'coran' && !document.body.classList.contains('q-immersive')) b.click();
    }, 250);
  }
  window.addEventListener('mawqut:view', e => { if (e.detail === 'coran') bookFullScreen(); });
  if (document.body.dataset.view === 'coran') bookFullScreen();

  // Retour : ferme le volume s'il est ouvert (le reste est géré dans app.js)
  window.aminTvClose = () => {
    if (document.querySelector('.vol-pop:not([hidden])')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return true;
    }
    return false;
  };
})();
