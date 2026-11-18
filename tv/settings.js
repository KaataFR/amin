/* Amin TV — Réglages : ville, alertes, sons, volume, bandeau par-dessus la télé, calcul. Chaque réglage s'ouvre avec OK. */
(() => {
  'use strict';
  const T = window.TV;
  const { $, esc, S } = T;
  const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const REMINDERS = [0, 5, 10, 15, 20, 30, 45, 60];
  const LENGTHS = [[0, 'En entier'], [90, '1 min 30'], [45, '45 secondes'], [20, '20 secondes']];

  const preview = new Audio();
  function play(file) { try { preview.pause(); preview.src = file; preview.volume = T.vol(); preview.play().catch(() => {}); } catch (e) { /* rien */ } }
  const stopPreview = () => { try { preview.pause(); } catch (e) { /* rien */ } };

  const fmtDeg = v => String(v).replace('.', ',') + '°';
  const fmtAdj = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' min';
  function methodLabel() {
    if (S.method === 'custom') return `Personnalisée · ${fmtDeg(S.fajrAngle)} / ${S.ishaMinutes > 0 ? 'Maghrib + ' + S.ishaMinutes + ' min' : fmtDeg(S.ishaAngle)}`;
    return (T.E.METHODS[S.method] || T.E.METHODS.mwl).label;
  }
  function adjBox(k) {
    const v = +S.adjust[k] || 0;
    return `<div class="adj${v ? ' is-set' : ''}" role="group" aria-label="${esc(T.NAMES[k].fr)}">
        <span class="adj-l">${esc(T.NAMES[k].fr)}</span>
        <button type="button" class="tb tb-ic" id="adj-${k}-m" data-adj="${k}" data-d="-1" aria-label="Une minute plus tôt">−</button>
        <span class="adj-v tnum">${fmtAdj(v)}</span>
        <button type="button" class="tb tb-ic" id="adj-${k}-p" data-adj="${k}" data-d="1" aria-label="Une minute plus tard">+</button>
      </div>`;
  }
  const FAJR_ANGLES = [12, 12.5, 13, 14, 15, 15.5, 16, 17, 18, 18.5, 19, 19.5, 20];
  const ISHA_CHOICES = [['m60', '60 min après Maghrib'], ['m75', '75 min après Maghrib'], ['m80', '80 min après Maghrib'], ['m90', '90 min après Maghrib'], ['m100', '100 min après Maghrib'], ['m120', '120 min après Maghrib'],
    ['a12', '12°'], ['a13', '13°'], ['a14', '14°'], ['a15', '15°'], ['a16', '16°'], ['a17', '17°'], ['a17.5', '17,5°'], ['a18', '18°']];
  const row = (id, label, value, sub) => `<button type="button" class="set-row" id="${id}"><span class="set-l">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="set-v">${value}</span>${CHEV}</button>`;
  let root = null;
  function render(el) {
    root = el;
    el.addEventListener('click', onClick);
    draw();
  }
  function draw() {
    if (!root) return;
    const inf = T.info();
    const rem = (S.reminders || []).filter(r => +r > 0).sort((a, b) => b - a);
    const ha = +S.hijriAdjust || 0;
    const C = window.TVCalme;
    const MQ = window.TVMosques;
    root.innerHTML = `
      <header class="pg-head"><h1>Réglages</h1><p class="pg-sub">OK pour changer un réglage. Ils sont gardés sur la télé.</p></header>
      <h2 class="sec-h">Ville et mosquée</h2>
      ${row('sCity', 'Ville des horaires', `${esc(S.city.name)}<small>${esc(T.placeSubtitle(S.city))}</small>`)}
      ${MQ ? row('sMosque', 'Horaires de ma mosquée', MQ.active() ? `${esc(MQ.active().name)}<small>${esc(MQ.ruleLabel(MQ.active().params))}</small>` : `Calcul pour la ville<small>${S.mosques && S.mosques.length ? S.mosques.length + ' mosquée' + (S.mosques.length > 1 ? 's' : '') + ' enregistrée' + (S.mosques.length > 1 ? 's' : '') : 'Ajoute ta mosquée pour avoir ses horaires'}</small>`, 'Chaque mosquée compte un peu à sa façon') : ''}
      <h2 class="sec-h">Alertes</h2>
      <button type="button" class="set-row set-toggle" id="sEnabled" aria-pressed="${!!S.enabled}"><span class="set-l">Alertes de prière<small>Adhan et bandeau à l’heure de chaque prière</small></span><span class="sw" aria-hidden="true"></span><span class="set-v">${S.enabled ? 'Activées' : 'Coupées'}</span></button>
      <div class="ptoggles" role="group" aria-label="Prières annoncées">${T.ORDER.map(k => `<button type="button" class="ptog" data-k="${k}" aria-pressed="${!!S.alerts[k]}"><span class="box" aria-hidden="true"></span>${esc(T.NAMES[k].fr)}${k === 'sunrise' ? '<small>fin de Fajr</small>' : ''}</button>`).join('')}</div>
      ${row('sRem', 'Rappel avant la prière', rem.length ? rem.map(r => r + ' min').join(', ') : 'Aucun')}
      ${row('sSound', 'Son à l’heure de la prière', esc((T.SOUNDS[S.prayerSound] || {}).label || ''))}
      ${row('sLen', 'Durée de l’adhan', esc((LENGTHS.find(l => l[0] === (+S.adhanLength || 0)) || LENGTHS[0])[1]))}
      ${row('sRSound', 'Son du rappel', esc((T.SOUNDS[S.reminderSound] || {}).label || ''))}
      <div class="set-row set-vol" role="group" aria-label="Volume">
        <span class="set-l">Volume<small>Alertes, adhan et récitation, par rapport au volume de la télé</small></span>
        <button type="button" class="tb tb-ic" id="sVolDown" aria-label="Moins fort">−</button>
        <span class="vol-v tnum" id="sVolV">${Math.round(T.volPos() * 100)} %</span>
        <button type="button" class="tb tb-ic" id="sVolUp" aria-label="Plus fort">+</button>
      </div>
      <div class="actions"><button type="button" class="tb tb-gold" id="sTest">${T.ICON_PLAY}<span>Tester l’alerte</span></button></div>
      <h2 class="sec-h">Affichage par-dessus la télé</h2>
      <div class="set-note" data-state="${inf.overlay ? 'on' : 'partial'}" tabindex="0">
        <span class="dot" aria-hidden="true"></span>
        <p>${inf.overlay ? 'Autorisé : le bandeau de l’alerte s’affiche par-dessus les chaînes, YouTube et les menus, même quand Amin est fermée.' : 'Pas encore autorisé : l’adhan sonne, mais le bandeau ne s’affiche que lorsque Amin est ouverte.'}</p>
      </div>
      ${inf.overlay ? '' : '<div class="actions"><button type="button" class="tb tb-gold" id="sOverlay">Autoriser le bandeau</button></div>'}
      <h2 class="sec-h">Écran calme</h2>
      ${C ? row('sCalmeIdle', 'S’ouvre tout seul', esc(C.idleLabel()), 'L’heure et les prochaines prières sur une vidéo apaisante') : ''}
      ${C ? row('sCalmeBg', 'Fond vidéo', esc(C.bgLabel())) : ''}
      ${C ? '<div class="actions"><button type="button" class="tb tb-gold" id="sCalme"><span>Voir l’écran calme</span></button></div>' : ''}
      <p class="set-about" tabindex="0">Quand la télé reste inactive, elle peut aussi afficher cet écran comme écran de veille (réglé à l’installation d’Amin).</p>
      <h2 class="sec-h">Calcul des horaires${MQ && MQ.active() ? `<small>réglages de ${esc(MQ.active().name)}</small>` : ''}</h2>
      ${row('sMethod', 'Méthode de calcul', esc(methodLabel()))}
      ${S.method === 'custom' ? row('sFajrA', 'Fajr', esc(fmtDeg(S.fajrAngle)) + '<small>angle du soleil sous l’horizon</small>') : ''}
      ${S.method === 'custom' ? row('sIshaA', 'Icha', S.ishaMinutes > 0 ? esc(S.ishaMinutes + ' min après Maghrib') : esc(fmtDeg(S.ishaAngle)) + '<small>angle du soleil sous l’horizon</small>') : ''}
      <h3 class="sub-h">Ajuster les minutes<small>pour coller aux horaires de ta mosquée</small></h3>
      <div class="adjs" role="group" aria-label="Ajuster les minutes">${T.ORDER.map(k => adjBox(k)).join('')}</div>
      ${row('sHijri', 'Date hégirienne', ha ? (ha > 0 ? '+' : '') + ha + ' jour' + (Math.abs(ha) > 1 ? 's' : '') : 'Sans correction', 'Si le mois commence un jour plus tôt ou plus tard chez toi')}
      <h2 class="sec-h">À propos</h2>
      <p class="set-about" tabindex="0">Amin${inf.version ? ' ' + esc(inf.version) : ''} · guide selon le rite malikite. Les horaires sont calculés sur la télé, sans connexion ; seule la récitation verset par verset utilise Internet.</p>`;
  }

  function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const id = b.id;
    if (b.dataset.k) {
      const k = b.dataset.k;
      S.alerts[k] = !S.alerts[k];
      if (S.alerts[k]) S.enabled = true;
      return commit(b);
    }
    if (id === 'sCity') return cityPicker();
    if (id === 'sMosque') return window.TVMosques && window.TVMosques.chooser();
    if (id === 'sEnabled') { S.enabled = !S.enabled; return commit(b); }
    if (id === 'sRem') return reminderPicker();
    if (id === 'sSound') return soundPicker('now');
    if (id === 'sRSound') return soundPicker('pre');
    if (id === 'sLen') return T.choose('Durée de l’adhan', LENGTHS.map(([v, l]) => ({ value: v, label: l })), +S.adhanLength || 0, v => { S.adhanLength = v; commit(); });
    if (id === 'sVolDown' || id === 'sVolUp') {
      S.volume = Math.round(Math.max(0, Math.min(1, T.volPos() + (id === 'sVolUp' ? 0.1 : -0.1))) * 10) / 10;
      S.muted = false;
      commit(b);
      play((T.SOUNDS[S.reminderSound] || T.SOUNDS['r-takbir-imadi']).file || T.SOUNDS['r-takbir-imadi'].file);
      return;
    }
    if (id === 'sTest') return T.testAlert();
    if (id === 'sCalmeIdle') return window.TVCalme.idlePicker(() => commit());
    if (id === 'sCalmeBg') return window.TVCalme.bgPicker(() => commit());
    if (id === 'sCalme') return window.TVCalme.open();
    if (id === 'sOverlay') return overlay();
    if (b.dataset.adj) {
      const k = b.dataset.adj;
      S.adjust[k] = Math.max(-30, Math.min(30, (+S.adjust[k] || 0) + +b.dataset.d));
      return commit(b);
    }
    if (id === 'sMethod') {
      const opts = Object.keys(T.E.METHODS).map(k => ({ value: k, label: k === 'custom' ? 'Personnalisée : angle de Fajr et Icha au choix' : T.E.METHODS[k].label }));
      return T.choose('Méthode de calcul', opts, S.method, v => {
        if (v === 'custom' && S.method !== 'custom') {
          // on part de la méthode actuelle pour que les horaires ne sautent pas
          const cur = T.E.METHODS[S.method] || T.E.METHODS.mwl;
          S.fajrAngle = cur.fajr; S.ishaAngle = cur.isha || 17; S.ishaMinutes = cur.ishaMinutes || 0;
        }
        S.method = v; commit();
      }, { hint: 'En France, la plupart des mosquées suivent la Ligue islamique mondiale ou l’UOIF (12°). Fais comme ta mosquée.' });
    }
    if (id === 'sFajrA') return T.choose('Angle de Fajr', FAJR_ANGLES.map(v => ({ value: v, label: fmtDeg(v) })), +S.fajrAngle, v => { S.fajrAngle = v; commit(); },
      { hint: 'Plus l’angle est petit, plus Fajr est tard. 12° : UOIF ; 18° : Ligue islamique mondiale.' });
    if (id === 'sIshaA') return T.choose('Icha', ISHA_CHOICES.map(([v, l]) => ({ value: v, label: l })), S.ishaMinutes > 0 ? 'm' + S.ishaMinutes : 'a' + S.ishaAngle, v => {
      if (v[0] === 'm') S.ishaMinutes = +v.slice(1); else { S.ishaAngle = +v.slice(1); S.ishaMinutes = 0; }
      commit();
    });
    if (id === 'sHijri') return T.choose('Date hégirienne', [-2, -1, 0, 1, 2].map(v => ({ value: v, label: v ? (v > 0 ? '+' : '') + v + ' jour' + (Math.abs(v) > 1 ? 's' : '') : 'Sans correction' })), +S.hijriAdjust || 0, v => { S.hijriAdjust = v; commit(); });
  }
  // Enregistre, redessine et garde le focus sur le même réglage
  function commit(btn) {
    const a = document.activeElement;
    const wasIn = !!(root && a && root.contains(a));
    const keep = btn ? (btn.id ? '#' + btn.id : `[data-k="${btn.dataset.k}"]`) : (a && a.id ? '#' + a.id : null);
    if (window.TVMosques) window.TVMosques.syncActive(); // la mosquée choisie garde ses réglages modifiés
    T.save();
    if (wasIn && keep) { const n = root.querySelector(keep); if (n) n.focus({ preventScroll: true }); }
  }

  function reminderPicker() {
    const cur = (S.reminders || []).filter(r => +r > 0)[0] || 0;
    T.choose('Rappel avant la prière', REMINDERS.map(v => ({ value: v, label: v ? `${v} minutes avant` : 'Pas de rappel' })), cur, v => { S.reminders = v ? [v] : []; commit(); },
      { hint: 'Un son court et le bandeau, quelques minutes avant l’adhan.' });
  }
  function soundPicker(kind) {
    const keys = kind === 'pre' ? T.REMINDER_SOUNDS : T.PRAYER_SOUNDS;
    const cur = kind === 'pre' ? S.reminderSound : S.prayerSound;
    T.choose(kind === 'pre' ? 'Son du rappel' : 'Son à l’heure de la prière',
      keys.map(k => ({ value: k, label: T.SOUNDS[k].label, preview: T.SOUNDS[k].file ? () => play(T.SOUNDS[k].file) : null })),
      cur, v => { if (kind === 'pre') S.reminderSound = v; else S.prayerSound = v; stopPreview(); commit(); },
      { hint: 'OK choisit le son. Le bouton ▶ à droite le fait écouter.', onClose: stopPreview });
  }

  // ---------- Ville ----------
  function cityPicker() {
    const el = document.createElement('div');
    el.className = 'layer sheet city';
    el.innerHTML = `<div class="sheet-card">
        <h2>Ville des horaires</h2>
        <p class="sheet-hint">Ville actuelle : ${esc(S.city.name)}. Tape le nom d’une ville, puis choisis-la dans la liste.</p>
        <input class="input" type="search" autocomplete="off" placeholder="Nom de la ville" aria-label="Nom de la ville">
        <div class="choices" id="cityRes"></div>
      </div>`;
    const input = el.querySelector('input');
    const res = el.querySelector('#cityRes');
    let found = [];
    const draw = () => {
      found = T.searchCities(input.value);
      res.innerHTML = found.length
        ? found.map((c, i) => `<button type="button" class="choice" data-i="${i}"><span class="choice-l">${esc(c.name)}</span><span class="choice-s">${esc(T.placeSubtitle(c))}</span></button>`).join('')
        : (input.value.trim().length >= 2 ? '<p class="sheet-hint">Aucune ville trouvée. Essaie une autre orthographe.</p>' : '');
    };
    input.addEventListener('input', draw);
    res.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const c = found[+b.dataset.i];
      if (window.TVMosques && S.mosque) window.TVMosques.leave(true); // une autre ville : on quitte la mosquée choisie
      if (c.cc !== S.city.cc) S.method = T.E.COUNTRY_DEFAULTS[c.cc] || S.method;
      S.city = T.pickCity(c);
      T.closeLayer();
      T.save();
      draw();
      T.toast(`Horaires de ${S.city.name}`);
    });
    T.openLayer(el, {
      remove: true,
      focus: () => input,
      onKey: (e, dir) => {
        // OK sur le clavier de la télé : on passe aux résultats
        if (dir === 'ok' && document.activeElement === input) { const f = res.querySelector('.choice'); if (f) { setTimeout(() => T.focusEl(f), 50); return true; } }
        return false;
      }
    });
    setTimeout(() => { if (T.bridge && T.bridge.showKeyboard) { try { T.bridge.showKeyboard(); } catch (e) { /* rien */ } } }, 150);
  }

  // ---------- Bandeau ----------
  function overlay() {
    let opened = false;
    if (T.bridge) { try { opened = T.bridge.openOverlaySettings(); } catch (e) { /* rien */ } }
    if (opened) return;
    const inf = T.info();
    const ip = inf.ip || 'adresse-de-la-télé';
    const el = document.createElement('div');
    el.className = 'layer sheet';
    el.innerHTML = `<div class="sheet-card">
        <h2>Autoriser le bandeau</h2>
        <p class="sheet-hint">Cette télé ne propose pas ce réglage dans ses menus. Depuis un ordinateur sur le même réseau (débogage USB activé dans les options pour les développeurs de la télé), lance :</p>
        <pre class="cmd" tabindex="0">adb connect ${esc(ip)}:5555\nadb shell appops set ${esc(inf.package || 'fr.amin.tv')} SYSTEM_ALERT_WINDOW allow</pre>
        <button type="button" class="tb tb-gold" data-close>Compris</button>
      </div>`;
    el.querySelector('[data-close]').addEventListener('click', () => T.closeLayer());
    T.openLayer(el, { remove: true });
  }

  // Réglage à distance, depuis l'ordinateur (adb … --es horaires custom/12/m90/-4,0,4,0,3,3) :
  // méthode / angle de Fajr / Icha (m = minutes après Maghrib, a = angle) / minutes à ajouter (Fajr, Chourouq, Dhohr, Asr, Maghrib, Icha)
  window.aminTvApply = str => {
    const [meth, fa, ish, adj] = String(str || '').split('/');
    if (meth && T.E.METHODS[meth]) S.method = meth;
    if (fa && isFinite(+fa) && +fa > 0) S.fajrAngle = +fa;
    if (ish && ish[0] === 'm' && isFinite(+ish.slice(1))) S.ishaMinutes = +ish.slice(1);
    if (ish && ish[0] === 'a' && isFinite(+ish.slice(1))) { S.ishaAngle = +ish.slice(1); S.ishaMinutes = 0; }
    if (adj) adj.split(',').forEach((x, i) => { const k = T.ORDER[i]; if (k && x !== '' && isFinite(+x)) S.adjust[k] = Math.max(-30, Math.min(30, Math.round(+x))); });
    T.save();
    T.toast('Horaires mis à jour');
    return 'ok';
  };

  T.page('settings', { render, show: draw });
  T.on('settings', () => { if (root && !root.hidden) draw(); });
  T.on('resume', () => { if (root && !root.hidden) draw(); });
  window.TVSettings = { cityPicker, reminderPicker, soundPicker, overlay };
})();
