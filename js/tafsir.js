/* Explication d'un verset : fenêtre ouverte par le petit bouton « livre » de chaque verset.
 *
 * Contenu :
 *  - le verset (arabe, phonétique, traduction) et des boutons pour l'écouter ou le retrouver dans le livre ;
 *  - l'explication en français (Al-Mukhtasar fi tafsir al-Qur'an al-Karim, Centre Tafsir), embarquée dans l'application ;
 *  - le contexte : place du verset dans la sourate, versets qui précèdent et suivent ;
 *  - les notes de la traduction choisie ;
 *  - « Pour approfondir » (en anglais, connexion requise) : Ibn Kathir et circonstances de la révélation (al-Wâhidî).
 * API : MawqutQuran.explain(sourate, verset)
 */
(function () {
  'use strict';
  const Q = window.MawqutQuran;
  if (!Q) return;
  const META = Q.meta;
  const $ = s => document.querySelector(s);

  // ---------- Données : une sourate à la fois, chargée à la demande ----------
  const DATA = {}, waiting = {};
  const T = window.MawqutTafsir = {
    load(n, arr) { DATA[n] = arr; (waiting[n] || []).forEach(f => f(arr)); delete waiting[n]; },
    ensure(n) {
      if (DATA[n]) return Promise.resolve(DATA[n]);
      return new Promise((resolve, reject) => {
        const first = !waiting[n];
        (waiting[n] = waiting[n] || []).push(resolve);
        if (!first) return;
        const sc = document.createElement('script');
        sc.src = `tafsir/t${String(n).padStart(3, '0')}.js`;
        sc.onerror = () => { delete waiting[n]; sc.remove(); reject(new Error('Explication introuvable')); };
        document.head.appendChild(sc);
      });
    }
  };

  const dlg = $('#tafsirSheet');
  const body = $('#tfBody');
  if (!dlg || !body) return;
  const refEl = $('#tfRef');
  const prevBtn = $('#tfPrev'), nextBtn = $('#tfNext'), posEl = $('#tfPos');

  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const arNum = n => String(n).replace(/\d/g, x => '٠١٢٣٤٥٦٧٨٩'[x]);
  const count = s => META.surahs[s - 1][3];
  const hasArabic = t => /[؀-ۿ]/.test(t);
  const settings = () => { try { return JSON.parse(localStorage.getItem('mawqut.quran')) || {}; } catch (e) { return {}; } };

  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.500v5h3.600L12 18.500v-13L7.600 9.500H4Z" fill="currentColor"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linecap="round"/></svg>';
  const ICON_BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.500c2.500-1.200 5.500-1.200 9 .8 3.500-2 6.500-2 9-.8V18c-2.500-1.200-5.500-1.200-9 .8-3.500-2-6.500-2-9-.8V6.500Z" fill="none" stroke="currentColor" stroke-width="1.600" stroke-linejoin="round"/><path d="M12 7.300V19" stroke="currentColor" stroke-width="1.600"/></svg>';

  // ---------- Mise en forme du texte ----------
  // Le texte source marque les termes translittérés par une apostrophe inversée (`Allâhu) : on les met en italique.
  const TERM = /(^|[\s(«“"])`([^\s,.;:!?()«»[\]"“”–—]+)/gu;
  function richLine(text) {
    const frag = document.createDocumentFragment();
    let last = 0, m;
    TERM.lastIndex = 0;
    const src = text;
    while ((m = TERM.exec(src))) {
      // le séparateur capturé (espace, parenthèse…) reste du texte ordinaire ; seul le terme passe en italique
      frag.appendChild(document.createTextNode(src.slice(last, m.index + m[1].length).replace(/`/g, '')));
      frag.appendChild(el('i', 'tf-term', m[2]));
      last = m.index + m[0].length;
    }
    frag.appendChild(document.createTextNode(src.slice(last).replace(/`/g, '')));
    return frag;
  }
  function paragraphs(text, container) {
    String(text).split(/\n+/).map(x => x.trim()).filter(Boolean).forEach(line => {
      const bullet = /^[-–•]\s+/.test(line);
      const p = el('p', bullet ? 'tf-li' : '');
      if (hasArabic(line) && !/[A-Za-zÀ-ÿ]{3}/.test(line)) { p.className = 'tf-ar-line'; p.lang = 'ar'; p.textContent = line; }
      else p.appendChild(richLine(bullet ? line.replace(/^[-–•]\s+/, '') : line));
      container.appendChild(p);
    });
  }

  // ---------- Explications en anglais (réseau) ----------
  const CDN = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/';
  const EXTRA = {
    kathir: { slug: 'en-tafisr-ibn-kathir', title: 'Ibn Kathir · explication détaillée', note: 'Tafsir Ibn Kathir (abrégé), en anglais : récits, paroles du Prophète ﷺ et commentaires des Compagnons.' },
    wahidi: { slug: 'en-asbab-al-nuzul-by-al-wahidi', title: 'Circonstances de la révélation · al-Wâhidî', note: 'Asbâb an-nuzûl d’al-Wâhidî, en anglais : à quelle occasion le verset a été révélé.' }
  };
  const cache = {};
  async function fetchExtra(kind, s, v) {
    const k = `${kind}:${s}:${v}`;
    if (cache[k] !== undefined) return cache[k];
    const res = await fetch(`${CDN}${EXTRA[kind].slug}/${s}/${v}.json`);
    if (res.status === 404) return (cache[k] = '');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    return (cache[k] = String((j && j.text) || '').trim());
  }

  // ---------- Fenêtre ----------
  let cur = { s: 1, v: 1 };
  let token = 0;

  function groupOf(arr, v) {
    let a = v, b = v;
    while (a > 1 && arr[a - 1] === 0) a--;
    while (b < arr.length && arr[b] === 0) b++;
    return { a, b, text: arr[a - 1] };
  }
  function neighbour(s, v, dir) {
    if (dir > 0) return v < count(s) ? { s, v: v + 1 } : (s < 114 ? { s: s + 1, v: 1 } : null);
    return v > 1 ? { s, v: v - 1 } : (s > 1 ? { s: s - 1, v: count(s - 1) } : null);
  }
  const nameOf = s => META.surahs[s - 1][1];
  function juzOf(s, v) {
    let j = 1;
    META.juz.forEach((st, i) => { if (s > st[0] || (s === st[0] && v >= st[1])) j = i + 1; });
    return j;
  }

  function section(title) {
    const sec = el('section', 'tf-sec');
    if (title) sec.appendChild(el('h3', null, title));
    return sec;
  }

  function contextCard(label, pos, d, dir) {
    const b = el('button', 'tf-ctx');
    b.type = 'button';
    b.dataset.s = pos.s; b.dataset.v = pos.v;
    const tr = (settings().trans === 'hm' ? d.hm : d.rm)[pos.v - 1].replace(/\[\d+\]/g, '');
    b.appendChild(el('span', 'tf-ctx-k', `${label} · ${nameOf(pos.s)} ${pos.s}:${pos.v}`));
    const ar = el('span', 'tf-ctx-ar', d.ar[pos.v - 1]); ar.lang = 'ar';
    b.appendChild(ar);
    b.appendChild(el('span', 'tf-ctx-tr', tr));
    b.appendChild(el('span', 'tf-ctx-go', dir > 0 ? 'Lire l’explication du verset suivant' : 'Lire l’explication du verset précédent'));
    return b;
  }

  async function render() {
    const my = ++token;
    const { s, v } = cur;
    const [arS, name, meaning, total, mecc] = META.surahs[s - 1];
    refEl.textContent = `${name} · ${s}:${v}`;
    posEl.textContent = `Verset ${v} sur ${total}`;
    const pv = neighbour(s, v, -1), nx = neighbour(s, v, 1);
    prevBtn.disabled = !pv; nextBtn.disabled = !nx;
    body.replaceChildren(el('p', 'tf-wait', 'Chargement de l’explication…'));
    body.scrollTop = 0;

    let d, arr;
    try { [d, arr] = await Promise.all([Q.ensure(s), T.ensure(s)]); }
    catch (e) {
      if (my !== token) return;
      body.replaceChildren(el('p', 'tf-wait', 'Cette explication n’est pas encore disponible hors connexion. Reconnecte-toi une fois pour la charger : elle restera ensuite disponible sans réseau.'));
      return;
    }
    if (my !== token) return;
    const set = settings();
    const frag = document.createDocumentFragment();

    // 1. Le verset
    const verse = el('section', 'tf-verse');
    const ar = el('p', 'tf-v-ar', `${d.ar[v - 1]} ۝${arNum(v)}`); ar.lang = 'ar';
    verse.appendChild(ar);
    verse.appendChild(el('p', 'tf-v-ph', d.ph[v - 1]));
    verse.appendChild(el('p', 'tf-v-tr', (set.trans === 'hm' ? d.hm : d.rm)[v - 1].replace(/\[\d+\]/g, '')));
    verse.appendChild(el('p', 'tf-v-src', set.trans === 'hm' ? 'Traduction de Muhammad Hamidullah' : 'Traduction de Rachid Maach'));
    const act = el('div', 'tf-actions');
    const listen = el('button', 'btn tf-listen'); listen.type = 'button'; listen.dataset.act = 'listen'; listen.innerHTML = ICON_PLAY; listen.appendChild(el('span', null, 'Écouter ce verset'));
    const book = el('button', 'btn'); book.type = 'button'; book.dataset.act = 'book'; book.textContent = 'Voir dans le livre';
    act.append(listen, book);
    verse.appendChild(act);
    frag.appendChild(verse);

    // 2. L'explication
    const ex = section('Explication');
    const g = groupOf(arr, v);
    if (g.a !== g.b) ex.appendChild(el('p', 'tf-group', `Ce commentaire explique ensemble les versets ${s}:${g.a} à ${s}:${g.b}.`));
    paragraphs(g.text, ex);
    frag.appendChild(ex);

    // 3. Le contexte
    const ctx = section('Dans son contexte');
    const info = el('p', 'tf-where');
    info.textContent = `Sourate ${name} (${meaning}), n° ${s}, ${mecc ? 'classée comme mecquoise, révélée avant l’Hégire' : 'classée comme médinoise, révélée après l’Hégire'} · verset ${v} sur ${total} · Juz’ ${juzOf(s, v)} · page ${d.pg[v - 1]} du Coran de Médine.`;
    ctx.appendChild(info);
    const ring = el('div', 'tf-ctx-row');
    if (pv) { const dd = pv.s === s ? d : await Q.ensure(pv.s); if (my !== token) return; ring.appendChild(contextCard('Avant', pv, dd, -1)); }
    if (nx) { const dd = nx.s === s ? d : await Q.ensure(nx.s); if (my !== token) return; ring.appendChild(contextCard('Après', nx, dd, 1)); }
    ctx.appendChild(ring);
    frag.appendChild(ctx);

    // 4. Notes de la traduction
    const notes = (set.trans === 'hm' ? d.hmn : d.rmn)[v - 1];
    if (notes && notes.length) {
      const nsec = section(null);
      const det = el('details', 'tf-notes');
      det.appendChild(el('summary', null, `Notes de la traduction (${notes.length})`));
      notes.forEach(n => det.appendChild(el('p', 'tf-note', n)));
      nsec.appendChild(det);
      frag.appendChild(nsec);
    }

    // 5. Pour approfondir (réseau)
    const more = section('Pour approfondir');
    more.appendChild(el('p', 'hint', 'En anglais, chargés depuis Internet quand tu les ouvres.'));
    for (const kind of ['kathir', 'wahidi']) {
      const det = el('details', 'tf-more'); det.dataset.kind = kind;
      det.appendChild(el('summary', null, EXTRA[kind].title));
      const box = el('div', 'tf-more-body');
      det.appendChild(box);
      det.addEventListener('toggle', async () => {
        if (!det.open || det.dataset.loaded) return;
        box.replaceChildren(el('p', 'tf-wait', 'Chargement…'));
        try {
          const txt = await fetchExtra(kind, s, v);
          if (my !== token) return;
          box.replaceChildren();
          if (!txt) box.appendChild(el('p', 'hint', kind === 'wahidi' ? 'Al-Wâhidî ne rapporte pas de circonstance particulière de révélation pour ce verset.' : 'Aucun texte pour ce verset.'));
          else { box.appendChild(el('p', 'hint', EXTRA[kind].note)); paragraphs(txt, box); det.dataset.loaded = '1'; }
        } catch (e) {
          if (my !== token) return;
          box.replaceChildren(el('p', 'tf-wait', 'Impossible de charger ce texte : vérifie ta connexion, puis ferme et rouvre cette section.'));
        }
      });
      more.appendChild(det);
    }
    frag.appendChild(more);

    // 6. Sources
    const src = el('p', 'tf-src');
    src.textContent = 'Explication : Al-Mukhtasar fi tafsir al-Qur’an al-Karim, Centre Tafsir pour les études coraniques (traduction française). C’est un résumé : pour étudier un verset en profondeur, appuie-toi sur un enseignant.';
    frag.appendChild(src);

    body.replaceChildren(frag);
    syncListen();
  }

  function open(s, v) {
    s = Math.max(1, Math.min(114, +s || 1));
    v = Math.max(1, Math.min(count(s), +v || 1));
    cur = { s, v };
    if (window.Mawqut && window.Mawqut.unlockAudio) window.Mawqut.unlockAudio();
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    return render();
  }
  function go(dir) {
    const n = neighbour(cur.s, cur.v, dir);
    if (n) open(n.s, n.v);
  }

  // ---------- Commandes ----------
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { token++; });
  dlg.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, select, textarea, summary')) return;
    let rtl = false; try { rtl = !!(JSON.parse(localStorage.getItem('mawqut.quran')) || {}).rtl; } catch (x) { /* défaut */ }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(rtl ? -1 : 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(rtl ? 1 : -1); }
  });
  body.addEventListener('click', e => {
    const c = e.target.closest('.tf-ctx');
    if (c) { open(+c.dataset.s, +c.dataset.v); return; }
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'listen') Q.play(cur.s, cur.v, false);
    if (a.dataset.act === 'book') { dlg.close(); Q.open(cur.s, cur.v); }
  });
  // le bouton « Écouter » suit l'état de la lecture
  function syncListen() {
    const b = body.querySelector('[data-act="listen"]');
    if (!b) return;
    const on = !!(window.__qPlaying && window.__qPlaying.s === cur.s && window.__qPlaying.v === cur.v);
    b.querySelector('span').textContent = on ? 'Arrêter' : 'Écouter ce verset';
  }
  window.addEventListener('mawqut:playing', e => { window.__qPlaying = e.detail || null; syncListen(); });

  Q.explain = open;
  window.Mawqut = window.Mawqut || {};
  window.Mawqut.explain = open;
})();
