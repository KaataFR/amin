/*
 * Amin TV — écran calme : l'heure et les prochaines prières sur une vidéo apaisante (nuit étoilée, dunes, mer).
 * S'ouvre depuis le menu ou la page Horaires, tout seul après quelques minutes sans toucher la télécommande,
 * et sert aussi d'écran de veille de la télé (tv.html?dream=1). N'importe quelle touche le referme.
 */
(() => {
  'use strict';
  const T = window.TV;
  const { esc } = T;
  const params = new URLSearchParams(location.search);
  const DREAM = params.get('dream') === '1';
  const OPEN_AT_START = params.get('open') === 'calme';

  const BGS = {
    auto: { label: 'Selon l’heure', sub: 'La mer le matin, les dunes l’après-midi, la nuit étoilée le soir' },
    nuit: { label: 'Nuit étoilée', sub: 'La Voie lactée au-dessus du désert' },
    dunes: { label: 'Dunes au soleil', sub: 'Les ombres glissent sur le sable' },
    mer: { label: 'Mer au lever du jour', sub: 'Des vagues douces, le soleil bas' }
  };
  const IDLE = [0, 5, 10, 20, 30];
  const prefs = Object.assign({ idle: 10, bg: 'auto' }, T.store.get('amin.tv.calme', {}));
  const savePrefs = () => T.store.set('amin.tv.calme', prefs);

  let el = null, video = null, open = false, tick = 0, drift = 0, idleT = 0, hintT = 0, shownBg = '';

  function bgFor(now) {
    if (prefs.bg !== 'auto' && BGS[prefs.bg]) return prefs.bg;
    const Tm = T.situation(now).D.T;
    if (now >= Tm.fajr && now < Tm.dhuhr) return 'mer';
    if (now >= Tm.dhuhr && now < Tm.maghrib) return 'dunes';
    return 'nuit';
  }

  function build() {
    el = document.createElement('div');
    el.className = 'layer calme';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Écran calme');
    el.innerHTML = `
      <div class="c-bg" aria-hidden="true"><img class="c-poster" alt=""><video class="c-vid" muted loop playsinline preload="auto"></video></div>
      <div class="c-scrim" aria-hidden="true"></div>
      <div class="c-wrap">
        <header class="c-top">
          <p class="c-date"><span class="c-d"></span><span class="c-hijri"></span></p>
          <p class="c-city"></p>
        </header>
        <div class="c-main">
          <p class="c-clock tnum"></p>
          <p class="c-now"></p>
          <div class="c-next">
            <p class="c-k">Prochaine prière</p>
            <div class="c-line"><span class="c-ar" lang="ar"></span><span class="c-fr"></span><span class="c-cd tnum"></span></div>
          </div>
        </div>
        <div class="c-after">
          <p class="c-k">Ensuite</p>
          <ol class="c-list"></ol>
        </div>
      </div>
      <p class="c-hint">${DREAM ? '' : 'Appuie sur une touche pour revenir'}</p>`;
    video = el.querySelector('.c-vid');
    video.addEventListener('error', () => el.classList.add('no-video'));
    video.addEventListener('playing', () => el.classList.add('is-playing'));
    el.querySelector('.c-poster').addEventListener('error', () => el.classList.add('no-video'));
    document.body.appendChild(el);
    el.hidden = true;
  }

  function setBg(now) {
    const bg = bgFor(now);
    if (bg === shownBg) return;
    shownBg = bg;
    el.dataset.bg = bg;
    el.classList.remove('is-playing', 'no-video');
    el.querySelector('.c-poster').src = `video/${bg}.jpg`;
    video.src = `video/${bg}.mp4`;
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* l'image fixe reste affichée */ });
  }

  // Les prochaines prières : la suivante en grand, puis les quatre d'après (aujourd'hui puis demain)
  function upcoming(now) {
    const D = T.situation(now).D;
    const list = [];
    for (const k of T.PRAYERS) if (D.T[k] > now) list.push({ k, ms: D.T[k], tomorrow: false });
    for (const k of T.PRAYERS) if (isFinite(D.N[k])) list.push({ k, ms: D.N[k], tomorrow: true });
    const fri = (D.weekday + 1) % 7 === 5;
    return list.slice(0, 5).map(e => Object.assign(e, { nm: e.k === 'dhuhr' && (e.tomorrow ? fri : D.weekday === 5) ? T.JUMUA : T.NAMES[e.k] }));
  }

  function draw() {
    if (!el || !open) return;
    const now = Date.now();
    setBg(now);
    el.querySelector('.c-clock').textContent = T.fmtTime(now);
    el.querySelector('.c-d').textContent = T.cap(T.fmt('d', { weekday: 'long', day: 'numeric', month: 'long' }).format(now));
    const h = T.hijriOf(now);
    el.querySelector('.c-hijri').textContent = `${h.day} ${T.E.HIJRI_MONTHS_FR[h.month - 1]} ${h.year}`;
    el.querySelector('.c-city').textContent = window.TVMosques ? window.TVMosques.place() : T.S.city.name;
    const up = upcoming(now);
    const n = up[0];
    if (n) {
      el.querySelector('.c-ar').textContent = n.nm.ar;
      el.querySelector('.c-fr').innerHTML = `${esc(n.nm.fr)} à <b class="tnum">${T.fmtTime(n.ms)}</b>${n.tomorrow ? ' demain' : ''}`;
      el.querySelector('.c-cd').textContent = 'dans ' + T.duration(n.ms - now);
    }
    el.querySelector('.c-list').innerHTML = up.slice(1).map(e => `<li${e.tomorrow ? ' class="is-tomorrow"' : ''}>
        <span class="c-l-n"><span>${esc(e.nm.fr)}</span><span class="c-l-ar" lang="ar">${esc(e.nm.ar)}</span></span>
        <b class="tnum">${T.fmtTime(e.ms)}</b>${e.tomorrow ? '<small>demain</small>' : '<small>&nbsp;</small>'}
      </li>`).join('');
    // L'heure d'une prière vient d'entrer (moins de 30 min)
    const cur = T.situation(now).current;
    const fresh = cur && cur.k !== 'sunrise' && now - cur.ms < 30 * 60000;
    const nowEl = el.querySelector('.c-now');
    nowEl.textContent = fresh ? `L’heure de ${T.nameOf(cur.k, T.situation(now).D, !cur.tomorrow).fr} est entrée à ${T.fmtTime(cur.ms)}` : '';
    nowEl.hidden = !fresh;
  }

  // Un léger déplacement du texte, très lent, pour que l'écran vive sans distraire
  function moveText() {
    const w = el.querySelector('.c-wrap');
    const x = Math.round((Math.random() * 2 - 1) * 14), y = Math.round((Math.random() * 2 - 1) * 10);
    w.style.transform = `translate(${x}px, ${y}px)`;
  }

  function openCalm() {
    if (open) return;
    if (!el) build();
    open = true;
    shownBg = '';
    draw();
    T.openLayer(el, { onKey: () => { if (!DREAM) T.closeLayer(); return true; }, onClose: closed, focus: () => el });
    el.tabIndex = -1;
    T.awake(true, 'calme');
    clearInterval(tick); tick = setInterval(draw, 5000);
    clearInterval(drift); drift = setInterval(moveText, 60000);
    el.classList.add('show-hint');
    clearTimeout(hintT); hintT = setTimeout(() => el.classList.remove('show-hint'), 6000);
  }
  function closed() {
    open = false;
    clearInterval(tick); clearInterval(drift);
    try { video.pause(); } catch (e) { /* rien */ }
    T.awake(false, 'calme');
    resetIdle();
  }

  // ---------- Ouverture automatique ----------
  function resetIdle() {
    clearTimeout(idleT);
    if (DREAM || !(+prefs.idle > 0)) return;
    idleT = setTimeout(autoOpen, prefs.idle * 60000);
  }
  function autoOpen() {
    // pas pendant une lecture, une fenêtre ouverte ou une récitation
    if (open || T.topLayer() || T.busy() || document.hidden) { resetIdle(); return; }
    openCalm();
  }
  window.addEventListener('keydown', resetIdle, true);
  T.on('resume', resetIdle);
  T.on('rail-act', a => { if (a === 'calme') openCalm(); });
  // Retour (télécommande) : la coque ferme la fenêtre du dessus ; on relance le compte à rebours
  const back = window.aminTvBack;
  window.aminTvBack = () => { resetIdle(); return back(); };
  window.aminTvOpen = what => { if (what === 'calme') openCalm(); };

  // ---------- Réglages ----------
  function idleLabel(v) { return v ? `Après ${v} min sans toucher la télécommande` : 'Jamais tout seul'; }
  function idlePicker(after) {
    T.choose('Écran calme automatique', IDLE.map(v => ({ value: v, label: v ? `Après ${v} minutes` : 'Jamais tout seul', sub: v ? 'Quand Amin est ouverte et qu’on ne touche pas la télécommande' : 'Seulement quand on le choisit' })),
      +prefs.idle || 0, v => { prefs.idle = v; savePrefs(); resetIdle(); if (after) after(); });
  }
  function bgPicker(after) {
    T.choose('Fond de l’écran calme', Object.keys(BGS).map(k => ({ value: k, label: BGS[k].label, sub: BGS[k].sub })),
      prefs.bg, v => { prefs.bg = v; savePrefs(); shownBg = ''; if (open) draw(); if (after) after(); });
  }

  window.TVCalme = {
    open: openCalm, idlePicker, bgPicker,
    get prefs() { return prefs; },
    idleLabel: () => idleLabel(+prefs.idle || 0),
    bgLabel: () => (BGS[prefs.bg] || BGS.auto).label,
    DREAM, OPEN_AT_START
  };
  resetIdle();
})();
