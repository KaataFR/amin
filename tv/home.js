/*
 * Amin TV — page Horaires, avec l'identité du site : le ciel du moment (étoiles, treillis), le dôme où
 * court le soleil de Fajr à Icha, la frise de zellige et l'arcade des six moments (OK = alerte oui/non).
 * Plus bas : état des alertes, écran calme, hadith du jour, sept jours.
 */
(() => {
  'use strict';
  const T = window.TV;
  const { $, esc } = T;
  const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const BELL_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 9.5-4.9M18 10.5v6l1.5 2H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M14.5 4.2a6 6 0 1 0 5.3 8.6 5 5 0 0 1-5.3-8.6Z"/><path d="M3 19.5c2.2-1.6 4.4-1.6 6.6 0s4.4 1.6 6.6 0 3.7-1.2 4.8-.6"/></g></svg>';
  const STAR_PATH = 'M-7 -7h14v14h-14Z M0 -9.9 9.9 0 0 9.9 -9.9 0Z';
  const svgNS = 'http://www.w3.org/2000/svg';

  let el = null, tick = 0, twinkle = 0;

  function render(root) {
    el = root;
    root.classList.add('home');
    root.innerHTML = `
      <div class="h-sky">
        <canvas class="stars" id="hStars" aria-hidden="true"></canvas>
        <div class="lattice" aria-hidden="true"></div>
        <header class="h-head">
          <p class="h-date"><span id="hDate"></span><span class="h-hijri" id="hHijri"></span></p>
          <button type="button" class="chip" id="hCity">${PIN}<span id="hCityName"></span></button>
        </header>
        <section class="dome" aria-live="polite">
          <svg class="dome-svg" id="hArc" viewBox="0 0 1000 310" aria-hidden="true">
            <defs>
              <radialGradient id="sunGlow"><stop offset="0" stop-color="#FFE7AE" stop-opacity=".95"/><stop offset=".35" stop-color="#F0C774" stop-opacity=".45"/><stop offset="1" stop-color="#F0C774" stop-opacity="0"/></radialGradient>
              <linearGradient id="horizon" x1="0" x2="1"><stop offset="0" stop-color="#D9B76E" stop-opacity="0"/><stop offset=".15" stop-color="#D9B76E" stop-opacity=".7"/><stop offset=".85" stop-color="#D9B76E" stop-opacity=".7"/><stop offset="1" stop-color="#D9B76E" stop-opacity="0"/></linearGradient>
              <mask id="crescent"><rect width="1000" height="310" fill="#fff"/><circle cx="836" cy="74" r="20" fill="#000"/></mask>
            </defs>
            <line x1="0" y1="262" x2="1000" y2="262" stroke="url(#horizon)" stroke-width="1.4"/>
            <g id="arcPaths"></g><g id="arcMarkers"></g><g id="arcLabels"></g><g id="arcSun"></g>
          </svg>
          <div class="next">
            <p class="next-label" id="hKicker">Prochaine prière</p>
            <p class="next-ar" lang="ar" id="hAr"></p>
            <p class="next-name" id="hFr"></p>
            <p class="next-cd tnum" id="hCd"></p>
          </div>
        </section>
      </div>
      <div class="frieze" aria-hidden="true"></div>
      <div class="court">
        <div class="arcade" id="hPrayers" role="group" aria-label="Horaires du jour"></div>
        <p class="keys"><b>OK</b> sur une prière : activer ou couper son alerte</p>
        <section class="alert-bar" id="hAlert">
          <span class="dot" aria-hidden="true"></span>
          <div class="alert-txt"><b id="hAlertTitle"></b><span id="hAlertDetail"></span></div>
        </section>
        <div class="actions" role="group" aria-label="Alertes et écran calme">
          <button type="button" class="tb tb-gold" id="hCalme">${MOON}<span>Écran calme</span></button>
          <button type="button" class="tb" id="hTest">${T.ICON_PLAY}<span>Tester l’alerte</span></button>
          <button type="button" class="tb" id="hRem"></button>
          <button type="button" class="tb" id="hSound"></button>
          <button type="button" class="tb" id="hOverlay" hidden>Autoriser le bandeau</button>
        </div>
        <section class="card hadith-day" id="hHadith" tabindex="0" hidden></section>
        <section class="days">
          <h2 class="sec-h">Les sept prochains jours</h2>
          <div class="days-grid" id="hDays"></div>
        </section>
      </div>`;
    $('#hCity').addEventListener('click', () => {
      if (window.TVMosques && T.S.mosques && T.S.mosques.length) window.TVMosques.chooser();
      else if (window.TVSettings) window.TVSettings.cityPicker();
    });
    $('#hCalme').addEventListener('click', () => window.TVCalme && window.TVCalme.open());
    $('#hTest').addEventListener('click', T.testAlert);
    $('#hRem').addEventListener('click', () => window.TVSettings && window.TVSettings.reminderPicker());
    $('#hSound').addEventListener('click', () => window.TVSettings && window.TVSettings.soundPicker('now'));
    $('#hOverlay').addEventListener('click', () => window.TVSettings && window.TVSettings.overlay());
    $('#hPrayers').addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const k = b.dataset.k;
      T.S.alerts[k] = !T.S.alerts[k];
      if (T.S.alerts[k] && !T.S.enabled) T.S.enabled = true;
      T.save();
      const nb = $(`#hPrayers [data-k="${k}"]`); if (nb) nb.focus({ preventScroll: true });
      T.toast(T.S.alerts[k] ? `Alerte activée pour ${T.NAMES[k].fr}` : `Plus d’alerte pour ${T.NAMES[k].fr}`);
    });
    $('#hHadith').addEventListener('click', () => window.TVHadith && window.TVHadith.openDaily());
    full();
  }

  // ---------- Dôme : la course du soleil, comme sur le site ----------
  const svgEl = (tag, attrs, parent) => { const n = document.createElementNS(svgNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const HZ = 262; // ligne d'horizon
  function arcPoint(ms, Tm) {
    const rise = Tm.sunrise, set = Tm.maghrib;
    if (ms <= rise) { const u = clamp01((ms - Tm.fajr) / (rise - Tm.fajr)); return [14 + 136 * u, HZ + 22 * Math.cos(u * Math.PI / 2)]; }
    if (ms <= set) { const u = (ms - rise) / (set - rise); return [150 + 700 * u, HZ - 216 * Math.sin(Math.PI * u)]; }
    const u = clamp01((ms - set) / (Tm.isha - set)); return [850 + 136 * u, HZ + 22 * Math.sin(u * Math.PI / 2)];
  }
  function pathBetween(a, b, Tm) {
    if (!(b > a)) return '';
    const steps = Math.max(2, Math.ceil((b - a) / 120000));
    let d = '';
    for (let i = 0; i <= steps; i++) { const p = arcPoint(a + (b - a) * i / steps, Tm); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
    return d;
  }
  const LABEL_POS = { fajr: ['start', 4, 22], sunrise: ['start', 16, 22], dhuhr: ['middle', 0, -20], asr: ['start', 20, -6], maghrib: ['end', -16, 22], isha: ['end', -4, 22] };
  let arcKey = '';
  function drawArc(now, sit) {
    const Tm = sit.D.T;
    const nextK = sit.next && !sit.next.tomorrow ? sit.next.k : null;
    const key = sit.D.key + (nextK || '') + Math.floor(now / 60000);
    if (key === arcKey) return;
    arcKey = key;
    const paths = $('#arcPaths'), markers = $('#arcMarkers'), labels = $('#arcLabels'), sun = $('#arcSun');
    [paths, markers, labels, sun].forEach(g => g.replaceChildren());
    if (!T.ORDER.every(k => isFinite(Tm[k]))) return;
    const dash = (a, b, d, o) => svgEl('path', { d: pathBetween(a, b, Tm), fill: 'none', stroke: '#D9B76E', 'stroke-opacity': o, 'stroke-width': '2', 'stroke-dasharray': d, 'stroke-linecap': 'round' }, paths);
    dash(Tm.fajr, Tm.sunrise, '3 8', '.45');
    dash(Tm.sunrise, Tm.maghrib, '1.5 9', '.4');
    dash(Tm.maghrib, Tm.isha, '3 8', '.45');
    if (now > Tm.fajr) svgEl('path', { d: pathBetween(Tm.fajr, Math.min(now, Tm.isha), Tm), fill: 'none', stroke: '#E9CC8C', 'stroke-width': '2.6', 'stroke-linecap': 'round' }, paths);
    for (const k of T.ORDER) {
      const [x, y] = arcPoint(Tm[k], Tm);
      const isNext = nextK === k;
      const past = Tm[k] <= now;
      const g = svgEl('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${isNext ? 1.2 : 0.82})` }, markers);
      if (isNext) svgEl('circle', { r: '12', class: 'pulse' }, g);
      svgEl('path', { d: STAR_PATH, class: 'marker' + (isNext ? ' is-next' : past ? ' is-past' : '') }, g);
      const [anchor, dx, dy] = LABEL_POS[k];
      const t = svgEl('text', { x: (x + dx).toFixed(1), y: (y + dy).toFixed(1), 'text-anchor': anchor, class: 'arc-label' + (isNext ? ' is-next' : '') }, labels);
      t.textContent = T.nameOf(k, sit.D).fr + ' ';
      svgEl('tspan', { class: 't' }, t).textContent = T.fmtTime(Tm[k]);
    }
    if (now >= Tm.fajr && now <= Tm.isha) {
      const [x, y] = arcPoint(now, Tm);
      svgEl('circle', { cx: x, cy: y, r: 50, fill: 'url(#sunGlow)' }, sun);
      svgEl('circle', { cx: x, cy: y, r: 12, fill: y > HZ ? '#E9A86A' : '#FFE3A0' }, sun);
    } else {
      svgEl('circle', { cx: 822, cy: 80, r: 26, fill: '#F3E6C8', mask: 'url(#crescent)', opacity: '.92' }, sun);
    }
  }

  // ---------- Étoiles (plus nombreuses la nuit) ----------
  const STAR_OPACITY = { night: 1, dawn: 0.45, dusk: 0.6, morning: 0, noon: 0, afternoon: 0.08 };
  let stars = [], starsW = 0;
  function seedStars() {
    const c = $('#hStars');
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    stars = Array.from({ length: Math.round(r.width * r.height / 2600) }, () => ({ x: rnd() * r.width, y: rnd() * r.height * 0.86, s: rnd() * 1.1 + 0.3, p: rnd() * 6.28, a: rnd() * 0.6 + 0.35 }));
    starsW = r.width;
  }
  function drawStars(t) {
    const c = $('#hStars');
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    if (Math.abs(r.width - starsW) > 2) seedStars();
    const g = c.getContext('2d');
    g.clearRect(0, 0, r.width, r.height);
    g.fillStyle = '#F5ECDC';
    for (const st of stars) {
      g.globalAlpha = st.a * (0.72 + 0.28 * Math.sin(t / 1500 + st.p)) * (1 - st.y / (r.height * 0.98));
      g.beginPath(); g.arc(st.x, st.y, st.s, 0, 6.283); g.fill();
    }
  }
  function startTwinkle() {
    clearInterval(twinkle);
    const op = STAR_OPACITY[T.period(Date.now())] || 0;
    const c = $('#hStars'); if (c) c.style.opacity = op;
    if (!op) return;
    drawStars(performance.now());
    twinkle = setInterval(() => { if (!document.hidden && !T.topLayer()) drawStars(performance.now()); }, 140);
  }

  // ---------- Arcade ----------
  function archPath(w, h) {
    const top = Math.min(40, w * 0.3);
    return `M1 ${h - 1}V${top}C1 ${top * 0.42} ${w * 0.3} ${top * 0.1} ${w / 2} 1C${w * 0.7} ${top * 0.1} ${w - 1} ${top * 0.42} ${w - 1} ${top}V${h - 1}Z`;
  }
  function shapeArches() {
    document.querySelectorAll('#hPrayers .arch').forEach(a => {
      const w = a.offsetWidth, h = a.offsetHeight;
      if (!w) return;
      const svg = a.querySelector('.arch-shape');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.querySelector('path').setAttribute('d', archPath(w, h));
    });
  }

  function full() {
    if (!el) return;
    const now = Date.now();
    const sit = T.situation(now);
    const { D, next } = sit;
    const nextK = next && !next.tomorrow ? next.k : null;
    $('#hDate').textContent = T.cap(T.fmt('d', { weekday: 'long', day: 'numeric', month: 'long' }).format(now));
    const h = T.hijriOf(now);
    $('#hHijri').textContent = `${h.day} ${T.E.HIJRI_MONTHS_FR[h.month - 1]} ${h.year}`;
    $('#hCityName').textContent = window.TVMosques ? window.TVMosques.place() : T.S.city.name;
    const a = document.activeElement;
    const keepK = a && a.closest && a.closest('#hPrayers') ? a.dataset.k : null;
    $('#hPrayers').innerHTML = T.ORDER.map(k => {
      const ms = D.T[k];
      const nm = T.nameOf(k, D, true);
      const on = !!T.S.alerts[k] && T.S.enabled;
      const isNext = nextK === k;
      const past = isFinite(ms) && ms <= now && !isNext;
      return `<button type="button" class="arch${isNext ? ' is-next' : ''}${past ? ' is-past' : ''}" data-k="${k}" aria-pressed="${on}">
          <svg class="arch-shape" aria-hidden="true"><path/></svg>
          <span class="a-ar" lang="ar">${esc(nm.ar)}</span>
          <span class="a-fr">${esc(nm.fr)}</span>
          <span class="a-t tnum">${T.fmtTime(ms)}</span>
          <span class="a-al">${on ? BELL + 'Alerte' : BELL_OFF + 'Coupée'}</span>
        </button>`;
    }).join('');
    shapeArches();
    if (keepK) { const n = $(`#hPrayers [data-k="${keepK}"]`); if (n) n.focus({ preventScroll: true }); }
    const rem = (T.S.reminders || []).filter(r => +r > 0).sort((x, y) => y - x);
    $('#hRem').innerHTML = `<span class="tb-k">Rappel</span><span>${rem.length ? rem.map(r => r + ' min').join(', ') + ' avant' : 'aucun'}</span>`;
    const sd = T.SOUNDS[T.S.prayerSound] || T.SOUNDS['adhan-imadi'];
    $('#hSound').innerHTML = `<span class="tb-k">Son</span><span>${esc(sd.label.replace('Adhan · ', 'Adhan '))}</span>`;
    status();
    days(now);
    hadith();
    arcKey = '';
    tickHero();
    startTwinkle();
  }

  function status() {
    const inf = T.info();
    const count = T.PRAYERS.filter(k => T.S.alerts[k]).length;
    const box = $('#hAlert');
    let state = 'on', title, detail;
    if (!T.S.enabled || !count) {
      state = 'off'; title = 'Alertes coupées';
      detail = 'Aucune prière n’est annoncée. Active-les dans Réglages.';
    } else if (!inf.overlay) {
      state = 'partial'; title = 'L’adhan sonnera, mais le bandeau reste à autoriser';
      detail = 'Sans cette autorisation, l’alerte ne s’affiche pas par-dessus les chaînes.';
    } else {
      title = `Alertes actives pour ${count} prière${count > 1 ? 's' : ''}`;
      detail = 'L’adhan et le bandeau passent par-dessus la télé, même quand Amin est fermée.';
    }
    box.dataset.state = state;
    $('#hAlertTitle').textContent = title;
    $('#hAlertDetail').textContent = detail;
    $('#hOverlay').hidden = !!inf.overlay;
  }

  function days(now) {
    const zp = T.E.zonedParts(now, T.S.city.tz);
    let d = { y: zp.y, m: zp.m, d: zp.d };
    let rows = `<div class="dg-row dg-head"><span></span>${T.ORDER.map(k => `<span>${T.NAMES[k].fr}</span>`).join('')}</div>`;
    for (let i = 0; i < 7; i++, d = T.E.addDays(d, 1)) {
      const Tm = T.E.timesFor(T.S.city, d, T.S);
      const ref = isFinite(Tm.dhuhr) ? Tm.dhuhr : now + i * 864e5;
      const label = i === 0 ? 'Aujourd’hui' : i === 1 ? 'Demain' : T.cap(T.fmt('dd', { weekday: 'long', day: 'numeric' }).format(ref));
      const fri = T.E.zonedParts(ref, T.S.city.tz).weekday === 5;
      rows += `<div class="dg-row${i === 0 ? ' is-today' : ''}${fri ? ' is-fri' : ''}" tabindex="0"><span class="dg-d">${esc(label)}</span>${T.ORDER.map(k => `<span class="tnum">${T.fmtTime(Tm[k])}</span>`).join('')}</div>`;
    }
    $('#hDays').innerHTML = rows;
  }

  function hadith() {
    const box = $('#hHadith');
    const H = window.TVHadith;
    if (!H) { box.hidden = true; return; }
    const e = H.today();
    if (!e) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<p class="sec-k">Hadith du jour · ${esc(H.themeName(e))}</p><p class="hd-fr">${esc(H.snippet(e))}</p><p class="hd-more">OK : lire le hadith, le texte arabe et son explication</p>`;
  }

  function tickHero() {
    if (!el || el.hidden) return;
    const now = Date.now();
    const sit = T.situation(now);
    const { D, next } = sit;
    if (next) {
      const nm = T.nameOf(next.k, D, !next.tomorrow);
      $('#hAr').textContent = nm.ar;
      $('#hFr').innerHTML = `${esc(nm.fr)} à <b class="tnum">${T.fmtTime(next.ms)}</b>${next.tomorrow ? ' demain' : ''}`;
      $('#hCd').textContent = 'dans ' + T.duration(next.ms - now);
    }
    drawArc(now, sit);
    // la prochaine prière a changé : on rafraîchit l'arcade
    const n = $('#hPrayers .is-next');
    const nextK = next && !next.tomorrow ? next.k : null;
    if ((n ? n.dataset.k : null) !== nextK) full();
  }

  T.page('home', {
    render,
    show() { full(); clearInterval(tick); tick = setInterval(tickHero, 15000); },
    hide() { clearInterval(tick); clearInterval(twinkle); },
    firstFocus: () => $('#hPrayers .is-next') || $('#hPrayers .arch')
  });
  T.on('settings', full);
  T.on('resume', full);
  window.addEventListener('resize', () => { if (el && !el.hidden) { shapeArches(); seedStars(); } });
  window.TVHome = { refresh: full };
})();
