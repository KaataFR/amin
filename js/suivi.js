/* Suivi de la lecture du Coran + plan « tout le Coran en 30 jours ».
 *
 * Ce qui est suivi : chaque verset peut être « lu » ou « écouté ».
 *  - lu : quand on tourne la page vers l'avant après l'avoir gardée affichée au moins 12 secondes,
 *    ou quand on coche une portion (ou un passage) soi-même ;
 *  - écouté : quand la récitation du verset va jusqu'au bout.
 * Tout reste sur l'appareil (localStorage « mawqut.suivi »), rien n'est envoyé.
 *
 * Plan : 1 Juz’ par jour pendant 30 jours (≈ 20 pages), découpé en 5 portions, une après chaque prière.
 * Les temps d'écoute sont des estimations (≈ 1,8 mot par seconde, le rythme d'une récitation posée).
 */
(function () {
  'use strict';
  const Q = window.MawqutQuran;
  const PL = window.MAWQUT_PLAN;
  if (!Q || !PL) return;
  const META = Q.meta;
  const $ = s => document.querySelector(s);
  const N = 6236, PAGES = 604, DAYS = 30;
  const KEY = 'mawqut.suivi';
  const READ_DWELL = 12000;   // une double page gardée 12 s, puis tournée : lue
  const LEAVE_DWELL = 30000;  // quitter la page du Coran après 30 s sur la même double page : lue
  const WORDS_PER_SEC = 1.8;
  const PORTION_NAMES = ['Après le Fajr', 'Après le Dhuhr', 'Après l’Asr', 'Après le Maghrib', 'Après l’Isha'];
  const NBSP = ' ';

  // ---------- Repères : numéro de verset global (0 à 6235) ----------
  const CUM = [];
  (() => { let c = 0; META.surahs.forEach(s => { CUM.push(c); c += s[3]; }); })();
  const gidx = (s, v) => CUM[s - 1] + v - 1;
  function fromG(g) {
    let lo = 0, hi = 113;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUM[m] <= g) lo = m; else hi = m - 1; }
    return [lo + 1, g - CUM[lo] + 1];
  }
  const JUZ0 = META.juz.map(([s, v]) => gidx(s, v));
  const juzRange = j => [JUZ0[j - 1], j < DAYS ? JUZ0[j] : N];
  const PS = PL.ps;
  const pageOf = g => { let lo = 0, hi = PS.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (PS[m] <= g) lo = m; else hi = m - 1; } return lo + 1; };
  const WP = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) WP[i + 1] = WP[i] + PL.vw[i];
  const TOTAL_W = WP[N];
  const words = (a, b) => WP[b] - WP[a];
  const WORDS_PER_PAGE = TOTAL_W / PAGES;
  const sName = s => META.surahs[s - 1][1];

  // ---------- Données enregistrées ----------
  const bytes = str => {
    const a = new Uint8Array(Math.ceil(N / 8));
    if (str) { try { const b = atob(str); for (let i = 0; i < a.length && i < b.length; i++) a[i] = b.charCodeAt(i); } catch (e) { /* données illisibles : on repart de zéro */ } }
    return a;
  };
  const pack = a => { let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
  const getBit = (a, i) => (a[i >> 3] >> (i & 7)) & 1;
  const setBit = (a, i) => { a[i >> 3] |= 1 << (i & 7); };
  const clrBit = (a, i) => { a[i >> 3] &= ~(1 << (i & 7)); };

  let S = { start: null, khatmas: 0, days: {}, last: null };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* rien */ }
  if (!S.days || typeof S.days !== 'object') S.days = {};
  let READ = bytes(S.read), HEARD = bytes(S.heard);
  function save() {
    S.read = pack(READ); S.heard = pack(HEARD);
    const keys = Object.keys(S.days).sort();
    while (keys.length > 400) delete S.days[keys.shift()];
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage plein ou bloqué */ }
  }
  const isDone = g => getBit(READ, g) | getBit(HEARD, g);

  // ---------- Dates ----------
  const pad = n => String(n).padStart(2, '0');
  const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => dkey(new Date());
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // jour du plan pour aujourd'hui (1 = premier jour ; peut être < 1 avant le début et > 30 après la fin)
  const planDay = () => (S.start ? Math.round((midnight(new Date()) - parseKey(S.start)) / 864e5) + 1 : null);
  const dateOfDay = i => { const s = parseKey(S.start); return new Date(s.getFullYear(), s.getMonth(), s.getDate() + i - 1); };
  const fmtLong = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtShort = d => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\.$/, '');
  const num = n => Math.round(n).toLocaleString('fr-FR');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ---------- Calculs ----------
  function countDone(a, b) { let n = 0; for (let g = a; g < b; g++) n += isDone(g); return n; }
  function wordsDone(a, b) { let w = 0; for (let g = a; g < b; g++) if (isDone(g)) w += PL.vw[g]; return w; }
  const frac = (a, b) => { const w = words(a, b); return w ? wordsDone(a, b) / w : 0; };
  function firstUndone(a, b) { for (let g = a; g < b; g++) if (!isDone(g)) return g; return -1; }
  function portions(j) {
    const [a, b] = juzRange(j);
    const p0 = pageOf(a), p1 = pageOf(b - 1), n = p1 - p0 + 1;
    const out = [];
    for (let k = 0; k < 5; k++) {
      const pa = p0 + Math.round(k * n / 5), pb = p0 + Math.round((k + 1) * n / 5) - 1;
      if (pb < pa) continue;
      out.push({ k, pa, pb, a: k === 0 ? a : Math.max(a, PS[pa - 1]), b: k === 4 || pb >= PAGES ? b : Math.min(b, PS[pb]), name: PORTION_NAMES[k] });
    }
    return out;
  }
  const rangeLabel = (a, b) => {
    const [s1, v1] = fromG(a), [s2, v2] = fromG(b - 1);
    return `${sName(s1)} ${s1}:${v1} à ${s1 === s2 ? '' : sName(s2) + ' '}${s2}:${v2}`;
  };
  const pagesLabel = (pa, pb) => (pa === pb ? `page ${pa}` : `pages ${pa} à ${pb}`);
  const listenMin = (a, b) => Math.max(1, Math.round(words(a, b) / WORDS_PER_SEC / 60));
  const pct = f => Math.floor(f * 100);
  const pctTxt = f => (f > 0 && f < 0.01 ? `< 1${NBSP}%` : `${pct(f)}${NBSP}%`);
  // pour l'ensemble du Coran, une décimale tant que c'est petit : 31 versets = 0,3 %, et jamais « 0 % » quand il y a déjà une progression
  const pctTot = f => (f > 0 && f < 0.1 ? `${(Math.floor(f * 1000) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1 })}${NBSP}%` : pctTxt(f));
  const totalFrac = () => wordsDone(0, N) / TOTAL_W;
  function streaks() {
    const has = k => (S.days[k] || 0) > 0;
    let cur = 0;
    const d = new Date();
    if (!has(dkey(d))) d.setDate(d.getDate() - 1);
    while (has(dkey(d))) { cur++; d.setDate(d.getDate() - 1); }
    let best = 0, run = 0, prev = null;
    Object.keys(S.days).filter(has).sort().forEach(k => {
      run = prev && Math.round((parseKey(k) - parseKey(prev)) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = k;
    });
    return { cur, best: Math.max(best, cur) };
  }
  function lateInfo(d) {
    if (d == null || d < 2) return null;
    const upTo = clamp(d - 1, 1, DAYS), end = juzRange(upTo)[1];
    const w = words(0, end) - wordsDone(0, end);
    const pages = w / WORDS_PER_PAGE;
    if (pages < 1) return null;
    const left = Math.max(1, DAYS - clamp(d, 1, DAYS) + 1);
    return { pages: Math.round(pages), perDay: Math.ceil(pages / left), from: firstUndone(0, end) };
  }

  // ---------- Marquer ----------
  function mark(list, kind, silent) {
    let added = 0, top = -1;
    const arr = kind === 'heard' ? HEARD : READ;
    for (const g of list) {
      if (g < 0 || g >= N) continue;
      const was = isDone(g);
      setBit(arr, g);
      if (!was) added++;
      if (kind === 'read' && g > top) top = g;
    }
    if (kind === 'read' && top >= 0) { const [s, v] = fromG(top); S.last = { s, v }; }
    if (added) { const k = todayKey(); S.days[k] = (S.days[k] || 0) + added; }
    if (added || top >= 0) { save(); if (!silent) changed(); }
    return added;
  }
  function unmark(a, b) {
    for (let g = a; g < b; g++) { clrBit(READ, g); clrBit(HEARD, g); }
    save(); changed();
  }
  const span = (a, b) => { const o = []; for (let g = a; g < b; g++) o.push(g); return o; };

  // lecture au fil des pages : la double page quittée vers l'avant est « lue » si elle est restée affichée un moment
  let cur = null;
  const reading = () => document.visibilityState === 'visible' && document.body.dataset.view === 'coran';
  function accrue() {
    if (!cur) return;
    if (cur.tick) cur.ms += Date.now() - cur.tick;
    cur.tick = reading() ? Date.now() : 0;
  }
  const keysToG = items => items.flatMap(it => it.verses.map(k => { const [s, v] = k.split(':').map(Number); return gidx(s, v); }));
  window.addEventListener('mawqut:spread', e => {
    const d = e.detail || {};
    const g = keysToG(d.items || []);
    const sig = g.length ? g[0] + '-' + g[g.length - 1] : '';
    if (cur && cur.sig === sig) { accrue(); return; } // même double page, simplement réaffichée
    accrue();
    if (cur && !cur.done && d.direction > 0 && cur.ms >= READ_DWELL) { mark(cur.g, 'read'); cur.done = true; }
    cur = { sig, g, ms: 0, tick: reading() ? Date.now() : 0, done: false };
  });
  function leave() {
    accrue();
    if (cur && !cur.done && cur.ms >= LEAVE_DWELL) { mark(cur.g, 'read'); cur.done = true; }
  }
  window.addEventListener('mawqut:view', () => { if (document.body.dataset.view !== 'coran') leave(); else accrue(); renderCard(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); else { accrue(); renderCard(); } });
  window.addEventListener('pagehide', leave);
  // écoute : un verset récité jusqu'au bout
  window.addEventListener('mawqut:verse-done', e => {
    const d = e.detail || {};
    if (d.s >= 1 && d.s <= 114) mark([gidx(d.s, d.v)], 'heard');
  });

  // ---------- Petits outils d'interface ----------
  const NS = 'http://www.w3.org/2000/svg';
  const h = (tag, props, ...kids) => {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'on') for (const ev in v) n.addEventListener(ev, v[ev]);
      else n.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c != null && c !== false) n.append(c.nodeType ? c : String(c)); });
    return n;
  };
  const ICONS = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.500 12.500l4.200 4.200L18.500 7.800" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.500v5h3.600L12 18.500v-13L7.600 9.500H4Z" fill="currentColor"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.500" y="6.500" width="11" height="11" rx="1.500" fill="currentColor"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.500c2.500-1.200 5.500-1.200 9 .8 3.500-2 6.500-2 9-.8V18c-2.500-1.200-5.500-1.200-9 .8-3.500-2-6.500-2-9-.8V6.500Z" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linejoin="round"/><path d="M12 7.300V19" stroke="currentColor" stroke-width="1.600"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.800"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.800"/></svg>'
  };
  const ico = name => { const t = document.createElement('template'); t.innerHTML = ICONS[name]; return t.content.firstChild; };
  const btn = (cls, label, onClick, props) => h('button', Object.assign({ type: 'button', class: cls, on: { click: onClick } }, props), label);
  function ring(f, label, cls) {
    const r = 19, C = 2 * Math.PI * r;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('class', 'sv-ring ' + (cls || '')); svg.setAttribute('aria-hidden', 'true');
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
    mk('circle', { cx: 24, cy: 24, r, class: 'sv-ring-bg' });
    if (f > 0) mk('circle', { cx: 24, cy: 24, r, class: 'sv-ring-fg', 'stroke-dasharray': `${(C * Math.min(1, f)).toFixed(2)} ${C.toFixed(2)}`, transform: 'rotate(-90 24 24)' });
    const t = mk('text', { x: 24, y: 24, class: 'sv-ring-t' }); t.textContent = label;
    return svg;
  }
  function bar(f, label) {
    const b = h('div', { class: 'sv-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct(f), 'aria-label': label || 'Avancement' });
    const i = h('i'); i.style.width = pct(f) + '%'; b.append(i);
    return b;
  }

  // ---------- Fenêtre « Mon suivi » ----------
  const dlg = $('#suiviSheet');
  let viewDay = null;
  let startDraft = todayKey();
  let confirm = '';          // « stop » ou « reset » : second appui demandé
  let playingId = '';
  const msgs = {};

  function openBook(g) {
    if (dlg && dlg.open) dlg.close();
    const [s, v] = fromG(g);
    Q.open(s, v);
  }
  function listenList(a, b, id, label) {
    if (window.Mawqut && window.Mawqut.unlockAudio) window.Mawqut.unlockAudio();
    const g0 = firstUndone(a, b);
    const from = g0 >= 0 ? g0 : a;
    Q.playList(span(from, b).map(fromG), { id, label, times: 1 });
  }

  function startPlan(key) {
    S.start = key || todayKey();
    viewDay = null; confirm = '';
    save(); changed();
  }
  function startBlock(withTitle) {
    const input = h('input', { type: 'date', id: 'svStart', value: startDraft, 'aria-label': 'Premier jour du plan', 'data-fid': 'start' });
    input.addEventListener('input', () => { if (input.value) startDraft = input.value; });
    return h('div', { class: 'sv-start' },
      withTitle ? h('label', { for: 'svStart' }, 'Premier jour') : null,
      input,
      btn('btn btn-primary', S.start ? 'Changer la date' : 'Commencer le plan', () => { if (input.value) startPlan(input.value); }, { 'data-fid': 'startgo' }));
  }

  function renderJour() {
    const box = $('#svJour');
    box.replaceChildren();
    const d = planDay();
    if (d == null) {
      box.append(
        h('section', { class: 'sv-intro' },
          h('h3', null, 'Tout le Coran en 30 jours'),
          h('p', null, 'Un Juz’ par jour, soit environ 20 pages. Chaque jour est partagé en cinq portions, une après chaque prière : à peine quatre pages à la fois.'),
          h('p', { class: 'hint' }, `Tu peux lire, écouter ou les deux : un verset écouté compte comme un verset lu. Écouter un Juz’ entier prend environ ${listenMin(...juzRange(1))}${NBSP}minutes (≈).`),
          startBlock(true)));
      box.append(resumeBlock());
      return;
    }
    const today = clamp(d, 1, DAYS);
    if (viewDay == null || viewDay < 1 || viewDay > DAYS) viewDay = today;
    const j = viewDay;
    const [a, b] = juzRange(j);
    const f = frac(a, b);
    const isToday = d >= 1 && d <= DAYS && j === d;

    if (d < 1) box.append(h('p', { class: 'sv-note' }, `Le plan commence le ${fmtLong(dateOfDay(1))}. Tu peux déjà lire à l’avance.`));
    if (d > DAYS) box.append(h('p', { class: 'sv-note' }, 'Le plan de 30 jours est terminé. Tu peux relire un jour ou recommencer depuis l’onglet « Plan 30 jours ».'));

    // en-tête : jour, date, navigation
    box.append(h('div', { class: 'sv-dayhead' },
      btn('btn sv-nav', ico('prev'), () => { viewDay = Math.max(1, j - 1); renderJour(); }, { 'aria-label': 'Jour précédent', disabled: j <= 1, 'data-fid': 'prevday' }),
      h('div', { class: 'sv-daytitle' },
        h('h3', null, `Jour ${j} sur ${DAYS}`),
        h('p', { class: 'hint' }, fmtLong(dateOfDay(j)) + (isToday ? ' · aujourd’hui' : ''))),
      btn('btn sv-nav', ico('next'), () => { viewDay = Math.min(DAYS, j + 1); renderJour(); }, { 'aria-label': 'Jour suivant', disabled: j >= DAYS, 'data-fid': 'nextday' })));
    if (d >= 1 && d <= DAYS && j !== d) box.append(btn('btn btn-quiet sv-back', 'Revenir à aujourd’hui', () => { viewDay = d; renderJour(); }, { 'data-fid': 'today' }));

    // le Juz' du jour
    const p0 = pageOf(a), p1 = pageOf(b - 1);
    box.append(h('section', { class: 'sv-hero' },
      h('div', { class: 'sv-hero-top' },
        h('p', { class: 'sv-juz' }, `Juz’ ${j}`),
        h('p', { class: 'sv-pct tnum' }, pctTxt(f))),
      bar(f, `Avancement du Juz’ ${j}`),
      h('p', { class: 'sv-range' }, rangeLabel(a, b)),
      h('p', { class: 'hint' }, `${pagesLabel(p0, p1)} du Coran de Médine · écoute ≈ ${listenMin(a, b)}${NBSP}min`)));

    // retard
    const late = isToday ? lateInfo(d) : null;
    if (late) {
      box.append(h('div', { class: 'sv-late', role: 'status' },
        h('p', null, `Il te reste environ ${late.pages} page${late.pages > 1 ? 's' : ''} à rattraper. En ajoutant ≈ ${late.perDay} page${late.perDay > 1 ? 's' : ''} par jour, tu finis dans les temps.`),
        late.from >= 0 ? btn('btn', 'Reprendre le retard', () => openBook(late.from), { 'data-fid': 'late' }) : null));
    }

    // portions
    const list = h('ol', { class: 'sv-portions' });
    const ps = portions(j);
    let nowIdx = -1;
    ps.forEach((p, i) => { if (nowIdx < 0 && frac(p.a, p.b) < 1) nowIdx = i; });
    ps.forEach((p, i) => {
      const pf = frac(p.a, p.b), full = pf >= 1 || countDone(p.a, p.b) === p.b - p.a;
      const id = `suivi:${j}:${p.k}`;
      const on = playingId === id;
      const li = h('li', { class: 'sv-portion' + (full ? ' is-done' : '') + (isToday && i === nowIdx ? ' is-now' : '') },
        btn('sv-check', ico('check'), () => { if (full) unmark(p.a, p.b); else mark(span(p.a, p.b), 'read'); },
          { 'aria-pressed': String(full), 'aria-label': `${p.name} : ${full ? 'fait, appuie pour annuler' : 'marquer comme fait'}`, 'data-fid': 'chk' + p.k }),
        h('div', { class: 'sv-ptext' },
          h('b', null, p.name),
          h('span', null, pagesLabel(p.pa, p.pb) + (full ? ' · fait' : pf > 0 ? ` · ${pctTxt(pf)}` : '') + ` · écoute ≈ ${listenMin(p.a, p.b)}${NBSP}min`),
          h('small', null, rangeLabel(p.a, p.b))),
        h('div', { class: 'sv-pact' },
          btn('btn', [ico('book'), h('span', null, 'Lire')], () => openBook(firstUndone(p.a, p.b) >= 0 ? firstUndone(p.a, p.b) : p.a), { 'aria-label': `Lire ${p.name.toLowerCase()}`, 'data-fid': 'read' + p.k }),
          btn('btn' + (on ? ' is-on' : ''), [ico(on ? 'stop' : 'play'), h('span', null, on ? 'Arrêter' : 'Écouter')], () => listenList(p.a, p.b, id, `Juz’ ${j} · ${p.name}`), { 'aria-pressed': String(on), 'aria-label': `${on ? 'Arrêter' : 'Écouter'} ${p.name.toLowerCase()}`, 'data-fid': 'listen' + p.k })));
      list.append(li);
    });
    box.append(list);

    const st = streaks();
    box.append(h('p', { class: 'sv-foot' }, st.cur > 0 ? `${st.cur} jour${st.cur > 1 ? 's' : ''} de suite avec de la lecture ou de l’écoute.` : 'Chaque verset lu ou écouté est compté automatiquement.'));
    box.append(resumeBlock());
  }

  function resumeBlock() {
    if (!S.last) return h('span');
    const g = gidx(S.last.s, S.last.v) + 1;
    const target = g < N ? g : N - 1;
    const [s, v] = fromG(target);
    return h('section', { class: 'sv-resume' },
      h('div', null, h('b', null, 'Ma dernière lecture'), h('span', null, `${sName(S.last.s)} ${S.last.s}:${S.last.v}`)),
      btn('btn', [ico('book'), h('span', null, 'Reprendre')], () => openBook(target), { 'aria-label': `Reprendre à ${sName(s)} ${s}:${v}`, 'data-fid': 'resume' }));
  }

  function renderPlan() {
    const box = $('#svPlan');
    box.replaceChildren();
    const d = planDay();
    box.append(h('p', { class: 'hint sv-planhint' }, S.start
      ? 'Appuie sur un jour pour voir ses cinq portions. Chaque Juz’ du plan est lu ou écouté en une journée.'
      : 'Voici le plan : un Juz’ par jour. Choisis un premier jour dans l’onglet « Aujourd’hui » pour le démarrer, ou appuie sur un Juz’ pour le lire tout de suite.'));
    const ol = h('ol', { class: 'sv-days' });
    for (let j = 1; j <= DAYS; j++) {
      const [a, b] = juzRange(j), f = frac(a, b), full = countDone(a, b) === b - a;
      const p0 = pageOf(a), p1 = pageOf(b - 1);
      const late = S.start && d != null && j < d && !full;
      const status = full ? 'Fait' : f > 0 ? pctTxt(f) : (late ? 'En retard' : '');
      const li = h('li', null,
        btn('sv-day' + (full ? ' is-done' : '') + (S.start && d === j ? ' is-today' : '') + (late ? ' is-late' : ''), [
          h('span', { class: 'sv-dn tnum' }, S.start ? fmtShort(dateOfDay(j)) : `Jour ${j}`),
          h('span', { class: 'sv-dt' }, h('b', null, `Juz’ ${j}`), h('small', null, `${rangeLabel(a, b)}`)),
          h('span', { class: 'sv-dp tnum' }, `${pagesLabel(p0, p1).replace(' à ', '–').replace('pages', 'p.').replace('page', 'p.')}`),
          h('span', { class: 'sv-ds' }, full ? ico('check') : status)
        ], () => { if (S.start) { viewDay = j; selectTab('jour'); renderJour(); } else openBook(a); },
        { 'aria-label': `Jour ${j}, Juz’ ${j}, ${status || 'pas commencé'}`, 'data-fid': 'day' + j }));
      ol.append(li);
    }
    box.append(ol);
    box.append(h('section', { class: 'sv-manage' },
      h('h3', null, S.start ? 'Gérer mon plan' : 'Démarrer le plan'),
      startBlock(true),
      S.start ? h('div', { class: 'sv-stop' },
        btn('btn btn-quiet', confirm === 'stop' ? 'Confirmer : arrêter le plan' : 'Arrêter le plan', () => { if (confirm === 'stop') { S.start = null; viewDay = null; confirm = ''; save(); changed(); } else { confirm = 'stop'; renderAll(); } }, { 'data-fid': 'stop' }),
        h('p', { class: 'hint' }, 'Ta progression de lecture est gardée.')) : null));
  }

  function renderBilan() {
    const box = $('#svBilan');
    box.replaceChildren();
    const f = totalFrac();
    let nRead = 0, nHeard = 0, nDone = 0;
    for (let g = 0; g < N; g++) { const r = getBit(READ, g), hd = getBit(HEARD, g); nRead += r; nHeard += hd; nDone += r | hd; }
    const st = streaks();
    box.append(h('section', { class: 'sv-total' },
      ring(f, pctTot(f), 'sv-ring-big'),
      h('div', null,
        h('p', { class: 'sv-big' }, `${num(nDone)} versets sur 6${NBSP}236`),
        h('p', { class: 'hint' }, `≈ ${num(wordsDone(0, N) / WORDS_PER_PAGE)} pages sur ${PAGES} du Coran de Médine, lues ou écoutées.`),
        S.khatmas ? h('p', { class: 'hint' }, `Lectures complètes terminées : ${S.khatmas}.`) : null)));
    if (nDone === N) {
      box.append(h('div', { class: 'sv-late sv-khatm', role: 'status' },
        h('p', null, 'Tu as lu ou écouté tout le Coran. Qu’Allah l’accepte de toi.'),
        btn('btn btn-primary', 'Commencer une nouvelle lecture', () => { S.khatmas = (S.khatmas || 0) + 1; READ = bytes(''); HEARD = bytes(''); S.start = null; S.last = null; viewDay = null; save(); changed(); }, { 'data-fid': 'newkhatm' })));
    }
    box.append(h('div', { class: 'sv-stats' },
      stat(num(nRead), 'versets lus'),
      stat(num(nHeard), 'versets écoutés'),
      stat(String(st.cur), st.cur > 1 ? 'jours de suite' : 'jour de suite'),
      stat(String(st.best), 'meilleure série')));

    // 14 derniers jours
    const chart = h('div', { class: 'sv-chart' });
    const days = [];
    const t = new Date();
    for (let i = 13; i >= 0; i--) { const dd = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i); days.push([dd, S.days[dkey(dd)] || 0]); }
    const max = Math.max(1, ...days.map(x => x[1]));
    const total14 = days.reduce((x, y) => x + y[1], 0);
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', `Versets lus ou écoutés chaque jour sur les 14 derniers jours : ${num(total14)} au total.`);
    days.forEach(([dd, n], i) => {
      const col = h('div', { class: 'sv-col' + (i === 13 ? ' is-today' : ''), title: `${fmtShort(dd)} : ${num(n)} verset${n > 1 ? 's' : ''}` });
      const b = h('i'); b.style.height = n ? Math.max(4, Math.round(n / max * 100)) + '%' : '2px';
      col.append(h('span', { class: 'sv-bw' }, b), h('small', null, ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dd.getDay()]));
      chart.append(col);
    });
    box.append(h('section', { class: 'sv-sec' }, h('h3', null, '14 derniers jours'), chart,
      h('p', { class: 'hint' }, total14 ? `${num(total14)} verset${total14 > 1 ? 's' : ''} lus ou écoutés sur cette période.` : 'Rien encore sur cette période : le premier verset lu ou écouté apparaîtra ici.')));

    // Juz'
    const grid = h('div', { class: 'sv-juzgrid' });
    for (let j = 1; j <= DAYS; j++) {
      const [a, b] = juzRange(j), jf = frac(a, b);
      const c = btn('sv-jz' + (jf >= 1 ? ' is-full' : ''), [h('b', { class: 'tnum' }, String(j)), h('small', null, jf > 0 ? pctTxt(jf) : '')], () => openBook(firstUndone(a, b) >= 0 ? firstUndone(a, b) : a), { 'aria-label': `Juz’ ${j}, ${pctTxt(jf)} lu ou écouté. Ouvrir.`, 'data-fid': 'jz' + j });
      c.style.setProperty('--f', String(Math.min(1, jf)));
      grid.append(c);
    }
    box.append(h('section', { class: 'sv-sec' }, h('h3', null, 'Les 30 Juz’'), grid));

    // marquer un passage lu à la main
    const sel = h('select', { id: 'svSurah', 'aria-label': 'Sourate', 'data-fid': 'msurah' });
    META.surahs.forEach((s, i) => sel.append(h('option', { value: i + 1 }, `${i + 1}. ${s[1]}`)));
    const from = h('input', { type: 'number', id: 'svFrom', min: 1, value: 1, inputmode: 'numeric', 'aria-label': 'Du verset', 'data-fid': 'mfrom' });
    const to = h('input', { type: 'number', id: 'svTo', min: 1, value: META.surahs[0][3], inputmode: 'numeric', 'aria-label': 'Au verset', 'data-fid': 'mto' });
    sel.addEventListener('change', () => { const c = META.surahs[+sel.value - 1][3]; from.max = c; to.max = c; from.value = 1; to.value = c; });
    const out = h('p', { class: 'hint', role: 'status', id: 'svMsg' }, msgs.mark || '');
    box.append(h('section', { class: 'sv-sec' }, h('h3', null, 'Marquer un passage comme lu'),
      h('p', { class: 'hint' }, 'Pour une lecture faite ailleurs, par exemple dans un Coran papier.'),
      h('div', { class: 'sv-form' }, sel, h('label', null, 'du verset', from), h('label', null, 'au verset', to),
        btn('btn', 'Marquer comme lu', () => {
          const s = +sel.value, c = META.surahs[s - 1][3];
          const a = clamp(Math.round(+from.value) || 1, 1, c), z = clamp(Math.round(+to.value) || c, 1, c);
          if (a > z) { msgs.mark = 'Le premier verset doit venir avant le dernier.'; out.textContent = msgs.mark; return; }
          const n = mark(span(gidx(s, a), gidx(s, z) + 1), 'read');
          msgs.mark = n ? `${sName(s)} ${s}:${a} à ${s}:${z} marqué comme lu (${n} nouveau${n > 1 ? 'x' : ''} verset${n > 1 ? 's' : ''}).` : 'Ce passage était déjà marqué.';
          renderAll();
        }, { 'data-fid': 'mgo' })),
      out));

    box.append(h('section', { class: 'sv-sec' },
      h('details', { class: 'tf-more sv-how' },
        h('summary', null, 'Comment c’est compté'),
        h('div', { class: 'tf-more-body' },
          h('p', null, 'Un verset est marqué lu quand tu tournes la page vers l’avant après l’avoir gardée affichée au moins 12 secondes, ou quand tu coches une portion toi-même. Il est marqué écouté quand sa récitation va jusqu’au bout.'),
          h('p', null, 'Les pourcentages comptent les mots, pour que les longs versets pèsent plus que les courts. Les durées d’écoute sont des estimations (≈). Tout reste sur cet appareil.'))),
      h('div', { class: 'sv-stop' },
        btn('btn btn-quiet', confirm === 'reset' ? 'Confirmer : tout effacer' : 'Effacer mon suivi', () => {
          if (confirm === 'reset') { S = { start: null, khatmas: 0, days: {}, last: null }; READ = bytes(''); HEARD = bytes(''); viewDay = null; confirm = ''; save(); changed(); }
          else { confirm = 'reset'; renderAll(); }
        }, { 'data-fid': 'reset' }),
        h('p', { class: 'hint' }, 'Efface la progression, le plan et l’historique.'))));
  }
  const stat = (n, label) => h('div', { class: 'sv-stat' }, h('b', { class: 'tnum' }, n), h('span', null, label));

  function selectTab(name) {
    if (window.Mawqut && window.Mawqut.showTab) window.Mawqut.showTab(dlg, name);
  }
  function renderAll() {
    if (!dlg) return;
    const ae = document.activeElement;
    const fid = ae && dlg.contains(ae) && ae.dataset ? ae.dataset.fid : '';
    const sc = dlg.querySelector('.sheet-body');
    const top = sc ? sc.scrollTop : 0;
    renderJour(); renderPlan(); renderBilan();
    if (sc) sc.scrollTop = top;
    if (fid) { const n = dlg.querySelector(`[data-fid="${fid}"]`); if (n && !n.disabled) n.focus({ preventScroll: true }); }
  }
  let timer = 0;
  function changed() {
    renderCard();
    if (dlg && dlg.open) { clearTimeout(timer); timer = setTimeout(renderAll, 250); }
  }

  // ---------- Carte sur la page Horaires ----------
  function renderCard() {
    const card = $('#suiviCard');
    if (!card) return;
    const d = planDay(), f = totalFrac();
    const T = $('#suiviCardTitle'), K = $('#scKicker'), SUB = $('#scSub'), MAIN = $('#scMain'), RING = $('#scRing');
    let kicker = 'Ma lecture du Coran', title, sub, main, act, rf = f, rt = pctTot(f);
    const st = streaks();
    const streakTxt = st.cur > 1 ? ` · ${st.cur} jours de suite` : '';
    if (d != null && d >= 1 && d <= DAYS) {
      const [a, b] = juzRange(d), ps = portions(d);
      const nDone = ps.filter(p => countDone(p.a, p.b) === p.b - p.a).length;
      kicker = 'Plan de 30 jours';
      rf = frac(a, b); rt = String(d);
      if (nDone === ps.length) { title = `Jour ${d} terminé`; sub = `Juz’ ${d} lu ou écouté en entier${streakTxt}. Qu’Allah l’accepte de toi.`; main = 'Voir mon suivi'; act = 'open'; }
      else {
        const next = ps.find(p => countDone(p.a, p.b) < p.b - p.a);
        title = `Jour ${d} sur ${DAYS} · Juz’ ${d}`;
        sub = `${nDone} portion${nDone > 1 ? 's' : ''} sur ${ps.length} faite${nDone > 1 ? 's' : ''} aujourd’hui · prochaine : ${next.name.toLowerCase()}${streakTxt}`;
        main = 'Continuer la lecture'; act = 'read';
      }
    } else if (d != null && d < 1) {
      title = 'Le plan commence bientôt'; sub = `Premier jour : ${fmtLong(dateOfDay(1))}.`; main = 'Voir le plan'; act = 'plan'; rt = '30'; rf = 0;
    } else if (d != null) {
      title = 'Plan de 30 jours terminé'; sub = `${pctTot(f)} du Coran lu ou écouté.`; main = 'Voir mon suivi'; act = 'open';
    } else if (f > 0 || S.last) {
      title = `${pctTot(f)} du Coran lu ou écouté`;
      sub = (S.last ? `Dernière lecture : ${sName(S.last.s)} ${S.last.s}:${S.last.v}` : 'Ta progression est enregistrée sur cet appareil.') + streakTxt;
      main = S.last ? 'Reprendre la lecture' : 'Voir mon suivi'; act = S.last ? 'resume' : 'open';
    } else {
      kicker = 'Plan de 30 jours';
      title = 'Tout le Coran en 30 jours';
      sub = 'Un Juz’ par jour, en cinq portions après les prières. Lis, écoute, ou les deux.';
      main = 'Voir le plan'; act = 'plan'; rt = '30'; rf = 0;
    }
    K.textContent = kicker; T.textContent = title; SUB.textContent = sub; MAIN.textContent = main; MAIN.dataset.act = act;
    RING.replaceChildren(ring(rf, rt));
    card.hidden = false;
  }

  function open(tab) {
    if (!dlg) return;
    msgs.mark = ''; confirm = '';
    if (!S.start) startDraft = todayKey();
    renderAll();
    selectTab(tab || 'jour');
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  function cardMain() {
    const act = $('#scMain').dataset.act;
    if (act === 'plan') { open(S.start ? 'plan' : 'jour'); return; }
    if (act === 'open') { open('bilan'); return; }
    if (act === 'resume' && S.last) { openBook(Math.min(N - 1, gidx(S.last.s, S.last.v) + 1)); return; }
    if (act === 'read') {
      const d = planDay(), [a, b] = juzRange(clamp(d, 1, DAYS)), g = firstUndone(a, b);
      Q.open(...fromG(g >= 0 ? g : a));
      return;
    }
    open('jour');
  }

  if (dlg) {
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { confirm = ''; });
    dlg.querySelector('.sheet-tabs').addEventListener('click', () => { confirm = ''; });
  }
  const tb = $('#qTrackBtn');
  if (tb) tb.addEventListener('click', () => open('jour'));
  const sm = $('#scMain'), so = $('#scOpen');
  if (sm) sm.addEventListener('click', cardMain);
  if (so) so.addEventListener('click', () => open(S.start || (!S.last && totalFrac() === 0) ? 'jour' : 'bilan'));
  window.addEventListener('mawqut:playing', e => {
    const q = e.detail && e.detail.queue;
    const id = q && String(q.id).startsWith('suivi:') ? q.id : '';
    if (id !== playingId) { playingId = id; if (dlg && dlg.open) renderAll(); }
  });
  setInterval(renderCard, 60000);
  renderCard();

  window.Mawqut = window.Mawqut || {};
  window.Mawqut.suivi = { open, mark, state: () => ({ start: S.start, done: countDone(0, N), day: planDay() }) };
})();
