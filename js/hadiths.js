/*
 * Amin — page « Hadiths » : hadith du jour, parcours par thème, recherche et favoris.
 * Données : hadith/meta.js (liste et thèmes) et hadith/t0.js … t8.js (textes, chargés à la demande).
 * Source : HadeethEnc.com. Seuls les hadiths authentiques rapportés par al-Bukhârî et/ou Muslim sont inclus.
 */
(() => {
  'use strict';
  const M = window.MAWQUT_HADITH;
  if (!M) return;
  const $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
  const SRC = ['al-Bukhârî et Muslim', 'al-Bukhârî', 'Muslim'];
  const BY_ID = new Map(M.list.map(e => [e[0], e]));
  const PAGE = 12;

  // ---------- Textes, chargés par thème ----------
  const DATA = {}, waiting = {};
  window.MawqutHadith = { load(i, d) { DATA[i] = d; (waiting[i] || []).forEach(f => f()); delete waiting[i]; } };
  function ensure(i) {
    if (DATA[i]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const first = !waiting[i];
      (waiting[i] = waiting[i] || []).push(resolve);
      if (!first) return;
      const s = document.createElement('script');
      s.src = `hadith/t${i}.js`;
      s.onerror = () => { delete waiting[i]; reject(new Error('hors connexion')); };
      document.head.appendChild(s);
    });
  }
  const full = e => { const d = DATA[e[1]] && DATA[e[1]][e[0]]; return d ? { fr: d[0], ar: d[1], ex: d[2], hints: d[3] } : null; };

  // ---------- Hadith du jour ----------
  function todayEntry() {
    const n = new Date();
    const day = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
    return { entry: BY_ID.get(M.daily[day % M.daily.length]), key: day };
  }

  // ---------- Favoris ----------
  const store = (window.Mawqut && window.Mawqut.store) || { get: (k, d) => d, set() {} };
  let favs = new Set(store.get('mawqut.hadith.favs', []));
  const saveFavs = () => store.set('mawqut.hadith.favs', [...favs]);

  // ---------- Carte d'un hadith ----------
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.800l2.300 1.700 2.900-.100 1 2.700 2.300 1.700-.800 2.800.800 2.800-2.300 1.700-1 2.700-2.900-.100L12 20.400l-2.300-1.700-2.900.100-1-2.700-2.300-1.700.800-2.800-.800-2.800 2.300-1.700 1-2.700 2.900.100L12 2.800Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.500 11.800l2.400 2.400 4.600-4.900" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.800l2.500 5.200 5.700.800-4.100 4 1 5.700L12 16.800l-5.100 2.700 1-5.700-4.100-4 5.700-.800L12 3.800Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const srcHTML = e => `<span class="h-src" title="Hadith jugé authentique (sahîh)">${CHECK}<span>Authentique · ${e[2] === 0 ? 'rapporté par ' : 'rapporté par '}${SRC[e[2]]}</span></span>`;
  function cardHTML(e, opts) {
    const o = opts || {}, f = full(e), fav = favs.has(e[0]);
    const id = e[0], pre = o.pre || (o.big ? 'd' : 'l');   // préfixe : un même hadith peut être affiché à deux endroits
    return `<article class="h-card${o.big ? ' is-big' : ''}" data-id="${id}">
      <div class="h-meta"><span class="tag h-theme">${esc(M.themes[e[1]][1])}</span>${srcHTML(e)}</div>
      ${o.big && f ? `<p class="h-ar" lang="ar">${esc(f.ar)}</p>` : ''}
      <p class="h-fr">${f ? esc(f.fr) : '« ' + esc(e[3]) + ' »'}</p>
      <div class="h-more" id="hm-${pre}-${id}" hidden></div>
      <div class="h-actions">
        <button class="btn h-toggle" type="button" aria-expanded="false" aria-controls="hm-${pre}-${id}">${o.big ? 'Lire l’explication' : 'Texte arabe et explication'}</button>
        <button class="btn btn-quiet h-fav" type="button" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Garder dans mes favoris'}">${STAR}<span>${fav ? 'Gardé' : 'Garder'}</span></button>
        <button class="btn btn-quiet h-share" type="button">${navigator.share ? 'Partager' : 'Copier'}</button>
      </div>
    </article>`;
  }
  function moreHTML(e, big) {
    const f = full(e);
    if (!f) return '<p class="hint">Texte indisponible hors connexion.</p>';
    return `${big ? '' : `<p class="h-ar" lang="ar">${esc(f.ar)}</p>`}
      ${f.ex ? `<h4>Explication</h4><p class="h-ex">${esc(f.ex)}</p>` : ''}
      ${f.hints.length ? `<h4>À retenir</h4><ul class="h-hints">${f.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
      <p class="say-src">Hadith n° ${e[0]} de HadeethEnc.com · ${SRC[e[2]] === 'al-Bukhârî et Muslim' ? 'rapporté par al-Bukhârî et Muslim' : 'rapporté par ' + SRC[e[2]]}</p>`;
  }
  const shareText = e => { const f = full(e); return `${f ? f.fr : '« ' + e[3] + ' »'}\n\n(Hadith authentique, rapporté par ${SRC[e[2]]})`; };

  // ---------- Petit message ----------
  let toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'q-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  // ---------- Hadith au hasard ----------
  // Un sac mélangé : on a tout vu avant qu'un hadith revienne, et jamais deux fois de suite le même.
  let bag = [], lastRandom = null, randomSeq = 0;
  function nextRandom() {
    if (!bag.length) {
      bag = M.list.map(e => e[0]);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === lastRandom) bag.unshift(bag.pop());
    }
    lastRandom = bag.pop();
    return BY_ID.get(lastRandom);
  }
  async function drawRandom() {
    const seq = ++randomSeq, entry = nextRandom(), btn = $('#hRandBtn'), box = $('#hRandom');
    btn.disabled = true; btn.classList.add('is-rolling');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { await Promise.all([ensure(entry[1]), new Promise(r => setTimeout(r, calm ? 0 : 420))]); } catch (e) { /* hors connexion : l'extrait suffit */ }
    if (seq !== randomSeq) return;
    box.innerHTML = cardHTML(entry, { big: true, pre: 'r' });
    box.firstElementChild.classList.add('is-drawn');
    btn.classList.remove('is-rolling'); btn.disabled = false;
    btn.querySelector('span').textContent = 'Un autre hadith';
    box.firstElementChild.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }
  $('#hRandHint').textContent = `Pioche parmi les ${M.list.length} hadiths authentiques.`;
  $('#hRandBtn').addEventListener('click', drawRandom);

  // ---------- Page ----------
  const view = $('#view-hadiths');
  const state = { theme: null, q: '', shown: PAGE, favOnly: false };
  let todayKey = null;

  async function renderToday() {
    const { entry, key } = todayEntry();
    if (todayKey === key && $('#hToday').firstElementChild) return;
    todayKey = key;
    $('#hTodayDate').textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).replace(/^./, c => c.toUpperCase());
    try { await ensure(entry[1]); } catch (e) { /* on affiche l'essentiel du hadith */ }
    $('#hToday').innerHTML = cardHTML(entry, { big: true });
  }
  function renderThemes() {
    const counts = M.themes.map((_, i) => M.list.filter(e => e[1] === i).length);
    $('#hThemes').innerHTML = M.themes.map((t, i) => `<button type="button" class="chip" data-theme="${i}" aria-pressed="${!state.favOnly && !state.q && state.theme === i}">${esc(t[1])} <small>${counts[i]}</small></button>`).join('') +
      `<button type="button" class="chip chip-fav" data-fav="1" aria-pressed="${state.favOnly}">${STAR} Mes favoris <small>${favs.size}</small></button>`;
  }
  function matches() {
    if (state.favOnly) return M.list.filter(e => favs.has(e[0]));
    if (state.q) {
      const words = norm(state.q).split(/\s+/).filter(Boolean);
      return M.list.filter(e => { const t = norm(e[3]); return words.every(w => t.includes(w)); });
    }
    return M.list.filter(e => e[1] === state.theme);
  }
  let renderSeq = 0;
  async function renderList() {
    const seq = ++renderSeq;
    const all = matches(), page = all.slice(0, state.shown);
    $('#hCount').textContent = state.favOnly ? (all.length ? `${all.length} hadith${all.length > 1 ? 's' : ''} gardé${all.length > 1 ? 's' : ''}` : '')
      : state.q ? `${all.length} résultat${all.length > 1 ? 's' : ''} pour « ${state.q} »` : `${all.length} hadiths · ${M.themes[state.theme][1]}`;
    const list = $('#hList');
    if (!all.length) {
      list.innerHTML = `<p class="h-empty">${state.favOnly ? 'Aucun favori pour l’instant. Appuie sur « Garder » sous un hadith pour le retrouver ici.' : 'Aucun hadith ne contient ces mots. Essaie un mot plus court, ou choisis un thème.'}</p>`;
      $('#hMore').hidden = true;
      return;
    }
    try { await Promise.all([...new Set(page.map(e => e[1]))].map(ensure)); } catch (e) { /* cartes réduites à l'essentiel */ }
    if (seq !== renderSeq) return;
    list.innerHTML = page.map(e => cardHTML(e)).join('');
    $('#hMore').hidden = all.length <= state.shown;
  }
  function setTheme(i) { state.theme = i; state.q = ''; state.favOnly = false; state.shown = PAGE; $('#hSearch').value = ''; renderThemes(); renderList(); }

  $('#hThemes').addEventListener('click', e => {
    const t = e.target.closest('[data-theme]');
    if (t) { setTheme(+t.dataset.theme); return; }
    if (e.target.closest('[data-fav]')) { state.favOnly = !state.favOnly; state.q = ''; $('#hSearch').value = ''; state.shown = PAGE; renderThemes(); renderList(); }
  });
  let searchT = 0;
  $('#hSearch').addEventListener('input', e => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { state.q = e.target.value.trim(); state.favOnly = false; state.shown = PAGE; renderThemes(); renderList(); }, 180);
  });
  $('#hMore').addEventListener('click', () => { state.shown += PAGE; renderList(); });

  view.addEventListener('click', async e => {
    const card = e.target.closest('.h-card');
    if (!card) return;
    const entry = BY_ID.get(+card.dataset.id), big = card.classList.contains('is-big');
    const tg = e.target.closest('.h-toggle');
    if (tg) {
      const box = card.querySelector('.h-more'), open = box.hidden;
      if (open && !box.dataset.done) {
        try { await ensure(entry[1]); } catch (err) { /* message ci-dessous */ }
        box.innerHTML = moreHTML(entry, big); box.dataset.done = '1';
      }
      box.hidden = !open; tg.setAttribute('aria-expanded', String(open));
      tg.textContent = open ? 'Masquer' : (big ? 'Lire l’explication' : 'Texte arabe et explication');
      return;
    }
    const fb = e.target.closest('.h-fav');
    if (fb) {
      const id = entry[0], on = !favs.has(id);
      if (on) favs.add(id); else favs.delete(id);
      saveFavs();
      view.querySelectorAll(`.h-card[data-id="${id}"] .h-fav`).forEach(b => { b.setAttribute('aria-pressed', String(on)); b.querySelector('span').textContent = on ? 'Gardé' : 'Garder'; b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Garder dans mes favoris'); });
      renderThemes();
      if (state.favOnly) renderList();
      return;
    }
    if (e.target.closest('.h-share')) {
      try { await ensure(entry[1]); } catch (err) { /* on partage l'essentiel */ }
      const text = shareText(entry);
      try {
        if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast('Hadith copié.'); }
      } catch (err) { if (err && err.name !== 'AbortError') toast('Impossible de copier ici. Sélectionne le texte à la main.'); }
    }
  });

  // ---------- Carte sur la page Horaires ----------
  function renderHomeCard() {
    const card = $('#hadithCard');
    if (!card) return;
    const { entry, key } = todayEntry();
    if (card.dataset.key === String(key)) return;
    card.dataset.key = key;
    // Le texte complet (jamais un extrait coupé). Le temps de le charger, ou hors connexion, on affiche l'extrait.
    const box = $('#hadithCardText');
    box.textContent = '« ' + entry[3].replace(/[.!\s]+$/, m => (m.includes('!') ? ' !' : '')) + ' »';
    $('#hadithCardSrc').innerHTML = CHECK + '<span>Authentique · ' + SRC[entry[2]] + '</span>';
    card.hidden = false;
    ensure(entry[1]).then(() => {
      const f = full(entry);
      if (f && card.dataset.key === String(key)) box.textContent = f.fr;
    }).catch(() => { /* hors connexion : l'extrait reste affiché */ });
  }

  // ---------- Affichage ----------
  function show() {
    renderToday();
    if (state.theme == null) { state.theme = todayEntry().entry[1]; renderThemes(); renderList(); }
  }
  window.addEventListener('mawqut:view', e => { if (e.detail === 'hadiths') show(); if (e.detail === 'horaires') renderHomeCard(); });
  if (document.body.dataset.view === 'hadiths') show();
  renderHomeCard();
  setInterval(() => { renderHomeCard(); if (document.body.dataset.view === 'hadiths') renderToday(); }, 60000);
})();
