/*
 * Amin — page « À réciter » : les sourates et versets recommandés à certains moments
 * (le vendredi, à la maison, le soir et avant de dormir, matin et soir, après la prière).
 * Chaque texte peut être lu sur place, ouvert dans le livre ou écouté.
 */
(() => {
  'use strict';
  const Q = window.MawqutQuran;
  if (!Q) return;
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const count = s => Q.surah(s)[3];

  const { P, GROUPS, NOW } = window.MAWQUT_MOMENTS; // js/moments-data.js

  const partEnd = ([s, , b]) => b || count(s);
  const verses = p => { const out = []; P[p].parts.forEach(pt => { for (let v = pt[1]; v <= partEnd(pt); v++) out.push([pt[0], v]); }); return out; };
  const total = p => P[p].parts.reduce((n, pt) => n + partEnd(pt) - pt[1] + 1, 0);
  const isShort = p => total(p) <= 16;
  const playId = (g, p) => g + ':' + p;

  const ICON = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.500v13l10.500-6.500L8 5.500Z" fill="currentColor"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.500" y="6.500" width="11" height="11" rx="1.500" fill="currentColor"/></svg>';
  const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5c2.5-1.2 5.5-1.2 9 .8 3.5-2 6.5-2 9-.8V18c-2.5-1.2-5.5-1.2-9 .8-3.5-2-6.5-2-9-.8V6.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7.3V19" stroke="currentColor" stroke-width="1.6"/></svg>';
  const SPK = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.500v5h3.600L12 18.500v-13L7.600 9.500H4Z" fill="currentColor"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.500" y="6.500" width="11" height="11" rx="1.500" fill="currentColor"/></svg>';
  const arNum = n => String(n).replace(/\d/g, x => '٠١٢٣٤٥٦٧٨٩'[x]);

  function play(g, p, times) {
    if (window.Mawqut && window.Mawqut.unlockAudio) window.Mawqut.unlockAudio();
    Q.playList(verses(p), { id: playId(g, p), label: P[p].title, times: times || 1 });
  }

  // ---------- Page ----------
  const root = $('#reciterContent');
  let rendered = '';
  function render() {
    const now = window.Mawqut && window.Mawqut.moment ? window.Mawqut.moment() : 'jour';
    if (rendered === now) return;
    rendered = now;
    const current = NOW[now].group;
    const groups = GROUPS.slice().sort((a, b) => (b.id === current) - (a.id === current));
    root.innerHTML = `
      <header class="r-head">
        <h1>À réciter</h1>
        <p class="r-ar" lang="ar">أَذْكَارٌ مِنَ القُرْآن</p>
        <p class="r-lead">Les sourates et les versets que le Prophète ﷺ a recommandés à certains moments. Lis-les ici, ouvre-les dans le livre ou écoute-les.</p>
      </header>
      <div class="r-bar" id="rBar">
        <nav class="r-nav" id="rNav" aria-label="Aller à un moment">${groups.map(g => `<a href="#reciter-${g.id}" data-go="${g.id}"${g.id === current ? ' class="is-now" title="C’est le moment"' : ''}>${g.id === current ? '<i class="r-dot" aria-hidden="true"></i>' : ''}${esc(g.title)}</a>`).join('')}</nav>
      </div>
      ${groups.map(g => `
      <section class="r-group${g.id === current ? ' is-now' : ''}" id="r-${g.id}" aria-labelledby="rh-${g.id}">
        <div class="r-group-head">
          <h2 id="rh-${g.id}">${esc(g.title)}</h2>
          ${g.id === current ? '<span class="r-now">C’est le moment</span>' : ''}
          <p>${esc(g.when)}</p>
        </div>
        <div class="r-items">${g.items.map(it => itemHTML(g.id, it)).join('')}</div>
      </section>`).join('')}
      <p class="r-foot">Les paroles citées sont traduites de l’arabe et leur source est indiquée sous chacune. La lecture sur écran ne remplace pas l’apprentissage auprès d’un enseignant.</p>`;
    sync(lastState);
    measureBar(); spy();
  }
  function itemHTML(g, it) {
    const p = P[it.p], short = isShort(it.p), first = p.parts[0];
    const id = playId(g, it.p);
    return `<article class="r-item" data-id="${id}" data-p="${it.p}">
      <div class="r-item-head">
        <div><h3>${esc(p.title)}</h3><p class="r-what">${esc(p.what)}</p></div>
        <span class="r-item-ar" lang="ar">${p.ar}</span>
      </div>
      ${it.times > 1 ? `<span class="tag tag-count">${it.times} fois</span>` : ''}
      <blockquote class="r-why"><p>${esc(it.why)}</p><cite>${esc(it.src)}</cite></blockquote>
      <div class="r-actions">
        <button class="btn btn-primary r-play" type="button" data-play="${id}" data-times="${it.times || 1}" aria-pressed="false">${ICON}<span>Écouter${it.times > 1 ? ' ' + it.times + ' fois' : ''}</span></button>
        ${short ? `<button class="btn r-toggle" type="button" aria-expanded="false" aria-controls="rt-${g}-${it.p}">Lire ici</button>` : ''}
        ${short ? `<button class="btn btn-quiet" type="button" data-explain="${first[0]}:${first[1]}">Explication</button>` : ''}
        <button class="btn${short ? ' btn-quiet' : ''}" type="button" data-open="${first[0]}:${first[1]}">${short ? 'Ouvrir dans le livre' : 'Lire dans le livre'}</button>
      </div>
      <p class="r-progress tnum" aria-live="polite" hidden></p>
      ${short ? `<div class="r-text" id="rt-${g}-${it.p}" hidden></div>` : ''}
    </article>`;
  }
  async function fillText(box, p) {
    if (box.dataset.done) return;
    box.innerHTML = '<p class="hint">Chargement du texte…</p>';
    try {
      let html = '';
      for (const pt of P[p].parts) {
        const [s, a] = pt, b = partEnd(pt);
        const d = await Q.ensure(s);
        if (P[p].parts.length > 1) html += `<h4 class="r-sub">${esc(Q.surah(s)[1])} <span lang="ar">${esc(Q.surah(s)[0])}</span></h4>`;
        if (a === 1 && s !== 1 && s !== 9) html += '<p class="qv-ar r-basmala" lang="ar">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>';
        for (let v = a; v <= b; v++) {
          const tr = d.rm[v - 1].replace(/\[\d+\]/g, '');
          html += `<div class="qv" data-key="${s}:${v}"><div class="qv-top"><button type="button" class="l-play" data-key="${s}:${v}" aria-label="Écouter le verset ${s}:${v}">${SPK}</button><button type="button" class="l-explain" data-key="${s}:${v}" aria-label="Explication du verset ${s}:${v}" title="Explication du verset">${BOOK}</button></div><p class="qv-ar" lang="ar">${esc(d.ar[v - 1])} <span class="qv-mark">۝${arNum(v)}</span></p><p class="say-ph">${esc(d.ph[v - 1])}</p><p class="say-fr">${esc(tr)}</p></div>`;
        }
      }
      box.innerHTML = html + '<p class="say-src">Traduction de Rachid Maach</p>';
      box.dataset.done = '1';
      sync(lastState);
    } catch (e) { box.innerHTML = '<p class="hint">Texte indisponible hors connexion.</p>'; }
  }
  root.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); const t = $('#r-' + go.dataset.go); if (t) t.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
    const pb = e.target.closest('[data-play]');
    if (pb) { const [g, p] = pb.dataset.play.split(':'); play(g, p, +pb.dataset.times); return; }
    const tg = e.target.closest('.r-toggle');
    if (tg) {
      const box = $('#' + tg.getAttribute('aria-controls')), open = box.hidden;
      box.hidden = !open; tg.setAttribute('aria-expanded', String(open)); tg.textContent = open ? 'Masquer le texte' : 'Lire ici';
      if (open) fillText(box, tg.closest('.r-item').dataset.p);
      return;
    }
    const eb = e.target.closest('[data-explain]');
    if (eb) { const [s, v] = eb.dataset.explain.split(':').map(Number); Q.explain(s, v); return; }
    const xb = e.target.closest('.l-explain');
    if (xb) { const [s, v] = xb.dataset.key.split(':').map(Number); Q.explain(s, v); return; }
    const ob = e.target.closest('[data-open]');
    if (ob) { const [s, v] = ob.dataset.open.split(':').map(Number); Q.open(s, v); return; }
    const vb = e.target.closest('.l-play');
    if (vb) { const [s, v] = vb.dataset.key.split(':').map(Number); if (window.Mawqut && window.Mawqut.unlockAudio) window.Mawqut.unlockAudio(); Q.play(s, v, false); }
  });

  // ---------- État de lecture : boutons, progression, bandeau ----------
  let lastState = null;
  const np = $('#nowPlaying');
  function sync(st) {
    lastState = st;
    const q = st && st.queue;
    document.querySelectorAll('.r-item').forEach(card => {
      const on = !!q && q.id === card.dataset.id;
      const b = card.querySelector('.r-play');
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('span').textContent = on ? 'Arrêter' : 'Écouter' + (+b.dataset.times > 1 ? ' ' + b.dataset.times + ' fois' : '');
      const pr = card.querySelector('.r-progress');
      pr.hidden = !on;
      if (on) pr.textContent = progress(q);
    });
    root.querySelectorAll('.qv.is-playing').forEach(x => x.classList.remove('is-playing'));
    if (st) root.querySelectorAll(`.qv[data-key="${st.s}:${st.v}"]`).forEach(x => x.classList.add('is-playing'));
    const mp = $('#momentPlay');
    if (mp && mp.dataset.play) { const on = !!q && q.id === mp.dataset.play; mp.setAttribute('aria-pressed', String(on)); mp.querySelector('span').textContent = on ? 'Arrêter' : 'Écouter'; }
    if (np) {
      np.hidden = !q;
      document.body.classList.toggle('has-np', !!q);
      if (q) { $('#npTitle').textContent = q.label; $('#npSub').textContent = progress(q); np.dataset.pos = st.s + ':' + st.v; }
    }
  }
  const progress = q => `Verset ${q.i + 1} sur ${q.n}` + (q.times > 1 ? ` · ${q.round}${q.round === 1 ? 're' : 'e'} fois sur ${q.times}` : '');
  window.addEventListener('mawqut:playing', e => sync(e.detail));
  if (np) {
    $('#npStop').addEventListener('click', () => Q.stop());
    $('#npOpen').addEventListener('click', e => { e.preventDefault(); const [s, v] = (np.dataset.pos || '1:1').split(':').map(Number); Q.open(s, v); });
  }

  // ---------- Suggestion du moment sur la page Horaires ----------
  const card = $('#momentCard');
  function renderCard() {
    if (!card || !window.Mawqut || !window.Mawqut.moment) return;
    const now = window.Mawqut.moment(), n = NOW[now], p = P[n.p];
    if (card.dataset.now === now) return;
    card.dataset.now = now;
    $('#momentKicker').textContent = n.kicker;
    $('#momentTitle').textContent = p.title + (n.times > 1 ? ', ' + n.times + ' fois' : '');
    const others = GROUPS.find(g => g.id === n.group).items.length - 1;
    $('#momentWhat').textContent = p.what + (others > 0 ? ` · et ${others} autre${others > 1 ? 's' : ''} lecture${others > 1 ? 's' : ''} pour ce moment` : '');
    const b = $('#momentPlay');
    b.innerHTML = ICON + '<span>Écouter</span>';
    b.dataset.play = playId(n.group, n.p); b.dataset.times = n.times || 1; b.setAttribute('aria-pressed', 'false');
    $('#momentRead').dataset.group = n.group; $('#momentRead').dataset.p = n.p;
    $('#momentRead').textContent = isShort(n.p) ? 'Lire' : 'Lire dans le livre';
    card.hidden = false;
    sync(lastState);
  }
  if (card) {
    $('#momentPlay').addEventListener('click', e => { const b = e.currentTarget; const [g, p] = b.dataset.play.split(':'); play(g, p, +b.dataset.times); });
    card.addEventListener('click', e => {
      const a = e.target.closest('a[href="#reciter"]');
      if (!a) return;
      const r = $('#momentRead');
      if (a === r && !isShort(r.dataset.p)) { e.preventDefault(); const pt = P[r.dataset.p].parts[0]; Q.open(pt[0], pt[1]); return; }
      pendingGroup = r.dataset.group;
      pendingItem = a === r ? r.dataset.p : '';
    });
  }

  // ---------- Repères : barre des moments, section courante, retour en haut ----------
  const topBtn = $('#rTop');
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let barH = 64, spyQueued = false;
  function measureBar() {
    const bar = $('#rBar');
    if (bar && bar.offsetHeight) barH = bar.offsetHeight;
    root.style.setProperty('--r-bar-h', barH + 'px');
  }
  function spy() {
    spyQueued = false;
    if (document.body.dataset.view !== 'reciter') return;
    const bar = $('#rBar'), nav = $('#rNav');
    if (!bar || !nav) return;
    const line = barH + 36;
    let active = '';
    root.querySelectorAll('.r-group').forEach(g => { if (g.getBoundingClientRect().top <= line) active = g.id.slice(2); });
    // En bas de page, la dernière section est considérée comme lue même si son titre n'a pas franchi la ligne.
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd) { const all = root.querySelectorAll('.r-group'); if (all.length) active = all[all.length - 1].id.slice(2); }
    let activeLink = null;
    nav.querySelectorAll('a').forEach(a => {
      const on = a.dataset.go === active;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'location'); activeLink = a; } else a.removeAttribute('aria-current');
    });
    // Fait défiler la barre (et non la page) pour garder la pastille active en vue.
    if (activeLink) {
      const l = activeLink.offsetLeft, r = l + activeLink.offsetWidth, v = nav.scrollLeft, w = nav.clientWidth;
      if (l < v + 12) nav.scrollTo({ left: Math.max(0, l - 16), behavior: reduce() ? 'auto' : 'smooth' });
      else if (r > v + w - 12) nav.scrollTo({ left: r - w + 16, behavior: reduce() ? 'auto' : 'smooth' });
    }
    const head = root.querySelector('.r-head');
    const stuck = bar.getBoundingClientRect().top <= 0.5;
    bar.classList.toggle('is-stuck', stuck);
    if (topBtn) topBtn.classList.toggle('is-shown', window.scrollY > (head ? head.offsetHeight + 120 : 500));
  }
  function queueSpy() { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }
  window.addEventListener('scroll', queueSpy, { passive: true });
  window.addEventListener('resize', () => { measureBar(); queueSpy(); });
  if (topBtn) topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' });
    const h = root.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });

  // ---------- Affichage ----------
  let pendingGroup = '', pendingItem = '';
  function show() {
    render();
    if (!pendingGroup) return;
    const t = $('#r-' + pendingGroup);
    const tg = pendingItem && t && t.querySelector(`.r-item[data-p="${pendingItem}"] .r-toggle[aria-expanded="false"]`);
    pendingGroup = ''; pendingItem = '';
    if (tg) tg.click();
    if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60);
  }
  window.addEventListener('mawqut:view', e => { if (e.detail === 'reciter') show(); if (e.detail === 'horaires') renderCard(); });
  if (document.body.dataset.view === 'reciter') show();
  renderCard();
  setInterval(() => { renderCard(); if (document.body.dataset.view === 'reciter') render(); }, 60000);
})();
