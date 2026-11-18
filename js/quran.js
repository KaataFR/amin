/*
 * Amin — lecture du Coran en livre (double page ou page unique).
 * Données : quran/meta.js (sommaire, pages de Médine) et quran/sNNN.js (une sourate par fichier, chargée à la demande).
 */
(() => {
  'use strict';
  const META = window.MAWQUT_QURAN_META;
  const $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const arNum = n => String(n).replace(/\d/g, d => AR_DIGITS[d]);
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’‘`]/g, ' ').replace(/\s+/g, ' ').trim();
  const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

  // ---------- Chargement des sourates ----------
  const DATA = {};
  const waiting = {};
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
        sc.src = `quran/s${String(n).padStart(3, '0')}.js`;
        sc.onerror = () => { delete waiting[n]; reject(new Error('Sourate introuvable')); };
        document.head.appendChild(sc);
      });
    },
    surah: n => META.surahs[n - 1]
  };

  // ---------- Réglages de lecture ----------
  const DEF = { texts: { ar: true, ph: false, tr: false }, trans: 'rm', notes: false, size: 1, layout: 'double', rtl: false, paper: 'parchment', pos: { s: 1, v: 1 }, reciter: 'husary', rate: 1, follow: false, pageSound: true, pageFlip: true };
  const saved = store.get('mawqut.quran', {});
  const R = Object.assign({}, DEF, saved, { texts: Object.assign({}, DEF.texts, saved.texts), pos: Object.assign({}, DEF.pos, saved.pos) });
  const persist = () => store.set('mawqut.quran', R);

  const view = $('#view-coran');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const book = $('#book');
  const spread = $('#spread');
  const measure = $('#qMeasure');
  const studyMode = () => R.texts.ph || R.texts.tr;
  const effectiveLayout = () => (R.layout === 'double' && window.innerWidth >= 900 ? 'double' : 'single');
  // Sens des pages : par défaut de gauche à droite, comme un livre ordinaire ; « mushaf » = de droite à gauche (page 1 à droite).
  function applyDir() {
    const rtl = !!R.rtl, d = rtl ? 'rtl' : 'ltr';
    view.dataset.dir = d; book.dataset.dir = d; spread.dir = d;
    const fwd = rtl ? '←' : '→', back = rtl ? '→' : '←';
    document.querySelectorAll('.q-pg[data-turn="1"] .kb').forEach(k => { k.textContent = fwd; });
    document.querySelectorAll('.q-pg[data-turn="-1"] .kb').forEach(k => { k.textContent = back; });
    const tn = document.querySelector('.q-turn-next'), tp = document.querySelector('.q-turn-prev');
    if (tn) tn.title = `Page suivante (touche ${fwd})`;
    if (tp) tp.title = `Page précédente (touche ${back})`;
    const h = $('#qDirHint');
    if (h) h.textContent = rtl
      ? 'Touche un verset pour l\u2019entendre, son numéro (ou le petit livre) pour lire son explication. Sens du mushaf : la page suivante est à gauche.'
      : 'Touche un verset pour l\u2019entendre, son numéro (ou le petit livre) pour lire son explication. Les pages se tournent de gauche à droite.';
    const o = $('#qDirOptHint');
    if (o) o.textContent = rtl
      ? 'Comme un mushaf imprimé : la page 1 est à droite, la page suivante est à gauche.'
      : 'Comme un livre ordinaire : la page 1 est à gauche, la page suivante est à droite. Le texte arabe, lui, se lit toujours de droite à gauche.';
    document.querySelectorAll('#qDirSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === d)));
  }

  // ---------- Dimensions du livre ----------
  let dims = { w: 0, h: 0 };
  let immersive = false;
  function computeDims() {
    const layout = effectiveLayout();
    const top = view.getBoundingClientRect().top + window.scrollY;
    const barH = $('.q-bar').offsetHeight || 60;
    // Tout doit tenir à l'écran : barre du haut, livre, boutons de page, et la navigation du bas sur mobile.
    const mobile = window.innerWidth <= 700;
    const pagerH = ($('.q-pager').offsetHeight || 52) + 14;
    const footH = mobile ? 58 : 58;
    const navH = mobile ? 70 : 0;
    const gaps = mobile ? 34 : 62;
    const availH = Math.max(mobile ? 430 : 420, window.innerHeight - Math.min(top, 160) - barH - pagerH - footH - navH - gaps);
    const turns = window.innerWidth >= 900 ? 2 * 64 : 0;
    const availW = Math.min(window.innerWidth, 1400) - 2 * (mobile ? 12 : 32) - turns;
    let h = Math.min(availH, 980);
    let w = Math.round(h * 0.69);
    const perRow = layout === 'double' ? 2 : 1;
    if (immersive) {
      // Lecture immersive : le livre prend tout l'écran SAUF deux bandes réservées (haut et bas) où flottent les commandes.
      // Ainsi les commandes ne recouvrent jamais l'en-tête ni le pied des pages, qu'elles soient visibles ou effacées.
      const bandT = $('.q-bar').offsetHeight, bandB = $('.q-pager').offsetHeight;
      document.body.style.setProperty('--imm-top', bandT + 'px');
      document.body.style.setProperty('--imm-bot', bandB + 'px');
      const padV = mobile ? 4 : 8, padH = mobile ? 6 : (window.innerWidth >= 900 ? 86 : 24);
      const fullH = window.innerHeight - bandT - bandB - 2 * padV, fullW = window.innerWidth - 2 * padH;
      h = Math.min(fullH, 1500); w = Math.round(h * 0.69);
      if (w * perRow > fullW) { w = Math.floor(fullW / perRow); h = Math.round(Math.min(fullH, w / 0.6)); }
      if (mobile) { w = fullW; h = fullH; }
      dims = { w, h };
      for (const el of [book, measure]) {
        el.style.setProperty('--page-w', w + 'px');
        el.style.setProperty('--page-h', h + 'px');
        el.style.setProperty('--q-scale', R.size);
      }
      book.dataset.layout = layout; book.dataset.paper = R.paper; measure.dataset.paper = R.paper;
      book.classList.toggle('is-study', studyMode()); measure.classList.toggle('is-study', studyMode());
      return layout;
    }
    if (w * perRow > availW) { w = Math.floor(availW / perRow); h = Math.round(Math.min(availH, w / 0.62)); }
    if (mobile) { w = availW; h = Math.round(Math.min(availH, Math.max(w * 1.35, 520))); }
    dims = { w, h };
    for (const el of [book, measure]) {
      el.style.setProperty('--page-w', w + 'px');
      el.style.setProperty('--page-h', h + 'px');
      el.style.setProperty('--q-scale', R.size);
    }
    book.dataset.layout = layout;
    book.dataset.paper = R.paper;
    measure.dataset.paper = R.paper;
    book.classList.toggle('is-study', studyMode());
    measure.classList.toggle('is-study', studyMode());
    return layout;
  }

  // ---------- Construction des pages ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  function juzOf(s, v) {
    let j = 1;
    META.juz.forEach((st, i) => { if (s > st[0] || (s === st[0] && v >= st[1])) j = i + 1; });
    return j;
  }
  function pageShell() {
    const page = el('article', 'page');
    const frame = el('div', 'page-frame');
    const head = el('header', 'page-head');
    const body = el('div', 'page-body');
    const foot = el('footer', 'page-foot');
    frame.append(head, body, foot);
    page.appendChild(frame);
    for (const c of ['tl', 'tr', 'bl', 'br']) { const o = el('span', 'corner ' + c); o.setAttribute('aria-hidden', 'true'); frame.appendChild(o); }
    return { page, head, body, foot };
  }
  function surahHead(n) {
    const [ar, name, meaning, count, mecc] = META.surahs[n - 1];
    const wrap = el('div', 'surah-head');
    const cart = el('div', 'cartouche');
    cart.innerHTML = `<svg viewBox="0 0 600 64" preserveAspectRatio="none" aria-hidden="true"><path d="M30 2H570C584 2 590 16 598 32 590 48 584 62 570 62H30C16 62 10 48 2 32 10 16 16 2 30 2Z"/><path class="in" d="M36 9H564C574 9 579 20 584 32 579 44 574 55 564 55H36C26 55 21 44 16 32 21 20 26 9 36 9Z"/></svg>`;
    const side1 = el('span', 'c-side', `آياتها ${arNum(count)}`); side1.lang = 'ar';
    const title = el('span', 'c-title', `سُورَةُ ${ar}`); title.lang = 'ar';
    const side2 = el('span', 'c-side', mecc ? 'مكية' : 'مدنية'); side2.lang = 'ar';
    cart.append(side2, title, side1);
    const sub = el('p', 'surah-sub', `${n} · ${name} · ${meaning} · ${count} versets · ${mecc ? 'mecquoise' : 'médinoise'}`);
    wrap.append(cart, sub);
    if (n !== 1 && n !== 9) { const b = el('p', 'basmala', BASMALA); b.lang = 'ar'; wrap.appendChild(b); }
    return wrap;
  }
  // Fin de sourate : filet orné + mention, pour marquer nettement le passage à la suivante
  function surahEnd(n) {
    const wrap = el('div', 'surah-end');
    const orn = el('div', 'se-orn');
    orn.setAttribute('aria-hidden', 'true');
    orn.append(el('i', 'se-line'), el('i', 'se-star'), el('i', 'se-line'));
    wrap.append(orn, el('p', 'se-txt', `Fin de la sourate ${META.surahs[n - 1][1]}`));
    return wrap;
  }
  function trText(d, i) {
    const txt = R.trans === 'hm' ? d.hm[i] : d.rm[i];
    const frag = document.createDocumentFragment();
    txt.split(/(\[\d+\])/).forEach(part => {
      const m = part.match(/^\[(\d+)\]$/);
      if (m) { if (R.notes) frag.appendChild(el('sup', 'fn', m[1])); }
      else if (part) frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }
  const PLAY_ICON = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.6L12 18.5v-13L7.6 9.5H4Z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/></svg>';
  const EXPLAIN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.500c2.500-1.200 5.500-1.200 9 .8 3.500-2 6.500-2 9-.8V18c-2.500-1.200-5.500-1.200-9 .8-3.500-2-6.500-2-9-.8V6.500Z" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linejoin="round"/><path d="M12 7.300V19" stroke="currentColor" stroke-width="1.600"/></svg>';
  function explainButton(n, v) {
    const b = el('button', 'vb-explain');
    b.type = 'button';
    b.dataset.key = `${n}:${v}`;
    b.setAttribute('aria-label', `Explication du verset ${n}:${v}`);
    b.title = 'Explication du verset';
    b.innerHTML = EXPLAIN_ICON;
    return b;
  }
  function playButton(n, v) {
    const b = el('button', 'vb-play');
    b.type = 'button';
    b.dataset.key = `${n}:${v}`;
    b.setAttribute('aria-label', `Écouter le verset ${n}:${v}`);
    b.innerHTML = PLAY_ICON;
    return b;
  }
  function verseBlock(n, d, i) {
    const b = el('div', 'vb');
    b.dataset.v = i + 1;
    b.dataset.key = `${n}:${i + 1}`;
    const top = el('div', 'vb-top');
    top.append(el('span', 'vb-num', `${n}:${i + 1}`), playButton(n, i + 1), explainButton(n, i + 1));
    b.appendChild(top);
    if (R.texts.ar) { const a = el('p', 'vb-ar', `${d.ar[i]} ۝${arNum(i + 1)}`); a.lang = 'ar'; b.appendChild(a); }
    if (R.texts.ph) b.appendChild(el('p', 'vb-ph', d.ph[i]));
    if (R.texts.tr) {
      const t = el('p', 'vb-tr'); t.appendChild(trText(d, i)); b.appendChild(t);
      const notes = R.trans === 'hm' ? d.hmn[i] : d.rmn[i];
      if (R.notes && notes) { const nn = el('div', 'vb-notes'); notes.forEach(x => nn.appendChild(el('p', null, x))); b.appendChild(nn); }
    }
    return b;
  }
  function verseSpan(d, i, n) {
    const s = el('span', 'aya', d.ar[i] + ' ');
    s.dataset.v = i + 1;
    s.dataset.key = `${n}:${i + 1}`;
    s.tabIndex = 0;
    s.setAttribute('role', 'button');
    s.setAttribute('aria-label', `Verset ${i + 1}, toucher pour écouter, touche E pour l’explication`);
    const mark = el('span', 'aya-mark', `۝${arNum(i + 1)}`);
    mark.title = `Explication du verset ${i + 1}`;
    s.appendChild(mark);
    s.appendChild(document.createTextNode(' '));
    return s;
  }
  function fillHeadFoot(shell, n, d, items, pageNo, total) {
    const firstV = items.verses.length ? items.verses[0] : 0;
    const hr = el('span', 'ph-surah', META.surahs[n - 1][0]); hr.lang = 'ar';
    const hl = el('span', 'ph-juz', `Juz’ ${juzOf(n, firstV + 1)} · Médine p. ${d.pg[firstV]}`);
    shell.head.append(hr, hl);
    const pn = el('span', 'pf-num', arNum(pageNo + 1));
    pn.lang = 'ar';
    shell.foot.append(pn, el('span', 'pf-lat', `${pageNo + 1} / ${total}`));
  }
  // Remplit le corps d'une page avec ses éléments
  function fillBody(body, n, d, items) {
    if (items.head) body.appendChild(surahHead(n));
    if (items.verses.length) {
      if (studyMode()) {
        for (const i of items.verses) body.appendChild(verseBlock(n, d, i));
      } else {
        const p = el('p', 'mushaf'); p.lang = 'ar';
        for (const i of items.verses) p.appendChild(verseSpan(d, i, n));
        body.appendChild(p);
      }
    }
    if (items.end) body.appendChild(surahEnd(n));
  }

  // ---------- Pagination par mesure ----------
  const PAGES = {};
  let layoutKey = '';
  function keyNow() { return [dims.w, dims.h, R.size, studyMode(), R.texts.ar, R.texts.ph, R.texts.tr, R.trans, R.notes].join('|'); }
  function paginate(n) {
    const k = keyNow();
    if (layoutKey !== k) { for (const x in PAGES) delete PAGES[x]; layoutKey = k; }
    if (PAGES[n]) return PAGES[n];
    const d = DATA[n];
    const pages = [];
    const shell = pageShell();
    fillHeadFoot(shell, n, d, { head: true, verses: [0] }, 0, 1); // même en-tête et même pied que la vraie page, pour mesurer la même hauteur
    measure.replaceChildren(shell.page);
    const body = shell.body;
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    let cur = { head: true, verses: [], overflow: false };
    body.appendChild(surahHead(n));
    const study = studyMode();
    let para = null;
    if (!study) { para = el('p', 'mushaf'); para.lang = 'ar'; body.appendChild(para); }
    const total = d.ar.length;
    for (let i = 0; i < total; i++) {
      const node = study ? verseBlock(n, d, i) : verseSpan(d, i, n);
      (study ? body : para).appendChild(node);
      if (!fits()) {
        node.remove();
        if (cur.verses.length || cur.head) {
          pages.push(cur);
          body.replaceChildren();
          cur = { head: false, verses: [], overflow: false };
          if (!study) { para = el('p', 'mushaf'); para.lang = 'ar'; body.appendChild(para); }
          (study ? body : para).appendChild(node);
          if (!fits()) cur.overflow = true;
        } else cur.overflow = true;
      }
      cur.verses.push(i);
    }
    // La fin de sourate a sa place réservée sur la dernière page ; s'il n'y en a plus, le dernier verset passe sur une page à part avec elle
    const endNode = surahEnd(n);
    body.appendChild(endNode);
    if (fits()) cur.end = true;
    else {
      endNode.remove();
      if (cur.verses.length > 1) {
        const last = cur.verses.pop();
        pages.push(cur);
        cur = { head: false, verses: [last], overflow: false, end: true };
      }
    }
    pages.push(cur);
    measure.replaceChildren();
    PAGES[n] = pages;
    return pages;
  }

  // ---------- Position et navigation ----------
  let pos = { s: R.pos.s, p: 0 };
  let ready = false;
  async function pagesOf(n) { await Q.ensure(n); return paginate(n); }
  async function nextPos(p) {
    const pages = await pagesOf(p.s);
    if (p.p + 1 < pages.length) return { s: p.s, p: p.p + 1 };
    if (p.s < 114) return { s: p.s + 1, p: 0 };
    return null;
  }
  async function prevPos(p) {
    if (p.p > 0) return { s: p.s, p: p.p - 1 };
    if (p.s > 1) { const pages = await pagesOf(p.s - 1); return { s: p.s - 1, p: pages.length - 1 }; }
    return null;
  }
  async function renderPage(p) {
    const pages = await pagesOf(p.s);
    const d = DATA[p.s];
    const items = pages[p.p];
    const shell = pageShell();
    if (items.overflow) shell.page.classList.add('is-overflow');
    fillHeadFoot(shell, p.s, d, items, p.p, pages.length);
    fillBody(shell.body, p.s, d, items);
    shell.page.dataset.s = p.s;
    return shell.page;
  }
  // Bruit de page qu'on tourne (court, synthétique, intégré à l'app)
  const sfx = new Audio('audio/page-turn.mp3');
  sfx.preload = 'auto';
  const SFX_MS = 1050;   // durée du bruit de page (audio/page-turn.mp3)
  const FLIP_MS = 820;   // durée de la page qui se tourne
  function pageSound() {
    if (!R.pageSound) return;
    try {
      sfx.pause(); sfx.currentTime = 0;
      sfx.volume = Math.min(1, gain() * 0.85);
      const pr = sfx.play();
      if (pr && pr.catch) pr.catch(() => { /* lecture refusée avant tout geste : sans importance */ });
    } catch (e) { /* facultatif */ }
  }
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flipRun = null, showSeq = 0;
  async function show(direction, opts) {
    const my = ++showSeq;
    if (flipRun) { flipRun.finish(false); flipRun = null; }   // une nouvelle demande remplace la page en train de se tourner
    const layout = effectiveLayout();
    const before = [...spread.children];
    const nodes = [await renderPage(pos)];
    let second = null;
    if (layout === 'double') {
      second = await nextPos(pos);
      if (second) nodes.push(await renderPage(second));
      else { const blank = el('article', 'page is-blank'); blank.appendChild(el('div', 'page-frame')); nodes.push(blank); }
    }
    if (my !== showSeq) return;                                // une demande plus récente est passée devant
    const seam = !!(second && second.s !== pos.s);             // deux sourates sur la même double page : la reliure est soulignée
    const flip = !!direction && R.pageFlip !== false && !calm() && !document.hidden && !!window.MawqutFlip
      && before.length === nodes.length && before.length > 0 && before.every(n => n.classList && n.classList.contains('page'));
    let run = null;
    if (flip) {
      spread.classList.remove('turn-next', 'turn-prev', 'has-seam');
      run = window.MawqutFlip.start({ book, spread, from: before, to: nodes, dir: direction, rtl: !!R.rtl, ms: opts && opts.fast ? 520 : FLIP_MS });
      flipRun = run;
    } else {
      spread.replaceChildren(...nodes);
      spread.classList.toggle('has-seam', seam);
      if (direction && !calm()) {
        spread.classList.remove('turn-next', 'turn-prev'); void spread.offsetWidth;
        spread.classList.add(direction > 0 ? 'turn-next' : 'turn-prev');
        spread.querySelectorAll('.cartouche').forEach(c => c.classList.add('is-arriving'));
      }
    }
    if (direction) pageSound();
    // barre et pied
    const [ar, name, meaning, count] = META.surahs[pos.s - 1];
    $('#qNum').textContent = pos.s;
    $('#qName').textContent = name;
    $('#qSub').textContent = `${meaning} · ${count} versets`;
    $('#qAr').textContent = ar;
    const pages = PAGES[pos.s];
    const items = pages[pos.p];
    const firstV = items.verses.length ? items.verses[0] + 1 : 1;
    const lastNode = second && second.s === pos.s ? PAGES[pos.s][second.p] : items;
    const lastV = lastNode.verses.length ? lastNode.verses[lastNode.verses.length - 1] + 1 : firstV;
    const pagesTxt = second && second.s === pos.s ? `pages ${pos.p + 1}–${second.p + 1}` : `page ${pos.p + 1}`;
    $('#qPageInfo').innerHTML = `<b>${cap(pagesTxt)} sur ${pages.length}</b><span>${firstV === lastV ? 'verset ' + firstV : 'versets ' + firstV + '–' + lastV} · Juz’ ${juzOf(pos.s, firstV)} · Coran de Médine p. ${DATA[pos.s].pg[firstV - 1]}</span>`;
    R.pos = { s: pos.s, v: firstV };
    persist();
    markPlaying();
    // le suivi de lecture sait ainsi quelle double page est sous les yeux (et quand on la tourne vers l'avant)
    window.dispatchEvent(new CustomEvent('mawqut:spread', { detail: { direction, items: nodes.map(n => ({ s: +n.dataset.s || 0, verses: [...n.querySelectorAll('[data-key]')].map(k => k.dataset.key).filter((k, j, a) => a.indexOf(k) === j) })).filter(x => x.s) } }));
    const noPrev = pos.s === 1 && pos.p === 0;
    const noNext = !(await nextPos(layout === 'double' && second ? second : pos));
    if (my !== showSeq) return;
    document.querySelectorAll('[data-turn]').forEach(b => { b.disabled = +b.dataset.turn > 0 ? noNext : noPrev; });
    if (run) {
      await run.done;                                          // la page finit de se tourner avant que la suite (lecture suivie) reprenne
      if (flipRun === run) flipRun = null;
      if (run.committed) {
        spread.classList.toggle('has-seam', seam);
        spread.querySelectorAll('.cartouche').forEach(c => c.classList.add('is-arriving'));
        markPlaying();
      }
    }
  }
  // Tourner les pages : aucune demande n'est perdue. Les demandes qui arrivent pendant qu'un tour s'affiche
  // (touche maintenue, clics rapides) sont additionnées, puis la double page finale est affichée d'un coup.
  let pendingTurns = 0, turnRun = null;
  function turn(dir) {
    pendingTurns = Math.max(-12, Math.min(12, pendingTurns + dir));
    if (flipRun) flipRun.finish(true);                         // une page déjà en train de se tourner s'achève tout de suite
    if (!turnRun) {
      turnRun = (async () => {
        await null; // laisse `turnRun` s'enregistrer avant la première boucle
        try {
          while (pendingTurns !== 0) {
            const n = pendingTurns; pendingTurns = 0;
            const sens = n > 0 ? 1 : -1;
            const steps = (effectiveLayout() === 'double' ? 2 : 1) * Math.abs(n);
            let p = pos;
            for (let i = 0; i < steps; i++) {
              const q = sens > 0 ? await nextPos(p) : await prevPos(p);
              if (!q) break;
              p = q;
            }
            if (p !== pos) { pos = p; await show(sens, { fast: Math.abs(n) > 1 }); }
          }
        } finally { turnRun = null; }
      })();
    }
    return turnRun;
  }
  async function goTo(s, v) {
    await Q.ensure(s);
    computeDims();
    const pages = paginate(s);
    let idx = 0;
    if (v) pages.forEach((pg, i) => { if (pg.verses.includes(v - 1)) idx = i; });
    pos = { s, p: idx };
    await show(0);
    if (v && v > 1) {
      const node = spread.querySelector(`.page[data-s="${s}"] [data-v="${v}"]`);
      if (node) { node.classList.add('is-target'); setTimeout(() => node.classList.remove('is-target'), 2400); }
    }
  }
  async function relayout() {
    if (!ready) return;
    const anchor = R.pos;
    computeDims();
    layoutKey = '';
    await goTo(anchor.s, anchor.v);
  }

  // ---------- Récitation ----------
  const RECITERS = {
    husary: { dir: 'Husary_64kbps', local: true },
    alafasy: { dir: 'Alafasy_64kbps' },
    minshawi: { dir: 'Minshawy_Murattal_128kbps' },
    abdulbasit: { dir: 'Abdul_Basit_Murattal_64kbps' },
    abdulbasit_mj: { dir: 'Abdul_Basit_Mujawwad_128kbps' }
  };
  const pad3 = x => String(x).padStart(3, '0');
  const isLocal = (s, v) => s === 1 || (s === 2 && v === 255) || s >= 93;
  // Récitations téléchargées : IndexedDB, clé « récitateur/sourate/verset »
  const vault = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('mawqut-recitations', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('verses');
          r.onsuccess = () => { this.db = r.result; res(this.db); };
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('verses', mode);
        const req = fn(t.objectStore('verses'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    },
    get(k) { return this.tx('readonly', st => st.get(k)); },
    put(k, b) { return this.tx('readwrite', st => st.put(b, k)); },
    keys(prefix) { return this.tx('readonly', st => st.getAllKeys(IDBKeyRange.bound(prefix, prefix + '￿'))); },
    clear() { return this.tx('readwrite', st => st.clear()); }
  };
  const vkey = (s, v, rec) => `${rec || R.reciter}/${pad3(s)}/${pad3(v)}`;
  async function fetchVerse(s, v, rec) {
    const r = RECITERS[rec || R.reciter] || RECITERS.husary;
    const res = await fetch(`https://everyayah.com/data/${r.dir}/${pad3(s)}${pad3(v)}.mp3`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    if (!blob.size) throw new Error('vide');
    try { await vault.put(vkey(s, v, rec), blob); } catch (e) { /* stockage plein ou indisponible */ }
    return blob;
  }
  let blobUrl = '';
  function blobSrc(blob) { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(blob); return blobUrl; }

  const player = new Audio();
  player.preload = 'auto';
  const gain = () => (window.Mawqut && window.Mawqut.gain ? window.Mawqut.gain() : 1);
  player.volume = gain();
  window.addEventListener('mawqut:volume', () => { player.volume = gain(); });
  let playing = null;
  const toastEl = el('div', 'q-toast');
  toastEl.setAttribute('role', 'status');
  document.body.appendChild(toastEl);
  let toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 4200);
  }
  function markPlaying() {
    document.querySelectorAll('[data-key].is-playing').forEach(e => e.classList.remove('is-playing'));
    if (playing) document.querySelectorAll(`[data-key="${playing.s}:${playing.v}"]`).forEach(e => e.classList.add('is-playing'));
    const lb = $('#qListen');
    if (lb) { lb.setAttribute('aria-pressed', String(!!(playing && playing.follow))); lb.querySelector('span').textContent = playing && playing.follow ? 'Arrêter' : 'Écouter'; }
    const q = playing && playing.queue;
    window.dispatchEvent(new CustomEvent('mawqut:playing', { detail: playing ? { s: playing.s, v: playing.v, queue: q ? { id: q.id, label: q.label, i: q.i, n: q.list.length, round: q.round, times: q.times } : null } : null }));
  }
  function stopVerse() {
    player.pause();
    playing = null;
    markPlaying();
  }
  async function playVerse(s, v, follow, queue) {
    if (window.Mawqut && window.Mawqut.stopAlertSound) window.Mawqut.stopAlertSound();
    player.pause();
    playing = { s, v, follow: !!follow, queue: queue || null };
    markPlaying();
    const still = () => playing && playing.s === s && playing.v === v;
    const tryPlay = async src => { player.src = src; player.playbackRate = R.rate || 1; player.volume = gain(); await player.play(); };
    // 1. déjà téléchargé ; 2. intégré à l'app ; 3. téléchargé maintenant puis gardé
    const sources = [
      async () => { const b = await vault.get(vkey(s, v)); if (!b) throw new Error('absent'); return blobSrc(b); },
      async () => { const u = (RECITERS[R.reciter] || {}).local && isLocal(s, v) ? `audio/quran/${pad3(s)}${pad3(v)}.mp3` : null; if (!u) throw new Error('non intégré'); return u; },
      async () => blobSrc(await fetchVerse(s, v)),
      async () => { if (!isLocal(s, v)) throw new Error('non intégré'); return `audio/quran/${pad3(s)}${pad3(v)}.mp3`; }
    ];
    for (const get of sources) {
      try {
        const src = await get();
        if (!still()) return false;
        await tryPlay(src);
        return still();
      } catch (e) { /* source suivante */ }
    }
    playing = null;
    markPlaying();
    toast(isLocal(s, v) ? 'Impossible de lire la récitation.' : 'Pas de connexion pour ce verset. Télécharge la sourate dans Options › Hors connexion pour l’écouter sans réseau.');
    return false;
  }

  // ---------- Téléchargement pour l'écoute hors connexion ----------
  let dl = null;
  const fmtMo = n => (n >= 1e9 ? (n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Go' : (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: n < 1e7 ? 1 : 0 }) + ' Mo');
  async function offlineStatus() {
    const box = $('#qOffStatus');
    if (!box) return;
    let txt = '';
    try {
      const n = META.surahs[pos.s - 1][3];
      const have = (await vault.keys(`${R.reciter}/${pad3(pos.s)}/`)).length;
      const all = (await vault.keys(`${R.reciter}/`)).length;
      const name = META.surahs[pos.s - 1][1];
      txt = `${name} : ${have} verset${have > 1 ? 's' : ''} sur ${n} téléchargé${have > 1 ? 's' : ''}. En tout : ${all.toLocaleString('fr-FR')} versets sur 6 236 pour ce récitateur.`;
      if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); if (e.usage) txt += ` Espace utilisé : ${fmtMo(e.usage)}.`; }
    } catch (e) { txt = 'Le stockage hors connexion n’est pas disponible dans ce navigateur.'; }
    box.textContent = txt;
  }
  async function download(list, label) {
    if (dl) return;
    const bar = $('#qOffBar'), st = $('#qOffProgress');
    dl = { stop: false };
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* facultatif */ }
    let done = 0, fail = 0, bytes = 0, i = 0;
    const todo = [];
    const rec = R.reciter;
    const have = new Set(await vault.keys(`${rec}/`).catch(() => []));
    for (const [s, v] of list) if (!have.has(vkey(s, v, rec))) todo.push([s, v]);
    const total = todo.length;
    document.querySelectorAll('.q-off-btn').forEach(b => { b.disabled = true; });
    $('#qOffStop').hidden = false;
    bar.hidden = false;
    const tick = () => { bar.value = total ? done / total : 1; st.textContent = `${label} : ${done.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} versets (${fmtMo(bytes)})${fail ? `, ${fail} échec${fail > 1 ? 's' : ''}` : ''}`; };
    tick();
    const worker = async () => {
      while (!dl.stop && i < todo.length) {
        const [s, v] = todo[i++];
        try { const b = await fetchVerse(s, v, rec); bytes += b.size; } catch (e) { fail++; if (fail > 8 && done === 0) dl.stop = true; }
        done++; tick();
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    const stopped = dl.stop;
    dl = null;
    $('#qOffStop').hidden = true;
    document.querySelectorAll('.q-off-btn').forEach(b => { b.disabled = false; });
    if (fail && done === fail) st.textContent = 'Téléchargement impossible ici : il fonctionne sur le site en ligne et dans l’app PC.';
    else st.textContent = stopped ? `Arrêté : ${done - fail} versets téléchargés.` : total ? `Terminé : ${(done - fail).toLocaleString('fr-FR')} versets téléchargés (${fmtMo(bytes)}).` : 'Déjà téléchargé.';
    offlineStatus();
  }
  const versesOf = (a, b) => { const out = []; for (let s = a; s <= b; s++) for (let v = 1; v <= META.surahs[s - 1][3]; v++) out.push([s, v]); return out; };
  $('#qOffSurah').addEventListener('click', () => download(versesOf(pos.s, pos.s), META.surahs[pos.s - 1][1]));
  $('#qOffAmma').addEventListener('click', () => download(versesOf(78, 114), 'Juz’ ‘Amma'));
  $('#qOffAll').addEventListener('click', () => download(versesOf(1, 114), 'Coran complet'));
  $('#qOffStop').addEventListener('click', () => { if (dl) dl.stop = true; });
  $('#qOffClear').addEventListener('click', async () => {
    if (dl) return;
    try { await vault.clear(); $('#qOffProgress').textContent = 'Récitations téléchargées supprimées.'; } catch (e) { /* rien */ }
    offlineStatus();
  });
  player.addEventListener('ended', async () => {
    const p = playing;
    if (!p) return;
    window.dispatchEvent(new CustomEvent('mawqut:verse-done', { detail: { s: p.s, v: p.v } }));
    if (p.queue) {
      // suite de versets lancée depuis la page « À réciter » : on enchaîne, puis on recommence si elle se récite plusieurs fois
      const q = p.queue;
      q.i += 1;
      if (q.i >= q.list.length) { q.i = 0; q.round += 1; }
      if (q.round > q.times) { playing = null; markPlaying(); return; }
      playVerse(q.list[q.i][0], q.list[q.i][1], false, q);
      return;
    }
    if (!p.follow) { playing = null; markPlaying(); return; }
    let s = p.s, v = p.v + 1;
    if (v > META.surahs[s - 1][3]) { s += 1; v = 1; }
    if (s > 114) { playing = null; markPlaying(); return; }
    // Entre deux pages (ou deux sourates), la récitation marque une pause : un temps de silence, le bruit de page, puis le verset suivant
    const inBook = document.body.dataset.view === 'coran';
    const needTurn = inBook && !spread.querySelector(`[data-key="${s}:${v}"]`);
    if (needTurn || s !== p.s) {
      await sleep(needTurn ? 300 : 650);
      if (playing !== p) return;
      if (needTurn) {
        const t0 = performance.now();
        await turn(1);                                         // inclut la page qui se tourne
        if (playing !== p) return;
        // le bruit de page finit de résonner (il dure un peu plus que le tour), puis un court silence avant le verset
        await sleep(R.pageSound ? Math.max(0, SFX_MS - (performance.now() - t0)) + 220 : 200);
        if (playing !== p) return;
      }
    }
    playVerse(s, v, true);
  });
  Q.play = (s, v, follow) => {
    if (playing && playing.s === s && playing.v === v) { stopVerse(); return; }
    playVerse(s, v, follow);
  };
  Q.stop = stopVerse;
  // Joue une suite de versets [[sourate, verset], …], « times » fois. Rappeler avec le même id arrête la lecture.
  Q.playList = (list, opts) => {
    const o = opts || {};
    if (playing && playing.queue && playing.queue.id === o.id) { stopVerse(); return false; }
    if (!list.length) return false;
    const q = { id: o.id || 'liste', label: o.label || '', list, i: 0, round: 1, times: Math.max(1, o.times || 1) };
    playVerse(list[0][0], list[0][1], false, q);
    return true;
  };
  // Ouvre le livre à un verset donné
  Q.open = (s, v) => {
    R.pos = { s, v: v || 1 };
    persist();
    if (document.body.dataset.view === 'coran') { if (started) goTo(s, v || 1); } else location.hash = '#coran';
  };
  function onVerseActivate(e) {
    // le petit bouton « livre » (mode étude) et le numéro du verset ۝ (mode mushaf) ouvrent l'explication
    const ex = e.target.closest('.vb-explain') || e.target.closest('.aya-mark');
    if (ex) {
      const holder = ex.closest('[data-key]');
      if (holder && Q.explain) { const [es, ev] = holder.dataset.key.split(':').map(Number); Q.explain(es, ev); }
      return;
    }
    const btn = e.target.closest('.vb-play');
    const aya = !btn && !studyMode() && e.target.closest('.aya');
    const target = btn || aya;
    if (!target) return;
    const [s, v] = target.dataset.key.split(':').map(Number);
    if (playing && playing.s === s && playing.v === v) { stopVerse(); return; }
    playVerse(s, v, R.follow);
  }
  spread.addEventListener('click', onVerseActivate);
  spread.addEventListener('keydown', e => {
    const aya = e.target.closest && e.target.closest('.aya');
    if (!aya || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVerseActivate(e); }
    else if ((e.key === 'e' || e.key === 'E') && Q.explain) { e.preventDefault(); const [es, ev] = aya.dataset.key.split(':').map(Number); Q.explain(es, ev); }
  });
  $('#qListen').addEventListener('click', () => {
    if (playing && playing.follow) { stopVerse(); return; }
    const first = spread.querySelector('.page [data-key]');
    if (!first) return;
    const [s, v] = first.dataset.key.split(':').map(Number);
    playVerse(s, v, true);
  });

  // ---------- Commandes ----------
  document.querySelectorAll('[data-turn]').forEach(b => b.addEventListener('click', () => turn(+b.dataset.turn)));
  // Clavier : les flèches suivent le sens du livre (→ = page suivante en gauche → droite, ← en mode mushaf).
  // PageSuiv. / Pagepréc. et, en plein écran, Espace / Maj+Espace, marchent dans les deux sens.
  const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']);
  document.addEventListener('keydown', e => {
    if (document.body.dataset.view !== 'coran' || document.querySelector('dialog[open]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Alt+← = retour du navigateur, etc.
    const t = e.target;
    if (t.closest && t.closest('input, select, textarea, [contenteditable="true"]')) return;
    let dir = 0;
    const ahead = R.rtl ? 'ArrowLeft' : 'ArrowRight', behind = R.rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === ahead || e.key === 'PageDown') dir = 1;
    else if (e.key === behind || e.key === 'PageUp') dir = -1;
    else if (immersive && e.key === ' ' && !(t.closest && t.closest('button, a, .aya'))) dir = e.shiftKey ? -1 : 1;
    if (!dir) return;
    e.preventDefault();
    turn(dir);
  });
  // ---------- Lecture immersive (plein écran) ----------
  const immBtn = $('#qImmersive');
  let idleT = 0;
  function wake() {
    if (!immersive) return;
    document.body.classList.remove('q-idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      // on ne masque pas les commandes tant qu'on les survole ou qu'un panneau est ouvert
      const hovering = window.matchMedia('(hover: hover)').matches && document.querySelector('.q-bar:hover, .q-pager:hover, .q-turn:hover');
      if (!immersive || document.querySelector('dialog[open]') || hovering) { wake(); return; }
      document.body.classList.add('q-idle');
    }, 3500);
  }
  async function setImmersive(on) {
    if (on === immersive) return;
    immersive = on;
    document.body.classList.toggle('q-immersive', on);
    document.body.classList.remove('q-idle');
    immBtn.setAttribute('aria-pressed', String(on));
    immBtn.querySelector('.lbl').textContent = on ? 'Quitter' : 'Plein écran';
    immBtn.title = on ? 'Quitter le plein écran (Échap)' : 'Lecture en plein écran (touche F)';
    // Le focus quitte le bouton : Espace ou Entrée ne doivent pas refermer le plein écran, et les flèches vont au livre.
    if (on && document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (!on) { document.body.style.removeProperty('--imm-top'); document.body.style.removeProperty('--imm-bot'); }
    const root = document.documentElement;
    try {
      if (on && !document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      if (!on && document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch (e) { /* plein écran refusé (aperçu intégré) : le livre occupe quand même toute la page */ }
    if (on) { window.scrollTo(0, 0); wake(); } else clearTimeout(idleT);
    lastW = window.innerWidth; lastH = window.innerHeight;
    await relayout();
  }
  immBtn.addEventListener('click', () => setImmersive(!immersive));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && immersive) setImmersive(false); });
  ['pointermove', 'pointerdown', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));
  // tourner les pages au clavier ne fait pas réapparaître les commandes : on reste sur la lecture
  document.addEventListener('keydown', e => { if (!NAV_KEYS.has(e.key) && e.key !== ' ') wake(); }, { passive: true });
  document.addEventListener('keydown', e => {
    if (document.body.dataset.view !== 'coran' || document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setImmersive(!immersive); }
    if (e.key === 'Escape' && immersive) setImmersive(false);
  });
  window.addEventListener('mawqut:view', e => { if (e.detail !== 'coran' && immersive) setImmersive(false); });

  // glissement : vers la gauche = page suivante (sens habituel) ; vers la droite en mode mushaf
  let sx = null, sy = null;
  book.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  book.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) turn((dx > 0) === !!R.rtl ? 1 : -1);
  });

  // textes affichés
  function syncTexts() {
    document.querySelectorAll('.q-texts .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(!!R.texts[b.dataset.text])));
  }
  document.querySelectorAll('.q-texts .seg-btn').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.text;
    const next = Object.assign({}, R.texts, { [k]: !R.texts[k] });
    if (!next.ar && !next.ph && !next.tr) return; // il faut au moins un texte
    R.texts = next; persist(); syncTexts(); relayout();
  }));

  // sommaire
  const sheet = $('#surahSheet');
  const list = $('#surahList');
  META.surahs.forEach(([ar, name, meaning, count, mecc], i) => {
    const li = el('li');
    const b = el('button', 'surah-item');
    b.type = 'button';
    b.dataset.s = i + 1;
    b.dataset.q = norm(`${i + 1} ${name} ${meaning}`);
    b.innerHTML = `<span class="si-num tnum">${i + 1}</span><span class="si-names"><b></b><small></small></span><span class="si-ar" lang="ar"></span>`;
    b.querySelector('b').textContent = name;
    b.querySelector('small').textContent = `${meaning} · ${count} versets · ${mecc ? 'mecquoise' : 'médinoise'}`;
    b.querySelector('.si-ar').textContent = ar;
    b.addEventListener('click', () => { sheet.close(); goTo(i + 1, 1); });
    li.appendChild(b);
    list.appendChild(li);
  });
  $('#qSurahBtn').addEventListener('click', () => {
    list.querySelectorAll('.surah-item').forEach(b => b.classList.toggle('is-current', +b.dataset.s === pos.s));
    sheet.showModal();
    const cur = list.querySelector('.is-current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
  $('#surahSearch').addEventListener('input', e => {
    const q = norm(e.target.value);
    list.querySelectorAll('.surah-item').forEach(b => { b.parentElement.hidden = q && !b.dataset.q.includes(q); });
  });
  $('#gotoVerse').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const m = e.target.value.trim().match(/^(\d{1,3})\s*[:.,\s]\s*(\d{1,3})$|^(\d{1,3})$/);
    const st = $('#gotoStatus');
    if (!m) { st.className = 'status-line err'; st.textContent = 'Écris la sourate et le verset, par exemple 2:255.'; return; }
    const s = +(m[1] || m[3]), v = +(m[2] || 1);
    if (s < 1 || s > 114 || v < 1 || v > META.surahs[s - 1][3]) { st.className = 'status-line err'; st.textContent = `La sourate ${s} n'a pas de verset ${v}.`; return; }
    st.className = 'status-line'; st.textContent = '';
    sheet.close();
    goTo(s, v);
  });
  document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog.sheet').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  // options d'affichage
  const opt = $('#qOptions');
  function syncOptions() {
    document.querySelectorAll('#qLayoutSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === R.layout)));
    document.querySelectorAll('#qPaperSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paper === R.paper)));
    document.querySelectorAll('input[name="qTrans"]').forEach(r => { r.checked = r.value === R.trans; });
    $('#qNotes').checked = !!R.notes;
    $('#qSize').value = R.size;
    document.querySelectorAll('input[name="qReciter"]').forEach(r => { r.checked = r.value === R.reciter; });
    document.querySelectorAll('#qRateSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.rate === +R.rate)));
    $('#qFollow').checked = !!R.follow;
    $('#qPageSound').checked = R.pageSound !== false;
    $('#qPageFlip').checked = R.pageFlip !== false;
  }
  $('#qOptionsBtn').addEventListener('click', () => { syncOptions(); offlineStatus(); opt.showModal(); });
  document.querySelectorAll('#qLayoutSeg .seg-btn').forEach(b => b.addEventListener('click', () => { R.layout = b.dataset.layout; persist(); syncOptions(); relayout(); }));
  document.querySelectorAll('#qDirSeg .seg-btn').forEach(b => b.addEventListener('click', () => { R.rtl = b.dataset.dir === 'rtl'; persist(); applyDir(); }));
  document.querySelectorAll('#qPaperSeg .seg-btn').forEach(b => b.addEventListener('click', () => { R.paper = b.dataset.paper; persist(); syncOptions(); book.dataset.paper = R.paper; measure.dataset.paper = R.paper; }));
  document.querySelectorAll('input[name="qTrans"]').forEach(r => r.addEventListener('change', () => {
    R.trans = r.value;
    if (!R.texts.tr) { R.texts.tr = true; syncTexts(); }
    persist(); relayout();
  }));
  $('#qNotes').addEventListener('change', e => { R.notes = e.target.checked; persist(); relayout(); });
  document.querySelectorAll('input[name="qReciter"]').forEach(r => r.addEventListener('change', () => { R.reciter = r.value; persist(); stopVerse(); offlineStatus(); }));
  document.querySelectorAll('#qRateSeg .seg-btn').forEach(b => b.addEventListener('click', () => { R.rate = +b.dataset.rate; player.playbackRate = R.rate; persist(); syncOptions(); }));
  $('#qFollow').addEventListener('change', e => { R.follow = e.target.checked; persist(); });
  $('#qPageFlip').addEventListener('change', e => { R.pageFlip = e.target.checked; persist(); });
  $('#qPageSound').addEventListener('change', e => { R.pageSound = e.target.checked; persist(); if (R.pageSound) pageSound(); });
  $('#qSize').addEventListener('change', e => { R.size = +e.target.value; persist(); relayout(); });

  // ---------- Démarrage ----------
  applyDir();
  let started = false;
  async function start() {
    if (started) return relayout();
    started = true;
    syncTexts();
    try { await Promise.all([document.fonts.load('32px "Amiri Quran"'), document.fonts.load('16px Jost'), document.fonts.load('18px Amiri')]); } catch (e) { /* polices de secours */ }
    computeDims();
    ready = true;
    await goTo(R.pos.s, R.pos.v);
  }
  window.addEventListener('mawqut:view', e => { if (e.detail === 'coran') start(); });
  if (document.body.dataset.view === 'coran') start();
  let rt = 0, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', () => {
    if (document.body.dataset.view !== 'coran') return;
    // Sur mobile, la barre d'adresse qui se replie change la hauteur : on ne recompose pas pour si peu.
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 130) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    clearTimeout(rt);
    rt = setTimeout(relayout, 200);
  });
})();
