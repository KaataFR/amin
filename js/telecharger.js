/* Onglet « Télécharger ».
   Tout vient de downloads/manifest.json, qui existe sous deux formes :
   - { "file", "size", "sha256", "url" } : l'installateur est hébergé ailleurs (release GitHub), le bouton devient un simple lien ;
     c'est la seule forme possible sur l'hébergement des artifacts, qui ne sert ni .exe ni .apk ;
   - { "file", "size", "sha256", "parts": [{ "name", "size" }] } : l'installateur est rangé en morceaux à côté du site
     (certains hébergeurs limitent la taille de chaque fichier) ; on les récupère un par un, on vérifie l'empreinte,
     puis on remet le fichier d'un seul bloc au navigateur.
   Deux manifestes : downloads/manifest.json (Windows) et downloads/tv.json (APK pour la télévision).
   Sans manifest, le bouton reste inactif. Sur Android, on propose l'installation depuis Chrome. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const grid = $('#dlGrid');
  if (!grid) return;
  const ua = navigator.userAgent || '';
  const os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Windows/i.test(ua) ? 'windows' : 'other';
  grid.dataset.os = os;

  // ---------- Forme d'arche ----------
  const archPath = (w, h) => {
    const top = Math.min(110, w * 0.26);
    return `M0.5 ${h - 0.5}V${top}C0.5 ${top * 0.42} ${w * 0.3} ${top * 0.12} ${w / 2} 0.5C${w * 0.7} ${top * 0.12} ${w - 0.5} ${top * 0.42} ${w - 0.5} ${top}V${h - 0.5}Z`;
  };
  const ro = new ResizeObserver(entries => entries.forEach(en => {
    const box = en.target, svg = box.querySelector(':scope > .dl-shape');
    const w = box.offsetWidth, h = box.offsetHeight;
    if (!svg || !w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.querySelector('path').setAttribute('d', archPath(w, h));
  }));
  grid.querySelectorAll('.dl-card').forEach(c => ro.observe(c));

  // ---------- Téléchargements (Windows, télévision) ----------
  const mo = n => (n / 1048576).toFixed(n >= 10485760 ? 0 : 1).replace('.', ',') + ' Mo';
  // Un bouton de téléchargement branché sur un manifeste (voir en tête de fichier)
  function downloader(o) {
    let btn = $(o.btn);
    const txt = () => $('.dl-txt', btn), st = $(o.status);
    let man = null, busy = false, started = false;
    const setStatus = (t, cls) => { st.textContent = t || ''; st.className = 'dl-status' + (cls ? ' ' + cls : ''); };
    const progress = f => { btn.style.setProperty('--p', Math.round(f * 100) + '%'); txt().textContent = 'Téléchargement… ' + Math.round(f * 100) + ' %'; };

    function ready(m) {
      man = m;
      $(o.meta).textContent = o.metaText + (m.size ? ' · ' + mo(m.size) : '');
      if (m.sha256 && o.hash) { const h = $(o.hash); $('code', h).textContent = m.sha256; h.hidden = false; }
      if (o.after) o.after(m);
      if (m.url) {
        // fichier hébergé ailleurs : un vrai lien, que le navigateur ouvre et télécharge lui-même
        const a = document.createElement('a');
        a.className = 'btn btn-primary dl-btn'; a.id = btn.id; a.href = m.url; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = `<span class="dl-txt">${o.label}</span>`;
        btn.replaceWith(a); btn = a;
        return;
      }
      txt().textContent = o.label;
      btn.disabled = false;
    }

    function init() {
      if (started) return; started = true;
      if (o.hint) setStatus(o.hint);
      fetch(o.manifest, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('manifest')))
        .then(m => {
          const okUrl = m && typeof m.url === 'string' && /^https:\/\//.test(m.url);
          const okParts = m && m.size && Array.isArray(m.parts) && m.parts.length;
          if (!m || !m.file || !(okUrl || okParts)) throw new Error('manifest');
          ready(m);
        })
        .catch(() => {
          txt().textContent = 'Bientôt disponible';
          setStatus(o.missing);
        });
    }

    async function download() {
      if (busy || !man || !man.parts) return;
      busy = true; btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
      setStatus('');
      const total = man.size, buf = new Uint8Array(total);
      let got = 0;
      try {
        progress(0);
        for (const part of man.parts) {
          const res = await fetch('downloads/' + part.name, { cache: 'no-store' });
          if (!res.ok) throw new Error('http ' + res.status);
          if (res.body && res.body.getReader) {
            const rd = res.body.getReader();
            for (;;) {
              const { done, value } = await rd.read();
              if (done) break;
              if (got + value.length > total) throw new Error('taille');
              buf.set(value, got); got += value.length;
              progress(got / total); setStatus(mo(got) + ' sur ' + mo(total));
            }
          } else {
            const ab = new Uint8Array(await res.arrayBuffer());
            if (got + ab.length > total) throw new Error('taille');
            buf.set(ab, got); got += ab.length;
            progress(got / total); setStatus(mo(got) + ' sur ' + mo(total));
          }
        }
        if (got !== total) throw new Error('taille');
        if (man.sha256 && window.crypto && crypto.subtle) {
          txt().textContent = 'Vérification du fichier…';
          const h = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
          const hex = Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
          if (hex !== man.sha256) throw new Error('empreinte');
        }
        const url = URL.createObjectURL(new Blob([buf], { type: o.type || 'application/octet-stream' }));
        const a = document.createElement('a');
        a.href = url; a.download = man.file; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 120000);
        txt().textContent = 'Télécharger à nouveau';
        setStatus(o.done(man.file), 'is-ok');
      } catch (e) {
        txt().textContent = 'Réessayer';
        setStatus(e && e.message === 'empreinte'
          ? 'Le fichier reçu est incomplet ou abîmé. Réessaie dans un instant.'
          : 'Le téléchargement a été interrompu. Vérifie ta connexion puis réessaie.', 'is-err');
      }
      btn.style.removeProperty('--p');
      busy = false; btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); btn.disabled = false;
    }
    btn.addEventListener('click', download);
    return { init };
  }

  const win = downloader({
    btn: '#dlWinBtn', status: '#dlWinStatus', meta: '#dlWinMeta', hash: '#dlWinHash',
    manifest: 'downloads/manifest.json', label: 'Télécharger pour Windows',
    metaText: 'Installateur pour Windows 10 et 11',
    hint: os !== 'windows' ? 'Ce fichier est fait pour un ordinateur Windows.' : '',
    missing: 'L’installateur Windows n’est pas encore proposé à cette adresse.',
    done: f => 'C’est téléchargé : ouvre le fichier ' + f + ' pour installer Amin.'
  });
  const tv = downloader({
    btn: '#dlTvBtn', status: '#dlTvStatus', meta: '#dlTvMeta', hash: '#dlTvHash',
    manifest: 'downloads/tv.json', label: 'Télécharger l’APK', type: 'application/vnd.android.package-archive',
    metaText: 'Android TV et Google TV, Android 7 ou plus récent',
    hint: '',
    missing: 'Le fichier pour la télévision n’est pas encore proposé à cette adresse.',
    done: f => 'C’est téléchargé : copie ' + f + ' sur la télé (voir plus bas).',
    after: m => { const u = $('#dlTvUrl'); if (u && m.url) u.textContent = m.url; }
  });
  const how = $('#dlTvHow');
  if (how) how.addEventListener('click', () => { const g = $('#dlTvGuide'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const init = () => { win.init(); tv.init(); };

  // ---------- Android : installation depuis le navigateur ----------
  const ib = $('#dlAndBtn'), ist = $('#dlAndStatus');
  const syncInstall = () => { ib.hidden = !(window.aminCanInstall && window.aminCanInstall()); };
  ib.addEventListener('click', async () => { if (window.aminInstall) await window.aminInstall(); syncInstall(); });
  window.addEventListener('amin:installable', syncInstall);
  window.addEventListener('amin:installed', () => { syncInstall(); ist.textContent = 'Amin est installé sur cet appareil.'; ist.className = 'dl-status is-ok'; });
  syncInstall();

  // ---------- Démarrage : seulement quand la page est ouverte ----------
  if (location.hash.replace('#', '') === 'telecharger') init();
  window.addEventListener('mawqut:view', e => { if (e.detail === 'telecharger') { init(); syncInstall(); } });
})();
