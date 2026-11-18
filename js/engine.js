/*
 * Amin — moteur de calcul des horaires de prière.
 * Calcul astronomique local (aucun appel réseau), d'après l'algorithme public PrayTimes.
 * Utilisable dans le navigateur (window.MawqutEngine) et dans Node (module.exports).
 */
(function (root) {
  'use strict';

  // ---- Méthodes de calcul ------------------------------------------------
  // fajr / isha : angle du soleil sous l'horizon (degrés).
  // ishaMinutes : Icha = Maghrib + N minutes (remplace l'angle).
  const METHODS = {
    uoif:      { label: 'Musulmans de France (UOIF) · 12°', fajr: 12, isha: 12 },
    mwl:       { label: 'Ligue islamique mondiale · 18° / 17°', fajr: 18, isha: 17 },
    algeria:   { label: 'Algérie · 18° / 17°', fajr: 18, isha: 17 },
    morocco:   { label: 'Maroc · 19° / 17°', fajr: 19, isha: 17 },
    tunisia:   { label: 'Tunisie · 18° / 18°', fajr: 18, isha: 18 },
    diyanet:   { label: 'Diyanet, Turquie · 18° / 17°', fajr: 18, isha: 17 },
    egypt:     { label: 'Autorité égyptienne · 19,5° / 17,5°', fajr: 19.5, isha: 17.5 },
    makkah:    { label: 'Umm al-Qura, La Mecque · 18,5° / 90 min', fajr: 18.5, ishaMinutes: 90, ramadanIshaMinutes: 120 },
    karachi:   { label: 'Université de Karachi · 18° / 18°', fajr: 18, isha: 18 },
    isna:      { label: 'ISNA, Amérique du Nord · 15° / 15°', fajr: 15, isha: 15 },
    gulf:      { label: 'Pays du Golfe · 19,5° / 90 min', fajr: 19.5, ishaMinutes: 90 },
    kuwait:    { label: 'Koweït · 18° / 17,5°', fajr: 18, isha: 17.5 },
    qatar:     { label: 'Qatar · 18° / 90 min', fajr: 18, ishaMinutes: 90 },
    singapore: { label: 'Singapour · 20° / 18°', fajr: 20, isha: 18 },
    custom:    { label: 'Personnalisée', fajr: 18, isha: 17 }
  };

  // Méthode de calcul proposée par défaut selon le pays de la ville.
  const COUNTRY_DEFAULTS = {
    FR: 'uoif', BE: 'uoif', CH: 'uoif', LU: 'uoif', MC: 'uoif',
    RE: 'mwl', YT: 'mwl', GP: 'mwl', MQ: 'mwl', GF: 'mwl',
    DZ: 'algeria', MA: 'morocco', TN: 'tunisia', TR: 'diyanet', EG: 'egypt',
    SA: 'makkah', AE: 'gulf', OM: 'gulf', BH: 'gulf', KW: 'kuwait', QA: 'qatar',
    PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi',
    US: 'isna', CA: 'isna', SG: 'singapore', MY: 'singapore', ID: 'singapore'
  };

  // ---- Trigonométrie en degrés -------------------------------------------
  const DEG = Math.PI / 180;
  const sin = d => Math.sin(d * DEG);
  const cos = d => Math.cos(d * DEG);
  const tan = d => Math.tan(d * DEG);
  const arcsin = x => Math.asin(x) / DEG;
  const arccos = x => Math.acos(x) / DEG;
  const arctan2 = (y, x) => Math.atan2(y, x) / DEG;
  const arccot = x => Math.atan(1 / x) / DEG;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixAngle = a => fix(a, 360);
  const fixHour = a => fix(a, 24);

  function julian(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D);
    const q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
    return { declination: arcsin(sin(e) * sin(L)), equation: q / 15 - fixHour(RA) };
  }

  /**
   * Calcule les horaires d'une journée.
   * @param {{y:number,m:number,d:number}} date  date civile locale de la ville (m = 1..12)
   * @param {number} lat
   * @param {number} lon
   * @param {object} p  { fajr, isha | ishaMinutes, maghribMinutes, asrFactor, asrShift, highLat, elevation }
   * @returns {{fajr,sunrise,dhuhr,asr,maghrib,isha}} instants en millisecondes UTC (NaN si introuvable)
   */
  function computeDay(date, lat, lon, p) {
    const jDate = julian(date.y, date.m, date.d) - lon / (15 * 24);
    const sunAt = t => sunPosition(jDate + t);
    const midDay = t => fixHour(12 - sunAt(t / 24).equation);
    const sunAngleTime = (angle, t, ccw) => {
      const decl = sunAt(t / 24).declination;
      const noon = midDay(t);
      const x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (x < -1 || x > 1) return NaN;
      const h = arccos(x) / 15;
      return noon + (ccw ? -h : h);
    };
    // asrShift : déclinaison du soleil prise N jours plus tard pour l'Asr. Mawaqit calcule ainsi (relevé sur une
    // année de calendrier d'une mosquée : avec 1 jour, ses heures d'Asr retombent juste) ; 0 = calcul astronomique exact.
    const asrTime = (factor, t) => {
      const decl = sunAt(t / 24 + (p.asrShift || 0)).declination;
      const angle = -arccot(factor + tan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t, false);
    };

    const riseSet = 0.833 + 0.0347 * Math.sqrt(Math.max(0, p.elevation || 0));
    // Une itération à partir d'estimations, comme PrayTimes, puis une seconde pour affiner.
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        fajr: sunAngleTime(p.fajr, isFinite(t.fajr) ? t.fajr : 5, true),
        sunrise: sunAngleTime(riseSet, isFinite(t.sunrise) ? t.sunrise : 6, true),
        dhuhr: midDay(t.dhuhr),
        asr: asrTime(p.asrFactor || 1, isFinite(t.asr) ? t.asr : 13),
        sunset: sunAngleTime(riseSet, isFinite(t.sunset) ? t.sunset : 18, false),
        isha: p.ishaMinutes ? NaN : sunAngleTime(p.isha, isFinite(t.isha) ? t.isha : 18, false)
      };
    }

    const maghrib = t.sunset + (p.maghribMinutes || 0) / 60;
    let isha = p.ishaMinutes ? maghrib + p.ishaMinutes / 60 : t.isha;
    let fajr = t.fajr;

    // Hautes latitudes : quand l'angle n'est jamais atteint (été en Europe du Nord, etc.).
    const rule = p.highLat || 'angle';
    if (rule !== 'none' && isFinite(t.sunrise) && isFinite(t.sunset)) {
      const night = fixHour(t.sunrise - t.sunset);
      const portion = angle => night * (rule === 'middle' ? 1 / 2 : rule === 'seventh' ? 1 / 7 : angle / 60);
      const fp = portion(p.fajr);
      if (!isFinite(fajr) || fixHour(t.sunrise - fajr) > fp) fajr = t.sunrise - fp;
      if (!p.ishaMinutes) {
        const ip = portion(p.isha);
        if (!isFinite(isha) || fixHour(isha - t.sunset) > ip) isha = t.sunset + ip;
      }
    }

    const base = Date.UTC(date.y, date.m - 1, date.d);
    const toUTC = h => (isFinite(h) ? base + (h - lon / 15) * 3600e3 : NaN);
    return {
      fajr: toUTC(fajr),
      sunrise: toUTC(t.sunrise),
      dhuhr: toUTC(t.dhuhr),
      asr: toUTC(t.asr),
      maghrib: toUTC(maghrib),
      isha: toUTC(isha)
    };
  }

  // ---- Fuseaux horaires ----------------------------------------------------
  const partsCache = {};
  function zonedParts(ms, tz) {
    let f = partsCache[tz];
    if (!f) {
      f = partsCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short'
      });
    }
    const o = {};
    for (const part of f.formatToParts(new Date(ms))) o[part.type] = part.value;
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday];
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, s: +o.second, weekday: wd };
  }

  function addDays(date, n) {
    const x = new Date(Date.UTC(date.y, date.m - 1, date.d + n));
    return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() };
  }

  function roundToMinute(ms) { return isFinite(ms) ? Math.round(ms / 60000) * 60000 : ms; }

  // ---- Calendrier hégirien ------------------------------------------------
  const HIJRI_MONTHS_FR = ['Mouharram', 'Safar', 'Rabi‘ al-awwal', 'Rabi‘ ath-thani', 'Joumada al-oula',
    'Joumada ath-thania', 'Rajab', 'Cha‘bane', 'Ramadan', 'Chawwal', 'Dhou al-qi‘da', 'Dhou al-hijja'];
  const HIJRI_MONTHS_AR = ['مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى',
    'جُمَادَى الآخِرَة', 'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة'];

  let hijriFmt = null;
  function hijri(date, adjustDays) {
    const x = addDays(date, adjustDays || 0);
    const ms = Date.UTC(x.y, x.m - 1, x.d, 12);
    try {
      hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
        timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric'
      });
      const o = {};
      for (const part of hijriFmt.formatToParts(new Date(ms))) o[part.type] = part.value;
      const r = { day: parseInt(o.day, 10), month: parseInt(o.month, 10), year: parseInt(o.year || o.relatedYear, 10) };
      if (r.day && r.month && r.year) return r;
    } catch (e) { /* calendrier non pris en charge : calcul tabulaire */ }
    // Calendrier hégirien tabulaire (repli).
    const jd = Math.floor(julian(x.y, x.m, x.d) + 0.5);
    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l) / 709);
    return { day: l - Math.floor((709 * month) / 24), month, year: 30 * n + j - 30 };
  }

  // ---- Qibla ---------------------------------------------------------------
  const KAABA = { lat: 21.4225, lon: 39.8262 };
  function qibla(lat, lon) {
    const dLon = KAABA.lon - lon;
    const y = sin(dLon);
    const x = cos(lat) * tan(KAABA.lat) - sin(lat) * cos(dLon);
    return fixAngle(arctan2(y, x));
  }

  /**
   * Horaires d'une ville pour une date locale donnée, avec réglages utilisateur.
   * settings: { method, fajrAngle, ishaAngle, ishaMinutes, asrShift, highLat, adjust: {fajr:..}, hijriAdjust }
   */
  function timesFor(city, date, settings) {
    const m = METHODS[settings.method] || METHODS.mwl;
    const isCustom = settings.method === 'custom';
    const hij = hijri(date, settings.hijriAdjust || 0);
    const params = {
      fajr: isCustom ? +settings.fajrAngle || 18 : m.fajr,
      isha: isCustom ? +settings.ishaAngle || 17 : m.isha,
      ishaMinutes: isCustom ? (+settings.ishaMinutes || 0) : (hij.month === 9 && m.ramadanIshaMinutes) || m.ishaMinutes || 0,
      maghribMinutes: 0,
      asrFactor: 1, // ombre simple : Asr au rite malikite
      asrShift: isCustom ? (+settings.asrShift || 0) : 0, // profils de mosquée calés sur Mawaqit
      highLat: settings.highLat || 'angle',
      elevation: 0
    };
    const raw = computeDay(date, city.lat, city.lon, params);
    raw.dhuhr += 60000; // marge d'une minute après le zénith (le disque solaire doit l'avoir dépassé)
    const adj = settings.adjust || {};
    const out = {};
    for (const k of Object.keys(raw)) out[k] = roundToMinute(raw[k] + (+adj[k] || 0) * 60000);
    return out;
  }

  const api = {
    METHODS, COUNTRY_DEFAULTS, HIJRI_MONTHS_FR, HIJRI_MONTHS_AR,
    computeDay, timesFor, zonedParts, addDays, hijri, qibla
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MawqutEngine = api;
})(typeof self !== 'undefined' ? self : this);
