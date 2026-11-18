/*
 * Amin TV — Mes mosquées : un profil par mosquée, calé sur ses horaires de quelques dates
 * (21 mars, 21 juin, 21 septembre proposés d'office). Le calcul et le calage sont communs au site,
 * à l'appli PC et à la télé (js/mosques.js). Aucune donnée n'est téléchargée : on recopie les horaires
 * affichés par la mosquée (son calendrier ou l'appli Mawaqit).
 */
(() => {
  'use strict';
  const T = window.TV;
  const { $, esc, S, E } = T;
  if (!Array.isArray(S.mosques)) S.mosques = [];
  const MQ = window.AminMosques;
  const KEYS = MQ.KEYS; // fajr, sunrise, dhuhr, asr, maghrib, isha
  const PARAMS = ['method', 'fajrAngle', 'ishaAngle', 'ishaMinutes', 'asrShift'];
  const ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const ICON_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>';

  const clone = o => JSON.parse(JSON.stringify(o));
  const pick = () => { const p = {}; PARAMS.forEach(k => { p[k] = S[k]; }); p.adjust = clone(S.adjust || {}); return p; };
  const active = () => S.mosques.find(m => m.id === S.mosque) || null;
  const place = () => { const m = active(); return m ? m.name : S.city.name; };
  const hhmm = MQ.hhmm;
  // Calcul et calage : partie commune au site, à l'appli PC et à la télé (js/mosques.js)
  const calc = (city, date, p) => MQ.calc(city, date, p, S.highLat);
  const fit = (city, samples, prev) => MQ.fit(city, samples, prev, S.highLat);
  const verdictOf = m => (m && m.samples && m.samples.length ? MQ.verdict(m.city, m.samples, m.params, S.highLat) : null);
  const ruleLabel = MQ.ruleLabel;

  // ---------- Activer, quitter ----------
  function activate(m) {
    if (!S.mosque) S.cityCalc = pick(); // pour revenir ensuite au calcul de la ville
    S.city = clone(m.city);
    Object.assign(S, { asrShift: 0 }, clone(m.params));
    S.mosque = m.id;
    T.save();
  }
  // Calcul de la ville : celui d'avant la mosquée, sauf s'il n'était qu'une copie d'une mosquée (méthode du pays alors)
  function cityParams() {
    const c = S.cityCalc;
    const dup = c && S.mosques.some(m => JSON.stringify(m.params) === JSON.stringify(c));
    if (c && !dup) return clone(c);
    return { method: E.COUNTRY_DEFAULTS[S.city.cc] || 'mwl', fajrAngle: S.fajrAngle, ishaAngle: S.ishaAngle, ishaMinutes: 0, asrShift: 0, adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } };
  }
  function leave(noSave) {
    if (!S.mosque) return;
    Object.assign(S, { asrShift: 0 }, cityParams());
    S.mosque = null;
    S.cityCalc = null;
    if (!noSave) T.save();
  }
  // Un réglage changé à la main (méthode, minutes) pendant qu'une mosquée est choisie : le profil suit
  function syncActive() { const m = active(); if (m) m.params = pick(); }

  // ---------- Saisie des horaires de la mosquée ----------
  // Une puce par date : 21 mars, 21 juin, 21 septembre, aujourd'hui, et les dates déjà recopiées.
  // Les heures partent du calcul actuel ; une date compte dès qu'on change une de ses heures (ou avec le bouton).
  function editor(m) {
    const city = m ? m.city : S.city;
    const today = MQ.todayOf(city);
    const ref = m ? m.params : pick();
    const now = pick();
    const days = [];
    const add = (date, label) => { if (!days.some(x => MQ.sameDay(x.date, date))) days.push({ date, label }); };
    MQ.proposedDates(today.y).forEach(d => add(d, MQ.dateLabel(d, true)));
    add(today, 'Aujourd’hui');
    ((m && m.samples) || []).forEach(sm => add(sm.date, MQ.dateLabel(sm.date, true)));
    for (const d of days) {
      const sm = ((m && m.samples) || []).find(x => MQ.sameDay(x.date, d.date));
      const start = sm ? sm.t : calc(city, d.date, ref);
      d.t = {}; KEYS.forEach(k => { d.t[k] = isFinite(start[k]) ? start[k] : 0; });
      d.used = !!sm;
      d.amin = calc(city, d.date, now);
    }
    let cur = Math.max(0, days.findIndex(d => !d.used));
    const el = document.createElement('div');
    el.className = 'layer sheet mosque-ed';
    el.innerHTML = `<div class="sheet-card wide" role="dialog" aria-label="${m ? 'Caler la mosquée' : 'Ajouter une mosquée'}">
        <h2>${m ? `Caler « ${esc(m.name)} »` : 'Ajouter une mosquée'}</h2>
        <p class="sheet-hint">Recopie les horaires de la mosquée pour ces dates : son calendrier, ou l’appli Mawaqit › Calendrier. Les trois premières suffisent pour toute l’année. Sur une heure : <b>←</b> <b>→</b> une minute (maintiens pour aller vite), <b>CH−</b> <b>CH+</b> dix minutes.</p>
        ${m ? '' : `<div class="ed-name"><span>Nom</span><input class="input" type="text" autocomplete="off" value="${esc(S.mosques.length ? 'Mosquée ' + (S.mosques.length + 1) : 'Ma mosquée')}" aria-label="Nom de la mosquée"></div>`}
        <div class="ed-dates">${days.map((d, i) => `<button type="button" class="ed-date" data-i="${i}">${esc(d.label)}<span class="ed-ok" aria-hidden="true"></span></button>`).join('')}</div>
        <div class="ed-times">${KEYS.map(k => `<div class="ed-cell">
            <span class="ed-l">${esc(T.NAMES[k].fr)} <span lang="ar">${esc(T.NAMES[k].ar)}</span></span>
            <button type="button" class="ed-t tnum" data-k="${k}" aria-label="${esc(T.NAMES[k].fr)}"><i aria-hidden="true">‹</i><b></b><i aria-hidden="true">›</i></button>
            <span class="ed-d" data-d="${k}"></span>
          </div>`).join('')}</div>
        <div class="ed-foot"><button type="button" class="ed-use" data-use></button><span class="ed-state"></span></div>
        <p class="sheet-hint ed-city">Ville : ${esc(city.name)}. ${m ? '' : 'Si la mosquée est dans une autre ville, choisis d’abord cette ville dans Réglages.'}</p>
        <div class="actions"><button type="button" class="tb tb-gold" data-save>${m ? 'Enregistrer' : 'Créer et utiliser'}</button><button type="button" class="tb" data-cancel>Annuler</button></div>
      </div>`;
    const showCell = k => {
      const d = days[cur];
      el.querySelector(`[data-k="${k}"] b`).textContent = hhmm(d.t[k]);
      const diff = d.t[k] - d.amin[k];
      el.querySelector(`[data-d="${k}"]`).textContent = isFinite(diff) && diff ? `Amin : ${hhmm(d.amin[k])} (${diff > 0 ? '+' : '−'}${Math.abs(diff)} min)` : '';
    };
    const showState = () => {
      const d = days[cur];
      el.querySelectorAll('.ed-date').forEach((b, i) => { b.classList.toggle('is-cur', i === cur); b.classList.toggle('is-used', days[i].used); b.setAttribute('aria-pressed', String(i === cur)); });
      el.querySelector('[data-use]').textContent = d.used ? 'Date prise en compte' : 'Prendre cette date en compte';
      el.querySelector('[data-use]').classList.toggle('is-on', d.used);
      const n = days.filter(x => x.used).length;
      el.querySelector('.ed-state').textContent = d.used
        ? `${n} date${n > 1 ? 's' : ''} recopiée${n > 1 ? 's' : ''}`
        : `${MQ.dateLabel(d.date)} : heures calculées par Amin, à remplacer par celles de la mosquée`;
    };
    const showDay = i => { cur = i; KEYS.forEach(showCell); showState(); };
    showDay(cur);
    el.addEventListener('focusin', e => { const b = e.target.closest('.ed-date'); if (b && +b.dataset.i !== cur) showDay(+b.dataset.i); });
    el.addEventListener('click', e => {
      if (e.target.closest('[data-cancel]')) { T.closeLayer(); return; }
      const dt = e.target.closest('.ed-date');
      if (dt) { showDay(+dt.dataset.i); T.focusEl(el.querySelector('.ed-t')); return; }
      if (e.target.closest('[data-use]')) { days[cur].used = !days[cur].used; showState(); return; }
      if (!e.target.closest('[data-save]')) return;
      const input = el.querySelector('.ed-name input');
      const name = (input ? input.value : m.name).trim().slice(0, 40) || 'Ma mosquée';
      const used = days.filter(d => d.used);
      if (!used.length) { T.toast('Recopie les horaires d’au moins une date'); return; }
      const bad = used.find(d => !MQ.validTimes(d.t).ok);
      if (bad) { showDay(days.indexOf(bad)); T.toast(`Les horaires du ${MQ.dateLabel(bad.date)} ne sont pas dans l’ordre de la journée`); return; }
      const samples = used.map(d => ({ date: d.date, t: Object.assign({}, d.t) })).slice(-8);
      const params = fit(city, samples, m && m.params);
      const prof = m || { id: 'm' + Date.now().toString(36), name, city: clone(city) };
      prof.name = name; prof.params = params; prof.samples = samples;
      if (!m) S.mosques.push(prof);
      T.closeLayer();
      activate(prof);
      report(prof);
    });
    T.openLayer(el, {
      remove: true,
      focus: () => el.querySelector('.ed-name input') || el.querySelector('.ed-date.is-cur') || el.querySelector('.ed-t'),
      onKey: (e, dir) => {
        const a = document.activeElement;
        const cell = a && a.closest && a.closest('.ed-t');
        if (cell && (dir === 'left' || dir === 'right' || dir === 'next' || dir === 'prev')) {
          const k = cell.dataset.k;
          days[cur].t[k] += dir === 'right' ? 1 : dir === 'left' ? -1 : dir === 'prev' ? 10 : -10; // CH+ (page précédente) : +10
          if (!days[cur].used) { days[cur].used = true; showState(); }
          showCell(k);
          return true;
        }
        // OK sur le clavier de la télé : on passe aux dates
        if (dir === 'ok' && a && a.tagName === 'INPUT') { setTimeout(() => T.focusEl(el.querySelector('.ed-date.is-cur') || el.querySelector('.ed-t')), 50); return true; }
        return false;
      }
    });
  }
  // Après le calage : un mot rapide, ou un avertissement si la mosquée fixe des heures à la main
  function report(m) {
    const v = verdictOf(m);
    if (!v) { T.toast(`${m.name} : réglé (${ruleLabel(m.params)})`); return; }
    const txt = MQ.verdictText(v);
    if (!txt.warn && !txt.body) { T.toast(`${m.name} : ${txt.title.charAt(0).toLowerCase()}${txt.title.slice(1)}`); return; }
    const el = document.createElement('div');
    el.className = 'layer sheet';
    el.innerHTML = `<div class="sheet-card${txt.warn ? ' is-warn' : ''}" role="alertdialog" aria-label="${esc(m.name)}">
        <h2>${esc(txt.warn ? txt.title : m.name)}</h2>
        <p class="sheet-hint">${esc(txt.warn ? txt.body : txt.title + ' ' + txt.body)}</p>
        <p class="sheet-hint">${esc(ruleLabel(m.params))}</p>
        <div class="actions"><button type="button" class="tb tb-gold" data-ok>Compris</button>${v.missing.length || txt.warn ? '<button type="button" class="tb" data-more>Recopier d’autres dates</button>' : ''}</div>
      </div>`;
    el.addEventListener('click', e => {
      if (e.target.closest('[data-ok]')) T.closeLayer();
      else if (e.target.closest('[data-more]')) { T.closeLayer(); editor(m); }
    });
    T.openLayer(el, { remove: true, focus: () => el.querySelector('[data-ok]') });
  }

  // ---------- Choisir, caler, supprimer ----------
  function statusOf(m) {
    const v = verdictOf(m);
    if (!v) return '';
    if (v.level === 'manual') return ` · heures fixées à la main, à ${v.worst} min près`;
    if (v.missing.includes('summer')) return ' · à compléter : 21 juin';
    return ` · calée sur ${v.count} date${v.count > 1 ? 's' : ''}`;
  }
  function chooser() {
    const cur = active();
    const el = document.createElement('div');
    el.className = 'layer sheet';
    const row = (key, label, sub, on, tools) => `<div class="choice-row">
        <button type="button" class="choice${on ? ' is-on' : ''}" data-pick="${key}"><span class="choice-l">${esc(label)}</span><span class="choice-s">${esc(sub)}</span>
          <svg class="choice-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        ${tools ? `<button type="button" class="choice-play" data-cal="${key}" aria-label="Recopier des horaires">${ICON_CLOCK}</button><button type="button" class="choice-play" data-del="${key}" aria-label="Supprimer">${ICON_TRASH}</button>` : ''}
      </div>`;
    const cityCalc = S.mosque ? cityParams() : pick();
    const cityRule = cityCalc.method === 'custom' ? 'Méthode personnalisée' : ((E.METHODS[cityCalc.method] || {}).label || 'Méthode du pays');
    el.innerHTML = `<div class="sheet-card" role="dialog" aria-label="Horaires de ma mosquée">
        <h2>Horaires de ma mosquée</h2>
        <p class="sheet-hint">Chaque mosquée garde sa propre façon de compter. Le bouton horloge recopie d’autres dates, la corbeille supprime la mosquée.</p>
        <div class="choices">
          ${row('city', `Calcul pour ${S.city.name}`, cityRule, !cur, false)}
          ${S.mosques.map(m => row(m.id, m.name, `${m.city.name} · ${ruleLabel(m.params)}${statusOf(m)}`, cur && cur.id === m.id, true)).join('')}
          <div class="choice-row"><button type="button" class="choice" data-add><span class="choice-l">Ajouter une mosquée</span><span class="choice-s">En recopiant ses horaires de trois dates</span></button></div>
        </div>
      </div>`;
    el.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) { T.closeLayer(); editor(null); return; }
      const cal = e.target.closest('[data-cal]');
      if (cal) { const m = S.mosques.find(x => x.id === cal.dataset.cal); T.closeLayer(); if (m) editor(m); return; }
      const del = e.target.closest('[data-del]');
      if (del) {
        const m = S.mosques.find(x => x.id === del.dataset.del);
        if (!m) return;
        T.closeLayer();
        T.choose(`Supprimer « ${m.name} » ?`, [{ value: 'no', label: 'Garder cette mosquée' }, { value: 'yes', label: 'Supprimer', sub: 'Ses réglages seront effacés' }], 'no', v => {
          if (v !== 'yes') return;
          if (S.mosque === m.id) leave(true);
          S.mosques = S.mosques.filter(x => x.id !== m.id);
          T.save();
          T.toast(`« ${m.name} » supprimée`);
        });
        return;
      }
      const p = e.target.closest('[data-pick]');
      if (!p) return;
      T.closeLayer();
      if (p.dataset.pick === 'city') { if (S.mosque) { leave(); T.toast(`Horaires calculés pour ${S.city.name}`); } return; }
      const m = S.mosques.find(x => x.id === p.dataset.pick);
      if (m && S.mosque !== m.id) { activate(m); T.toast(`Horaires de ${m.name}`); }
    });
    T.openLayer(el, { remove: true, focus: () => el.querySelector('.choice.is-on') || el.querySelector('.choice') });
  }

  // Depuis l'ordinateur : « méthode/Fajr/Icha/minutes/Nom_de_la_mosquée[/asr1] » crée ou met à jour la mosquée et la choisit
  // (asr1 : Asr calculé comme Mawaqit, asr0 : calcul exact ; sans rien, on garde le réglage du profil)
  const apply = window.aminTvApply;
  window.aminTvApply = str => {
    const parts = String(str || '').split('/');
    const name = (parts[4] || '').replace(/_/g, ' ').trim();
    if (!name) return apply(str);
    if (S.mosque) leave(true);
    const keep = pick();
    apply(parts.slice(0, 4).join('/'));
    let m = S.mosques.find(x => x.name === name && x.city.name === S.city.name);
    if (!m) { m = { id: 'm' + Date.now().toString(36), name, city: clone(S.city), samples: [] }; S.mosques.push(m); }
    const asr = /^asr(-?\d+(?:\.\d+)?)$/.exec(parts[5] || '');
    S.asrShift = asr ? +asr[1] : (m.params && +m.params.asrShift) || 0;
    m.params = pick();
    Object.assign(S, keep); // le calcul de la ville reste celui d'avant
    activate(m);
    return 'ok';
  };

  window.TVMosques = { chooser, editor, place, active, leave, syncActive, fit, calc, ruleLabel, verdictOf };
})();
