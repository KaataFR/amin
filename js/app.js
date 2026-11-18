(() => {
  'use strict';
  const E = window.MawqutEngine;
  const $ = s => document.querySelector(s);
  const desktop = window.mawqutDesktop || null;
  const tv = window.AminTV || null; // app Google TV : alertes gérées par l'app (adhan et bandeau par-dessus la télé)
  const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const NAMES = {
    fajr: { fr: 'Fajr', ar: 'الفَجْر' },
    sunrise: { fr: 'Chourouq', ar: 'الشُّرُوق' },
    dhuhr: { fr: 'Dhohr', ar: 'الظُّهْر' },
    asr: { fr: 'Asr', ar: 'العَصْر' },
    maghrib: { fr: 'Maghrib', ar: 'المَغْرِب' },
    isha: { fr: 'Icha', ar: 'العِشَاء' }
  };
  const JUMUA = { fr: 'Joumou‘a', ar: 'الجُمُعَة' };
  const STAR_PATH = 'M-7 -7h14v14h-14Z M0 -9.9 9.9 0 0 9.9 -9.9 0Z';

  // ---------- Stockage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  };
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’‘`]/g, ' ').replace(/\s+/g, ' ').trim();

  // ---------- Villes ----------
  let CITY_DB = null;
  function cityDb() {
    if (CITY_DB) return CITY_DB;
    const tzs = window.MAWQUT_TZ || [];
    CITY_DB = (window.MAWQUT_CITIES || '').split('\n').filter(Boolean).map(line => {
      const [name, alt, cc, sub, lat, lon, tz, pop] = line.split('|');
      return { name, cc, sub, lat: +lat, lon: +lon, tz: tzs[+tz], pop: +pop, key: norm(name), akey: alt ? alt.split(';').map(norm) : [] };
    });
    return CITY_DB;
  }
  function searchCities(q) {
    const nq = norm(q);
    if (nq.length < 2) return [];
    const res = [];
    for (const c of cityDb()) {
      let r = -1;
      if (c.key === nq) r = 0;
      else if (c.key.startsWith(nq)) r = 1;
      else if (c.akey.some(a => a.startsWith(nq))) r = 2;
      else if (c.key.includes(' ' + nq)) r = 3;
      if (r >= 0) res.push([r, c]);
    }
    res.sort((a, b) => a[0] - b[0] || b[1].pop - a[1].pop);
    return res.slice(0, 8).map(x => x[1]);
  }
  const regionNames = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (e) { return null; } })();
  const countryName = cc => { try { return (regionNames && regionNames.of(cc)) || cc; } catch (e) { return cc; } };
  const placeSubtitle = c => [c.sub, c.cc ? countryName(c.cc) : ''].filter(Boolean).join(', ');
  function validTz(tz) { try { new Intl.DateTimeFormat('fr', { timeZone: tz }); return true; } catch (e) { return false; } }
  function defaultCity() {
    let tz = 'Europe/Paris';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* défaut */ }
    const db = cityDb();
    const c = (tz === 'Europe/Paris' && db.find(x => x.key === 'paris' && x.cc === 'FR')) || db.find(x => x.tz === tz) || db.find(x => x.key === 'paris');
    return c ? pickCity(c) : { name: 'Paris', sub: 'Paris', cc: 'FR', lat: 48.8534, lon: 2.3488, tz: 'Europe/Paris' };
  }
  const pickCity = c => ({ name: c.name, sub: c.sub || '', cc: c.cc || '', lat: c.lat, lon: c.lon, tz: c.tz });

  // ---------- Réglages ----------
  const DEFAULTS = {
    city: null, method: null, highLat: 'angle',
    fajrAngle: 18, ishaAngle: 17, ishaMinutes: 0, asrShift: 0,
    adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    mosques: [], mosque: null, cityCalc: null, // Mes mosquées (voir plus bas)
    hijriAdjust: 0, hijriAtMaghrib: true,
    enabled: false,
    alerts: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true },
    reminders: [10], prayerSound: 'adhan-imadi', reminderSound: 'r-takbir-imadi', adhanLength: 0,
    volume: 0.7, muted: false, sticky: true, adhanName: '', daysShown: 7
  };
  const saved = store.get('mawqut.settings', {});
  // migration des réglages de la première version
  if (saved.before !== undefined && !saved.reminders) saved.reminders = +saved.before > 0 ? [+saved.before] : [];
  if (saved.sound && !saved.prayerSound) saved.prayerSound = saved.sound === 'adhan' ? 'adhan-custom' : saved.sound === 'none' ? 'none' : 'soft';
  delete saved.before; delete saved.sound;
  const S = Object.assign({}, DEFAULTS, saved, {
    adjust: Object.assign({}, DEFAULTS.adjust, saved.adjust),
    alerts: Object.assign({}, DEFAULTS.alerts, saved.alerts)
  });
  if (tv && saved.enabled === undefined) { S.enabled = true; S.volume = 1; }
  if (!S.city || !validTz(S.city.tz)) S.city = defaultCity();
  if (!S.method) S.method = E.COUNTRY_DEFAULTS[S.city.cc] || 'mwl';
  delete S.asr; // l'Asr suit toujours l'ombre simple (rite malikite)
  if (!Array.isArray(S.mosques)) S.mosques = [];
  if (S.mosque && !S.mosques.some(m => m.id === S.mosque)) S.mosque = null;

  // ---------- Mes mosquées : réglages ----------
  // Par défaut, le calcul de la ville (méthode du pays). Une mosquée = des réglages calés sur ses horaires
  // recopiés de quelques dates (js/mosques.js, commun au site, à l'appli PC et à la télé).
  const MQ = window.AminMosques;
  const MQ_PARAMS = ['method', 'fajrAngle', 'ishaAngle', 'ishaMinutes', 'asrShift'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const escHtml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pickParams = () => { const p = {}; MQ_PARAMS.forEach(k => { p[k] = S[k]; }); p.adjust = clone(S.adjust || {}); return p; };
  const activeMosque = () => S.mosques.find(m => m.id === S.mosque) || null;
  function activateMosque(m) {
    if (!S.mosque) S.cityCalc = pickParams(); // pour revenir ensuite au calcul de la ville
    S.city = clone(m.city);
    Object.assign(S, { asrShift: 0 }, clone(m.params));
    S.mosque = m.id;
    save(); syncSettingsForm();
  }
  // Calcul de la ville : celui d'avant la mosquée, sauf s'il n'était qu'une copie d'une mosquée (méthode du pays alors)
  function cityParams() {
    const c = S.cityCalc;
    const dup = c && S.mosques.some(m => JSON.stringify(m.params) === JSON.stringify(c));
    if (c && !dup) return clone(c);
    return { method: E.COUNTRY_DEFAULTS[S.city.cc] || 'mwl', fajrAngle: 18, ishaAngle: 17, ishaMinutes: 0, asrShift: 0, adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } };
  }
  function leaveMosque(noSave) {
    if (!S.mosque) return;
    Object.assign(S, { asrShift: 0 }, cityParams());
    S.mosque = null; S.cityCalc = null;
    if (!noSave) { save(); syncSettingsForm(); }
  }

  let version = 0;
  function save() { const am = activeMosque(); if (am) am.params = pickParams(); /* un réglage changé à la main suit la mosquée choisie */ store.set('mawqut.settings', S); version++; dayCache = null; fmtCache = {}; trayLabel = ''; rebuildEvents(Date.now()); render(true); pushTv(); }

  // ---------- Formats ----------
  let fmtCache = {};
  const fmt = (key, opts) => fmtCache[key] || (fmtCache[key] = new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: S.city.tz }, opts)));
  const fmtTime = ms => isFinite(ms) ? fmt('t', { hour: '2-digit', minute: '2-digit' }).format(ms) : '--:--';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function fmtDuration(ms, withSeconds) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    if (withSeconds) {
      if (h > 0) return { main: `${h} h ${String(m).padStart(2, '0')} min`, small: `${String(s).padStart(2, '0')} s` };
      if (m > 0) return { main: `${m} min`, small: `${String(s).padStart(2, '0')} s` };
      return { main: `${s} s`, small: '' };
    }
    const mm = Math.ceil(total / 60);
    if (mm >= 60) return `${Math.floor(mm / 60)} h ${String(mm % 60).padStart(2, '0')}`;
    return `${mm} min`;
  }
  const toArabicDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  // ---------- Calcul du jour ----------
  let dayCache = null;
  function day(now) {
    const zp = E.zonedParts(now, S.city.tz);
    const today = { y: zp.y, m: zp.m, d: zp.d };
    const key = `${today.y}-${today.m}-${today.d}#${version}`;
    if (dayCache && dayCache.key === key) return dayCache;
    const Y = E.timesFor(S.city, E.addDays(today, -1), S);
    const T = E.timesFor(S.city, today, S);
    const N = E.timesFor(S.city, E.addDays(today, 1), S);
    const timeline = [
      { k: 'maghrib', ms: Y.maghrib }, { k: 'isha', ms: Y.isha },
      ...ORDER.map(k => ({ k, ms: T[k], today: true })),
      { k: 'fajr', ms: N.fajr, tomorrow: true }, { k: 'sunrise', ms: N.sunrise, tomorrow: true }
    ].filter(e => isFinite(e.ms));
    dayCache = { key, today, weekday: zp.weekday, Y, T, N, timeline };
    return dayCache;
  }
  function situation(now) {
    const D = day(now);
    const next = D.timeline.find(e => e.k !== 'sunrise' && e.ms > now);
    let current = null;
    for (const e of D.timeline) if (e.ms <= now) current = e;
    return { D, next, current };
  }
  // Moment de la journée, pour proposer la lecture qui convient : vendredi, nuit, matin ou journée
  function moment(at) {
    const now = at || Date.now();
    const D = day(now), T = D.T;
    if (!isFinite(T.maghrib) || !isFinite(T.fajr)) return 'jour';
    if (now >= T.maghrib || now < T.fajr) return 'nuit';
    if (D.weekday === 5) return 'vendredi';
    return isFinite(T.dhuhr) && now < T.dhuhr ? 'matin' : 'jour';
  }
  const nameOf = (k, D, isToday) => (k === 'dhuhr' && D.weekday === 5 && isToday !== false ? JUMUA : NAMES[k]);

  function periodOf(now, T) {
    if (!isFinite(T.fajr) || now < T.fajr) return 'night';
    if (now < T.sunrise) return 'dawn';
    if (now < T.dhuhr) return 'morning';
    if (now < T.asr) return 'noon';
    if (now < T.maghrib) return 'afternoon';
    if (now < T.isha) return 'dusk';
    return 'night';
  }

  // ---------- Arc solaire ----------
  const svgNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const n = document.createElementNS(svgNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const clamp01 = x => Math.max(0, Math.min(1, x));
  function arcPoint(ms, T) {
    const rise = T.sunrise, set = T.maghrib;
    if (ms <= rise) { const u = clamp01((ms - T.fajr) / (rise - T.fajr)); return [30 + 80 * u, 300 + 45 * Math.cos(u * Math.PI / 2)]; }
    if (ms <= set) { const u = (ms - rise) / (set - rise); return [110 + 780 * u, 300 - 250 * Math.sin(Math.PI * u)]; }
    const u = clamp01((ms - set) / (T.isha - set)); return [890 + 80 * u, 300 + 45 * Math.sin(u * Math.PI / 2)];
  }
  function pathBetween(a, b, T) {
    if (!(b > a)) return '';
    const steps = Math.max(2, Math.ceil((b - a) / 120000));
    let d = '';
    for (let i = 0; i <= steps; i++) { const p = arcPoint(a + (b - a) * i / steps, T); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
    return d;
  }
  const LABEL_POS = { fajr: ['start', 14, 9], sunrise: ['start', 12, 26], dhuhr: ['middle', 0, -20], asr: ['start', 18, -8], maghrib: ['end', -12, 26], isha: ['end', -14, 10] };
  let arcKey = '';
  function drawArc(now, sit) {
    const T = sit.D.T;
    const ok = ORDER.every(k => isFinite(T[k]));
    const nextKey = sit.next ? sit.next.k + sit.next.ms : '';
    const minuteKey = Math.floor(now / 60000);
    const svgW = $('#arc').clientWidth || 1000;
    const z = Math.max(1, Math.min(3, 900 / svgW)); // agrandit repères et soleil sur petit écran
    const key = sit.D.key + nextKey + minuteKey + '|' + z.toFixed(2);
    if (key === arcKey) return;
    arcKey = key;
    const paths = $('#arcPaths'), markers = $('#arcMarkers'), labels = $('#arcLabels'), sun = $('#arcSun');
    [paths, markers, labels, sun].forEach(g => g.replaceChildren());
    if (!ok) return;
    const startDay = T.sunrise, endDay = T.maghrib;
    // tracé complet discret
    el('path', { d: pathBetween(T.fajr, startDay, T), fill: 'none', stroke: '#D9B76E', 'stroke-opacity': '.4', 'stroke-width': '1.4', 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, paths);
    el('path', { d: pathBetween(startDay, endDay, T), fill: 'none', stroke: '#D9B76E', 'stroke-opacity': '.32', 'stroke-width': '1.4', 'stroke-dasharray': '1 7', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, paths);
    el('path', { d: pathBetween(endDay, T.isha, T), fill: 'none', stroke: '#D9B76E', 'stroke-opacity': '.4', 'stroke-width': '1.4', 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, paths);
    // portion parcourue
    const inDay = now >= T.fajr && now <= T.isha;
    if (now > T.fajr) el('path', { d: pathBetween(T.fajr, Math.min(now, T.isha), T), fill: 'none', stroke: '#E9CC8C', 'stroke-width': '2', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, paths);
    // repères
    for (const k of ORDER) {
      const [x, y] = arcPoint(T[k], T);
      const isNext = sit.next && sit.next.today && sit.next.k === k;
      const past = T[k] <= now;
      const g = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${((isNext ? 0.95 : 0.62) * z).toFixed(2)})` }, markers);
      if (isNext) el('circle', { r: '12', class: 'pulse' }, g);
      el('path', { d: STAR_PATH, class: 'marker' + (isNext ? ' is-next' : past ? ' is-past' : ''), 'fill-rule': 'nonzero' }, g);
      const [anchor, dx, dy] = LABEL_POS[k];
      const nm = nameOf(k, sit.D);
      const t = el('text', { x: (x + dx).toFixed(1), y: (y + dy).toFixed(1), 'text-anchor': anchor, class: 'arc-label' + (isNext ? ' is-next' : '') }, labels);
      t.textContent = nm.fr + ' ';
      const ts = el('tspan', { class: 't' }, t); ts.textContent = fmtTime(T[k]);
    }
    // soleil ou lune
    if (inDay) {
      const [x, y] = arcPoint(now, T);
      el('circle', { cx: x, cy: y, r: 46 * z, fill: 'url(#sunGlow)' }, sun);
      el('circle', { cx: x, cy: y, r: 11 * z, fill: y > 300 ? '#E9A86A' : '#FFE3A0' }, sun);
    } else {
      el('circle', { cx: 822, cy: 80, r: 26, fill: '#F3E6C8', mask: 'url(#crescent)', opacity: '.92' }, sun);
    }
  }

  // ---------- Étoiles ----------
  const canvas = $('#stars');
  const ctx2d = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];
  function seedStars() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const count = Math.round(r.width * r.height / 5200);
    stars = Array.from({ length: count }, () => ({ x: rnd() * r.width, y: rnd() * r.height * 0.82, s: rnd() * 1.1 + 0.25, p: rnd() * 6.28, a: rnd() * 0.6 + 0.3 }));
    drawStars(performance.now());
  }
  function drawStars(t) {
    const r = canvas.getBoundingClientRect();
    ctx2d.clearRect(0, 0, r.width, r.height);
    for (const st of stars) {
      const tw = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t / 1400 + st.p);
      ctx2d.globalAlpha = st.a * tw * (1 - st.y / (r.height * 0.95));
      ctx2d.fillStyle = '#F5ECDC';
      ctx2d.beginPath(); ctx2d.arc(st.x, st.y, st.s, 0, 6.283); ctx2d.fill();
    }
  }
  const STAR_OPACITY = { night: 1, dawn: 0.45, dusk: 0.55, morning: 0, noon: 0, afternoon: 0.05 };
  function loopStars(t) {
    if (!document.hidden && +canvas.style.opacity > 0 && !reduceMotion) drawStars(t);
    requestAnimationFrame(loopStars);
  }

  // ---------- Arcade ----------
  const arcade = $('#arcade');
  const cards = {};
  function archPath(w, h) {
    const top = Math.min(44, w * 0.32);
    return `M0.5 ${h - 0.5}V${top}C0.5 ${top * 0.42} ${w * 0.3} ${top * 0.12} ${w / 2} 0.5C${w * 0.7} ${top * 0.12} ${w - 0.5} ${top * 0.42} ${w - 0.5} ${top}V${h - 0.5}Z`;
  }
  const ro = new ResizeObserver(entries => {
    for (const en of entries) {
      const box = en.target; const svg = box.querySelector(':scope > .arch-shape');
      const w = box.offsetWidth, h = box.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.querySelector('path').setAttribute('d', archPath(w, h));
    }
  });
  const bellIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="bell-body" d="M6.2 16.5V11a5.800 5.800 0 0 1 11.600 0v5.500l1.700 2H4.500l1.700-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20.500a2.100 2.100 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="bell-off" d="M4.500 4.500l15 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  function buildArcade() {
    for (const k of ORDER) {
      const a = document.createElement('article');
      a.className = 'arch'; a.dataset.k = k;
      a.innerHTML = `<svg class="arch-shape" aria-hidden="true"><path/></svg>
        <div class="arch-ar" lang="ar"></div><div class="arch-fr"></div>
        <div class="arch-time"></div><div class="arch-note"></div>
        <button class="arch-toggle" type="button" aria-pressed="false">${bellIcon}<span></span></button>`;
      a.querySelector('.arch-toggle').addEventListener('click', () => {
        if (!S.enabled) { S.alerts[k] = true; enableAlerts(); return; }
        S.alerts[k] = !S.alerts[k];
        save(); syncSettingsForm();
      });
      arcade.appendChild(a); cards[k] = a; ro.observe(a);
    }
    ro.observe($('#alertBox'));
  }

  // ---------- Rendu ----------
  let lastSecond = -1;
  function render(force) {
    const now = Date.now();
    const sec = Math.floor(now / 1000);
    if (!force && (sec === lastSecond || document.hidden)) return;
    lastSecond = sec;
    const sit = situation(now);
    const { D, next, current } = sit;
    const T = D.T;

    // période du ciel
    const period = periodOf(now, T);
    if (document.body.dataset.period !== period) document.body.dataset.period = period;
    canvas.style.opacity = STAR_OPACITY[period];

    // dates
    $('#gregDate').textContent = cap(fmt('d', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now));
    const afterMaghrib = S.hijriAtMaghrib && now >= T.maghrib;
    const h = E.hijri(afterMaghrib ? E.addDays(D.today, 1) : D.today, +S.hijriAdjust || 0);
    $('#hijriAr').textContent = `${toArabicDigits(h.day)} ${E.HIJRI_MONTHS_AR[h.month - 1]} ${toArabicDigits(h.year)} هـ`;
    $('#hijriFr').textContent = `${h.day} ${E.HIJRI_MONTHS_FR[h.month - 1]} ${h.year}` + (afterMaghrib ? ' (depuis le Maghrib)' : '');
    const ramadan = h.month === 9;

    // prochaine prière
    if (next) {
      const nm = nameOf(next.k, D, !next.tomorrow);
      $('#nextAr').textContent = nm.ar;
      $('#nextName').textContent = nm.fr + (next.tomorrow ? ' demain' : '');
      $('#nextTime').textContent = fmtTime(next.ms);
      const left = fmtDuration(next.ms - now, true);
      const cd = $('#countdown');
      cd.textContent = 'dans ' + left.main;
      if (left.small) { const sm = document.createElement('small'); sm.textContent = left.small; cd.appendChild(sm); }
      document.title = `${nm.fr} dans ${fmtDuration(next.ms - now, false)} · Amin`;
    }

    // arcade
    for (const k of ORDER) {
      const a = cards[k];
      const nm = nameOf(k, D);
      const isNext = next && next.today && next.k === k;
      const isCurrent = current && current.today && current.k === k && !isNext;
      a.classList.toggle('is-next', !!isNext);
      a.classList.toggle('is-current', !!isCurrent);
      a.classList.toggle('is-past', T[k] <= now && !isCurrent);
      a.querySelector('.arch-ar').textContent = nm.ar;
      a.querySelector('.arch-fr').textContent = nm.fr;
      a.querySelector('.arch-time').textContent = fmtTime(T[k]);
      let note = '';
      if (isNext) note = 'dans ' + fmtDuration(T[k] - now, false);
      else if (isCurrent) note = k === 'sunrise' ? 'matinée' : 'en cours';
      else if (k === 'sunrise') note = 'fin de Fajr';
      if (ramadan && k === 'fajr' && !isNext) note = 'Imsak ' + fmtTime(T.fajr - 10 * 60000);
      if (ramadan && k === 'maghrib' && !isNext) note = 'Iftar';
      a.querySelector('.arch-note').textContent = note;
      const tg = a.querySelector('.arch-toggle');
      const on = S.enabled && S.alerts[k];
      tg.setAttribute('aria-pressed', String(on));
      tg.querySelector('span').textContent = on ? 'Alerte activée' : 'Sans alerte';
      tg.setAttribute('aria-label', (on ? 'Alerte activée pour ' : 'Pas d\'alerte pour ') + nm.fr + (on ? ' : appuie pour la couper' : ' : appuie pour l\'activer'));
      tg.title = on ? 'Couper l\'alerte de ' + nm.fr : 'Activer l\'alerte de ' + nm.fr;
    }

    // nuit
    const nightStart = T.maghrib, nightEnd = D.N.fajr;
    if (isFinite(nightStart) && isFinite(nightEnd)) {
      const len = nightEnd - nightStart;
      $('#nightInfo').innerHTML = `<span>Milieu de la nuit : <b>${fmtTime(nightStart + len / 2)}</b></span><span>Dernier tiers de la nuit : dès <b>${fmtTime(nightStart + len * 2 / 3)}</b></span>` +
        (ramadan ? `<span>Ramadan : Imsak <b>${fmtTime(D.N.fajr - 600000)}</b> demain</span>` : '');
    }

    drawArc(now, sit);
    renderDays();
    if (force) renderStatic();
  }

  function renderStatic() {
    const am = activeMosque();
    $('#placeName').textContent = am ? am.name : S.city.name;
    $('#placeSub').textContent = am ? S.city.name : placeSubtitle(S.city);
    $('#placeBtn').title = am ? 'Changer de mosquée ou de ville' : 'Changer de ville';
    $('#currentPlace').textContent = [S.city.name, placeSubtitle(S.city)].filter(Boolean).join(', ');
    const m = E.METHODS[S.method] || E.METHODS.mwl;
    $('#methodName').textContent = am ? `${am.name} · ${MQ.ruleLabel(S)}` : (S.method === 'custom' ? `Personnalisée · ${S.fajrAngle}° / ${S.ishaMinutes > 0 ? 'Maghrib + ' + S.ishaMinutes + ' min' : S.ishaAngle + '°'}` : m.label);
    const q = E.qibla(S.city.lat, S.city.lon);
    $('#qiblaDeg').textContent = Math.round(q) + '°';
    const dirs = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'];
    $('#qiblaDir').textContent = 'vers le ' + dirs[Math.round(q / 45) % 8] + ', depuis le nord';
    $('#qiblaNeedle').setAttribute('transform', `rotate(${q.toFixed(1)} 60 60)`);
    $('#qiblaDist').textContent = `Depuis ${S.city.name}, La Mecque est à ${Math.round(distanceKm(S.city.lat, S.city.lon, 21.4225, 39.8262)).toLocaleString('fr-FR')} km.`;
    renderDays();
    renderAlertStatus();
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }

  // ---------- Prochains jours ----------
  let daysKey = '';
  function renderDays() {
    const now = Date.now();
    const D = day(now);
    const n = S.daysShown === 30 ? 30 : 7;
    const key = D.key + '|' + n;
    if (key === daysKey) return;
    daysKey = key;
    const tb = $('#daysTable tbody');
    const rows = [];
    const dayFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
    for (let i = 0; i < n; i++) {
      const d = E.addDays(D.today, i);
      const T = E.timesFor(S.city, d, S);
      const utcNoon = Date.UTC(d.y, d.m - 1, d.d, 12);
      const wd = new Date(utcNoon).getUTCDay();
      const h = E.hijri(d, +S.hijriAdjust || 0);
      const label = cap(dayFmt.format(utcNoon).replace(/\./g, ''));
      const cells = ORDER.map(k => {
        const t = fmtTime(T[k]);
        return k === 'dhuhr' && wd === 5 ? `<td><span class="jumua" title="Joumou‘a">${t}</span></td>` : `<td>${t}</td>`;
      }).join('');
      rows.push(`<tr class="${i === 0 ? 'is-today' : ''}${wd === 5 ? ' is-friday' : ''}"><th scope="row"><span class="d-main">${i === 0 ? 'Aujourd’hui' : label}</span><span class="d-sub">${i === 0 ? label + ' · ' : ''}${h.day} ${E.HIJRI_MONTHS_FR[h.month - 1]}</span></th>${cells}</tr>`);
    }
    tb.innerHTML = rows.join('');
    document.querySelectorAll('.days .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.days === n)));
  }
  document.querySelectorAll('.days .seg-btn').forEach(b => b.addEventListener('click', () => { S.daysShown = +b.dataset.days; store.set('mawqut.settings', S); renderDays(); }));

  // ---------- Son ----------
  let audioCtx = null;
  function unlockAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume().then(renderAlertStatus, () => {});
    } catch (e) { /* audio indisponible */ }
    renderAlertStatus();
  }
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true }));
  const SOUNDS = {
    'adhan-imadi': { label: 'Adhan · Ahmed al-Imadi', file: 'audio/adhan-imadi.mp3', adhan: true },
    'adhan-slimane': { label: 'Adhan · Mokhtar Hadj Slimane', file: 'audio/adhan-hadj-slimane.mp3', adhan: true },
    'adhan-hamathani': { label: 'Adhan · Majed al-Hamathani', file: 'audio/adhan-hamathani.mp3', adhan: true },
    'adhan-custom': { label: 'Ton adhan importé', adhan: true, custom: true },
    takbir: { label: 'Takbîr seul · Ahmed al-Imadi (20 s)', file: 'audio/takbir-imadi.mp3' },
    'r-takbir-imadi': { label: 'Allâhou akbar · Ahmed al-Imadi (5 s)', file: 'audio/rappel-takbir-imadi.mp3' },
    'r-salah-imadi': { label: 'Hayya ‘ala s-salâh · Ahmed al-Imadi (10 s)', file: 'audio/rappel-salah-imadi.mp3' },
    'r-takbir-slimane': { label: 'Allâhou akbar · Mokhtar Hadj Slimane (15 s)', file: 'audio/rappel-takbir-hadj-slimane.mp3' },
    none: { label: 'Aucun son' }
  };
  const PRAYER_SOUNDS = ['adhan-imadi', 'adhan-slimane', 'adhan-hamathani', 'adhan-custom', 'takbir', 'none'];
  const REMINDER_SOUNDS = ['r-takbir-imadi', 'r-salah-imadi', 'r-takbir-slimane', 'none'];
  if (tv) PRAYER_SOUNDS.splice(PRAYER_SOUNDS.indexOf('adhan-custom'), 1); // pas d'import de fichier sur la télé
  if (!PRAYER_SOUNDS.includes(S.prayerSound)) S.prayerSound = S.prayerSound === 'none' ? 'none' : 'adhan-imadi';
  if (!REMINDER_SOUNDS.includes(S.reminderSound)) S.reminderSound = S.reminderSound === 'none' ? 'none' : 'r-takbir-imadi';
  // Volume général : la position du curseur (0 à 1) est mise au carré, pour que le bas de la course reste fin et utile.
  const volPos = () => { const v = +S.volume; return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7; };
  const vol = () => (S.muted ? 0 : volPos() * volPos());
  // Repli discret, utilisé seulement si un fichier audio ne peut pas être lu
  function synth(key, kind) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const ctx = audioCtx, t0 = ctx.currentTime + 0.05, V = vol();
    (kind === 'pre' ? [0, 0.7] : [0, 0.75, 1.5]).forEach(dt => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 622;
      g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.linearRampToValueAtTime(V * 0.3, t0 + dt + 0.06); g.gain.exponentialRampToValueAtTime(0.0006, t0 + dt + 0.6);
      o.connect(g).connect(ctx.destination); o.start(t0 + dt); o.stop(t0 + dt + 0.7);
    });
  }
  const adhanAudio = new Audio();
  adhanAudio.preload = 'none';
  let customUrl = '';
  let adhanStopAt = 0, fading = 0;
  const idb = {
    open() {
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('mawqut', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('files');
          r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async run(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', mode); const req = fn(tx.objectStore('files')); tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); }); },
    get(k) { return this.run('readonly', s => s.get(k)); },
    put(k, v) { return this.run('readwrite', s => s.put(v, k)); }
  };
  async function loadAdhan() {
    try {
      const blob = await idb.get('adhan');
      if (blob) { if (customUrl) URL.revokeObjectURL(customUrl); customUrl = URL.createObjectURL(blob); }
    } catch (e) { /* pas de fichier */ }
    syncSoundSelects();
  }
  function playAdhan(key) {
    const def = SOUNDS[key];
    const src = def && (def.custom ? customUrl : def.file);
    if (!src) return false;
    if (window.MawqutQuran && window.MawqutQuran.stop) window.MawqutQuran.stop();
    try {
      clearInterval(fading);
      if (adhanAudio.dataset.src !== src) { adhanAudio.src = src; adhanAudio.dataset.src = src; }
      adhanAudio.volume = vol();
      adhanAudio.currentTime = 0;
      const p = adhanAudio.play();
      if (p) p.catch(() => synth('soft', 'now'));
      adhanStopAt = def.adhan && +S.adhanLength > 0 ? Date.now() + S.adhanLength * 1000 : 0;
      return true;
    } catch (e) { return false; }
  }
  function fadeOutAdhan() {
    adhanStopAt = 0;
    clearInterval(fading);
    fading = setInterval(() => {
      const v = adhanAudio.volume - 0.06;
      if (v <= 0.02) { clearInterval(fading); adhanAudio.pause(); } else adhanAudio.volume = v;
    }, 110);
  }
  function stopSound() { adhanStopAt = 0; clearInterval(fading); try { adhanAudio.pause(); } catch (e) { /* rien */ } }
  function playKey(key, kind) {
    if (!key || key === 'none') return;
    if (playAdhan(key)) return;
    if (playAdhan(kind === 'pre' ? 'r-takbir-imadi' : 'adhan-imadi')) return;
    synth('soft', kind);
  }
  function playFor(kind) { playKey(kind === 'pre' ? S.reminderSound : S.prayerSound, kind); }
  const silentFor = kind => (kind === 'pre' ? S.reminderSound : S.prayerSound) !== 'none';

  // ---------- Notifications ----------
  let swReg = null;
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const notifSupported = 'Notification' in window;
  const notifPerm = () => (notifSupported ? Notification.permission : 'unsupported');
  async function systemNotify(title, body, tag, kind) {
    if (desktop) return;
    if (!notifSupported || Notification.permission !== 'granted') return;
    const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/badge-72.png', requireInteraction: !!S.sticky && kind !== 'pre', silent: silentFor(kind), renotify: true };
    try { if (swReg) { await swReg.showNotification(title, opts); return; } } catch (e) { /* repli */ }
    try { const n = new Notification(title, opts); n.onclick = () => { window.focus(); n.close(); }; } catch (e) { /* refusé */ }
  }

  // ---------- Planification ----------
  let events = [];
  const fired = new Set();
  let snoozes = [];
  function rebuildEvents(now) {
    const { D } = situation(now);
    events = [];
    for (const e of D.timeline) {
      if (!S.alerts[e.k]) continue;
      events.push({ id: `${e.k}@${e.ms}`, kind: 'now', k: e.k, at: e.ms, prayerMs: e.ms, tomorrow: e.tomorrow });
      if (e.k !== 'sunrise') for (const r of S.reminders || []) {
        if (+r > 0) events.push({ id: `pre${r}-${e.k}@${e.ms}`, kind: 'pre', k: e.k, at: e.ms - r * 60000, prayerMs: e.ms, tomorrow: e.tomorrow });
      }
    }
    for (const ev of events) if (ev.at <= now - 1500) fired.add(ev.id);
  }
  let lastDayKey = '';
  function checkAlerts(now) {
    const D = day(now);
    if (D.key !== lastDayKey) { lastDayKey = D.key; rebuildEvents(now); }
    if (!S.enabled || tv) return;
    for (const ev of events) {
      if (fired.has(ev.id) || now < ev.at) continue;
      fired.add(ev.id);
      if (ev.kind === 'pre' && now >= ev.prayerMs) continue;
      if (ev.kind === 'now' && now - ev.at > 20 * 60000) continue;
      fireAlert(ev, now);
    }
    snoozes = snoozes.filter(sn => { if (now >= sn.at) { fireAlert(Object.assign({}, sn.ev, { kind: 'snooze' }), now); return false; } return true; });
  }

  let currentAlert = null, alertTimer = 0;
  function fireAlert(ev, now, isTest) {
    const D = day(now);
    const nm = nameOf(ev.k, D, !ev.tomorrow);
    const time = fmtTime(ev.prayerMs);
    let title, body;
    if (isTest) { title = `Test : ${nm.fr}`; body = `Voilà ce que tu verras et entendras à ${time}.`; }
    else if (ev.kind === 'pre') { title = `${nm.fr} dans ${Math.max(1, Math.round((ev.prayerMs - now) / 60000))} min`; body = `À ${time} à ${S.city.name}. Le temps de faire tes ablutions.`; }
    else if (ev.k === 'sunrise') { title = 'Lever du soleil'; body = `Le temps de Fajr est terminé (${time}).`; }
    else if (ev.kind === 'snooze') { title = `Rappel : ${nm.fr}`; body = `La prière a commencé à ${time}.`; }
    else { title = `C'est l'heure de ${nm.fr}`; body = `${time} à ${S.city.name}.`; }
    const kind = isTest ? 'now' : ev.kind;
    playFor(ev.k === 'sunrise' && !isTest ? 'pre' : kind);
    systemNotify(`${title} · ${nm.ar}`, body, 'mawqut-' + ev.k, kind);
    if (desktop && desktop.notify) desktop.notify({ title, body, arabic: nm.ar, kind, sticky: !!S.sticky, silent: silentFor(kind) });
    showAlertBox({ ar: nm.ar, title, body, ev, kind });
  }
  function showAlertBox(a) {
    currentAlert = a;
    $('#alertAr').textContent = a.ar;
    $('#alertTitle').textContent = a.title;
    $('#alertBody').textContent = a.body;
    $('#snoozeBtn').hidden = a.kind === 'pre' || a.ev.k === 'sunrise';
    $('#dismissBtn').textContent = a.kind === 'pre' || a.ev.k === 'sunrise' ? 'OK' : 'J\'y vais';
    document.querySelectorAll('dialog[open]').forEach(d => d.close()); // l'alerte passe devant un panneau ouvert
    const box = $('#alertBox'); box.hidden = false;
    clearTimeout(alertTimer);
    const ttl = a.kind === 'pre' ? 20000 : (S.sticky ? 0 : 90000);
    if (ttl) alertTimer = setTimeout(hideAlertBox, ttl);
  }
  function hideAlertBox() { $('#alertBox').hidden = true; stopSound(); currentAlert = null; if (tv) { try { tv.stopSound(); } catch (e) { /* rien */ } } }
  $('#dismissBtn').addEventListener('click', hideAlertBox);
  $('#snoozeBtn').addEventListener('click', () => {
    if (currentAlert) snoozes.push({ at: Date.now() + 5 * 60000, ev: currentAlert.ev });
    hideAlertBox();
  });
  if (desktop && desktop.onDismiss) desktop.onDismiss(hideAlertBox);
  if (desktop && desktop.onTest) desktop.onTest(testAlert);

  function testAlert() {
    unlockAudio();
    const now = Date.now();
    const { next } = situation(now);
    if (!next) return;
    if (tv) {
      const nm = nameOf(next.k, day(now), !next.tomorrow);
      const ev = { t: now, kind: 'test', k: next.k, ar: nm.ar, title: `Test : ${nm.fr}`, body: `Voilà ce que tu verras et entendras à ${fmtTime(next.ms)}.`, sound: tvSound('now'), len: tvLen() };
      try { tv.test(JSON.stringify(ev), vol()); } catch (e) { /* rien */ }
      return;
    }
    fireAlert({ k: next.k, kind: 'now', at: now, prayerMs: next.ms, tomorrow: next.tomorrow }, now, true);
  }

  async function enableAlerts() {
    unlockAudio();
    S.enabled = true;
    if (!desktop && notifSupported && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* refusé ou bloqué */ }
    }
    save(); syncSettingsForm();
  }
  function disableAlerts() { S.enabled = false; save(); syncSettingsForm(); }

  function renderAlertStatus() {
    const box = $('#alerts');
    const title = $('#alertsTitle'), detail = $('#alertsDetail');
    const btns = document.querySelectorAll('.js-enable');
    const setBtn = (txt, primary) => btns.forEach(b => { b.textContent = txt; b.classList.toggle('btn-primary', primary); });
    const master = () => { $('#alertsMaster').dataset.state = box.dataset.state; $('#masterTitle').textContent = title.textContent; $('#masterDetail').textContent = detail.textContent; };
    const audioOk = desktop || (audioCtx && audioCtx.state === 'running');
    const count = PRAYERS.filter(k => S.alerts[k]).length;
    const sd = SOUNDS[S.prayerSound] || SOUNDS['adhan-imadi'];
    const soundTxt = S.prayerSound === 'none' ? 'sans son' : sd.adhan ? 'avec l’adhan' : 'avec le takbîr';
    const rem = (S.reminders || []).slice().sort((a, b) => b - a);
    const beforeTxt = rem.length ? `, rappel${rem.length > 1 ? 's' : ''} ${rem.length > 1 ? rem.slice(0, -1).join(', ') + ' et ' + rem[rem.length - 1] : rem[0]} min avant` : '';
    if (!S.enabled) {
      box.dataset.state = 'off';
      title.textContent = 'Alertes désactivées';
      detail.textContent = 'Active-les pour recevoir une notification et un son à chaque prière, même quand tu es dans un autre onglet ou une autre fenêtre.';
      setBtn('Activer les alertes', true);
      master();
      return;
    }
    setBtn('Couper les alertes', false);
    const perm = notifPerm();
    if (tv) {
      const info = tvInfo();
      $('#tvOverlayBtn').hidden = !!info.overlay;
      if (info.overlay) {
        box.dataset.state = 'on';
        title.textContent = `Alertes actives pour ${count} prière${count > 1 ? 's' : ''}`;
        detail.textContent = `Adhan ${soundTxt === 'avec l’adhan' ? '' : '(' + soundTxt + ') '}et bandeau par-dessus la télé${beforeTxt}, même quand Amin est fermée.`;
      } else {
        box.dataset.state = 'partial';
        title.textContent = 'Le son est prêt, le bandeau reste à autoriser';
        detail.textContent = 'Pour que l’alerte s’affiche par-dessus les chaînes et les vidéos, autorise Amin à s’afficher par-dessus les autres applis.';
      }
      master();
      return;
    }
    if (desktop) {
      box.dataset.state = 'on';
      title.textContent = `Alertes actives pour ${count} prière${count > 1 ? 's' : ''}`;
      detail.textContent = `Notification Windows ${soundTxt}${beforeTxt}. Amin reste dans la zone de notification quand tu fermes la fenêtre.`;
    } else if (perm === 'granted' && audioOk) {
      box.dataset.state = 'on';
      title.textContent = `Alertes actives pour ${count} prière${count > 1 ? 's' : ''}`;
      detail.textContent = `Notification ${soundTxt}${beforeTxt}. Laisse cet onglet ouvert, ou installe le site comme application.`;
    } else {
      box.dataset.state = 'partial';
      if (perm !== 'granted') {
        title.textContent = 'Alertes à l\'écran et au son seulement';
        detail.textContent = inFrame
          ? 'Cet aperçu ne peut pas afficher de notifications système. Ouvre la version installée (site ou app PC) pour les recevoir.'
          : 'Ton navigateur bloque les notifications. Autorise-les via l\'icône à gauche de l\'adresse, puis recharge la page.';
      } else {
        title.textContent = 'Clique une fois sur la page pour autoriser le son';
        detail.textContent = 'Le navigateur bloque le son tant que tu n\'as pas interagi avec la page. Les notifications fonctionnent déjà.';
      }
    }
    master();
  }
  document.querySelectorAll('.js-enable').forEach(b => b.addEventListener('click', () => (S.enabled ? disableAlerts() : enableAlerts())));
  document.querySelectorAll('.js-test').forEach(b => b.addEventListener('click', () => { if (dlg.open) dlg.close(); testAlert(); }));

  // ---------- App Google TV ----------
  function tvInfo() { try { return JSON.parse(tv.info()) || {}; } catch (e) { return {}; } }
  function tvSound(kind) {
    const key = kind === 'pre' ? S.reminderSound : S.prayerSound;
    if (key === 'none') return '';
    const def = SOUNDS[key];
    return def && def.file ? def.file : SOUNDS[kind === 'pre' ? 'r-takbir-imadi' : 'adhan-imadi'].file;
  }
  const tvLen = () => { const d = SOUNDS[S.prayerSound]; return d && d.adhan ? (+S.adhanLength || 0) : 0; };
  const TV_DAYS = 370;
  // Le planning des alertes est calculé ici pour un an, puis confié à l'app : elle sonne même quand Amin est fermée.
  function tvSchedule() {
    const now = Date.now();
    const zp = E.zonedParts(now, S.city.tz);
    let d = { y: zp.y, m: zp.m, d: zp.d };
    const out = [];
    const where = S.city.name;
    for (let i = 0; i < TV_DAYS; i++, d = E.addDays(d, 1)) {
      const T = E.timesFor(S.city, d, S);
      const friday = isFinite(T.dhuhr) && E.zonedParts(T.dhuhr, S.city.tz).weekday === 5;
      for (const k of ORDER) {
        const ms = T[k];
        if (!S.alerts[k] || !isFinite(ms) || ms <= now) continue;
        const nm = k === 'dhuhr' && friday ? JUMUA : NAMES[k];
        const time = fmtTime(ms);
        if (k === 'sunrise') {
          out.push({ t: ms, kind: 'info', k, ar: nm.ar, title: 'Lever du soleil', body: `Le temps de Fajr est terminé (${time}).`, sound: tvSound('pre') });
          continue;
        }
        out.push({ t: ms, kind: 'now', k, ar: nm.ar, title: `C'est l'heure de ${nm.fr}`, body: `${time} à ${where}.`, sound: tvSound('now'), len: tvLen() });
        for (const r of S.reminders || []) {
          const at = ms - r * 60000;
          if (+r > 0 && at > now) out.push({ t: at, kind: 'pre', k, ar: nm.ar, title: `${nm.fr} dans ${r} min`, body: `À ${time} à ${where}. Le temps de faire tes ablutions.`, sound: tvSound('pre') });
        }
      }
    }
    out.sort((a, b) => a.t - b.t);
    return { v: 1, enabled: !!S.enabled, volume: vol(), city: where, events: out };
  }
  let tvTimer = 0;
  function pushTv() {
    if (!tv) return;
    clearTimeout(tvTimer);
    tvTimer = setTimeout(() => { try { tv.setSchedule(JSON.stringify(tvSchedule())); } catch (e) { /* rien */ } renderAlertStatus(); }, 250);
  }
  if (tv) {
    document.documentElement.classList.add('tv');
    $('#tvOverlayBtn').addEventListener('click', tvOverlayHelp);
    $('#tvOverlayBtn2').addEventListener('click', tvOverlayHelp);
    window.aminTvResume = () => { lastDayKey = ''; pushTv(); };
    window.aminTvAlert = json => {
      let ev = {}; try { ev = JSON.parse(json); } catch (e) { return; }
      showAlertBox({ ar: ev.ar || '', title: ev.title || '', body: ev.body || '', ev: { k: ev.k || '' }, kind: ev.kind === 'test' ? 'now' : ev.kind });
      $('#snoozeBtn').hidden = true; // le rappel suivant est déjà prévu par l'app
      const b = $('#dismissBtn'); if (b) b.focus();
    };
    window.aminTvAlertDone = () => { if (currentAlert) { $('#alertBox').hidden = true; currentAlert = null; } };
    // Retour de la télécommande : ferme d'abord ce qui est ouvert, puis revient en arrière.
    window.aminTvBack = () => {
      if (!$('#alertBox').hidden) { hideAlertBox(); return 'handled'; }
      const open = [...document.querySelectorAll('dialog[open]')].pop();
      if (open) { open.close(); return 'handled'; }
      if (window.aminTvClose && window.aminTvClose()) return 'handled';
      // le Coran s'ouvre en plein écran sur la télé : Retour quitte le livre et revient à la page précédente
      if (document.body.classList.contains('q-immersive')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return document.body.dataset.view === 'horaires' ? 'exit' : 'back';
    };
    // l'écran reste allumé pendant une récitation
    let playingMedia = 0;
    const awake = () => { try { tv.keepAwake(playingMedia > 0); } catch (e) { /* rien */ } };
    document.addEventListener('play', () => { playingMedia++; awake(); }, true);
    ['pause', 'ended', 'emptied'].forEach(t => document.addEventListener(t, () => { playingMedia = Math.max(0, playingMedia - 1); awake(); }, true));
    const sticky = $('#sticky'); if (sticky && sticky.closest('label')) sticky.closest('label').hidden = true;
    fillTvHelp();
    pushTv();
  }
  function tvOverlayHelp() {
    let opened = false;
    try { opened = tv.openOverlaySettings(); } catch (e) { /* rien */ }
    if (!opened) { fillTvHelp(); openSettings('alertes'); const h = $('#tvHelp'); if (h) { h.open = true; setTimeout(() => h.scrollIntoView({ block: 'start' }), 60); } }
  }
  function fillTvHelp() {
    if (!tv) return;
    const info = tvInfo();
    const ip = info.ip || 'ADRESSE-IP-DE-LA-TÉLÉ';
    $('#tvIp').textContent = ip;
    $('#tvCmd').textContent = `adb connect ${ip}:5555\nadb shell appops set ${info.package || 'fr.amin.tv'} SYSTEM_ALERT_WINDOW allow`;
    $('#tvHelp').hidden = false;
  }

  // ---------- Installation (PWA) ----------
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; window.dispatchEvent(new Event('amin:installable')); });
  window.aminCanInstall = () => !!installEvt;
  window.aminInstall = async () => { if (!installEvt) return false; installEvt.prompt(); let ok = false; try { const c = await installEvt.userChoice; ok = !!c && c.outcome === 'accepted'; } catch (e) { /* rien */ } installEvt = null; $('#installBtn').hidden = true; if (ok) window.dispatchEvent(new Event('amin:installed')); return ok; };
  $('#installBtn').addEventListener('click', async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* rien */ } installEvt = null; $('#installBtn').hidden = true; });
  if (!desktop && !tv && !inFrame && 'serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(r => { swReg = r; }).catch(() => {});
  }

  // ---------- Réglages : formulaire ----------
  const dlg = $('#settings');
  // Onglets des panneaux (réglages, options du Coran)
  function showTab(sheet, name) {
    const tabs = sheet.querySelectorAll('.sheet-tabs [data-tab]');
    if (![...tabs].some(t => t.dataset.tab === name)) name = tabs[0].dataset.tab;
    tabs.forEach(t => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    sheet.querySelectorAll('.sheet-panel').forEach(pn => { pn.hidden = pn.dataset.panel !== name; });
    sheet.dataset.tab = name;
    const body = sheet.querySelector('.sheet-body'); if (body) body.scrollTop = 0;
    sheet.scrollTop = 0;
  }
  document.querySelectorAll('dialog.sheet .sheet-tabs').forEach(bar => {
    const sheet = bar.closest('dialog');
    bar.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) showTab(sheet, t.dataset.tab); });
    bar.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = [...bar.querySelectorAll('[data-tab]')];
      const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      showTab(sheet, n.dataset.tab); n.focus(); e.preventDefault();
    });
  });
  function openSettings(tab) {
    syncSettingsForm();
    showTab(dlg, tab || dlg.dataset.tab || 'ville');
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    if (tab === 'ville' && window.matchMedia('(pointer: fine)').matches) setTimeout(() => $('#citySearch').focus(), 30);
  }
  $('#settingsBtn').addEventListener('click', () => openSettings());
  $('#placeBtn').addEventListener('click', () => openSettings('ville'));
  $('#alertsSettingsBtn').addEventListener('click', () => openSettings('alertes'));
  $('#closeSettings').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  const methodSel = $('#method');
  for (const [key, m] of Object.entries(E.METHODS)) {
    const o = document.createElement('option'); o.value = key; o.textContent = m.label; methodSel.appendChild(o);
  }
  const tzSel = $('#manTz');
  (window.MAWQUT_TZ || []).slice().sort().forEach(tz => { const o = document.createElement('option'); o.value = tz; o.textContent = tz.replace(/_/g, ' '); tzSel.appendChild(o); });

  const adjWrap = $('#adjustFields');
  for (const k of ORDER) {
    const id = 'adj-' + k;
    adjWrap.insertAdjacentHTML('beforeend', `<label class="field" for="${id}"><span>${NAMES[k].fr}</span><input class="input tnum" id="${id}" type="number" step="1" min="-30" max="30"></label>`);
    $('#' + id).addEventListener('change', e => { S.adjust[k] = Math.max(-30, Math.min(30, Math.round(+e.target.value || 0))); e.target.value = S.adjust[k]; save(); });
  }
  const checksWrap = $('#alertChecks');
  for (const k of ORDER) {
    const id = 'al-' + k;
    checksWrap.insertAdjacentHTML('beforeend', `<label class="check" for="${id}"><input type="checkbox" id="${id}"> ${NAMES[k].fr}${k === 'sunrise' ? ' (fin de Fajr)' : ''}</label>`);
    $('#' + id).addEventListener('change', e => { S.alerts[k] = e.target.checked; save(); });
  }

  function syncSettingsForm() {
    methodSel.value = S.method;
    $('#customFields').hidden = S.method !== 'custom';
    $('#fajrAngle').value = S.fajrAngle; $('#ishaAngle').value = S.ishaAngle; $('#ishaMinutes').value = S.ishaMinutes;
    $('#highLat').value = S.highLat;
    for (const k of ORDER) { $('#adj-' + k).value = S.adjust[k] || 0; $('#al-' + k).checked = !!S.alerts[k]; }
    syncSoundSelects();
    document.querySelectorAll('#reminderChips button').forEach(b => b.setAttribute('aria-pressed', String((S.reminders || []).includes(+b.dataset.min))));
    $('#adhanLength').value = String(S.adhanLength || 0);
    $('#adhanName').textContent = S.adhanName ? `Fichier : ${S.adhanName}` : '';
    syncVolume(); $('#sticky').checked = !!S.sticky;
    $('#hijriAdjust').value = String(S.hijriAdjust || 0); $('#hijriAtMaghrib').checked = !!S.hijriAtMaghrib;
    $('#manName').value = S.city.name; $('#manLat').value = S.city.lat; $('#manLon').value = S.city.lon; tzSel.value = S.city.tz;
    renderMosques();
    const am = activeMosque();
    $('#mqCalcNote').hidden = !am;
    if (am) $('#mqCalcNote').textContent = `Ces réglages sont ceux de « ${am.name} », calés sur ses horaires recopiés : les changer modifie cette mosquée. Pour revenir au calcul de ta ville, va dans l’onglet Ville.`;
  }
  methodSel.addEventListener('change', () => { S.method = methodSel.value; save(); syncSettingsForm(); });
  ['fajrAngle', 'ishaAngle', 'ishaMinutes'].forEach(id => $('#' + id).addEventListener('change', e => { S[id] = Math.max(0, +e.target.value || 0); save(); }));
  $('#highLat').addEventListener('change', e => { S.highLat = e.target.value; save(); });
  // rappels cumulables
  const chipsWrap = $('#reminderChips');
  [15, 10, 5, 3, 2, 1].forEach(m => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.min = m; b.textContent = `${m} min`;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const set = new Set(S.reminders || []);
      set.has(m) ? set.delete(m) : set.add(m);
      S.reminders = [...set].sort((a, c) => c - a);
      save(); syncSettingsForm();
    });
    chipsWrap.appendChild(b);
  });
  function syncSoundSelects() {
    const fill = (sel, keys, value) => {
      sel.replaceChildren();
      for (const k of keys) {
        const o = document.createElement('option');
        o.value = k; o.textContent = SOUNDS[k].label + (SOUNDS[k].custom && !customUrl ? ' (aucun fichier)' : '');
        if (SOUNDS[k].custom && !customUrl) o.disabled = true;
        sel.appendChild(o);
      }
      sel.value = value;
    };
    fill($('#prayerSound'), PRAYER_SOUNDS, S.prayerSound);
    fill($('#reminderSound'), REMINDER_SOUNDS, S.reminderSound);
  }
  $('#prayerSound').addEventListener('change', e => { S.prayerSound = e.target.value; save(); });
  $('#reminderSound').addEventListener('change', e => { S.reminderSound = e.target.value; save(); });
  $('#adhanLength').addEventListener('change', e => { S.adhanLength = +e.target.value; save(); });
  document.querySelectorAll('[data-preview]').forEach(b => b.addEventListener('click', () => {
    unlockAudio(); stopSound();
    const kind = b.dataset.preview;
    setTimeout(() => playKey(kind === 'pre' ? S.reminderSound : S.prayerSound, kind === 'pre' ? 'pre' : 'now'), 60);
  }));
  // Volume général : mêmes curseurs dans l'en-tête, les réglages et les options du Coran
  function syncVolume() {
    const pos = volPos(), off = !!S.muted || pos === 0;
    document.querySelectorAll('.js-volume').forEach(r => { r.value = pos; r.style.setProperty('--fill', (pos * 100) + '%'); });
    document.querySelectorAll('.js-volpct').forEach(o => { o.textContent = off ? 'Muet' : Math.round(pos * 100) + ' %'; });
    document.querySelectorAll('.js-mute').forEach(b => { b.setAttribute('aria-pressed', String(off)); b.setAttribute('aria-label', off ? 'Remettre le son' : 'Couper le son'); b.title = off ? 'Remettre le son' : 'Couper le son'; });
    $('#volBtn').classList.toggle('is-muted', off);
  }
  function setVolume(pos, muted) {
    if (pos != null) S.volume = Math.max(0, Math.min(1, +pos));
    if (muted != null) S.muted = !!muted;
    if (S.muted && pos != null && S.volume > 0) S.muted = false; // toucher au curseur remet le son
    if (!S.muted && volPos() === 0 && muted === false) S.volume = 0.5;
    store.set('mawqut.settings', S);
    clearInterval(fading); adhanAudio.volume = vol();
    syncVolume();
    window.dispatchEvent(new CustomEvent('mawqut:volume', { detail: vol() }));
  }
  document.querySelectorAll('.js-volume').forEach(r => r.addEventListener('input', e => setVolume(e.target.value, null)));
  document.querySelectorAll('.js-mute').forEach(b => b.addEventListener('click', () => setVolume(null, !(S.muted || volPos() === 0))));
  const volBtn = $('#volBtn'), volPop = $('#volPop');
  function placeVolPop() {
    const r = volBtn.getBoundingClientRect(), w = volPop.offsetWidth;
    volPop.style.top = Math.round(r.bottom + 8) + 'px';
    volPop.style.left = Math.round(Math.max(10, Math.min(window.innerWidth - w - 10, r.right - w))) + 'px';
  }
  function toggleVolPop(open) {
    const show = open == null ? volPop.hidden : open;
    volPop.hidden = !show;
    volBtn.setAttribute('aria-expanded', String(show));
    if (show) { placeVolPop(); $('#volPopRange').focus({ preventScroll: true }); }
  }
  volBtn.addEventListener('click', e => { e.stopPropagation(); toggleVolPop(); });
  document.addEventListener('click', e => { if (!volPop.hidden && !e.target.closest('#volPop, #volBtn')) toggleVolPop(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !volPop.hidden) { toggleVolPop(false); volBtn.focus(); } });
  window.addEventListener('resize', () => { if (!volPop.hidden) placeVolPop(); });
  window.addEventListener('scroll', () => { if (!volPop.hidden) toggleVolPop(false); }, { passive: true });
  window.addEventListener('hashchange', () => toggleVolPop(false));
  syncVolume();
  $('#sticky').addEventListener('change', e => { S.sticky = e.target.checked; save(); });
  $('#hijriAdjust').addEventListener('change', e => { S.hijriAdjust = +e.target.value; save(); });
  $('#hijriAtMaghrib').addEventListener('change', e => { S.hijriAtMaghrib = e.target.checked; save(); });
  $('#adhanFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { await idb.put('adhan', f); } catch (err) { /* stockage indisponible : on garde le fichier pour la session */ }
    if (customUrl) URL.revokeObjectURL(customUrl);
    customUrl = URL.createObjectURL(f);
    S.adhanName = f.name; S.prayerSound = 'adhan-custom'; save(); syncSettingsForm();
  });

  // ville
  const results = $('#cityResults');
  function setCity(c, statusMsg) {
    if (S.mosque) leaveMosque(true); // une autre ville : on revient au calcul de la ville
    const countryChanged = c.cc !== S.city.cc;
    S.city = pickCity(c);
    if (countryChanged && E.COUNTRY_DEFAULTS[c.cc]) S.method = E.COUNTRY_DEFAULTS[c.cc];
    save(); syncSettingsForm();
    results.replaceChildren(); $('#citySearch').value = '';
    $('#placeStatus').className = 'status-line';
    $('#placeStatus').textContent = statusMsg || `Horaires mis à jour pour ${c.name}.`;
  }
  $('#citySearch').addEventListener('input', e => {
    const list = searchCities(e.target.value);
    results.replaceChildren();
    for (const c of list) {
      const li = document.createElement('li');
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<span></span><span class="r-sub"></span>';
      b.firstChild.textContent = c.name; b.lastChild.textContent = placeSubtitle(c);
      b.addEventListener('click', () => setCity(c));
      li.appendChild(b); results.appendChild(li);
    }
    if (!list.length && norm(e.target.value).length >= 2) {
      const li = document.createElement('li'); li.className = 'hint'; li.style.padding = '8px 10px';
      li.textContent = 'Aucune ville trouvée. Vérifie l\'orthographe ou saisis ses coordonnées plus bas.';
      results.appendChild(li);
    }
  });
  $('#citySearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const b = results.querySelector('button'); if (b) { e.preventDefault(); b.click(); } } });
  $('#locateBtn').addEventListener('click', () => {
    const st = $('#placeStatus');
    if (!navigator.geolocation) { st.className = 'status-line err'; st.textContent = 'La localisation n\'est pas disponible ici. Choisis ta ville dans la liste.'; return; }
    st.className = 'status-line'; st.textContent = 'Recherche de ta position…';
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let best = null, bestD = Infinity;
      for (const c of cityDb()) { const d = (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bestD) { bestD = d; best = c; } }
      const near = best && Math.sqrt(bestD) * 111 < 25;
      let tz = best ? best.tz : 'UTC';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* défaut */ }
      setCity({ name: near ? best.name : 'Ma position', sub: near ? best.sub : '', cc: best ? best.cc : '', lat: +lat.toFixed(4), lon: +lon.toFixed(4), tz },
        near ? `Position trouvée près de ${best.name}.` : 'Position trouvée.');
    }, () => { st.className = 'status-line err'; st.textContent = 'Position refusée ou indisponible. Choisis ta ville dans la liste.'; }, { timeout: 12000, maximumAge: 3600e3 });
  });
  $('#manApply').addEventListener('click', () => {
    const lat = +$('#manLat').value, lon = +$('#manLon').value, tz = tzSel.value, name = $('#manName').value.trim() || 'Ma position';
    const st = $('#placeStatus');
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180) || !validTz(tz)) { st.className = 'status-line err'; st.textContent = 'Coordonnées invalides : latitude entre −90 et 90, longitude entre −180 et 180.'; return; }
    setCity({ name, sub: '', cc: S.city.cc, lat, lon, tz });
  });

  // ---------- Mes mosquées : interface (Réglages › Ville) ----------
  const mqList = $('#mqList'), mqEd = $('#mqEd'), mqDays = $('#mqDays'), mqResult = $('#mqResult');
  let mqEditing = null, mqCity = null, mqRef = null, mqDelAsk = null;
  function mqStatus(m) {
    if (!m.samples || !m.samples.length) return null;
    const v = MQ.verdict(m.city, m.samples, m.params, S.highLat);
    if (v.level === 'manual') return { text: `heures fixées à la main, à ${v.worst} min près`, warn: true };
    if (v.missing.includes('summer')) return { text: 'à compléter avec le 21 juin', warn: true };
    return { text: `calée sur ${v.count} date${v.count > 1 ? 's' : ''}`, warn: false };
  }
  function renderMosques() {
    if (!mqList) return;
    const am = activeMosque();
    const rule = am ? cityParams() : pickParams();
    const ruleName = rule.method === 'custom' ? 'Méthode personnalisée' : ((E.METHODS[rule.method] || {}).label || 'Méthode du pays');
    const rows = [`<div class="mq-row${am ? '' : ' is-on'}"><button class="mq-pick" type="button" data-pick="city" aria-pressed="${!am}"><span class="mq-dot" aria-hidden="true"></span><span class="mq-txt"><b>Calcul pour ${escHtml(S.city.name)}</b><small>${escHtml(ruleName)}</small></span></button></div>`];
    for (const m of S.mosques) {
      if (mqDelAsk === m.id) {
        rows.push(`<div class="mq-row is-ask"><p>Supprimer « ${escHtml(m.name)} » et ses horaires recopiés ?</p><div class="mq-tools"><button class="btn" type="button" data-delok="${m.id}">Supprimer</button><button class="btn" type="button" data-delno>Garder</button></div></div>`);
        continue;
      }
      const st = mqStatus(m), on = !!am && am.id === m.id;
      rows.push(`<div class="mq-row${on ? ' is-on' : ''}"><button class="mq-pick" type="button" data-pick="${m.id}" aria-pressed="${on}"><span class="mq-dot" aria-hidden="true"></span><span class="mq-txt"><b>${escHtml(m.name)}</b><small>${escHtml(m.city.name)} · ${escHtml(MQ.ruleLabel(m.params))}${st ? ` · <span class="${st.warn ? 'mq-warn' : 'mq-ok'}">${escHtml(st.text)}</span>` : ''}</small></span></button>` +
        `<div class="mq-tools"><button class="link-btn" type="button" data-edit="${m.id}">Recopier des dates</button><button class="link-btn" type="button" data-del="${m.id}">Supprimer</button></div></div>`);
    }
    mqList.innerHTML = rows.join('');
    $('#mqAdd').hidden = !mqEd.hidden;
  }
  mqList.addEventListener('click', e => {
    const pickB = e.target.closest('[data-pick]');
    if (pickB) {
      mqResult.hidden = true;
      if (pickB.dataset.pick === 'city') leaveMosque();
      else { const m = S.mosques.find(x => x.id === pickB.dataset.pick); if (m && S.mosque !== m.id) activateMosque(m); }
      renderMosques();
      const again = mqList.querySelector(`[data-pick="${pickB.dataset.pick}"]`); if (again) again.focus();
      return;
    }
    const ed = e.target.closest('[data-edit]');
    if (ed) { openMqEditor(S.mosques.find(x => x.id === ed.dataset.edit)); return; }
    const del = e.target.closest('[data-del]');
    if (del) { mqDelAsk = del.dataset.del; renderMosques(); const ok = mqList.querySelector('[data-delok]'); if (ok) ok.focus(); return; }
    const delok = e.target.closest('[data-delok]');
    if (delok) {
      const id = delok.dataset.delok;
      if (S.mosque === id) leaveMosque(true);
      S.mosques = S.mosques.filter(x => x.id !== id);
      mqDelAsk = null; mqResult.hidden = true;
      save(); syncSettingsForm(); $('#mqAdd').focus();
      return;
    }
    if (e.target.closest('[data-delno]')) { mqDelAsk = null; renderMosques(); }
  });

  // Saisie : une case par prière pour chaque date (21 mars, 21 juin, 21 septembre, et d'autres au besoin)
  function dayOf(fs) {
    const v = fs.dataset.extra ? fs.querySelector('input[type="date"]').value : fs.dataset.date;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function hintDay(fs) {
    const d = dayOf(fs), a = d ? MQ.calc(mqCity, d, mqRef, S.highLat) : null;
    fs.querySelectorAll('[data-a]').forEach(el => { el.textContent = a ? `Amin : ${MQ.hhmm(a[el.dataset.a])}` : ''; });
  }
  function addDay(date, t, extra) {
    const fs = document.createElement('fieldset');
    fs.className = 'mq-day' + (extra ? ' is-extra' : '');
    if (extra) fs.dataset.extra = '1';
    fs.dataset.date = MQ.dayKey(date);
    const head = extra
      ? `<legend class="visually-hidden">Autre date</legend><div class="mq-date"><label class="field"><span>Autre date</span><input class="input" type="date" value="${MQ.dayKey(date)}"></label><button class="link-btn mq-rm" type="button">Retirer</button></div>`
      : `<legend>${escHtml(MQ.dateLabel(date))}</legend>`;
    fs.innerHTML = head + `<div class="mq-times">${MQ.KEYS.map(k => `<label class="mq-t"><span>${NAMES[k].fr}${k === 'sunrise' ? ' <i>(facultatif)</i>' : ''}</span>` +
      `<input class="input tnum" type="time" data-k="${k}" value="${t && isFinite(t[k]) ? MQ.hhmm(t[k]) : ''}"><small data-a="${k}"></small></label>`).join('')}</div>`;
    mqDays.appendChild(fs);
    hintDay(fs);
    return fs;
  }
  function openMqEditor(m) {
    mqEditing = m || null;
    mqCity = m ? m.city : S.city;
    mqRef = m ? m.params : pickParams();
    mqDelAsk = null; mqResult.hidden = true;
    $('#mqEdTitle').textContent = m ? `Recopier des dates pour « ${m.name} »` : 'Ajouter une mosquée';
    $('#mqName').value = m ? m.name : '';
    $('#mqCity').textContent = m ? `Ville : ${m.city.name}.` : `Ville : ${S.city.name}. Si la mosquée est dans une autre ville, choisis d’abord cette ville plus haut.`;
    $('#mqSave').textContent = m ? 'Enregistrer' : 'Enregistrer et utiliser';
    mqDays.replaceChildren();
    const dates = MQ.proposedDates(MQ.todayOf(mqCity).y);
    const samples = (m && m.samples) || [];
    dates.forEach(d => addDay(d, (samples.find(x => MQ.sameDay(x.date, d)) || {}).t, false));
    samples.filter(x => !dates.some(d => MQ.sameDay(d, x.date))).forEach(x => addDay(x.date, x.t, true));
    $('#mqStatus').textContent = '';
    mqEd.hidden = false;
    renderMosques();
    setTimeout(() => { const f = m ? mqDays.querySelector('input[type="time"]') : $('#mqName'); if (f) f.focus(); }, 30);
  }
  mqDays.addEventListener('change', e => { if (e.target.type === 'date') hintDay(e.target.closest('.mq-day')); });
  mqDays.addEventListener('click', e => { const rm = e.target.closest('.mq-rm'); if (rm) { rm.closest('.mq-day').remove(); $('#mqMore').focus(); } });
  $('#mqMore').addEventListener('click', () => { const fs = addDay(MQ.todayOf(mqCity), null, true); fs.querySelector('input[type="date"]').focus(); });
  $('#mqAdd').addEventListener('click', () => openMqEditor(null));
  $('#mqCancel').addEventListener('click', () => { mqEd.hidden = true; mqEditing = null; renderMosques(); $('#mqAdd').focus(); });
  mqEd.addEventListener('submit', e => {
    e.preventDefault();
    const st = $('#mqStatus');
    st.className = 'status-line err';
    const samples = [];
    for (const fs of mqDays.querySelectorAll('.mq-day')) {
      const t = {};
      let any = false;
      fs.querySelectorAll('input[type="time"]').forEach(inp => { t[inp.dataset.k] = MQ.parseHHMM(inp.value); if (isFinite(t[inp.dataset.k])) any = true; });
      if (!any) continue;
      const date = dayOf(fs);
      if (!date) { st.textContent = 'Choisis la date des horaires ajoutés.'; fs.querySelector('input[type="date"]').focus(); return; }
      const label = MQ.dateLabel(date);
      const ok = MQ.validTimes(t);
      if (!ok.ok) {
        st.textContent = ok.missing ? `Il manque ${NAMES[ok.missing].fr} le ${label}.` : `Les horaires du ${label} ne sont pas dans l’ordre de la journée.`;
        (fs.querySelector(`[data-k="${ok.missing}"]`) || fs.querySelector('input[type="time"]')).focus();
        return;
      }
      if (samples.some(x => MQ.sameDay(x.date, date))) { st.textContent = `Le ${label} est recopié deux fois.`; return; }
      samples.push({ date, t });
    }
    if (!samples.length) { st.textContent = 'Recopie les horaires d’au moins une date, les trois si possible.'; mqDays.querySelector('input[type="time"]').focus(); return; }
    const name = ($('#mqName').value || '').trim().slice(0, 40) || (mqEditing ? mqEditing.name : 'Ma mosquée');
    const params = MQ.fit(mqCity, samples, mqEditing && mqEditing.params, S.highLat);
    const prof = mqEditing || { id: 'm' + Date.now().toString(36), name, city: clone(mqCity) };
    prof.name = name; prof.params = params; prof.samples = samples;
    if (!mqEditing) S.mosques.push(prof);
    mqEd.hidden = true; mqEditing = null;
    activateMosque(prof);
    showMqResult(prof);
  });
  function showMqResult(m) {
    const v = MQ.verdict(m.city, m.samples, m.params, S.highLat), txt = MQ.verdictText(v);
    const title = txt.warn ? txt.title : `${m.name} : ${txt.title.charAt(0).toLowerCase()}${txt.title.slice(1)}`;
    mqResult.className = 'mq-result' + (txt.warn ? ' is-warn' : '');
    mqResult.innerHTML = `<b>${escHtml(title)}</b>${txt.body ? `<span>${escHtml(txt.body)}</span>` : ''}<small>${escHtml(MQ.ruleLabel(m.params))}. Les horaires et les alertes suivent maintenant ${escHtml(m.name)}.</small>`;
    mqResult.hidden = false;
    renderMosques();
    mqResult.scrollIntoView({ block: 'nearest' });
  }

  // ---------- App PC ----------
  if (desktop) {
    $('#desktopOptions').hidden = false;
    $('#installBtn').hidden = true;
    if (desktop.getPrefs) desktop.getPrefs().then(p => { $('#autostart').checked = !!p.autostart; $('#overlay').checked = p.overlay !== false; });
    $('#autostart').addEventListener('change', e => desktop.setPref && desktop.setPref('autostart', e.target.checked));
    $('#overlay').addEventListener('change', e => desktop.setPref && desktop.setPref('overlay', e.target.checked));
  }

  // ---------- Navigation entre sections ----------
  const VIEWS = ['horaires', 'coran', 'reciter', 'hadiths', 'apprendre', 'telecharger'];
  function currentView() {
    const h = location.hash.replace('#', '');
    if (VIEWS.includes(h)) return h;
    if (h.startsWith('apprendre-')) return 'apprendre';
    if (h.startsWith('coran-')) return 'coran';
    return 'horaires';
  }
  function route() {
    const v = currentView();
    const changed = document.body.dataset.view !== v;
    document.body.dataset.view = v;
    document.querySelectorAll('main.view').forEach(m => { m.hidden = m.dataset.view !== v; });
    document.querySelectorAll('a[data-view]').forEach(a => { if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (v === 'horaires') { arcKey = ''; render(true); }
    if (changed) window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent('mawqut:view', { detail: v }));
  }
  window.addEventListener('hashchange', route);

  // ---------- Boussole Qibla ----------
  const cmpDlg = $('#compassDlg');
  const cmp = { heading: null, lat: null, lon: null, label: '', on: false, lastBuzz: 0, raf: 0 };
  (function buildTicks() {
    const g = $('#cmpTicks');
    for (let a = 0; a < 360; a += 5) {
      const long = a % 30 === 0;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', 150); l.setAttribute('x2', 150);
      l.setAttribute('y1', 18 + 0); l.setAttribute('y2', long ? 34 : 26);
      l.setAttribute('y1', 20); l.setAttribute('stroke', long ? 'rgba(245,236,220,.75)' : 'rgba(217,183,110,.4)');
      l.setAttribute('stroke-width', long ? 1.6 : 1);
      l.setAttribute('transform', `rotate(${a} 150 150)`);
      g.appendChild(l);
    }
  })();
  const cmpPos = () => (cmp.lat != null ? { lat: cmp.lat, lon: cmp.lon, name: cmp.label } : { lat: S.city.lat, lon: S.city.lon, name: S.city.name });
  function cmpStatus(t) { $('#compassStatus').textContent = t; }
  function renderCompass() {
    cmp.raf = 0;
    const pos = cmpPos();
    const q = E.qibla(pos.lat, pos.lon);
    $('#cmpKaaba').setAttribute('transform', `rotate(${q.toFixed(1)} 150 150)`);
    $('#compassMeta').textContent = `Qibla à ${Math.round(q)}° du nord depuis ${pos.name} · La Mecque à ${Math.round(distanceKm(pos.lat, pos.lon, 21.4225, 39.8262)).toLocaleString('fr-FR')} km`;
    const box = $('#compass');
    if (cmp.heading == null) {
      $('#cmpRose').setAttribute('transform', 'rotate(0 150 150)');
      return;
    }
    $('#cmpRose').setAttribute('transform', `rotate(${(-cmp.heading).toFixed(1)} 150 150)`);
    const diff = ((q - cmp.heading + 540) % 360) - 180;
    const aligned = Math.abs(diff) <= 4;
    box.dataset.state = aligned ? 'aligned' : 'live';
    if (aligned) {
      cmpStatus('Tu es face à la Qibla.');
      if (navigator.vibrate && Date.now() - cmp.lastBuzz > 4000) { cmp.lastBuzz = Date.now(); try { navigator.vibrate(35); } catch (e) { /* rien */ } }
    } else {
      cmpStatus(`Tourne-toi de ${Math.round(Math.abs(diff))}° vers la ${diff > 0 ? 'droite' : 'gauche'}.`);
    }
  }
  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    h = (h + so + 360) % 360;
    if (cmp.heading == null) cmp.heading = h;
    else { const d = ((h - cmp.heading + 540) % 360) - 180; cmp.heading = (cmp.heading + d * 0.25 + 360) % 360; }
    if (!cmp.raf) cmp.raf = requestAnimationFrame(renderCompass);
  }
  async function startCompass() {
    unlockAudio();
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') throw new Error('refus');
      }
    } catch (e) {
      cmpStatus('L’accès aux capteurs a été refusé. Autorise « Mouvement et orientation » pour ce site dans les réglages du navigateur, puis réessaie.');
      return;
    }
    if (!cmp.on) {
      if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrient);
      window.addEventListener('deviceorientation', onOrient);
      cmp.on = true;
    }
    cmpStatus('Recherche du nord…');
    $('#compassStart').hidden = true;
    setTimeout(() => {
      if (cmp.heading == null) {
        const q = Math.round(E.qibla(cmpPos().lat, cmpPos().lon));
        cmpStatus(`Pas de boussole détectée sur cet appareil. Repère le nord, puis tourne-toi de ${q}° vers la droite.`);
        $('#compassStart').hidden = false;
      }
    }, 2500);
  }
  function stopCompass() {
    window.removeEventListener('deviceorientationabsolute', onOrient);
    window.removeEventListener('deviceorientation', onOrient);
    cmp.on = false; cmp.heading = null;
    $('#compass').dataset.state = 'idle';
    $('#compassStart').hidden = false;
  }
  $('#compassBtn').addEventListener('click', () => {
    cmp.lat = null; cmp.lon = null;
    renderCompass();
    const touch = window.matchMedia('(pointer: coarse)').matches;
    cmpStatus(touch ? 'Active la boussole pour orienter ton téléphone vers La Mecque.' : 'Sur ordinateur, il n’y a pas de boussole : utilise l’angle ci-dessous depuis le nord, ou ouvre Amin sur ton téléphone.');
    $('#compassStart').hidden = !touch;
    $('#compassTip').hidden = !touch;
    if (typeof cmpDlg.showModal === 'function') cmpDlg.showModal(); else cmpDlg.setAttribute('open', '');
  });
  $('#compassStart').addEventListener('click', startCompass);
  $('#compassClose').addEventListener('click', () => cmpDlg.close());
  cmpDlg.addEventListener('close', stopCompass);
  $('#compassLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { cmpStatus('La localisation n’est pas disponible ici.'); return; }
    cmpStatus('Recherche de ta position…');
    navigator.geolocation.getCurrentPosition(p => {
      cmp.lat = p.coords.latitude; cmp.lon = p.coords.longitude; cmp.label = 'ta position';
      renderCompass();
      if (cmp.heading == null) cmpStatus('Position trouvée. Active la boussole pour t’orienter.');
    }, () => cmpStatus('Position refusée ou indisponible : la Qibla est calculée depuis ta ville.'), { enableHighAccuracy: true, timeout: 12000 });
  });

  // Petit pont pour les autres sections
  window.Mawqut = { unlockAudio, store, stopAlertSound: stopSound, showTab, openSettings, gain: vol, setVolume, moment };

  // ---------- Horloge ----------
  let trayLabel = '';
  function updateDesktopTray(now) {
    if (!desktop || !desktop.updateTray) return;
    const { D, next } = situation(now);
    if (!next) return;
    const nm = nameOf(next.k, D, !next.tomorrow);
    const label = `${nm.fr}${next.tomorrow ? ' demain' : ''} à ${fmtTime(next.ms)}`;
    if (label === trayLabel) return;
    trayLabel = label;
    desktop.updateTray({ label, tooltip: `Amin · ${label} (${S.city.name})` });
  }
  function tick() {
    const now = Date.now();
    if (adhanStopAt && now >= adhanStopAt) fadeOutAdhan();
    checkAlerts(now);
    updateDesktopTray(now);
    render(false);
  }
  buildArcade();
  route();
  seedStars();
  window.addEventListener('resize', () => { clearTimeout(seedStars.t); seedStars.t = setTimeout(() => { seedStars(); arcKey = ''; render(true); }, 150); });
  document.addEventListener('visibilitychange', () => render(true));
  rebuildEvents(Date.now());
  lastDayKey = day(Date.now()).key;
  render(true);
  requestAnimationFrame(loopStars);
  loadAdhan().then(renderAlertStatus);
  // Les minuteries d'un worker ne sont pas ralenties quand l'onglet est en arrière-plan.
  try {
    const w = new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'], { type: 'text/javascript' })));
    w.onmessage = tick;
  } catch (e) { setInterval(tick, 1000); }
})();
