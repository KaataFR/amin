/* Amin TV — pages À réciter, Hadiths et Apprendre. */
(() => {
  'use strict';
  const T = window.TV;
  const { $, esc } = T;
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const STAR_ON = STAR.replace('fill="none"', 'fill="currentColor"');
  const PREV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // =====================================================================
  //  À réciter
  // =====================================================================
  const MO = window.MAWQUT_MOMENTS;
  function passage(id, extra) {
    const p = MO.P[id];
    return Object.assign({ title: p.title, ar: p.ar, what: p.what, parts: p.parts }, extra || {});
  }
  function renderReciter(root) {
    const now = MO.NOW[T.moment()] || MO.NOW.jour;
    const nowItem = MO.GROUPS.find(g => g.id === now.group).items.find(it => it.p === now.p) || {};
    const card = (g, it) => {
      const p = MO.P[it.p];
      return `<button type="button" class="rcard" data-g="${g.id}" data-p="${it.p}">
          <span class="r-ar" lang="ar">${esc(p.ar)}</span>
          <b>${esc(p.title)}</b>
          <small>${esc(p.what)}</small>
          ${it.times > 1 ? `<span class="tag">${it.times} fois</span>` : ''}
        </button>`;
    };
    root.innerHTML = `
      <header class="pg-head"><h1>À réciter</h1><p class="pg-sub">Les sourates et versets que le Prophète ﷺ recommandait à certains moments.</p></header>
      <button type="button" class="card now-card" data-g="${now.group}" data-p="${now.p}">
        <span class="sec-k">${esc(now.kicker)}</span>
        <span class="now-main"><span class="r-ar big" lang="ar">${esc(MO.P[now.p].ar)}</span><span><b>${esc(MO.P[now.p].title)}</b><small>${esc(MO.P[now.p].what)}</small></span></span>
        ${nowItem.why ? `<span class="now-why">${esc(nowItem.why)}</span>` : ''}
      </button>
      ${MO.GROUPS.map(g => `<h2 class="sec-h">${esc(g.title)} <small>${esc(g.when)}</small></h2><div class="rgrid">${g.items.map(it => card(g, it)).join('')}</div>`).join('')}`;
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      const g = MO.GROUPS.find(x => x.id === b.dataset.g);
      const it = (g && g.items.find(x => x.p === b.dataset.p)) || {};
      window.TVQuran.openReader(passage(b.dataset.p, { times: it.times || 1, why: it.why, src: it.src }));
    });
  }
  T.page('reciter', { render: renderReciter, firstFocus: () => $('#p-reciter .now-card') });

  // =====================================================================
  //  Hadiths
  // =====================================================================
  const M = window.MAWQUT_HADITH;
  const SRC = ['al-Bukhârî et Muslim', 'al-Bukhârî', 'Muslim'];
  const BY_ID = new Map(M.list.map(e => [e[0], e]));
  const HDATA = {}, hwait = {};
  window.MawqutHadith = { load(i, d) { HDATA[i] = d; (hwait[i] || []).forEach(f => f()); delete hwait[i]; } };
  function ensureTheme(i) {
    if (HDATA[i]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const first = !hwait[i];
      (hwait[i] = hwait[i] || []).push(resolve);
      if (!first) return;
      const s = document.createElement('script');
      s.src = `hadith/t${i}.js`;
      s.onerror = () => { delete hwait[i]; reject(new Error('indisponible')); };
      document.head.appendChild(s);
    });
  }
  const full = e => { const d = HDATA[e[1]] && HDATA[e[1]][e[0]]; return d ? { fr: d[0], ar: d[1], ex: d[2], hints: d[3] || [] } : null; };
  const themeName = e => M.themes[e[1]][1];
  const snippet = e => e[3];
  function today() {
    const n = new Date();
    const d = Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
    return BY_ID.get(M.daily[d % M.daily.length]);
  }
  let favs = new Set(T.store.get('mawqut.hadith.favs', []));
  const saveFavs = () => T.store.set('mawqut.hadith.favs', [...favs]);

  let hreader = null;
  async function openHadith(list, i) {
    const e = list[i];
    try { await ensureTheme(e[1]); } catch (x) { T.toast('Texte indisponible.'); return; }
    const f = full(e);
    if (!f) { T.toast('Texte indisponible.'); return; }
    const el = hreader && hreader.el.isConnected ? hreader.el : document.createElement('div');
    el.className = 'layer read hreader';
    el.innerHTML = `
      <header class="read-top">
        <div class="read-title"><p class="read-kicker">${esc(themeName(e))} · ${list.length > 1 ? `${i + 1} sur ${list.length}` : 'hadith du jour'}</p><h2>Authentique · rapporté par ${esc(SRC[e[2]])}</h2></div>
        <div class="read-actions">
          <button type="button" class="tb" data-act="fav">${favs.has(e[0]) ? STAR_ON + '<span>Gardé</span>' : STAR + '<span>Garder</span>'}</button>
          ${list.length > 1 ? `<button type="button" class="tb tb-ic" data-act="prev" aria-label="Hadith précédent"${i ? '' : ' disabled'}>${PREV}</button><button type="button" class="tb tb-ic" data-act="next" aria-label="Hadith suivant"${i + 1 < list.length ? '' : ' disabled'}>${NEXT}</button>` : ''}
        </div>
      </header>
      <div class="read-body" data-read><div class="hd">
        <div class="hd-b" tabindex="0"><p class="hd-fr">${esc(f.fr)}</p></div>
        <div class="hd-b" tabindex="0"><p class="hd-ar" lang="ar">${esc(f.ar)}</p></div>
        ${f.ex ? `<div class="hd-b" tabindex="0"><h3>Explication</h3><p>${esc(f.ex)}</p></div>` : ''}
        ${f.hints.length ? `<div class="hd-b" tabindex="0"><h3>Ce qu’on en retient</h3><ul>${f.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}
        <p class="hd-src">Texte, traduction et explication : HadeethEnc.com</p>
      </div></div>
      <p class="keys"><b>↑ ↓</b> lire${list.length > 1 ? ' · <b>← →</b> hadith précédent ou suivant' : ''} · <b>Retour</b> fermer</p>`;
    const fresh = !hreader || !hreader.el.isConnected;
    hreader = { el, list, i };
    if (fresh) {
      el.addEventListener('click', ev => {
        const b = ev.target.closest('[data-act]');
        if (!b || !hreader) return;
        const a = b.dataset.act;
        if (a === 'fav') {
          const id = hreader.list[hreader.i][0];
          if (favs.has(id)) favs.delete(id); else favs.add(id);
          saveFavs();
          b.innerHTML = favs.has(id) ? STAR_ON + '<span>Gardé</span>' : STAR + '<span>Garder</span>';
          T.toast(favs.has(id) ? 'Gardé dans tes favoris' : 'Retiré des favoris');
          renderFavs();
        } else if (a === 'prev' || a === 'next') step(a === 'next' ? 1 : -1);
      });
      T.openLayer(el, { remove: true, focus: () => el.querySelector('.hd-b'), onKey: hadithKey, onClose: () => { hreader = null; } });
    } else {
      el.querySelector('.read-body').scrollTop = 0;
      T.focusEl(el.querySelector('.hd-b'));
    }
  }
  function step(d) {
    if (!hreader) return;
    const j = hreader.i + d;
    if (j < 0 || j >= hreader.list.length) return;
    openHadith(hreader.list, j);
  }
  function hadithKey(e, dir) {
    const a = document.activeElement;
    if ((dir === 'left' || dir === 'right') && a && a.closest && a.closest('.hd-b')) { step(dir === 'right' ? 1 : -1); return true; }
    return false;
  }
  function openTheme(t) {
    const list = M.list.filter(e => e[1] === t);
    const el = document.createElement('div');
    el.className = 'layer read hlist';
    el.innerHTML = `
      <header class="read-top"><div class="read-title"><p class="read-kicker">Hadiths · ${list.length} textes</p><h2>${esc(M.themes[t][1])}</h2></div></header>
      <div class="read-body"><div class="hl">${list.map((e, i) => `<button type="button" class="hl-i" data-i="${i}"><span class="hl-t">${esc(e[3])}</span><small>Rapporté par ${esc(SRC[e[2]])}</small></button>`).join('')}</div></div>
      <p class="keys"><b>↑ ↓</b> parcourir · <b>OK</b> lire · <b>Retour</b> fermer</p>`;
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (b) openHadith(list, +b.dataset.i); });
    T.openLayer(el, { remove: true });
  }
  let hroot = null;
  function renderHadiths(root) {
    hroot = root;
    const e = today();
    const counts = M.themes.map((_, i) => M.list.filter(x => x[1] === i).length);
    root.innerHTML = `
      <header class="pg-head"><h1>Hadiths</h1><p class="pg-sub">Paroles et actes du Prophète ﷺ, tous jugés authentiques et rapportés par al-Bukhârî ou Muslim.</p></header>
      <button type="button" class="card hd-day" id="hdDay">
        <span class="sec-k">Hadith du jour · ${esc(themeName(e))}</span>
        <span class="hd-fr">${esc(e[3])}</span>
        <span class="hd-more">OK : lire le texte arabe et l’explication</span>
      </button>
      <h2 class="sec-h">Par thème</h2>
      <div class="tgrid">${M.themes.map(([, name], i) => `<button type="button" class="tcard" data-t="${i}"><b>${esc(name)}</b><small>${counts[i]} hadiths</small></button>`).join('')}</div>
      <div id="hdFavs"></div>`;
    root.addEventListener('click', ev => {
      if (ev.target.closest('#hdDay')) return openHadith([today()], 0);
      const t = ev.target.closest('[data-t]');
      if (t) return openTheme(+t.dataset.t);
      const f = ev.target.closest('[data-fav]');
      if (f) { const list = [...favs].map(id => BY_ID.get(id)).filter(Boolean); openHadith(list, +f.dataset.fav); }
    });
    renderFavs();
  }
  function renderFavs() {
    const box = hroot && $('#hdFavs', hroot);
    if (!box) return;
    const list = [...favs].map(id => BY_ID.get(id)).filter(Boolean);
    box.innerHTML = list.length ? `<h2 class="sec-h">Mes favoris</h2><div class="hl">${list.map((e, i) => `<button type="button" class="hl-i" data-fav="${i}"><span class="hl-t">${esc(e[3])}</span><small>${esc(themeName(e))}</small></button>`).join('')}</div>` : '';
  }
  T.page('hadiths', { render: renderHadiths, firstFocus: () => $('#hdDay') });
  window.TVHadith = { today, themeName, snippet, openDaily: () => openHadith([today()], 0) };

  // =====================================================================
  //  Apprendre (contenu rendu par js/learn.js)
  // =====================================================================
  const CH = () => window.MAWQUT_LEARN || [];
  function renderLearn(root) {
    root.innerHTML = `
      <header class="pg-head"><h1>Apprendre</h1><p class="pg-sub">Le guide de la prière pas à pas, selon le rite malikite.</p></header>
      <div class="lgrid">${CH().map((c, i) => `<button type="button" class="lcard" data-slug="${esc(c.slug)}">
          <span class="l-n tnum">${i + 1}</span>
          <span class="l-txt"><b>${esc(c.title)}</b><span class="l-ar" lang="ar">${esc(c.ar)}</span><small>${esc(c.lead || '')}</small></span>
        </button>`).join('')}</div>`;
    root.addEventListener('click', e => { const b = e.target.closest('[data-slug]'); if (b) openChapter(b.dataset.slug); });
  }
  const layer = $('#learnLayer');
  function syncChapter() {
    const slug = location.hash.replace('#apprendre-', '');
    const c = CH().find(x => x.slug === slug);
    $('#learnTitle').textContent = c ? c.title : 'Le guide';
    const i = CH().findIndex(x => x.slug === slug);
    $('#learnKeys').innerHTML = `<b>↑ ↓</b> lire · <b>OK</b> écouter une formule${i >= 0 ? ` · chapitre ${i + 1} sur ${CH().length}` : ''} · <b>Retour</b> fermer`;
    $('#learnBody').scrollTop = 0;
  }
  // Au début d'un chapitre : le premier élément à choisir s'il est à l'écran, sinon le texte lui-même
  // (↓ fait alors défiler la lecture au lieu de sauter tout en bas, vers « Suivant »).
  function startTarget() {
    const body = $('#learnBody');
    body.scrollTop = 0;
    const v = body.getBoundingClientRect();
    const f = T.firstIn(layer);
    return f && f.getBoundingClientRect().top < v.bottom - 30 ? f : body;
  }
  function openChapter(slug) {
    location.hash = 'apprendre-' + slug;
    syncChapter();
    T.openLayer(layer, {
      focus: startTarget,
      onClose: () => { try { history.replaceState(null, '', location.pathname); } catch (e) { /* rien */ } document.querySelectorAll('audio').forEach(a => { try { a.pause(); } catch (x) { /* rien */ } }); }
    });
  }
  window.addEventListener('hashchange', () => {
    if (layer.hidden || !location.hash.startsWith('#apprendre-')) return;
    syncChapter();
    setTimeout(() => T.focusEl(startTarget()), 80);
  });
  T.page('apprendre', { render: renderLearn });
})();
