/*
 * Amin TV — coque de l'interface télé.
 * Réglages partagés avec le site (localStorage « mawqut.settings »), horaires, planning des alertes
 * confié à l'app Android, navigation à la télécommande (menu, pages, fenêtres) et touche Retour.
 */
(() => {
  'use strict';
  const E = window.MawqutEngine;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bridge = window.AminTV || null;

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
    return res.slice(0, 12).map(x => x[1]);
  }
  const pickCity = c => ({ name: c.name, sub: c.sub || '', cc: c.cc || '', lat: c.lat, lon: c.lon, tz: c.tz });
  const regionNames = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (e) { return null; } })();
  const countryName = cc => { try { return (regionNames && regionNames.of(cc)) || cc; } catch (e) { return cc; } };
  const placeSubtitle = c => [c.sub, c.cc ? countryName(c.cc) : ''].filter(Boolean).join(', ');
  function validTz(tz) { try { new Intl.DateTimeFormat('fr', { timeZone: tz }); return true; } catch (e) { return false; } }
  function defaultCity() {
    let tz = 'Europe/Paris';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* défaut */ }
    const db = cityDb();
    const c = (tz === 'Europe/Paris' && db.find(x => x.key === 'paris' && x.cc === 'FR')) || db.find(x => x.tz === tz) || db.find(x => x.key === 'paris');
    return c ? pickCity(c) : { name: 'Paris', sub: 'Île-de-France', cc: 'FR', lat: 48.8534, lon: 2.3488, tz: 'Europe/Paris' };
  }

  // ---------- Réglages (mêmes que le site) ----------
  const DEFAULTS = {
    city: null, method: null, highLat: 'angle',
    fajrAngle: 18, ishaAngle: 17, ishaMinutes: 0, asrShift: 0,
    adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    hijriAdjust: 0, hijriAtMaghrib: true,
    enabled: true,
    alerts: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true },
    reminders: [10], prayerSound: 'adhan-imadi', reminderSound: 'r-takbir-imadi', adhanLength: 0,
    volume: 1, muted: false, sticky: true, adhanName: '', daysShown: 7,
    mosques: [], mosque: null, cityCalc: null
  };
  const saved = store.get('mawqut.settings', {});
  const S = Object.assign({}, DEFAULTS, saved, {
    adjust: Object.assign({}, DEFAULTS.adjust, saved.adjust),
    alerts: Object.assign({}, DEFAULTS.alerts, saved.alerts)
  });
  if (saved.enabled === undefined) { S.enabled = true; S.volume = 1; }
  if (!S.city || !validTz(S.city.tz)) S.city = defaultCity();
  if (!S.method) S.method = E.COUNTRY_DEFAULTS[S.city.cc] || 'mwl';
  delete S.asr; // Asr à l'ombre simple (rite malikite)

  const SOUNDS = {
    'adhan-imadi': { label: 'Adhan · Ahmed al-Imadi', file: 'audio/adhan-imadi.mp3', adhan: true },
    'adhan-slimane': { label: 'Adhan · Mokhtar Hadj Slimane', file: 'audio/adhan-hadj-slimane.mp3', adhan: true },
    'adhan-hamathani': { label: 'Adhan · Majed al-Hamathani', file: 'audio/adhan-hamathani.mp3', adhan: true },
    takbir: { label: 'Takbîr seul · Ahmed al-Imadi (20 s)', file: 'audio/takbir-imadi.mp3' },
    'r-takbir-imadi': { label: 'Allâhou akbar · Ahmed al-Imadi (5 s)', file: 'audio/rappel-takbir-imadi.mp3' },
    'r-salah-imadi': { label: 'Hayya ‘ala s-salâh · Ahmed al-Imadi (10 s)', file: 'audio/rappel-salah-imadi.mp3' },
    'r-takbir-slimane': { label: 'Allâhou akbar · Mokhtar Hadj Slimane (15 s)', file: 'audio/rappel-takbir-hadj-slimane.mp3' },
    none: { label: 'Aucun son' }
  };
  const PRAYER_SOUNDS = ['adhan-imadi', 'adhan-slimane', 'adhan-hamathani', 'takbir', 'none'];
  const REMINDER_SOUNDS = ['r-takbir-imadi', 'r-salah-imadi', 'r-takbir-slimane', 'none'];
  if (!PRAYER_SOUNDS.includes(S.prayerSound)) S.prayerSound = S.prayerSound === 'none' ? 'none' : 'adhan-imadi';
  if (!REMINDER_SOUNDS.includes(S.reminderSound)) S.reminderSound = S.reminderSound === 'none' ? 'none' : 'r-takbir-imadi';
  const volPos = () => { const v = +S.volume; return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; };
  const vol = () => (S.muted ? 0 : volPos() * volPos());

  // ---------- Prières et dates ----------
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
  let fmtCache = {};
  const fmt = (key, opts) => fmtCache[key] || (fmtCache[key] = new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: S.city.tz }, opts)));
  const fmtTime = ms => (isFinite(ms) ? fmt('t', { hour: '2-digit', minute: '2-digit' }).format(ms) : '--:--');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const arDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  let version = 0, dayCache = null;
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
  // Période du ciel, comme sur le site : nuit, aube, matin, midi, après-midi, crépuscule
  function period(now) {
    const T = day(now).T;
    if (!isFinite(T.fajr) || now < T.fajr) return 'night';
    if (now < T.sunrise) return 'dawn';
    if (now < T.dhuhr) return 'morning';
    if (now < T.asr) return 'noon';
    if (now < T.maghrib) return 'afternoon';
    if (now < T.isha) return 'dusk';
    return 'night';
  }
  const nameOf = (k, D, isToday) => (k === 'dhuhr' && D.weekday === 5 && isToday !== false ? JUMUA : NAMES[k]);
  function duration(ms) {
    const total = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(total / 60), m = total % 60;
    if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
    return `${Math.max(1, m)} min`;
  }
  function hijriOf(now) {
    const D = day(now);
    const afterMaghrib = S.hijriAtMaghrib && now >= D.T.maghrib;
    return E.hijri(afterMaghrib ? E.addDays(D.today, 1) : D.today, +S.hijriAdjust || 0);
  }
  // Moment de la journée, pour proposer la bonne lecture (même logique que le site)
  function moment(at) {
    const now = at || Date.now();
    const D = day(now), T = D.T;
    if (!isFinite(T.maghrib) || !isFinite(T.fajr)) return 'jour';
    if (now >= T.maghrib || now < T.fajr) return 'nuit';
    if (D.weekday === 5) return 'vendredi';
    return isFinite(T.dhuhr) && now < T.dhuhr ? 'matin' : 'jour';
  }

  // ---------- Petit bus d'événements ----------
  const subs = {};
  const on = (n, f) => { (subs[n] = subs[n] || []).push(f); };
  const emit = (n, d) => (subs[n] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } });

  // ---------- Planning des alertes, confié à l'app ----------
  function soundFile(kind) {
    const key = kind === 'pre' ? S.reminderSound : S.prayerSound;
    if (key === 'none') return '';
    const def = SOUNDS[key];
    return def && def.file ? def.file : SOUNDS[kind === 'pre' ? 'r-takbir-imadi' : 'adhan-imadi'].file;
  }
  const adhanLen = () => { const d = SOUNDS[S.prayerSound]; return d && d.adhan ? (+S.adhanLength || 0) : 0; };
  const DAYS = 370;
  function schedule() {
    const now = Date.now();
    const zp = E.zonedParts(now, S.city.tz);
    let d = { y: zp.y, m: zp.m, d: zp.d };
    const out = [];
    const where = S.city.name;
    for (let i = 0; i < DAYS; i++, d = E.addDays(d, 1)) {
      const T = E.timesFor(S.city, d, S);
      const friday = isFinite(T.dhuhr) && E.zonedParts(T.dhuhr, S.city.tz).weekday === 5;
      for (const k of ORDER) {
        const ms = T[k];
        if (!S.alerts[k] || !isFinite(ms) || ms <= now) continue;
        const nm = k === 'dhuhr' && friday ? JUMUA : NAMES[k];
        const time = fmtTime(ms);
        if (k === 'sunrise') {
          out.push({ t: ms, kind: 'info', k, ar: nm.ar, title: 'Lever du soleil', body: `Le temps de Fajr est terminé (${time}).`, sound: soundFile('pre') });
          continue;
        }
        out.push({ t: ms, kind: 'now', k, ar: nm.ar, title: `C'est l'heure de ${nm.fr}`, body: `${time} à ${where}.`, sound: soundFile('now'), len: adhanLen() });
        for (const r of S.reminders || []) {
          const at = ms - r * 60000;
          if (+r > 0 && at > now) out.push({ t: at, kind: 'pre', k, ar: nm.ar, title: `${nm.fr} dans ${r} min`, body: `À ${time} à ${where}. Le temps de faire tes ablutions.`, sound: soundFile('pre') });
        }
      }
    }
    out.sort((a, b) => a.t - b.t);
    return { v: 1, enabled: !!S.enabled, volume: vol(), city: where, events: out };
  }
  let pushT = 0;
  function pushSchedule() {
    clearTimeout(pushT);
    pushT = setTimeout(() => {
      if (bridge) { try { bridge.setSchedule(JSON.stringify(schedule())); } catch (e) { /* rien */ } }
      emit('schedule');
    }, 200);
  }
  function testAlert() {
    const now = Date.now();
    const { D, next } = situation(now);
    if (!next) return;
    const nm = nameOf(next.k, D, !next.tomorrow);
    const ev = { t: now, kind: 'test', k: next.k, ar: nm.ar, title: `Test : ${nm.fr}`, body: `Voilà ce que tu verras et entendras à ${fmtTime(next.ms)}.`, sound: soundFile('now'), len: adhanLen() };
    if (bridge) { try { bridge.test(JSON.stringify(ev), vol()); } catch (e) { /* rien */ } }
    else showAlert(ev);
  }
  function info() { if (!bridge) return { overlay: true }; try { return JSON.parse(bridge.info()) || {}; } catch (e) { return {}; } }
  function save() {
    store.set('mawqut.settings', S);
    version++; dayCache = null; fmtCache = {};
    // les pages se redessinent : on garde la sélection sur le même réglage
    const a = document.activeElement;
    const sel = a && a.id ? '#' + a.id : (a && a.dataset && a.dataset.k ? `[data-k="${a.dataset.k}"]` : null);
    const scope = a && a.closest ? a.closest('.page, .layer') : null;
    emit('settings');
    if (sel && a && !a.isConnected) { const n = ((scope && scope.isConnected) ? scope : document).querySelector(sel); if (n) n.focus({ preventScroll: true }); }
    pushSchedule();
  }

  // ---------- Message bref ----------
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 3800);
  }

  // =====================================================================
  //  Navigation à la télécommande
  // =====================================================================
  const SEL = 'button:not([disabled]), a[href], input:not([type="hidden"]), select, [tabindex="0"]';
  const rail = $('#rail');
  const pages = {};
  let current = null;
  const lastFocus = {};
  const layers = [];

  function rectOf(el) {
    let r = el.getBoundingClientRect();
    if ((r.width < 4 || r.height < 4) && el.labels && el.labels[0]) r = el.labels[0].getBoundingClientRect();
    return r;
  }
  function usable(el) {
    if (el.disabled || el.closest('[hidden], [inert], .is-off')) return null;
    const r = rectOf(el);
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    return r;
  }
  function candidates(zone) {
    const out = [];
    for (const el of zone.querySelectorAll(SEL)) { const r = usable(el); if (r) out.push({ el, r }); }
    return out;
  }
  function scrollerOf(el, zone) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n !== el) {
        const cs = getComputedStyle(n);
        if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
      }
      if (n === zone) break;
    }
    if (zone) {
      const cs = getComputedStyle(zone);
      if (/(auto|scroll)/.test(cs.overflowY)) return zone;
    }
    return document.scrollingElement || document.documentElement;
  }
  function viewOf(sc) {
    if (sc === document.scrollingElement || sc === document.documentElement) return { top: 0, bottom: innerHeight, left: 0, right: innerWidth, height: innerHeight };
    const r = sc.getBoundingClientRect();
    // scroll-padding : bandeaux posés par-dessus la zone qui défile (en-tête du lecteur du Coran)
    const cs = getComputedStyle(sc);
    const pt = parseFloat(cs.scrollPaddingTop) || 0, pb = parseFloat(cs.scrollPaddingBottom) || 0;
    const top = Math.max(0, r.top + pt), bottom = Math.min(innerHeight, r.bottom - pb);
    return { top, bottom, left: r.left, right: r.right, height: bottom - top };
  }
  const inView = (r, v) => r.bottom > v.top + 6 && r.top < v.bottom - 6;
  const canScroll = (sc, dir) => (dir === 'down' ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : dir === 'up' ? sc.scrollTop > 2 : false);
  function scrollStep(sc, dir, frac) {
    sc.scrollBy({ top: (dir === 'down' ? 1 : -1) * viewOf(sc).height * (frac || 0.55), behavior: 'smooth' });
  }

  function score(dir, from, r) {
    const fx = (from.left + from.right) / 2, fy = (from.top + from.bottom) / 2;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    if (dir === 'down' || dir === 'up') {
      // marge de 6 px : la carte sélectionnée avance un peu (translateY), ses voisines ne sont pas « en dessous »
      if (dir === 'down' ? !(cy > fy + 6 && r.top >= from.top + 6) : !(cy < fy - 6 && r.bottom <= from.bottom - 6)) return Infinity;
      const main = dir === 'down' ? Math.max(0, r.top - from.bottom) : Math.max(0, from.top - r.bottom);
      const overlap = Math.min(r.right, from.right) - Math.max(r.left, from.left);
      return main + (overlap > 0 ? 0 : -overlap) * 2.5 + Math.abs(cx - fx) * 0.02;
    }
    if (dir === 'right' ? !(cx > fx + 2 && r.left >= from.left + 2) : !(cx < fx - 2 && r.right <= from.right - 2)) return Infinity;
    const main = dir === 'right' ? Math.max(0, r.left - from.right) : Math.max(0, from.left - r.right);
    const overlap = Math.min(r.bottom, from.bottom) - Math.max(r.top, from.top);
    return main + (overlap > 0 ? 0 : -overlap) * 3 + Math.abs(cy - fy) * 0.02;
  }

  function ensureVisible(el) {
    const sc = scrollerOf(el, zoneOf(el));
    const v = viewOf(sc);
    const r = rectOf(el);
    const pad = Math.min(72, v.height * 0.16);
    let dy = 0;
    if (r.top < v.top + pad) dy = r.top - v.top - pad;
    else if (r.bottom > v.bottom - pad) dy = Math.min(r.bottom - v.bottom + pad, r.top - v.top - pad);
    if (dy) {
      const target = sc.scrollTop + dy;
      sc.scrollTo({ top: target < 90 ? 0 : target, behavior: 'smooth' });
    }
    // rangées qui défilent à l'horizontale
    const row = el.closest('[data-hscroll]');
    if (row) {
      const rr = row.getBoundingClientRect();
      if (r.left < rr.left + 8 || r.right > rr.right - 8) row.scrollBy({ left: r.left < rr.left + 8 ? r.left - rr.left - 40 : r.right - rr.right + 40, behavior: 'smooth' });
    }
  }
  function focusEl(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    ensureVisible(el);
  }

  function topLayer() { return layers.length ? layers[layers.length - 1] : null; }
  function zoneOf(el) {
    const L = topLayer();
    if (L) return L.el;
    if (el && rail.contains(el)) return rail;
    return pages[current] ? pages[current].el : $('#stage');
  }
  // premier élément visible, dans l'ordre de lecture
  function firstIn(zone, fromBottom) {
    const list = candidates(zone);
    if (!list.length) return null;
    const sc = scrollerOf(list[0].el, zone);
    const v = viewOf(sc);
    const seen = list.filter(c => inView(c.r, v));
    const pool = seen.length ? seen : list;
    const row = c => Math.round(c.r.top / 20);
    pool.sort((a, b) => row(a) - row(b) || a.r.left - b.r.left);
    return (fromBottom ? pool[pool.length - 1] : pool[0]).el;
  }

  function move(dir) {
    const active = document.activeElement;
    const zone = zoneOf(active);
    let cur = active && active !== document.body && zone.contains(active) && active.matches(SEL) ? active : null;
    const sc = scrollerOf(cur || zone.querySelector(SEL) || zone, zone);
    const v = viewOf(sc);
    if (cur && !inView(rectOf(cur), v) && sc.contains(cur)) {
      // l'élément choisi a défilé hors de l'écran : on le lâche (OK ne doit pas l'activer à l'aveugle)
      cur = null;
      if (sc.hasAttribute('tabindex')) sc.focus({ preventScroll: true }); else active.blur();
    }

    // Texte long : on lit d'abord tout l'élément sélectionné avant de passer au suivant.
    if (cur && (dir === 'down' || dir === 'up') && sc.contains(cur)) {
      const r = rectOf(cur);
      if (dir === 'down' && r.bottom > v.bottom - 12 && canScroll(sc, 'down')) { scrollStep(sc, 'down'); return true; }
      if (dir === 'up' && r.top < v.top + 12 && canScroll(sc, 'up')) { scrollStep(sc, 'up'); return true; }
    }

    const list = candidates(zone).filter(c => c.el !== cur);
    if (!cur) {
      if ((dir === 'down' || dir === 'up') && zone !== rail) {
        // Rien de sélectionné à l'écran (texte long lu au défilement) : on reprend sur ce qui est visible,
        // sinon on continue de défiler. Jamais de saut vers un élément lointain.
        if (list.some(c => inView(c.r, v))) { focusEl(firstIn(zone, dir === 'up')); return true; }
        if (canScroll(sc, dir)) { scrollStep(sc, dir, 0.6); return true; }
        if (sc.hasAttribute('data-read')) return true; // début ou fin du texte : on reste là
      }
      if (dir === 'down' || dir === 'up' || zone === rail) { const f = firstIn(zone, dir === 'up'); if (f) { focusEl(f); return true; } }
    }
    const from = cur ? rectOf(cur) : { top: v.top, bottom: v.top, left: v.left, right: v.right };
    let best = null, bestScore = Infinity;
    for (const c of list) {
      const s = score(dir, from, c.r);
      if (s < bestScore) { bestScore = s; best = c; }
    }
    if ((dir === 'down' || dir === 'up') && canScroll(sc, dir)) {
      const reach = v.height * 0.45;
      const near = best && (dir === 'down' ? best.r.top <= v.bottom + reach : best.r.bottom >= v.top - reach);
      if (!near) { scrollStep(sc, dir, 0.6); return true; }
    }
    if (best) { focusEl(best.el); return true; }
    return false;
  }

  // ---------- Pages ----------
  function page(id, def) {
    pages[id] = Object.assign({ el: $('#p-' + id), rendered: false }, def);
  }
  function railItem(id) { return $(`.rail-i[data-page="${id}"]`); }
  let railT = 0;
  function showPage(id) {
    clearTimeout(railT);
    const P = pages[id];
    if (!P) return;
    if (!P.rendered && P.render) { P.render(P.el); P.rendered = true; }
    if (current === id) return;
    if (pages[current] && pages[current].hide) pages[current].hide();
    Object.values(pages).forEach(p => { p.el.hidden = p !== P; });
    current = id;
    $$('.rail-i').forEach(b => b.classList.toggle('is-current', b.dataset.page === id));
    if (P.show) P.show(P.el);
  }
  function enterContent() {
    const P = pages[current];
    if (!P) return;
    const last = lastFocus[current];
    if (last && last.isConnected && usable(last)) { focusEl(last); return; }
    const f = (P.firstFocus && P.firstFocus()) || firstIn(P.el);
    if (f) focusEl(f);
  }
  rail.addEventListener('focusin', e => {
    const b = e.target.closest('.rail-i');
    if (!b) return;
    clearTimeout(railT);
    if (b.dataset.page) railT = setTimeout(() => showPage(b.dataset.page), 120);
  });
  rail.addEventListener('click', e => {
    const b = e.target.closest('.rail-i');
    if (!b) return;
    clearTimeout(railT);
    if (b.dataset.act) { emit('rail-act', b.dataset.act); return; }
    showPage(b.dataset.page);
    enterContent();
  });
  $('#stage').addEventListener('focusin', e => { lastFocus[current] = e.target; document.body.classList.remove('in-rail'); });
  rail.addEventListener('focusin', () => document.body.classList.add('in-rail'));

  // ---------- Fenêtres (lecture, choix, recherche) ----------
  function openLayer(el, opts) {
    const o = opts || {};
    const opener = document.activeElement;
    el.hidden = false;
    if (!el.isConnected) document.body.appendChild(el);
    layers.push({ el, opener, o });
    document.body.classList.add('has-layer');
    requestAnimationFrame(() => el.classList.add('is-open'));
    const f = (o.focus && (typeof o.focus === 'function' ? o.focus() : o.focus)) || firstIn(el);
    if (f) setTimeout(() => focusEl(f), 30);
    return el;
  }
  function closeLayer() {
    const L = layers.pop();
    if (!L) return false;
    L.el.classList.remove('is-open');
    if (L.o.remove) L.el.remove(); else L.el.hidden = true;
    if (L.o.onClose) L.o.onClose();
    if (!layers.length) document.body.classList.remove('has-layer');
    if (L.opener && L.opener.isConnected && usable(L.opener)) focusEl(L.opener);
    else if (topLayer()) { const f = firstIn(topLayer().el); if (f) focusEl(f); }
    else enterContent();
    return true;
  }
  // Fenêtre de choix : une liste, OK choisit
  function choose(title, options, currentValue, onPick, extra) {
    const el = document.createElement('div');
    el.className = 'layer sheet';
    el.innerHTML = `<div class="sheet-card" role="dialog" aria-label="${esc(title)}">
        <h2>${esc(title)}</h2>
        ${extra && extra.hint ? `<p class="sheet-hint">${esc(extra.hint)}</p>` : ''}
        <div class="choices">${options.map((o, i) => `<div class="choice-row">
          <button type="button" class="choice${o.value === currentValue ? ' is-on' : ''}" data-i="${i}">
            <span class="choice-l">${esc(o.label)}</span>${o.sub ? `<span class="choice-s">${esc(o.sub)}</span>` : ''}
            <svg class="choice-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>${o.preview ? `<button type="button" class="choice-play" data-p="${i}" aria-label="Écouter">${ICON_PLAY}</button>` : ''}</div>`).join('')}</div>
      </div>`;
    el.addEventListener('click', e => {
      const p = e.target.closest('[data-p]');
      if (p) { const o = options[+p.dataset.p]; if (o.preview) o.preview(); return; }
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const o = options[+b.dataset.i];
      closeLayer();
      onPick(o.value, o);
    });
    openLayer(el, { remove: true, focus: () => el.querySelector('.choice.is-on') || el.querySelector('.choice'), onClose: extra && extra.onClose });
  }
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/></svg>';

  // ---------- Alerte affichée dans l'app (si la superposition n'est pas autorisée) ----------
  function showAlert(ev) {
    const old = $('.layer.alert-layer'); if (old) closeLayer();
    const el = document.createElement('div');
    el.className = 'layer sheet alert-layer';
    el.innerHTML = `<div class="sheet-card alert-card" role="alertdialog">
        <p class="alert-ar" lang="ar">${esc(ev.ar || '')}</p>
        <h2>${esc(ev.title || '')}</h2><p class="alert-body">${esc(ev.body || '')}</p>
        <button type="button" class="tb tb-gold" data-ok>J’y vais</button>
      </div>`;
    el.querySelector('[data-ok]').addEventListener('click', () => closeLayer());
    openLayer(el, { remove: true, onClose: () => { if (bridge) { try { bridge.stopSound(); } catch (e) { /* rien */ } } } });
  }

  // ---------- Touches ----------
  const DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const MEDIA = new Set(['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaTrackNext', 'MediaTrackPrevious', 'MediaFastForward', 'MediaRewind']);
  const TEXT = /^(text|search|email|number|tel|url|password)$/;
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const L = topLayer();
    const hook = L ? L.o.onKey : (pages[current] && !rail.contains(t) ? pages[current].onKey : null);
    if (MEDIA.has(e.key)) { e.preventDefault(); emit('media', e.key); return; }
    const isText = t && t.tagName === 'INPUT' && TEXT.test(t.type);
    if (e.key === 'Enter' || e.keyCode === 13) {
      if (isText) { if (bridge && bridge.showKeyboard) { try { bridge.showKeyboard(); } catch (x) { /* rien */ } } if (hook && hook(e, 'ok')) e.preventDefault(); return; }
      if (e.repeat) { e.preventDefault(); return; }
      if (hook && hook(e, 'ok')) { e.preventDefault(); return; }
      if (t && t !== document.body && t.matches(SEL)) {
        e.preventDefault();
        const sc = scrollerOf(t, zoneOf(t));
        if (sc && sc.contains(t) && !inView(rectOf(t), viewOf(sc))) return; // hors de l'écran : rien
        t.click();
      }
      return;
    }
    if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      const dir = e.key === 'PageDown' ? 'next' : 'prev';
      if (hook && hook(e, dir)) return;
      const zone = zoneOf(t);
      const sc = scrollerOf(t && zone.contains(t) ? t : zone, zone);
      scrollStep(sc, dir === 'next' ? 'down' : 'up', 0.85);
      return;
    }
    const dir = DIRS[e.key];
    if (!dir) return;
    if (isText && (dir === 'left' || dir === 'right') && t.value) return;
    e.preventDefault();
    if (hook && hook(e, dir)) return;
    if (move(dir)) return;
    // Bords : à gauche du contenu, on revient au menu ; depuis le menu, → entre dans la page.
    if (!L && dir === 'left' && !rail.contains(t)) { const b = railItem(current); if (b) b.focus(); return; }
    if (!L && dir === 'right' && rail.contains(t)) { enterContent(); return; }
    if (dir === 'up') { const zone = zoneOf(t); const sc = scrollerOf(t && zone.contains(t) ? t : zone, zone); if (canScroll(sc, 'up')) sc.scrollTo({ top: 0, behavior: 'smooth' }); }
  });

  // Retour de la télécommande (appelé par l'app) : ferme, puis remonte, puis quitte.
  window.aminTvBack = () => {
    const z = $('#figZoom');
    if (z && z.open) { z.close(); return 'handled'; }
    if (closeLayer()) return 'handled';
    const a = document.activeElement;
    if (!rail.contains(a)) { const b = railItem(current); if (b) { b.focus(); return 'handled'; } }
    if (current !== 'home') { showPage('home'); railItem('home').focus(); return 'handled'; }
    return 'exit';
  };
  window.aminTvResume = () => { dayCache = null; pushSchedule(); emit('resume'); };
  window.aminTvAlert = json => { let ev = {}; try { ev = JSON.parse(json); } catch (e) { return; } showAlert(ev); };

  // Pour le guide (js/learn.js) : volume et arrêt de l'alerte
  window.Mawqut = { gain: vol, store, stopAlertSound() { if (bridge) { try { bridge.stopSound(); } catch (e) { /* rien */ } } } };

  // l'écran reste allumé pendant une récitation
  // (l'écran calme a sa propre raison de rester allumé ; sa vidéo ne compte pas comme une récitation)
  let playingMedia = 0;
  const reasons = new Set();
  const awake = () => { if (bridge) { try { bridge.keepAwake(playingMedia > 0 || reasons.size > 0); } catch (e) { /* rien */ } } };
  const setAwake = (on, who) => { const k = who || 'player'; if (on) reasons.add(k); else reasons.delete(k); awake(); };
  const counted = e => e.target && e.target.tagName === 'AUDIO';
  document.addEventListener('play', e => { if (counted(e)) { playingMedia++; awake(); } }, true);
  ['pause', 'ended', 'emptied'].forEach(t => document.addEventListener(t, e => { if (counted(e)) { playingMedia = Math.max(0, playingMedia - 1); awake(); } }, true));
  const busy = () => playingMedia > 0 || reasons.has('player');

  window.TV = {
    $, $$, esc, store, bridge, E, S, SOUNDS, PRAYER_SOUNDS, REMINDER_SOUNDS, ORDER, PRAYERS, NAMES, JUMUA,
    vol, volPos, save, day, situation, nameOf, fmt, fmtTime, cap, arDigits, duration, hijriOf, moment,
    searchCities, pickCity, placeSubtitle, countryName,
    on, emit, pushSchedule, testAlert, info, toast,
    awake: setAwake, busy, period, page, showPage, enterContent, openLayer, closeLayer, topLayer, choose, focusEl, firstIn, ensureVisible, scrollerOf, viewOf, canScroll, scrollStep,
    get current() { return current; }, railItem, ICON_PLAY, ICON_PAUSE, showAlert
  };
})();
