/*
 * Amin — Mes mosquées, partie commune au site, à l'appli PC et à la télé.
 *
 * Par défaut, Amin calcule les horaires de la ville avec la méthode du pays. Pour suivre une mosquée,
 * on recopie ses horaires de quelques dates ; Amin garde son calcul astronomique (hors connexion) et cherche
 * les réglages qui les redonnent : angle de Fajr, règle d'Icha (minutes après Maghrib ou angle), façon de
 * calculer l'Asr et minutes à ajouter. Aucune donnée n'est téléchargée.
 *
 * Trois dates suffisent en général : le 21 juin départage les règles de Fajr et d'Icha (elles s'écartent
 * surtout en été), le 21 mars et le 21 septembre révèlent le calcul de l'Asr (il se voit autour des
 * équinoxes). Vérifié sur 20 dates d'un calendrier de mosquée : ces trois-là redonnent exactement les
 * mêmes réglages que les 20.
 *
 * Une mosquée qui fixe certaines heures à la main (Dhohr bloqué l'hiver, Icha plafonné l'été…) ne suit
 * aucun calcul : les dates recopiées ne collent pas toutes, et verdict() le signale.
 */
(function (root) {
  'use strict';
  const E = root.MawqutEngine || (typeof require === 'function' ? require('./engine.js') : null);
  const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const NAMES = { fajr: 'Fajr', sunrise: 'Chourouq', dhuhr: 'Dhohr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Icha' };
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const FAJR = [12, 12.5, 13, 14, 15, 15.5, 16, 17, 17.5, 18, 18.5, 19, 19.5, 20];
  const FAJR_PREF = new Set([12, 15, 18, 18.5, 19.5]);
  const ISHA = [12, 13, 14, 15, 16, 17, 17.5, 18];
  const ISHA_PREF = new Set([12, 15, 17, 18]);

  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const spread = a => Math.max(...a) - Math.min(...a);
  const sameDay = (a, b) => !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
  const dayKey = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  const minutesOf = (ms, tz) => { const z = E.zonedParts(ms, tz); return z.h * 60 + z.min; };
  const hhmm = n => { if (!isFinite(n)) return '--:--'; const v = ((Math.round(n) % 1440) + 1440) % 1440; return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); };
  const parseHHMM = s => { const m = /^\s*(\d{1,2})\s*[:hH.]\s*(\d{2})\s*$/.exec(String(s || '')); if (!m) return NaN; const h = +m[1], mi = +m[2]; return h < 24 && mi < 60 ? h * 60 + mi : NaN; };
  const dateLabel = (d, short) => `${d.d === 1 ? '1er' : d.d} ${(short ? MONTHS_SHORT : MONTHS)[d.m - 1]}${short ? '' : ' ' + d.y}`;
  const todayOf = city => { const z = E.zonedParts(Date.now(), city.tz); return { y: z.y, m: z.m, d: z.d }; };
  // Les dates à recopier : 21 mars, 21 juin, 21 septembre de l'année en cours
  const proposedDates = year => [3, 6, 9].map(m => ({ y: year, m, d: 21 }));

  // Horaires (en minutes depuis minuit, heure de la ville) pour un jeu de réglages
  function calc(city, date, p, highLat) {
    const s = Object.assign({ method: 'custom', fajrAngle: 18, ishaAngle: 17, ishaMinutes: 0, asrShift: 0, highLat: highLat || 'angle', adjust: {} }, p);
    const t = E.timesFor(city, date, s);
    const out = {};
    for (const k of KEYS) out[k] = isFinite(t[k]) ? minutesOf(t[k], city.tz) : NaN;
    return out;
  }

  // Les réglages qui redonnent le mieux les horaires de la mosquée, sur une ou plusieurs dates.
  // Les angles courants (12°, 15°, 18°…) sont préférés : une seule date ne suffit pas à trancher entre
  // « 12° moins 4 min » et « 13° plus 1 min », et la règle courante tient mieux toute l'année.
  // prev : réglages déjà en place pour cette mosquée (gardés quand les dates ne permettent pas de trancher).
  function fit(city, samples, prev, highLat) {
    const C = (date, p) => calc(city, date, p, highLat);
    const res = { method: 'custom', adjust: {} };
    let best = null;
    for (const a of FAJR) {
      const d = samples.map(s => s.t.fajr - C(s.date, { fajrAngle: a }).fajr);
      if (!d.length || d.some(x => !isFinite(x))) continue;
      const score = spread(d) * 3 + Math.abs(mean(d)) * 0.3 + (FAJR_PREF.has(a) ? 0 : 2);
      if (!best || score < best.score) best = { a, score, m: mean(d) };
    }
    res.fajrAngle = best ? best.a : 18;
    res.adjust.fajr = best ? Math.round(best.m) : 0;
    const base = samples.map(s => C(s.date, { fajrAngle: res.fajrAngle }));
    for (const k of ['sunrise', 'dhuhr', 'maghrib']) {
      const d = samples.map((s, i) => s.t[k] - base[i][k]).filter(isFinite);
      res.adjust[k] = d.length ? Math.round(mean(d)) : 0;
    }
    // Asr : calcul exact (0) ou à la façon de Mawaqit (1) ; on garde celui qui redonne le mieux les horaires
    let asrBest = null;
    for (const sh of [0, 1]) {
      const d = samples.map(s => s.t.asr - C(s.date, { fajrAngle: res.fajrAngle, asrShift: sh }).asr).filter(isFinite);
      if (!d.length) continue;
      const a = Math.round(mean(d)), err = d.reduce((x, v) => x + Math.abs(v - a), 0);
      const keep = prev && (+prev.asrShift || 0) === sh;
      if (!asrBest || err < asrBest.err || (err === asrBest.err && keep)) asrBest = { sh, a, err };
    }
    res.asrShift = asrBest ? asrBest.sh : (prev && +prev.asrShift) || 0;
    res.adjust.asr = asrBest ? asrBest.a : 0;
    // Icha : un écart fixe après Maghrib (souvent 90 min) ou un angle
    const gaps = samples.map(s => s.t.isha - s.t.maghrib);
    const g = Math.round(mean(gaps));
    let ib = null;
    if (g >= 45 && g <= 150) ib = { kind: 'm', n: g, score: spread(gaps) * 3 + (g % 5 ? 1 : 0.5) }; // à égalité, un angle courant qui tombe juste l'emporte
    for (const b of ISHA) {
      const d = samples.map(s => s.t.isha - C(s.date, { fajrAngle: res.fajrAngle, ishaAngle: b }).isha);
      if (d.some(x => !isFinite(x))) continue;
      const score = spread(d) * 3 + Math.abs(mean(d)) * 0.3 + (ISHA_PREF.has(b) ? 0 : 2);
      if (!ib || score < ib.score) ib = { kind: 'a', b, score, m: mean(d) };
    }
    if (ib && ib.kind === 'm') { res.ishaMinutes = ib.n; res.ishaAngle = 17; }
    else { res.ishaMinutes = 0; res.ishaAngle = ib ? ib.b : 17; }
    // Icha compté depuis le Maghrib calculé : on lui ajoute l'écart observé
    if (ib && ib.kind === 'm') {
      const raw = samples.map(s => C(s.date, { fajrAngle: res.fajrAngle, ishaMinutes: res.ishaMinutes }).isha);
      res.adjust.isha = Math.round(mean(samples.map((s, i) => s.t.isha - raw[i])));
    } else res.adjust.isha = ib ? Math.round(ib.m) : 0;
    for (const k of KEYS) res.adjust[k] = Math.max(-45, Math.min(45, res.adjust[k] || 0));
    return res;
  }

  // Le plus grand écart restant entre les horaires recopiés et ceux des réglages
  function check(city, samples, p, highLat) {
    let worst = 0, where = null;
    for (const s of samples) {
      const c = calc(city, s.date, p, highLat);
      for (const k of KEYS) {
        if (!isFinite(s.t[k]) || !isFinite(c[k])) continue;
        const d = Math.abs(s.t[k] - c[k]);
        if (d > worst) { worst = d; where = { key: k, date: s.date, mosque: s.t[k], amin: c[k] }; }
      }
    }
    return { worst, where };
  }

  // Ce qu'on peut dire du calage :
  //  level  'exact' (à la minute), 'close' (à 2 min) ou 'manual' (la mosquée fixe des heures à la main) ;
  //  missing  'summer' (pas de date en été : Fajr et Icha peuvent s'écarter), 'asr' (pas de date autour d'un équinoxe).
  function verdict(city, samples, p, highLat) {
    const c = check(city, samples, p, highLat);
    const months = samples.map(s => s.date.m);
    const missing = [];
    if (!months.some(m => m >= 5 && m <= 8)) missing.push('summer');
    if (!months.some(m => (m >= 2 && m <= 4) || (m >= 9 && m <= 11))) missing.push('asr');
    return { level: c.worst <= 1 ? 'exact' : c.worst <= 2 ? 'close' : 'manual', worst: c.worst, where: c.where, missing, count: samples.length };
  }

  // Phrases prêtes à afficher (site, appli PC et télé)
  function verdictText(v) {
    const w = v.where;
    if (v.level === 'manual' && w) {
      return {
        warn: true,
        title: 'Ces horaires ne suivent pas tout à fait un calcul',
        body: `Le ${dateLabel(w.date)}, ${NAMES[w.key]} est à ${hhmm(w.mosque)} à la mosquée, et à ${hhmm(w.amin)} avec le calcul le plus proche. ` +
          `La mosquée fixe sans doute certaines heures à la main : Amin peut s’en écarter de ${v.worst} min. Vérifie de temps en temps, ou recopie d’autres dates.`
      };
    }
    const done = v.count > 1 ? `Calée sur ${v.count} dates` : 'Calée sur une date';
    const prec = v.level === 'exact' ? 'à la minute' : `à ${v.worst} min près`;
    const tips = [];
    if (v.missing.includes('summer')) tips.push('le 21 juin, pour être sûr de Fajr et d’Icha en été');
    if (v.missing.includes('asr')) tips.push('le 21 mars ou le 21 septembre, pour l’Asr');
    return { warn: false, title: `${done}, ${prec}.`, body: tips.length ? `Recopie aussi ${tips.join(' et ')}.` : '' };
  }

  const ruleLabel = p => `Fajr ${String(p.fajrAngle).replace('.', ',')}° · Icha ${p.ishaMinutes > 0 ? 'Maghrib + ' + p.ishaMinutes + ' min' : String(p.ishaAngle).replace('.', ',') + '°'}`;

  // Horaires recopiés : vérifie qu'ils sont complets et dans l'ordre de la journée
  function validTimes(t) {
    for (const k of PRAYERS) if (!isFinite(t[k])) return { ok: false, missing: k };
    const seq = KEYS.filter(k => isFinite(t[k])).map(k => t[k]);
    for (let i = 1; i < seq.length; i++) if (seq[i] <= seq[i - 1]) return { ok: false, order: true };
    return { ok: true };
  }

  const API = { KEYS, PRAYERS, NAMES, calc, fit, check, verdict, verdictText, ruleLabel, proposedDates, dateLabel, todayOf, hhmm, parseHHMM, sameDay, dayKey, validTimes };
  root.AminMosques = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
