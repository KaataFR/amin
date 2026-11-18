/* Mouvement d'Amin : écran de chargement, changement de page, indicateur d'onglet,
   apparitions au défilement. Le site fonctionne sans ce fichier ; il ne fait qu'ajouter du
   mouvement, et il se tait si l'appareil demande moins d'animations (ou si un robot de test pilote la page). */
(() => {
  'use strict';
  const D = document, H = D.documentElement, B = D.body;
  const FX = H.classList.contains('fx');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ORDER = ['horaires', 'coran', 'reciter', 'hadiths', 'apprendre', 'telecharger'];
  const $ = (s, r = D) => r.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------- Barre de progression ----------
  let bar = null, barT = 0, busyN = 0;
  function mkBar() {
    if (bar) return bar;
    bar = D.createElement('div'); bar.className = 'fx-bar'; bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<i></i>'; B.appendChild(bar);
    return bar;
  }
  function sweep() {
    if (!FX || reduce || busyN) return;
    const b = mkBar();
    b.classList.remove('run'); void b.offsetWidth; b.classList.add('run');
    clearTimeout(barT); barT = setTimeout(() => b.classList.remove('run'), 800);
  }
  // busy(true) … busy(false) : barre qui court pendant un chargement un peu long
  function busy(on) {
    if (!FX || reduce) return;
    busyN = Math.max(0, busyN + (on ? 1 : -1));
    const b = mkBar();
    if (busyN > 0) { b.classList.remove('run'); b.classList.add('busy'); }
    else { b.classList.remove('busy'); sweep(); }
  }

  // ---------- Écran de chargement ----------
  const splash = D.getElementById('splash');
  function afterSplash() {
    B.classList.add('boot');
    const a = $('#arc'); if (a && FX && !reduce) { a.classList.add('arc-intro'); setTimeout(() => a.classList.remove('arc-intro'), 3000); }
    const m = $('main.view:not([hidden])'); if (m) enter(m, 0);
    setTimeout(() => B.classList.remove('boot'), 1800);
    scanReveal();
  }
  if (splash && H.classList.contains('has-splash')) {
    const short = H.classList.contains('splash-short');
    const minMs = reduce ? 650 : short ? 1000 : 2000;
    let over = false;
    const finish = () => {
      if (over) return; over = true;
      const fill = D.getElementById('splashFill');
      if (fill) { fill.style.animation = 'none'; fill.style.transition = 'transform .25s ease'; fill.style.transform = 'scaleX(1)'; }
      setTimeout(() => {
        splash.classList.add('is-out'); H.classList.add('splash-done');
        try { sessionStorage.setItem('amin.seen', '1'); } catch (e) {}
        afterSplash();
        setTimeout(() => splash.remove(), 900);
      }, 220);
    };
    const loaded = new Promise(r => { if (D.readyState === 'complete') r(); else addEventListener('load', r, { once: true }); });
    const fonts = D.fonts && D.fonts.ready ? D.fonts.ready.catch(() => {}) : Promise.resolve();
    Promise.race([Promise.all([loaded, fonts]), wait(4000)]).then(() => wait(Math.max(0, minMs - performance.now()))).then(finish);
    // un toucher ou une touche passe l'écran de chargement une fois la page prête
    const skip = () => { Promise.all([loaded]).then(() => { if (performance.now() > 700) finish(); }); };
    splash.addEventListener('pointerdown', skip); addEventListener('keydown', skip, { once: true });
    splash.style.pointerEvents = 'auto';
  } else {
    // pas d'écran de chargement : la page s'installe tout de suite
    requestAnimationFrame(() => { if (FX) afterSplash(); });
  }

  // ---------- Arrivée d'une page ----------
  function enter(main, dir) {
    if (!FX || reduce || !main) return;
    clearTimeout(main._fxT);
    (main._fxBlocks || []).forEach(s => { s.classList.remove('stg'); s.style.removeProperty('--i'); });
    main.classList.remove('view-in');
    const blocks = [...main.querySelectorAll('section')]
      .filter(s => !s.parentElement.closest('section') && !s.hidden && s.offsetParent !== null && s.getBoundingClientRect().top < innerHeight * 1.05)
      .slice(0, 8);
    blocks.forEach((s, i) => { s.style.setProperty('--i', i); s.classList.add('stg'); });
    main._fxBlocks = blocks;
    main.style.setProperty('--dir', String(dir));
    void main.offsetWidth;
    main.classList.add('view-in');
    main._fxT = setTimeout(() => {
      main.classList.remove('view-in');
      blocks.forEach(s => { s.classList.remove('stg'); s.style.removeProperty('--i'); });
    }, 1400);
  }

  // ---------- Indicateur d'onglet ----------
  const nav = $('nav.tabs');
  let ink = null, inkX = null, inkT = 0;
  function placeInk(animate) {
    if (!nav) return;
    const a = nav.querySelector('.tab[aria-current="page"]');
    if (!a || !nav.offsetWidth) { if (ink) ink.style.opacity = '0'; return; }
    if (!ink) { ink = D.createElement('span'); ink.className = 'tab-ink'; ink.setAttribute('aria-hidden', 'true'); nav.appendChild(ink); }
    ink.style.opacity = '';
    const x = Math.round(a.offsetLeft + a.offsetWidth / 2 - 11), y = a.offsetTop + a.offsetHeight - 4;
    const set = (tx, w) => { ink.style.setProperty('--x', tx + 'px'); ink.style.setProperty('--y', y + 'px'); ink.style.width = w + 'px'; };
    clearTimeout(inkT);
    if (animate && FX && !reduce && inkX !== null && inkX !== x) {
      // l'indicateur s'étire jusqu'au nouvel onglet puis se resserre
      ink.classList.add('is-moving');
      set(Math.min(inkX, x), Math.abs(x - inkX) + 22);
      inkT = setTimeout(() => set(x, 22), 170);
      setTimeout(() => ink.classList.remove('is-moving'), 520);
    } else { ink.classList.remove('is-moving'); set(x, 22); }
    inkX = x;
    H.classList.add('has-ink');
  }

  // ---------- Apparition au défilement ----------
  let io = null;
  function scanReveal() {
    if (!FX || reduce || !('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target; io.unobserve(t); t.classList.add('rv-in');
      setTimeout(() => { t.classList.remove('rv', 'rv-in'); }, 1100);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    const m = $('main.view:not([hidden])'); if (!m) return;
    m.querySelectorAll('section, .reveal').forEach(s => {
      if (s.dataset.rv || s.hidden || s.parentElement.closest('section')) return;
      const r = s.getBoundingClientRect();
      if (!r.height || r.top < innerHeight * 0.95) return;
      s.dataset.rv = '1'; s.classList.add('rv'); io.observe(s);
    });
  }

  // ---------- Changement de page ----------
  let prev = (() => { const m = $('main.view:not([hidden])'); return m ? m.dataset.view : null; })();
  addEventListener('mawqut:view', ev => {
    const v = ev.detail;
    placeInk(true);
    if (v === prev) return;
    const dir = Math.sign(ORDER.indexOf(v) - ORDER.indexOf(prev)) || 0;
    prev = v;
    if (!B.classList.contains('boot') && !(splash && splash.isConnected && !H.classList.contains('splash-done'))) {
      sweep();
      enter($('main.view[data-view="' + v + '"]'), dir);
    }
    setTimeout(scanReveal, 120);
    setTimeout(scanReveal, 700);
  });

  placeInk(false);
  addEventListener('resize', () => placeInk(false));
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => placeInk(false));
  addEventListener('load', () => placeInk(false));

  window.AminFx = { sweep, busy, enter };
})();
