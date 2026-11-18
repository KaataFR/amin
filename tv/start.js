/* Amin TV — démarrage : horloge du menu, ciel du moment, première page, planning des alertes, écran calme. */
(() => {
  'use strict';
  const T = window.TV;
  const C = window.TVCalme || {};
  function clock() {
    const now = Date.now();
    document.getElementById('clock').textContent = T.fmtTime(now);
    const { D, next } = T.situation(now);
    document.getElementById('railNext').textContent = next ? `${T.nameOf(next.k, D, !next.tomorrow).fr} à ${T.fmtTime(next.ms)}` : '';
    const p = T.period(now);
    if (document.body.dataset.period !== p) document.body.dataset.period = p;
  }
  clock();
  setInterval(clock, 10000);
  T.on('settings', clock);
  T.on('resume', clock);
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* rien */ }
  if (C.DREAM) {
    // Écran de veille de la télé : seulement l'écran calme
    document.body.classList.add('dream');
    C.open();
    return;
  }
  T.showPage('home');
  T.pushSchedule();
  setTimeout(() => T.enterContent(), 60);
  if (C.OPEN_AT_START) setTimeout(() => C.open(), 300);
})();
