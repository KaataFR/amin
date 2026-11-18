/*
 * Amin TV — Coran : sommaire (reprise, juz’, sourates) et lecteur verset par verset.
 * Dans le lecteur : ↑ ↓ versets, OK écouter à partir du verset, ← → sourate précédente / suivante.
 * Fournit aussi window.MawqutQuran (chargement des sourates, lecture d'un verset) pour le guide.
 */
(() => {
  'use strict';
  const T = window.TV;
  const { $, esc } = T;
  const META = window.MAWQUT_QURAN_META;
  const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
  const pad3 = x => String(x).padStart(3, '0');

  // ---------- Données ----------
  const DATA = {}, waiting = {};
  const Q = window.MawqutQuran = {
    meta: META,
    load(n, d) { DATA[n] = d; (waiting[n] || []).forEach(f => f(d)); delete waiting[n]; },
    ensure(n) {
      if (DATA[n]) return Promise.resolve(DATA[n]);
      return new Promise((resolve, reject) => {
        const first = !waiting[n];
        (waiting[n] = waiting[n] || []).push(resolve);
        if (!first) return;
        const sc = document.createElement('script');
        sc.src = `quran/s${pad3(n)}.js`;
        sc.onerror = () => { delete waiting[n]; reject(new Error('Sourate introuvable')); };
        document.head.appendChild(sc);
      });
    },
    surah: n => META.surahs[n - 1],
    play(s, v) { Player.start([[s, v]], 0, 1, null); },
    stop() { Player.stop(); },
    explain() { /* l'explication des versets n'est pas proposée sur la télé */ }
  };
  const surah = n => META.surahs[n - 1]; // [ar, nom, sens, versets, mecquoise, page]

  // Réglages de lecture partagés avec le site (position, récitateur) + préférences télé
  const R = T.store.get('mawqut.quran', {});
  const TVQ = Object.assign({ size: 2 }, T.store.get('amin.tv.quran', {}));
  // Textes affichés : arabe, phonétique, traduction, un ou plusieurs (au moins un)
  if (!TVQ.texts) TVQ.texts = TVQ.mode === 'ar' ? { ar: true, ph: false, tr: false } : TVQ.mode === 'all' ? { ar: true, ph: true, tr: true } : { ar: true, ph: false, tr: true };
  delete TVQ.mode;
  const TEXTS = [['ar', 'Arabe'], ['ph', 'Phonétique'], ['tr', 'Traduction']];
  const saveR = () => { const cur = T.store.get('mawqut.quran', {}); T.store.set('mawqut.quran', Object.assign(cur, { pos: R.pos, reciter: R.reciter })); };
  const saveTVQ = () => T.store.set('amin.tv.quran', TVQ);
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const RECITERS = {
    husary: { label: 'al-Husary', full: 'Mahmoud Khalil al-Husary', sub: 'Lecture posée, idéale pour suivre', dir: 'Husary_64kbps', local: true },
    alafasy: { label: 'al-Afasy', full: 'Mishary al-Afasy', sub: 'Voix claire et mélodieuse', dir: 'Alafasy_64kbps' },
    minshawi: { label: 'al-Minshawi', full: 'Mohamed Siddiq al-Minshawi', sub: 'Récitation classique égyptienne', dir: 'Minshawy_Murattal_128kbps' },
    abdulbasit: { label: 'Abdelbasset', full: 'Abdelbasset Abdessamad', sub: 'Murattal : voix ample, au rythme habituel', dir: 'Abdul_Basit_Murattal_64kbps' },
    abdulbasit_mj: { label: 'Abdelbasset lent', full: 'Abdelbasset Abdessamad, mujawwad', sub: 'Lent et très mélodieux, avec de longues tenues', dir: 'Abdul_Basit_Mujawwad_128kbps' }
  };
  if (!RECITERS[R.reciter]) R.reciter = 'husary';
  const SIZES = [0.8, 0.9, 1, 1.15, 1.3];

  // ---------- Récitation ----------
  const isLocal = (s, v) => s === 1 || (s === 2 && v === 255) || s >= 93;
  const srcOf = (s, v) => (R.reciter === 'husary' && isLocal(s, v)) ? `audio/quran/${pad3(s)}${pad3(v)}.mp3`
    : `https://everyayah.com/data/${RECITERS[R.reciter].dir}/${pad3(s)}${pad3(v)}.mp3`;
  const Player = (() => {
    const audio = new Audio();
    audio.preload = 'auto';
    const pre = new Audio();
    pre.preload = 'auto';
    let q = null;
    function mark() { T.emit('verse', q ? { s: q.list[q.i][0], v: q.list[q.i][1], round: q.round, times: q.times } : null); }
    function playAt(i) {
      if (!q) return;
      T.awake(true);
      q.i = i;
      const [s, v] = q.list[i];
      audio.src = srcOf(s, v);
      audio.volume = T.vol();
      const p = audio.play();
      if (p) p.catch(() => fail());
      mark();
      const n = q.list[i + 1];
      if (n) { pre.src = srcOf(n[0], n[1]); pre.load(); }
    }
    function fail() {
      if (!q) return;
      T.toast('Récitation indisponible : vérifie la connexion Internet de la télé.');
      stop();
    }
    audio.addEventListener('ended', () => {
      if (!q) return;
      if (q.i + 1 < q.list.length) { playAt(q.i + 1); return; }
      if (q.round + 1 < q.times) { q.round++; playAt(0); return; }
      const done = q.onEnd; stop(); if (done) done();
    });
    audio.addEventListener('error', () => { if (q && audio.src) fail(); });
    function start(list, i, times, onEnd) { stop(); q = { list, i: i || 0, times: times || 1, round: 0, onEnd }; playAt(q.i); }
    function stop() { q = null; try { audio.pause(); } catch (e) { /* rien */ } T.awake(false); mark(); }
    function toggle() { if (!q) return false; if (audio.paused) { audio.play().catch(() => fail()); T.awake(true); } else { audio.pause(); T.awake(false); } T.emit('verse', q ? { s: q.list[q.i][0], v: q.list[q.i][1], paused: audio.paused } : null); return true; }
    return { start, stop, toggle, get active() { return q; }, get paused() { return audio.paused; } };
  })();
  window.TVPlayer = Player;

  // ---------- Lecteur verset par verset ----------
  // src : { s } pour une sourate, ou { title, ar, parts: [[s, a, b]], times, why } pour un passage
  let reader = null;
  async function openReader(src, focusV) {
    Player.stop();
    const passage = !!src.parts;
    const parts = passage ? src.parts : [[src.s, 1, 0]];
    for (const [s] of parts) { try { await Q.ensure(s); } catch (e) { T.toast('Texte indisponible.'); return; } }
    const el = document.createElement('div');
    el.className = 'layer read qreader';
    const first = surah(parts[0][0]);
    const title = passage
      ? `<p class="read-kicker">${esc(src.what || '')}</p><h2>${src.ar ? `<span class="rt-ar" lang="ar">${esc(src.ar)}</span>` : ''}${esc(src.title)}</h2>`
      : `<p class="read-kicker">Sourate ${src.s} · ${esc(first[2])} · ${first[3]} versets</p><h2><span class="rt-ar" lang="ar">${esc(first[0])}</span>${esc(first[1])}</h2>`;
    let body = '';
    if (passage && src.why) body += `<blockquote class="why" tabindex="0"><p>${esc(src.why)}</p>${src.src ? `<cite>${esc(src.src)}</cite>` : ''}${src.times > 1 ? `<span class="tag">À réciter ${src.times} fois</span>` : ''}</blockquote>`;
    const list = [];
    for (const [s, a, b0] of parts) {
      const d = DATA[s], meta = surah(s);
      const b = b0 || meta[3];
      if (passage && parts.length > 1) body += `<h3 class="v-head"><span lang="ar">${esc(meta[0])}</span> Sourate ${esc(meta[1])}</h3>`;
      if (a === 1 && s !== 1 && s !== 9) body += `<p class="basmala" lang="ar">${BASMALA}</p>`;
      for (let v = a; v <= b; v++) {
        list.push([s, v]);
        const tr = (d.rm[v - 1] || '').replace(/\[\d+\]/g, '').trim();
        body += `<div class="v" tabindex="0" data-s="${s}" data-v="${v}">
            <p class="v-ar" lang="ar">${esc(d.ar[v - 1])} <span class="v-n">﴿${T.arDigits(v)}﴾</span></p>
            <p class="v-ph"><span class="v-num tnum">${v}.</span> ${esc(d.ph[v - 1] || '')}</p>
            <p class="v-tr"><span class="v-num tnum">${v}.</span> ${esc(tr)}</p>
          </div>`;
      }
    }
    if (!passage) {
      const nx = src.s < 114 ? surah(src.s + 1) : null;
      body += `<div class="read-end">${nx ? `<button type="button" class="tb" data-act="next">Sourate suivante : ${esc(nx[1])}</button>` : ''}</div>`;
    }
    el.innerHTML = `
      <header class="read-top">
        <div class="read-title">${title}</div>
        <div class="read-actions">
          <button type="button" class="tb tb-gold" data-act="play">${T.ICON_PLAY}<span>Écouter</span></button>
          <div class="seg" role="group" aria-label="Textes affichés">${TEXTS.map(([k, l]) => `<button type="button" class="seg-b" data-text="${k}" aria-pressed="false"><span class="box" aria-hidden="true"></span>${l}</button>`).join('')}</div>
          <button type="button" class="tb" data-act="reciter"></button>
          <button type="button" class="tb tb-ic" data-act="smaller" aria-label="Texte plus petit">A−</button>
          <button type="button" class="tb tb-ic" data-act="bigger" aria-label="Texte plus grand">A+</button>
        </div>
      </header>
      <div class="read-body" data-read><div class="verses">${body}</div></div>
      <p class="keys"><b>↑ ↓</b> versets · <b>OK</b> écouter à partir de ce verset${passage ? '' : ' · <b>← →</b> sourate précédente ou suivante'} · <b>Retour</b> fermer</p>`;
    reader = { el, src, list, passage, times: src.times || 1 };
    applyPrefs();
    el.addEventListener('click', e => {
      const tx = e.target.closest('[data-text]');
      if (tx) return toggleText(tx.dataset.text);
      const b = e.target.closest('[data-act]');
      if (b) return act(b.dataset.act);
      const v = e.target.closest('.v');
      if (v) playFrom(+v.dataset.s, +v.dataset.v);
    });
    el.addEventListener('focusin', e => {
      const v = e.target.closest('.v');
      if (v && reader && reader.el === el && !reader.passage) { R.pos = { s: +v.dataset.s, v: +v.dataset.v }; clearTimeout(savePosT); savePosT = setTimeout(saveR, 800); }
    });
    const target = () => {
      if (focusV) { const v = el.querySelector(`.v[data-s="${parts[0][0]}"][data-v="${focusV}"]`); if (v) return v; }
      return el.querySelector('.v');
    };
    T.openLayer(el, { remove: true, focus: target, onKey: readerKey, onClose: () => { Player.stop(); clearTimeout(hudT); reader = null; refreshResume(); } });
    if (!passage) { R.pos = { s: src.s, v: focusV || 1 }; saveR(); }
    requestAnimationFrame(hudMeasure);
    hudWake();
  }

  // En-tête et rappel des touches : ils se retirent après 5 s sans toucher la télécommande, et reviennent à la première touche
  const HUD_DELAY = 5000;
  let hudT = 0;
  function hudMeasure() {
    if (!reader) return;
    const el = reader.el;
    el.style.setProperty('--hud-top', el.querySelector('.read-top').offsetHeight + 'px');
    el.style.setProperty('--hud-bottom', el.querySelector(':scope > .keys').offsetHeight + 'px');
  }
  function hudWake() {
    if (!reader) return;
    reader.el.classList.remove('hud-off');
    clearTimeout(hudT);
    hudT = setTimeout(hudSleep, HUD_DELAY);
  }
  function hudSleep() {
    if (!reader) return;
    const a = document.activeElement, top = T.topLayer();
    // pas pendant un choix dans l'en-tête ni sous une fenêtre ouverte par-dessus
    if ((a && reader.el.contains(a) && a.closest('.read-top')) || (top && top.el !== reader.el)) { hudT = setTimeout(hudSleep, HUD_DELAY); return; }
    reader.el.classList.add('hud-off');
  }
  window.addEventListener('keydown', () => { if (reader) hudWake(); }, true);
  window.addEventListener('resize', () => hudMeasure());
  let savePosT = 0;

  function applyPrefs() {
    if (!reader) return;
    const el = reader.el;
    for (const [k] of TEXTS) {
      el.classList.toggle('hide-' + k, !TVQ.texts[k]);
      const b = el.querySelector(`[data-text="${k}"]`);
      if (b) b.setAttribute('aria-pressed', String(!!TVQ.texts[k]));
    }
    el.style.setProperty('--qz', SIZES[TVQ.size] || 1);
    el.querySelector('[data-act="reciter"]').innerHTML = `${MIC}<span>${RECITERS[R.reciter].label}</span>`;
    el.querySelector('[data-act="reciter"]').setAttribute('aria-label', 'Voix : ' + RECITERS[R.reciter].full);
  }
  function act(a) {
    if (a === 'play') {
      if (Player.active) { Player.stop(); return; }
      const f = document.activeElement && document.activeElement.closest && document.activeElement.closest('.v');
      const [s, v] = f ? [+f.dataset.s, +f.dataset.v] : reader.list[0];
      playFrom(s, v);
    } else if (a === 'reciter') {
      T.choose('Voix de la récitation', Object.keys(RECITERS).map(k => ({ value: k, label: RECITERS[k].full, sub: RECITERS[k].sub })), R.reciter, v => { R.reciter = v; saveR(); if (Player.active) Player.stop(); applyPrefs(); });
    } else if (a === 'smaller' || a === 'bigger') {
      TVQ.size = Math.max(0, Math.min(SIZES.length - 1, TVQ.size + (a === 'bigger' ? 1 : -1))); saveTVQ(); applyPrefs();
    } else if (a === 'next') {
      const s = reader.src.s;
      T.closeLayer(); openReader({ s: s + 1 });
    }
  }
  function toggleText(k) {
    const next = Object.assign({}, TVQ.texts, { [k]: !TVQ.texts[k] });
    if (!next.ar && !next.ph && !next.tr) { T.toast('Garde au moins un texte affiché.'); return; }
    TVQ.texts = next; saveTVQ(); applyPrefs();
  }
  function playFrom(s, v) {
    if (!reader) return;
    const i = reader.list.findIndex(x => x[0] === s && x[1] === v);
    const cur = Player.active;
    if (cur && cur.list === reader.list && cur.i === i) { Player.toggle(); return; }
    Player.start(reader.list, Math.max(0, i), reader.times, () => T.toast(reader && reader.passage ? 'Lecture terminée.' : 'Fin de la sourate.'));
  }
  function readerKey(e, dir) {
    const a = document.activeElement;
    const onVerse = a && a.closest && a.closest('.v, .why, .basmala');
    if ((dir === 'left' || dir === 'right') && onVerse && reader && !reader.passage) {
      const s = reader.src.s + (dir === 'right' ? 1 : -1);
      if (s < 1 || s > 114) return true;
      T.closeLayer(); openReader({ s });
      T.toast(`Sourate ${surah(s)[1]}`);
      return true;
    }
    if ((dir === 'left' || dir === 'right') && onVerse) return true; // rien à côté d'un verset
    return false;
  }
  // le verset récité est mis en avant et suivi à l'écran
  T.on('verse', p => {
    if (!reader) return;
    reader.el.querySelectorAll('.v.is-playing').forEach(x => x.classList.remove('is-playing'));
    const btn = reader.el.querySelector('[data-act="play"]');
    if (btn) btn.innerHTML = Player.active && !Player.paused ? `${T.ICON_PAUSE}<span>Arrêter</span>` : `${T.ICON_PLAY}<span>Écouter</span>`;
    if (!p) return;
    const v = reader.el.querySelector(`.v[data-s="${p.s}"][data-v="${p.v}"]`);
    if (!v) return;
    v.classList.add('is-playing');
    if (p.paused) return;
    follow(v);
  });
  // Le lecteur suit la récitation : le verset récité monte en haut de l'écran et prend la sélection
  // (sauf si une fenêtre de choix est ouverte ou qu'on règle la taille ou les textes).
  function follow(v) {
    if (!reader || T.topLayer() && T.topLayer().el !== reader.el) return;
    const body = reader.el.querySelector('.read-body');
    const b = body.getBoundingClientRect(), r = v.getBoundingClientRect();
    const cs = getComputedStyle(body);
    const pt = parseFloat(cs.scrollPaddingTop) || 0, pb = parseFloat(cs.scrollPaddingBottom) || 0;
    const h = b.height - pt - pb; // partie visible, sous l'en-tête s'il est affiché
    const target = body.scrollTop + (r.top - b.top) - pt - Math.max(16, Math.min(h * 0.18, h - r.height - 16));
    body.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    const a = document.activeElement;
    const busy = a && reader.el.contains(a) && a.closest('.seg, [data-act="smaller"], [data-act="bigger"], [data-act="reciter"]');
    if (!busy) v.focus({ preventScroll: true });
  }
  T.on('media', key => {
    if (key === 'MediaStop') { Player.stop(); return; }
    if (Player.active) { Player.toggle(); return; }
    if (reader && /Play/.test(key)) act('play');
  });

  // ---------- Page Coran ----------
  let page = null;
  function render(root) {
    page = root;
    const juz = (META.juz || []).map(([s, v], i) => `<button type="button" class="chip juz" data-s="${s}" data-v="${v}"><span class="tnum">Juz’ ${i + 1}</span><small>${esc(surah(s)[1])} ${v}</small></button>`).join('');
    root.innerHTML = `
      <header class="pg-head"><h1>Le Coran</h1><p class="pg-sub">Choisis une sourate. Pendant la lecture, OK lance la récitation.</p></header>
      <button type="button" class="card resume" id="qResume"></button>
      <h2 class="sec-h">Les trente juz’</h2>
      <div class="hrow" data-hscroll>${juz}</div>
      <h2 class="sec-h">Les 114 sourates</h2>
      <div class="sgrid">${META.surahs.map((m, i) => `<button type="button" class="scard" data-s="${i + 1}">
          <span class="s-n tnum">${i + 1}</span>
          <span class="s-txt"><b>${esc(m[1])}</b><small>${esc(m[2])} · ${m[3]} versets</small></span>
          <span class="s-ar" lang="ar">${esc(m[0])}</span>
        </button>`).join('')}</div>`;
    root.addEventListener('click', e => {
      const sc = e.target.closest('.scard');
      if (sc) return openReader({ s: +sc.dataset.s });
      const j = e.target.closest('.juz');
      if (j) return openReader({ s: +j.dataset.s }, +j.dataset.v);
      if (e.target.closest('#qResume')) { const p = R.pos || { s: 1, v: 1 }; openReader({ s: p.s }, p.v); }
    });
    refreshResume();
  }
  function refreshResume() {
    const b = page && $('#qResume', page);
    if (!b) return;
    const p = R.pos || { s: 1, v: 1 };
    const m = surah(p.s);
    b.innerHTML = `<span class="sec-k">${R.pos ? 'Reprendre la lecture' : 'Commencer la lecture'}</span>
      <span class="res-main"><span class="res-ar" lang="ar">${esc(m[0])}</span><span><b>Sourate ${esc(m[1])}</b><small>Verset ${p.v} sur ${m[3]}</small></span></span>`;
  }
  T.page('coran', { render, firstFocus: () => page && $('#qResume', page) });
  window.TVQuran = { openReader, surah, RECITERS, player: Player };
})();
