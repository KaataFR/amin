/* Amin · Page qui se tourne
   Une vraie feuille : elle se soulève par le bord libre, se courbe, passe à la verticale puis retombe de l'autre côté
   en laissant voir son verso. Tout est du CSS 3D (aucune bibliothèque) : la feuille est découpée en bandes verticales
   emboîtées, chacune pivotant un peu plus que la précédente, ce qui donne la courbure. Chaque bande est éclairée selon
   son inclinaison, et la feuille jette une ombre sur la page qu'elle recouvre ou qu'elle découvre.

   MawqutFlip.start({ book, spread, from, to, dir, rtl, ms }) → { done, finish(commit), committed }
     from / to : pages affichées avant / après (1 page en vue simple, 2 en double page)
     dir       : 1 vers l'avant, -1 vers l'arrière (la même animation, jouée à l'envers)
   Réglages de test : window.__mawqutFlipSlow (multiplie la durée), window.__mawqutFlipFreeze (0..1, fige l'animation). */
(function () {
  'use strict';
  const BEND = 40;                      // écart maximal, en degrés, entre le pied de la feuille et son bord libre
  const LIGHT = { x: 0.45, z: 0.82 };   // lumière venant d'en haut à gauche, devant le livre
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
  const div = cls => { const d = document.createElement('div'); d.className = cls; return d; };

  // Copie figée d'une page : sans identifiant ni attribut de lecture, pour ne rien dupliquer dans le livre.
  function ghost(node, like) {
    const c = node.cloneNode(true);
    c.querySelectorAll('[id],[data-key],[data-v]').forEach(n => { n.removeAttribute('id'); n.removeAttribute('data-key'); n.removeAttribute('data-v'); });
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    c.classList.add('pf-page');
    if (like) c.style.borderRadius = getComputedStyle(like).borderRadius;
    return c;
  }
  function blankPage(like) {
    const b = document.createElement('article');
    b.className = 'page is-blank pf-page';
    b.appendChild(div('page-frame'));
    b.setAttribute('aria-hidden', 'true');
    if (like) b.style.borderRadius = getComputedStyle(like).borderRadius;
    return b;
  }

  function start(o) {
    const { book, spread, from, to } = o;
    const dir = o.dir >= 0 ? 1 : -1;
    const fe = o.rtl ? -1 : 1;                       // sens du bord libre quand la feuille est à plat (+1 : vers la droite)
    const two = from.length === 2;
    const W = from[0].offsetWidth, H = from[0].offsetHeight;
    const bb = book.getBoundingClientRect(), sb = spread.getBoundingClientRect();
    const K = clamp(Math.round(W / 28), 10, 16), sw = W / K;
    const A = dir > 0 ? from : to, B = dir > 0 ? to : from;   // A → B : le sens « avant » de l'animation
    const lastI = two ? 1 : 0;
    const spineX = two ? W : (fe > 0 ? 0 : W);
    const slow = Math.max(0.05, +window.__mawqutFlipSlow || 1);
    const D = (o.ms || 820) * slow;

    // copies de la feuille, faites avant de toucher au livre (les styles calculés en dépendent)
    const front = ghost(A[lastI], from[lastI]);
    const back = two ? ghost(B[0], from[0]) : blankPage(from[0]);

    // dessous : la page qui se recouvre et la page qui se découvre
    const under = two ? [A[0], B[1]] : [B[0]];
    spread.replaceChildren(...under);

    const stage = div('pf-stage');
    stage.setAttribute('aria-hidden', 'true');
    stage.style.cssText = `left:${sb.left - bb.left}px;top:${sb.top - bb.top}px;width:${sb.width}px;height:${H}px;perspective:${Math.round(W * 4.2)}px;perspective-origin:${spineX}px 50%`;

    // ombres portées sur le dessous : A = page découverte (côté de départ), Bsh = page recouverte (côté d'arrivée)
    const toward = side => (side > 0 ? 'to right' : 'to left');
    const grad = d => `linear-gradient(${d}, rgba(20,12,2,.92) 0, rgba(20,12,2,.5) 42%, rgba(20,12,2,0) 100%)`;
    const shA = div('pf-sh'), shB = div('pf-sh');
    shA.style.background = grad(toward(fe));
    shB.style.background = grad(toward(-fe));
    stage.append(shA);
    if (two) stage.append(shB);

    // la feuille : K bandes emboîtées, de la reliure vers le bord libre
    const strips = [];
    let parent = stage;
    for (let i = 0; i < K; i++) {
      const s = div('pf-strip');
      s.style.width = sw + 'px'; s.style.height = H + 'px';
      s.style.transformOrigin = fe > 0 ? '0 50%' : '100% 50%';
      s.style.left = (i === 0 ? (fe > 0 ? spineX : spineX - sw) : (fe > 0 ? sw : -sw)) + 'px';
      const mk = (cls, page, c0) => {
        const f = div('pf-face ' + cls);
        f.style.width = (sw + 1) + 'px'; f.style.height = H + 'px';
        const p = page.cloneNode(true);
        p.style.left = (0.5 - c0) + 'px';
        const dark = div('pf-dark'), gloss = div('pf-gloss');
        f.append(p, dark, gloss);
        s.append(f);
        return { f, dark, gloss };
      };
      const fc0 = fe > 0 ? i * sw : W - (i + 1) * sw;          // partie du recto portée par cette bande
      const bc0 = fe > 0 ? W - (i + 1) * sw : i * sw;          // partie du verso, vue une fois la feuille retournée
      strips.push({ el: s, front: mk('pf-front', front, fc0), back: mk('pf-back', back, bc0) });
      parent.append(s);
      parent = s;
    }

    let done = false, committed = false, raf = 0, tm = 0, resolve;
    const promise = new Promise(r => { resolve = r; });

    function shade(face, d) {
      face.dark.style.opacity = clamp(0.62 * (1 - d), 0, 0.46).toFixed(3);
      face.gloss.style.opacity = clamp(0.9 * (d - 1), 0, 0.16).toFixed(3);
    }

    // p : 0 = feuille à plat côté départ, 1 = feuille retournée côté arrivée
    function render(p) {
      const e = smooth(clamp(p, 0, 1));
      const phi = 180 * e, bend = BEND * Math.sin(2 * Math.PI * e);   // bord libre en avance au début, en retard à la fin
      let prev = 0, xe = 0, sum = 0;
      for (let i = 0; i < K; i++) {
        const T = clamp(phi + bend * Math.pow((i + 0.5) / K, 1.5), 0, 180);
        const rad = T * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad);
        strips[i].el.style.transform = `rotateY(${(-fe * (T - prev)).toFixed(2)}deg)`;
        prev = T; sum += T; xe += sw * cs;
        const lit = (LIGHT.x * fe * sn + LIGHT.z * cs) / LIGHT.z;
        shade(strips[i].front, lit);
        shade(strips[i].back, -lit);
      }
      if (!two) {                                    // vue simple : la feuille s'efface en quittant le livre
        const fade = (1 - smooth(clamp((e - 0.55) / 0.35, 0, 1))).toFixed(3);
        for (let i = 0; i < K; i++) { strips[i].front.f.style.opacity = fade; strips[i].back.f.style.opacity = fade; }
      }
      // ombres : intensité maximale quand la feuille est de travers, longueur = ce que la feuille recouvre
      const strength = 0.5 * Math.pow(Math.sin(sum / K * Math.PI / 180), 1.1);
      const wA = clamp((xe + 0.18 * W) / (0.36 * W), 0, 1);
      const extA = clamp(Math.max(xe, 0) + 0.12 * W, 0, W), extB = clamp(Math.max(-xe, 0) + 0.12 * W, 0, W);
      shA.style.width = extA + 'px';
      shA.style.left = (fe > 0 ? spineX : spineX - extA) + 'px';
      shA.style.opacity = (strength * wA).toFixed(3);
      if (two) {
        shB.style.width = extB + 'px';
        shB.style.left = (fe > 0 ? spineX - extB : spineX) + 'px';
        shB.style.opacity = (strength * (1 - wA)).toFixed(3);
      }
    }

    function finish(commit) {
      if (done) return;
      done = true; committed = !!commit;
      cancelAnimationFrame(raf); clearTimeout(tm);
      if (commit) spread.replaceChildren(...to);
      stage.remove();
      api.committed = committed;
      resolve();
    }

    render(dir > 0 ? 0 : 1);
    book.append(stage);

    let acc = 0, last = performance.now();
    function frame(now) {
      if (done) return;
      const frz = window.__mawqutFlipFreeze;
      if (typeof frz === 'number') { last = now; render(dir > 0 ? frz : 1 - frz); }
      else {
        acc += now - last; last = now;
        const p = Math.min(1, acc / D);
        render(dir > 0 ? p : 1 - p);
        if (p >= 1) { finish(true); return; }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(t => { last = t; frame(t); });
    // filet de sécurité : onglet masqué ou image sautée, la page finit toujours par être affichée
    const guard = () => { if (done) return; if (typeof window.__mawqutFlipFreeze === 'number') { tm = setTimeout(guard, 500); return; } finish(true); };
    tm = setTimeout(guard, D + 600);

    const api = { done: promise, finish, committed: false };
    return api;
  }

  window.MawqutFlip = { start };
})();
