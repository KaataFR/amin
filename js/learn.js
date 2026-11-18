/*
 * Amin — section « Apprendre » : les cinq piliers, conditions, ablutions, prière pas à pas, rak'as, invocations, adhan, cas particuliers.
 * Les textes coraniques viennent des données du lecteur (MawqutQuran) ; les invocations sont écrites ci-dessous.
 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Illustrations : postures (vue de profil, tournée vers la Qibla à droite) ----------
  const POSTURES = {
    standing: { head: [100, 40], lines: [[[100, 56], [100, 112]], [[100, 112], [101, 147], [100, 180], [115, 182]]] },
    takbir: { base: 'standing', arm: [[100, 66], [115, 77], [112, 47]] },
    qiyam: { base: 'standing', arm: [[100, 66], [93, 93], [114, 86]] },
    itidal: { base: 'standing', arm: [[100, 66], [101, 92], [103, 117]] },
    ruku: { head: [157, 103], lines: [[[82, 108], [142, 103]], [[82, 108], [84, 146], [84, 180], [98, 182]]], arm: [[138, 105], [90, 141]] },
    sujud: { head: [152, 170], r: 12, lines: [[[50, 182], [63, 166], [98, 180]], [[98, 180], [92, 134]], [[92, 134], [138, 159]]], arm: [[134, 158], [121, 168], [141, 182]], touch: [[160, 182], [141, 182], [98, 182], [50, 182]] },
    julus: { head: [90, 86], lines: [[[66, 166], [77, 182]], [[77, 181], [128, 181]], [[84, 160], [128, 178]], [[84, 160], [88, 104]]], arm: [[88, 110], [100, 136], [122, 165]] },
    tashahhud: { base: 'julus', finger: [[122, 165], [128, 151]] }
  };
  function postureSVG(name) {
    if (name === 'taslim') return taslimSVG();
    let p = POSTURES[name];
    const base = p.base ? POSTURES[p.base] : null;
    const head = p.head || base.head;
    const lines = (p.lines || base.lines).slice();
    const arm = p.arm || (base && base.arm);
    const finger = p.finger;
    const pts = l => l.map(x => x.join(',')).join(' ');
    let s = `<svg class="fig" viewBox="26 14 176 178" role="img" aria-hidden="true">`;
    s += `<rect class="fig-mat" x="34" y="184" width="146" height="5" rx="2.5"/>`;
    s += `<g class="fig-kaaba"><rect x="182" y="166" width="15" height="17" rx="1.5"/><path d="M182 171.5h15"/></g>`;
    for (const l of lines) s += `<polyline class="fig-body" points="${pts(l)}"/>`;
    if (arm) s += `<polyline class="fig-body fig-arm" points="${pts(arm)}"/>`;
    if (finger) s += `<polyline class="fig-finger" points="${pts(finger)}"/>`;
    s += `<circle class="fig-head" cx="${head[0]}" cy="${head[1]}" r="${p.r || 13}"/>`;
    if (p.touch) for (const t of p.touch) s += `<circle class="fig-touch" cx="${t[0]}" cy="${t[1]}" r="4.2"/>`;
    return s + '</svg>';
  }
  function taslimSVG() {
    return `<svg class="fig" viewBox="0 0 200 200" role="img" aria-hidden="true">
      <rect class="fig-mat" x="34" y="184" width="146" height="5" rx="2.5"/>
      <polyline class="fig-body" points="100,82 100,140"/>
      <polyline class="fig-body" points="78,90 70,128 76,160"/><polyline class="fig-body" points="122,90 130,128 124,160"/>
      <polyline class="fig-body" points="76,88 124,88"/>
      <path class="fig-body" d="M58 176 Q100 150 142 176"/>
      <circle class="fig-head" cx="110" cy="62" r="14"/>
      <path class="fig-arrow" d="M128 40 Q150 40 158 58"/><path class="fig-arrow-head" d="M152 56 158 58 160 51"/>
      <path class="fig-arrow fig-arrow-2" d="M72 40 Q50 40 42 58"/><path class="fig-arrow-head fig-arrow-2" d="M48 56 42 58 40 51"/>
    </svg>`;
  }

  // ---------- Illustration : zones lavées pendant les ablutions (vue de face) ----------
  const ZONES = {
    heart: '<path class="zone" d="M86 92c-3-5-11-3-10 3 1 5 10 10 10 10s9-5 10-10c1-6-7-8-10-3Z"/>',
    hands: '<ellipse class="zone" cx="33" cy="160" rx="8" ry="11"/><ellipse class="zone" cx="127" cy="160" rx="8" ry="11"/>',
    mouth: '<ellipse class="zone" cx="80" cy="51" rx="7" ry="3.6"/>',
    nose: '<ellipse class="zone" cx="80" cy="40" rx="4" ry="7"/>',
    face: '<ellipse class="zone" cx="80" cy="41" rx="17" ry="21"/>',
    arms: '<polyline class="zone-line" points="40,114 34,150"/><polyline class="zone-line" points="120,114 126,150"/><ellipse class="zone" cx="33" cy="160" rx="8" ry="11"/><ellipse class="zone" cx="127" cy="160" rx="8" ry="11"/>',
    head: '<path class="zone" d="M59 34Q60 12 80 12T101 34Q80 23 59 34Z"/>',
    ears: '<ellipse class="zone" cx="58.5" cy="40" rx="4.5" ry="8"/><ellipse class="zone" cx="101.5" cy="40" rx="4.5" ry="8"/>',
    feet: '<polyline class="zone-line" points="62.5,222 62,233"/><polyline class="zone-line" points="97.5,222 98,233"/><ellipse class="zone" cx="57" cy="238" rx="12" ry="6"/><ellipse class="zone" cx="103" cy="238" rx="12" ry="6"/>'
  };
  function bodySVG(zone) {
    return `<svg class="fig fig-bodymap" viewBox="0 0 160 250" role="img" aria-hidden="true">
      <g class="bm">
        <ellipse cx="80" cy="38" rx="21" ry="25"/><ellipse cx="58.5" cy="40" rx="4" ry="7.5"/><ellipse cx="101.5" cy="40" rx="4" ry="7.5"/>
        <rect x="72" y="60" width="16" height="13" rx="4"/>
        <path d="M50 74Q80 66 110 74L104 150Q80 156 56 150Z"/>
        <ellipse cx="33" cy="160" rx="7" ry="10"/><ellipse cx="127" cy="160" rx="7" ry="10"/>
        <ellipse cx="58" cy="238" rx="11" ry="5.5"/><ellipse cx="102" cy="238" rx="11" ry="5.5"/>
      </g>
      <g class="bm-limbs"><polyline points="52,78 40,116 34,150"/><polyline points="108,78 120,116 126,150"/><polyline points="66,150 62,232"/><polyline points="94,150 98,232"/></g>
      ${ZONES[zone] || ''}
      ${zone && zone !== 'heart' ? '<g class="drops"><path d="M138 26c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12Z"/><path d="M22 70c0 0-4.5 6-4.5 9a4.5 4.5 0 0 0 9 0c0-3-4.5-9-4.5-9Z"/></g>' : ''}
    </svg>`;
  }

  // ---------- Illustrations (images sans visage, si présentes dans img/apprendre/) ----------
  const POSTURE_IMG = { itidal: 'priere-debout', takbir: 'priere-takbir', qiyam: 'priere-qiyam', ruku: 'priere-ruku', sujud: 'priere-sujud', julus: 'priere-assis', tashahhud: 'priere-tachahhoud', taslim: 'priere-taslim' };
  const WUDU_IMG = ['woudou-intention', 'woudou-mains', 'woudou-bouche', 'woudou-nez', 'woudou-visage', 'woudou-bras', 'woudou-tete', 'woudou-oreilles', 'woudou-pieds', 'woudou-invocation'];
  const imgTag = name => (name ? `<img class="fig-img" src="img/apprendre/${name}.webp" alt="" decoding="async">` : '');
  function wireImages(root) {
    root.querySelectorAll('img.fig-img').forEach(img => {
      const fig = img.parentElement;
      const ok = () => {
        fig.classList.add('has-img');
        fig.tabIndex = 0; fig.setAttribute('role', 'button');
        const h = fig.closest('.step') && fig.closest('.step').querySelector('h4');
        fig.setAttribute('aria-label', 'Agrandir l’illustration' + (h ? ' : ' + h.textContent : ''));
      };
      if (img.complete && img.naturalWidth) ok(); else img.addEventListener('load', ok, { once: true });
    });
  }
  // Agrandir une illustration
  const zoom = document.querySelector('#figZoom');
  function openZoom(fig) {
    const img = fig.querySelector('.fig-img');
    if (!img || !zoom) return;
    zoom.querySelector('#figZoomImg').src = img.currentSrc || img.src;
    const st = fig.closest('.step');
    zoom.querySelector('#figZoomCap').textContent = st ? st.querySelector('.step-n').textContent + '. ' + st.querySelector('h4').textContent : '';
    if (typeof zoom.showModal === 'function') zoom.showModal(); else zoom.setAttribute('open', '');
  }
  if (zoom) zoom.addEventListener('click', e => { if (e.target === zoom || e.target.id === 'figZoomImg') zoom.close(); });

  // ---------- Contenu ----------
  // say: { ar, ph, fr } ; quran: [sourate, verset début, verset fin]
  const TAKBIR = { ar: 'اللَّهُ أَكْبَرُ', ph: 'Allâhou akbar', fr: 'Allah est le plus grand.' };
  const CH = [
    {
      slug: 'piliers', title: 'Les cinq piliers de l’islam', ar: 'أَرْكَانُ الْإِسْلَامِ',
      lead: 'Le Prophète ﷺ a dit que l’islam est bâti sur cinq choses. On les appelle les cinq piliers : ce sont les actes essentiels de tout musulman. Les chapitres suivants expliquent le deuxième, la prière, geste par geste.',
      blocks: [
        { type: 'p', text: 'Voici la parole du Prophète ﷺ qui les énumère, rapportée par ‘Abdoullah ibn ‘Oumar.' },
        { type: 'dhikr', items: [{
          ar: 'قَالَ رَسُولُ اللَّهِ ﷺ: «بُنِيَ الْإِسْلَامُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلَاةِ، وَإِيتَاءِ الزَّكَاةِ، وَحَجِّ الْبَيْتِ، وَصَوْمِ رَمَضَانَ»',
          fr: 'Le Messager d’Allah ﷺ a dit : « L’islam est bâti sur cinq : l’attestation qu’il n’y a de divinité qu’Allah et que Muhammad est le messager d’Allah, l’accomplissement de la prière, l’acquittement de la zakat, le pèlerinage à la Maison et le jeûne de Ramadan. »',
          src: 'Rapporté par al-Bukhârî (8) et Muslim (16)'
        }] },
        { type: 'pillars', items: [
          ['pilier-chahada', 'الشَّهَادَة', 'La chahada'],
          ['pilier-priere', 'الصَّلَاة', 'La prière'],
          ['pilier-zakat', 'الزَّكَاة', 'La zakat'],
          ['pilier-jeune', 'الصِّيَام', 'Le jeûne'],
          ['pilier-hajj', 'الحَجّ', 'Le pèlerinage']
        ] },
        { type: 'note', text: 'Selon les récits, le jeûne et le pèlerinage ne sont pas toujours cités dans le même ordre. Ici, on suit l’ordre que l’on enseigne d’habitude.' },

        { type: 'pillar', id: 'pilier-chahada', n: 1, title: 'La chahada', sub: 'L’attestation de foi', ar: 'الشَّهَادَة' },
        { type: 'p', text: 'C’est dire, en y croyant de tout son cœur, qu’il n’y a de divinité digne d’être adorée qu’Allah et que Muhammad ﷺ est Son messager. On entre dans l’islam en la prononçant avec sincérité, et les quatre autres piliers reposent sur elle.' },
        { type: 'dhikr', items: [{ ar: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ', ph: 'Ach-hadou an lâ ilâha illa llâh, wa ach-hadou anna Mouhammadan rasoûlou llâh', fr: 'J’atteste qu’il n’y a de divinité qu’Allah, et j’atteste que Muhammad est le messager d’Allah.' }] },
        { type: 'list', items: [
          'La première partie signifie qu’on adore Allah seul, sans associé.',
          'La seconde signifie qu’on croit au message de Muhammad ﷺ, qu’on lui obéit et qu’on suit son exemple.',
          'On la redit à chaque prière, au moment du tachahhoud.'
        ] },

        { type: 'pillar', id: 'pilier-priere', n: 2, title: 'La prière', sub: 'As-salât', ar: 'الصَّلَاة' },
        { type: 'p', text: 'Cinq prières par jour, à des moments précis : Fajr à l’aube, Dhohr au milieu de la journée, Asr l’après-midi, Maghrib au coucher du soleil et Icha la nuit. Elles sont obligatoires pour tout musulman pubère et doué de raison.' },
        { type: 'quran', intro: 'Le Coran rappelle qu’elle est prescrite à des heures déterminées.', ref: [4, 103, 103] },
        { type: 'p', text: 'Ce guide lui consacre les chapitres suivants : les conditions, les ablutions, chaque geste et chaque parole, le nombre de rak‘as, l’adhan et les cas particuliers. L’onglet Horaires donne l’heure de chaque prière pour ta ville.' },

        { type: 'pillar', id: 'pilier-zakat', n: 3, title: 'La zakat', sub: 'L’aumône obligatoire', ar: 'الزَّكَاة' },
        { type: 'p', text: 'C’est une part obligatoire de ses biens, donnée chaque année à celles et ceux qui y ont droit. Le mot évoque la purification et la croissance : donner purifie les biens et le cœur.' },
        { type: 'quran', intro: 'Dans le Coran, la zakat est souvent citée avec la prière.', ref: [2, 43, 43] },
        { type: 'h', text: 'Qui la donne, et combien' },
        { type: 'cards', items: [
          ['Qui', 'Tout musulman dont les biens atteignent le nissab, le seuil à partir duquel la zakat est due.'],
          ['Le seuil (nissab)', 'L’équivalent de 85 g d’or, ou de 595 g d’argent selon l’avis que l’on suit. Il varie donc avec le cours du métal.'],
          ['Le délai (hawl)', 'Ces biens doivent avoir été gardés pendant une année lunaire entière.'],
          ['Le montant', '2,5 % (un quarantième), une fois par an. Les troupeaux et les récoltes suivent d’autres règles.'],
          ['Ce qui est compté', 'L’argent et l’épargne, l’or et l’argent, les marchandises destinées à la vente.'],
          ['Ce qui n’est pas compté', 'La maison où l’on habite, les vêtements, le véhicule et les objets d’usage personnel.']
        ] },
        { type: 'h', text: 'À qui la donner' },
        { type: 'quran', intro: 'Le Coran nomme huit catégories de bénéficiaires.', ref: [9, 60, 60] },
        { type: 'p', text: 'La zakat al-fitr est une autre aumône : elle se donne à la fin de Ramadan, avant la prière de l’Aïd.' },
        { type: 'note', text: 'Le calcul exact dépend de la situation de chacun (épargne, dettes, commerce), et le seuil change avec le cours de l’or. Pour le faire sans erreur, demande à un savant ou à une institution de confiance.' },

        { type: 'pillar', id: 'pilier-jeune', n: 4, title: 'Le jeûne de Ramadan', sub: 'As-siyâm', ar: 'الصِّيَام' },
        { type: 'p', text: 'Pendant le mois de Ramadan, le neuvième mois du calendrier lunaire, le musulman s’abstient de manger, de boire et des relations conjugales, de l’aube jusqu’au coucher du soleil, avec l’intention de jeûner pour Allah. Il commence donc à l’heure de Fajr et s’achève à celle de Maghrib, que l’onglet Horaires affiche pour ta ville. L’intention se forme dans le cœur, la nuit avant l’aube ; une seule intention suffit pour tout le mois, tant que le jeûne n’est pas interrompu (par un voyage ou une maladie, par exemple : on la renouvelle alors).' },
        { type: 'quran', intro: 'Le jeûne est prescrit dans le Coran.', ref: [2, 183, 183] },
        { type: 'h', text: 'Ce qui annule le jeûne' },
        { type: 'list', items: [
          'Manger ou boire volontairement.',
          'Les relations conjugales.',
          'Vomir volontairement.',
          'Pour une femme, l’arrivée des règles ou des lochies, même juste avant le coucher du soleil.'
        ] },
        { type: 'p', text: 'Manger ou boire par oubli en Ramadan oblige aussi à rattraper ce jour (qadâ’), mais sans expiation. Vomir sans le vouloir n’annule pas le jeûne ; se faire vomir l’annule.' },
        { type: 'h', text: 'Quand on rompt volontairement son jeûne' },
        { type: 'p', text: 'Manger, boire ou avoir des relations conjugales volontairement, en plein jour de Ramadan et sans excuse, oblige à rattraper le jour et à faire une expiation (kaffâra), au choix : libérer un esclave, ou jeûner deux mois de suite, ou nourrir soixante personnes pauvres (un moudd à chacune).' },
        { type: 'h', text: 'Qui peut ne pas jeûner' },
        { type: 'cards', items: [
          ['Le malade', 'Quand le jeûne aggrave sa maladie ou retarde sa guérison. Il rattrape les jours manqués plus tard.'],
          ['Le voyageur', 'En voyage assez long pour raccourcir la prière (environ 80 km), il peut rompre le jeûne et rattraper les jours manqués plus tard. S’il en est capable, il vaut mieux jeûner.'],
          ['La femme qui a ses règles ou ses lochies', 'Elle ne jeûne pas pendant cette période et rattrape les jours manqués.'],
          ['La femme enceinte', 'Si elle craint pour elle ou pour son enfant, elle ne jeûne pas et rattrape ensuite les jours manqués, sans fidya.'],
          ['La femme qui allaite', 'Si elle craint pour son enfant et ne trouve pas de nourrice, elle ne jeûne pas, rattrape ensuite les jours manqués et verse la fidya : un moudd de nourriture par jour, donné à une personne pauvre.'],
          ['La personne âgée', 'Si le jeûne lui est impossible, elle ne jeûne pas. Il lui est recommandé de verser la fidya : nourrir une personne pauvre (un moudd) pour chaque jour manqué.'],
          ['L’enfant', 'Avant la puberté, le jeûne n’est pas obligatoire. On y habitue les enfants progressivement.']
        ] },
        { type: 'quran', intro: 'Le Coran prévoit cette facilité pour le malade et le voyageur.', ref: [2, 185, 185] },
        { type: 'p', text: 'Les jours manqués se rattrapent plus tard, un jour pour un jour, sans obligation de les enchaîner. Le mois s’achève par la fête de l’Aïd al-Fitr.' },
        { type: 'note', text: 'Les détails (médicaments, soins, cas d’erreur) varient selon les situations. En cas de doute, demande à l’imam de ta mosquée.' },

        { type: 'pillar', id: 'pilier-hajj', n: 5, title: 'Le pèlerinage', sub: 'Al-hajj', ar: 'الحَجّ' },
        { type: 'p', text: 'C’est le voyage à La Mecque, chaque année durant le mois de Dhoû l-Hidjja, le dernier du calendrier lunaire. Il est obligatoire une seule fois dans la vie, pour le musulman pubère et doué de raison qui en a les moyens, physiques et financiers (hadith rapporté par Muslim).' },
        { type: 'quran', intro: 'Le Coran l’ordonne à celui qui en a les moyens.', ref: [3, 97, 97] },
        { type: 'h', text: 'Les grandes étapes' },
        { type: 'list', items: [
          'L’ihrâm : l’entrée en état de sacralisation, avec l’intention d’accomplir le pèlerinage.',
          'La station à ‘Arafa, le 9 de Dhoû l-Hidjja : c’est le moment central du hajj.',
          'Le tawâf : sept tours autour de la Kaaba.',
          'Le sa‘y : sept trajets entre les collines de Safâ et Marwa.'
        ] },
        { type: 'p', text: 'La ‘oumra, le petit pèlerinage, se fait en toute saison ; elle ne remplace pas le hajj. C’est une sunna confirmée, à faire une fois dans la vie. Il vaut mieux ne pas repousser son hajj sans bonne raison quand on en a les moyens.' },

        { type: 'h', text: 'Piliers de l’islam, piliers de la foi' },
        { type: 'p', text: 'Les cinq piliers sont des actes. Dans le hadith de Jibrîl (rapporté par Muslim), le Prophète ﷺ cite aussi six piliers de la foi (îmân), ce que l’on croit dans son cœur :' },
        { type: 'list', items: [
          'Croire en Allah.',
          'Croire en Ses anges.',
          'Croire en Ses livres.',
          'Croire en Ses messagers.',
          'Croire au Jour dernier.',
          'Croire au destin (al-qadar), qu’il soit bon ou mauvais.'
        ] }
      ]
    },
    {
      slug: 'conditions', title: 'Avant de commencer', ar: 'شُرُوطُ الصَّلَاةِ',
      lead: 'La prière (as-salât) est le deuxième pilier de l’islam. Cinq prières sont obligatoires chaque jour pour tout musulman pubère et doué de raison. Avant de prier, six conditions doivent être réunies.',
      blocks: [
        { type: 'cards', items: [
          ['Être en état de pureté', 'Avoir fait ses ablutions, et le grand lavage (ghousl) quand il est nécessaire.'],
          ['Un corps, des vêtements et un lieu propres', 'Sans urine, sang ni autre impureté. Un tapis de prière n’est pas obligatoire : tout sol propre convient.'],
          ['Couvrir sa ‘awra', 'Pour l’homme, au minimum du nombril aux genoux, et il est recommandé de couvrir les épaules. Pour la femme, tout le corps sauf le visage et les mains.'],
          ['Être dans le temps de la prière', 'Chaque prière a un début et une fin. L’onglet Horaires te donne ces moments pour ta ville.'],
          ['Se tourner vers la Qibla', 'C’est la direction de la Kaaba, à La Mecque. Ouvre la boussole Qibla depuis l’onglet Horaires.'],
          ['Avoir l’intention (niyya)', 'Savoir dans son cœur quelle prière on accomplit. Elle ne se prononce pas à voix haute.']
        ] },
        { type: 'h', text: 'Le vocabulaire de la prière' },
        { type: 'glossary', items: [
          ['Rak‘a', 'رَكْعَة', 'Une unité de prière : debout, inclinaison, deux prosternations.'],
          ['Takbîr', 'تَكْبِير', 'Dire « Allâhou akbar », à chaque changement de position.'],
          ['Qiyâm', 'قِيَام', 'La position debout, pendant la récitation.'],
          ['Roukoû‘', 'رُكُوع', 'L’inclinaison, le dos droit, les mains sur les genoux.'],
          ['Soujoûd', 'سُجُود', 'La prosternation, le front et le nez au sol.'],
          ['Djouloûs', 'جُلُوس', 'La position assise.'],
          ['Tachahhoud', 'تَشَهُّد', 'L’attestation récitée en position assise.'],
          ['Taslîm', 'تَسْلِيم', 'Le salut final, dit une seule fois : « As-salâmou ‘alaykoum ».'],
          ['Fard', 'فَرْض', 'Ce qui est obligatoire.'],
          ['Sunna', 'سُنَّة', 'Ce que le Prophète ﷺ faisait régulièrement : recommandé, récompensé, sans être obligatoire.']
        ] },
        { type: 'note', text: 'Ce guide suit le rite malikite, d’après la Risala d’Ibn Abi Zayd al-Qayrawânî et ses commentaires. En cas de doute, demande à l’imam de ta mosquée.' }
      ]
    },
    {
      slug: 'ablutions', title: 'Les ablutions', ar: 'الوُضُوء',
      lead: 'Les ablutions (al-woudoû’) purifient avant la prière. Elles prennent deux minutes et se font avec peu d’eau : le Prophète ﷺ se contentait d’environ un moudd, moins d’un litre.',
      blocks: [
        { type: 'quran', ref: [5, 6, 6], intro: 'Leur fondement est ce verset de la sourate La table servie :' },
        { type: 'note', text: 'Les boutons d’écoute jouent un extrait d’un vrai enregistrement de la prière, pour entendre la prononciation. Les formules sans bouton n’ont pas d’enregistrement ici.' },
        { type: 'h', text: 'Pas à pas' },
        { type: 'steps', kind: 'body', items: [
          { zone: 'heart', title: 'L’intention et la basmala', text: 'Forme dans ton cœur l’intention de te purifier pour la prière, puis prononce :', say: [{ ar: 'بِسْمِ اللَّهِ', ph: 'Bismillâh', fr: 'Au nom d’Allah.' }], tag: 'Indispensable (l’intention)' },
          { zone: 'hands', title: 'Les mains', text: 'Lave tes mains jusqu’aux poignets, en passant l’eau entre les doigts.', count: 3, tag: 'Sunna' },
          { zone: 'mouth', title: 'La bouche', text: 'Prends de l’eau dans la main droite, rince-toi la bouche et recrache.', count: 3, tag: 'Sunna' },
          { zone: 'nose', title: 'Le nez', text: 'Aspire un peu d’eau par le nez avec la main droite, puis rejette-la en t’aidant de la main gauche.', count: 3, tag: 'Sunna' },
          { zone: 'face', title: 'Le visage', text: 'Lave tout le visage : du haut du front, à la naissance des cheveux, jusqu’au menton, et d’une oreille à l’autre. Si ta barbe est clairsemée, l’eau doit atteindre la peau ; si elle est épaisse, laver l’extérieur suffit.', count: 3, tag: 'Obligatoire' },
          { zone: 'arms', title: 'Les avant-bras', text: 'Lave l’avant-bras droit du bout des doigts jusqu’au coude inclus, puis le gauche.', count: 3, tag: 'Obligatoire' },
          { zone: 'head', title: 'La tête', text: 'Passe tes mains mouillées sur toute la tête, du front jusqu’à la nuque, puis reviens vers le front.', count: 1, tag: 'Obligatoire' },
          { zone: 'ears', title: 'Les oreilles', text: 'Passe les index à l’intérieur des oreilles et les pouces derrière. Il est recommandé de reprendre un peu d’eau pour cela.', count: 1, tag: 'Sunna' },
          { zone: 'feet', title: 'Les pieds', text: 'Lave le pied droit jusqu’aux chevilles incluses, en passant l’eau entre les orteils (recommandé), puis le gauche.', count: 3, tag: 'Obligatoire' },
          { zone: 'heart', title: 'L’invocation finale', text: 'Une fois les ablutions terminées, dis :', say: [
            { ar: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', ph: 'Ach-hadou an lâ ilâha illa llâhou wahdahoû lâ charîka lah, wa ach-hadou anna Mouhammadan ‘abdouhoû wa rasoûlouh.', fr: 'J’atteste qu’il n’y a de divinité qu’Allah, Seul, sans associé, et j’atteste que Muhammad est Son serviteur et Son messager.', src: 'Rapporté par Muslim' },
            { ar: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ، وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ', ph: 'Allâhoumma dj‘alnî mina t-tawwâbîna, wa dj‘alnî mina l-moutatahhirîn.', fr: 'Ô Allah, fais de moi l’un de ceux qui se repentent et de ceux qui se purifient.', src: 'Rapporté par at-Tirmidhî' }
          ], tag: 'Sunna' }
        ] },
        { type: 'note', text: 'Ces paroles de la fin sont recommandées, pas obligatoires : les ablutions sont valides sans elles. Tu peux dire la chahada seule, rapportée par Muslim avec la promesse que les huit portes du Paradis s’ouvrent pour toi. La seconde invocation est un ajout rapporté par at-Tirmidhî : les savants discutent la solidité de sa chaîne, même si al-Albânî la juge authentique.' },
        { type: 'note', text: 'Frotter les membres en les lavant (ad-dalk) et enchaîner les gestes sans longue pause (al-fawr) sont obligatoires ; l’ordre des étapes est une sunna. Commence toujours par la droite.' },
        { type: 'h', text: 'Ce qui annule les ablutions' },
        { type: 'list', items: [
          'Tout ce qui sort par les voies naturelles : urine, selles, gaz, et le liquide prostatique (madhy). Après le madhy, on lave tout l’organe avant de refaire les ablutions.',
          'Le sommeil profond, où l’on perd conscience de ce qui nous entoure.',
          'La perte de conscience : évanouissement, anesthésie, ivresse.',
          'Pour l’homme, toucher son sexe directement, avec la paume ou l’intérieur des doigts.',
          'Toucher une personne avec désir ou en y trouvant du plaisir, ou l’embrasser sur la bouche.',
          'Tout ce qui impose le grand lavage.'
        ] },
        { type: 'note', text: 'N’annulent pas les ablutions : vomir, saigner (y compris du nez) et toucher quelqu’un sans désir ni plaisir.' },
        { type: 'h', text: 'Le grand lavage (ghousl)' },
        { type: 'p', text: 'Il est obligatoire après l’émission de sperme avec plaisir (même pendant le sommeil), après les rapports conjugaux (même sans éjaculation), ainsi qu’à la fin des règles ou des lochies. Forme l’intention, lave tes mains et tes parties intimes, fais les ablutions, verse l’eau trois fois sur la tête en la faisant passer entre les cheveux jusqu’à la racine, puis lave tout le corps en commençant par le côté droit. Frotte-toi (ad-dalk) et enchaîne sans longue pause (al-fawr). L’eau doit atteindre toute la peau.' },
        { type: 'h', text: 'Les ablutions sèches (tayammoum)' },
        { type: 'p', text: 'Quand il n’y a pas d’eau, ou si l’eau est nocive pour ta santé, tu peux faire le tayammoum, une fois le temps de la prière entré : forme l’intention, frappe de tes deux paumes la terre propre (ou le sable, la pierre) et secoue-les légèrement, passe-les sur tout le visage, puis frappe une seconde fois et passe les mains sur les avant-bras jusqu’aux coudes (l’obligation s’arrête aux poignets ; aller jusqu’aux coudes est une sunna). Si tu es sûr de trouver de l’eau avant la fin du temps, attends la fin du temps ; si tu es sûr de n’en pas trouver, fais-le dès le début ; dans le doute, au milieu du temps.' }
      ]
    },
    {
      slug: 'priere', title: 'La prière pas à pas', ar: 'صِفَةُ الصَّلَاةِ',
      lead: 'Voici une prière de deux rak‘as, comme celle de Fajr, geste par geste. Les prières de trois ou quatre rak‘as suivent le même modèle : le chapitre suivant explique ce qui change.',
      blocks: [
        { type: 'note', text: 'Les boutons d’écoute jouent un extrait d’un vrai enregistrement de la prière, pour entendre la prononciation. Les formules sans bouton n’ont pas d’enregistrement ici.' },
        { type: 'steps', kind: 'posture', items: [
          { fig: 'itidal', title: 'Debout, face à la Qibla', text: 'Tiens-toi droit, les pieds légèrement écartés, face à la Qibla. Forme dans ton cœur l’intention de la prière que tu vas accomplir, par exemple : « je prie les deux rak‘as de Fajr ».', tag: 'Indispensable' },
          { fig: 'takbir', title: 'Le takbîr d’entrée', text: 'Lève les mains à hauteur des épaules, ou un peu plus bas, et dis :', say: [TAKBIR], tag: 'Indispensable', after: 'À partir de cet instant, tu es en prière : plus de parole, de nourriture ni de geste inutile. C’est le seul moment de la prière où l’on lève les mains.' },
          { fig: 'itidal', title: 'La position debout', text: 'Reste debout, les bras le long du corps (as-sadl) : c’est la pratique habituelle des malikites. Poser la main droite sur la main gauche est aussi admis. Regarde droit devant toi, en direction de la Qibla. Ne dis rien entre le takbîr et la récitation : on commence directement par Al-Fâtiha.', tag: 'Pratique malikite' },
          { fig: 'itidal', title: 'Al-Fâtiha', text: 'Récite la sourate d’ouverture, sans « Bismillâh » au début : dans les prières obligatoires, les malikites ne récitent pas la basmala. Al-Fâtiha est indispensable dans chaque rak‘a pour l’imam et pour celui qui prie seul. Derrière l’imam, écoute-le quand il récite à voix haute ; quand il récite à voix basse, récite-la pour toi.', quran: [1, 2, 7], say: [{ ar: 'آمِين', ph: 'Âmîn', fr: 'Exauce-nous.', src: 'Se dit à voix basse après « wa la d-dâllîn », seul ou derrière l’imam' }], tag: 'Indispensable' },
          { fig: 'itidal', title: 'Une autre sourate', text: 'Dans les deux premières rak‘as, récite ensuite une sourate ou quelques versets. Par exemple, la sourate Al-Ikhlâs :', quran: [112, 1, 4], tag: 'Sunna' },
          { fig: 'ruku', title: 'L’inclinaison (roukoû‘)', text: 'Dis « Allâhou akbar » et incline-toi : le dos droit et horizontal, la tête dans son prolongement, les mains posées sur les genoux. Glorifie ton Seigneur ; aucune formule n’est imposée, par exemple trois fois :', say: [{ ar: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ', ph: 'Soubhâna rabbiya l-‘adhîm', fr: 'Gloire à mon Seigneur, l’Immense.' }], tag: 'Indispensable' },
          { fig: 'itidal', title: 'Le redressement', text: 'Relève-toi en te redressant complètement. L’imam dit seulement « Sami‘a llâhou liman hamidah » ; celui qui le suit dit seulement « Rabbanâ wa laka l-hamd » ; celui qui prie seul dit les deux :', say: [{ ar: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ', ph: 'Sami‘a llâhou liman hamidah', fr: 'Allah entend celui qui Le loue.' }, { ar: 'رَبَّنَا وَلَكَ الْحَمْدُ', ph: 'Rabbanâ wa laka l-hamd', fr: 'Notre Seigneur, à Toi la louange.', src: 'Une fois debout, immobile' }], tag: 'Indispensable' },
          { fig: 'sujud', title: 'La prosternation (soujoûd)', text: 'Dis « Allâhou akbar » et prosterne-toi : le front et le nez touchent le sol, les paumes sont à plat, doigts vers la Qibla, à hauteur des oreilles ou un peu en arrière ; appuie aussi les genoux et le bout des orteils, tournés vers la Qibla (ce sont les sept appuis marqués en turquoise). Écarte les coudes du sol et du corps. Glorifie ton Seigneur, par exemple trois fois :', say: [{ ar: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', ph: 'Soubhâna rabbiya l-a‘lâ', fr: 'Gloire à mon Seigneur, le Très-Haut.' }], tag: 'Indispensable', after: 'Tu peux aussi y ajouter tes propres invocations : c’est recommandé dans la prosternation, car c’est là que le serviteur est le plus proche de son Seigneur (rapporté par Muslim).' },
          { fig: 'julus', title: 'Assis entre les deux prosternations', text: 'Dis « Allâhou akbar », relève la tête et assieds-toi : le pied gauche replié sous toi, le pied droit dressé, les orteils au sol, et pose les mains sur les genoux. Reste immobile un instant.', tag: 'Indispensable' },
          { fig: 'sujud', title: 'La deuxième prosternation', text: 'Dis « Allâhou akbar » et prosterne-toi de nouveau, exactement comme la première fois, en glorifiant ton Seigneur. La première rak‘a est terminée.', tag: 'Indispensable' },
          { fig: 'itidal', title: 'La deuxième rak‘a', text: 'Relève-toi directement de la prosternation, en t’appuyant sur les mains, et dis « Allâhou akbar » en te levant. Récite Al-Fâtiha puis une autre sourate. Fais ensuite l’inclinaison, le redressement et les deux prosternations comme dans la première rak‘a.', tag: 'Indispensable' },
          { fig: 'tashahhud', title: 'Le tachahhoud', text: 'Après la seconde prosternation de la deuxième rak‘a, assieds-toi : le pied droit dressé, les orteils au sol, le pied gauche replié dessous, assis sur la fesse gauche (et non sur le pied). Pose la main gauche à plat sur la cuisse ; ferme les doigts de la main droite en laissant l’index tendu. Dans une prière de deux rak‘as, c’est l’assise finale : tu récites tout ce qui suit. (Pour trois ou quatre rak‘as, voir le chapitre suivant.) Récite :', say: [{ ar: 'التَّحِيَّاتُ لِلَّهِ، الزَّاكِيَاتُ لِلَّهِ، الطَّيِّبَاتُ الصَّلَوَاتُ لِلَّهِ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', ph: 'At-tahiyyâtou lillâh, az-zâkiyâtou lillâh, at-tayyibâtou s-salawâtou lillâh. As-salâmou ‘alayka ayyouha n-nabiyyou wa rahmatou llâhi wa barakâtouh. As-salâmou ‘alaynâ wa ‘alâ ‘ibâdi llâhi s-sâlihîn. Ach-hadou an lâ ilâha illa llâhou wahdahoû lâ charîka lah, wa ach-hadou anna Mouhammadan ‘abdouhoû wa rasoûlouh.', fr: 'Les salutations sont pour Allah, les bonnes œuvres pures sont pour Allah, les bonnes paroles et les prières sont pour Allah. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d’Allah et Ses bénédictions. Que la paix soit sur nous et sur les pieux serviteurs d’Allah. J’atteste qu’il n’y a de divinité qu’Allah, Seul, sans associé, et j’atteste que Muhammad est Son serviteur et Son messager.', src: 'Texte de la Risala d’Ibn Abi Zayd al-Qayrawânî, d’après la version de ‘Oumar ibn al-Khattâb rapportée par l’imam Mâlik dans le Mouwatta’' }], tag: 'Sunna confirmée' },
          { fig: 'tashahhud', title: 'La prière sur le Prophète ﷺ', text: 'Toujours assis, poursuis avec la prière abrahamique :', say: [{ ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ', ph: 'Allâhoumma salli ‘alâ Mouhammadin wa ‘alâ âli Mouhammad, kamâ sallayta ‘alâ Ibrâhîma wa ‘alâ âli Ibrâhîm, innaka hamîdoun madjîd. Allâhoumma bârik ‘alâ Mouhammadin wa ‘alâ âli Mouhammad, kamâ bârakta ‘alâ Ibrâhîma wa ‘alâ âli Ibrâhîm, innaka hamîdoun madjîd.', fr: 'Ô Allah, prie sur Muhammad et sur la famille de Muhammad, comme Tu as prié sur Abraham et sur la famille d’Abraham ; Tu es digne de louange et de gloire. Ô Allah, bénis Muhammad et la famille de Muhammad, comme Tu as béni Abraham et la famille d’Abraham ; Tu es digne de louange et de gloire.', src: 'Rapporté par al-Boukhârî' }], tag: 'Sunna' },
          { fig: 'tashahhud', title: 'Une invocation avant de saluer', text: 'Avant de conclure, tu peux invoquer Allah comme tu le souhaites. Le Prophète ﷺ recommandait celle-ci :', say: [{ ar: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ، وَمِنْ عَذَابِ الْقَبْرِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ', ph: 'Allâhoumma innî a‘oûdhou bika min ‘adhâbi djahannam, wa min ‘adhâbi l-qabr, wa min fitnati l-mahyâ wa l-mamât, wa min charri fitnati l-masîhi d-dadjdjâl.', fr: 'Ô Allah, je cherche refuge auprès de Toi contre le châtiment de l’Enfer, contre le châtiment de la tombe, contre les épreuves de la vie et de la mort, et contre le mal de l’épreuve du faux messie.', src: 'Rapporté par Muslim' }], tag: 'Recommandé' },
          { fig: 'taslim', title: 'Le salut final (taslîm)', text: 'Dis une seule fois la formule, face à la Qibla, en tournant légèrement la tête vers la droite. La prière est terminée. Derrière l’imam, dis-la une fois en te tournant vers la droite, puis réponds en silence au salut de l’imam, vers l’avant ; ne salue à ta gauche que si quelqu’un t’y a salué.', say: [{ ar: 'السَّلَامُ عَلَيْكُمْ', ph: 'As-salâmou ‘alaykoum', fr: 'Que la paix soit sur vous.', src: 'La formule se dit exactement ainsi, une seule fois' }], tag: 'Indispensable' }
        ] },
        { type: 'note', text: 'Chaque changement de position se fait en disant « Allâhou akbar », sauf le redressement après l’inclinaison (« Sami‘a llâhou liman hamidah ») et le salut final. Prends ton temps : chaque position doit être marquée par un instant d’immobilité (at-touma’nîna).' }
      ]
    },
    {
      slug: 'rakats', title: 'Les rak‘as de chaque prière', ar: 'عَدَدُ الرَّكَعَاتِ',
      lead: 'Les cinq prières n’ont pas toutes le même nombre de rak‘as. Pour celles de trois ou quatre rak‘as, il suffit d’ajouter quelques gestes au modèle de deux rak‘as.',
      blocks: [
        { type: 'table', head: ['Prière', 'Rak‘as obligatoires', 'Récitation', 'Sunnas qui l’accompagnent'], rows: [
          ['Fajr', '2', 'À voix haute', '2 rak‘as avant (vivement recommandées)'],
          ['Dhohr', '4', 'À voix basse', '4 avant et 4 après (recommandées)'],
          ['Asr', '4', 'À voix basse', '4 avant (recommandées)'],
          ['Maghrib', '3', 'Haute pour les 2 premières, basse pour la 3e', '2 après, et jusqu’à 6 (recommandées)'],
          ['Icha', '4', 'Haute pour les 2 premières, basse ensuite', 'Après Icha : le chaf‘ (2 rak‘as) puis le witr (1 rak‘a)'],
          ['Joumou‘a (vendredi)', '2', 'À voix haute', 'Remplace Dhohr, après le sermon']
        ] },
        { type: 'p', text: '« À voix haute » concerne d’abord l’imam. Celui qui prie seul fait de même, de préférence, et récite à voix basse le reste du temps. Derrière l’imam, on l’écoute quand il récite à voix haute.' },
        { type: 'h', text: 'Combien d’assises, et que dit-on ?' },
        { type: 'p', text: 'Dans une prière de quatre rak‘as, on s’assoit deux fois, pas quatre. Le tachahhoud (« At-tahiyyâtou lillâh… ‘abdouhoû wa rasoûlouh ») se récite à chaque assise. La prière sur le Prophète ﷺ, l’invocation et le salut ne viennent qu’à la toute dernière.' },
        { type: 'table', plain: true, head: ['Prière', 'Assise après la 2e rak‘a', 'Assise finale'], rows: [
          ['Fajr, Joumou‘a (2 rak‘as)', 'Aucune : la seule assise est la finale', 'Après la 2e rak‘a : tachahhoud, prière sur le Prophète ﷺ, invocation, salut'],
          ['Maghrib (3 rak‘as)', 'Oui : tachahhoud seul, puis relève-toi', 'Après la 3e rak‘a : tachahhoud, prière sur le Prophète ﷺ, invocation, salut'],
          ['Dhohr, Asr, Icha (4 rak‘as)', 'Oui : tachahhoud seul, puis relève-toi', 'Après la 4e rak‘a : tachahhoud, prière sur le Prophète ﷺ, invocation, salut']
        ] },
        { type: 'note', text: 'Il n’y a pas d’assise après la 3e rak‘a d’une prière de quatre : on enchaîne directement avec la 4e. À la première assise, on ne dit que le tachahhoud, sans prière sur le Prophète ﷺ.' },
        { type: 'h', text: 'Prier trois ou quatre rak‘as' },
        { type: 'steps', kind: 'posture', items: [
          { fig: 'tashahhud', title: 'Le premier tachahhoud', text: 'Après les deux premières rak‘as, assieds-toi et récite le tachahhoud en entier, jusqu’aux deux attestations (« … ‘abdouhoû wa rasoûlouh »). Rien de plus : ni prière sur le Prophète ﷺ, ni invocation, ni salut.', tag: 'Sunna' },
          { fig: 'itidal', title: 'Se relever', text: 'Relève-toi en disant « Allâhou akbar » pour commencer la troisième rak‘a, sans lever les mains.', tag: 'Indispensable' },
          { fig: 'itidal', title: 'La Fâtiha seule', text: 'Dans la troisième et la quatrième rak‘a, récite uniquement Al-Fâtiha, à voix basse, puis fais l’inclinaison et les deux prosternations.', tag: 'Indispensable' },
          { fig: 'tashahhud', title: 'La dernière position assise', text: 'Après la dernière rak‘a (la 3e au Maghrib, la 4e pour Dhohr, Asr et Icha), récite le même tachahhoud, puis ajoute la prière sur le Prophète ﷺ et une invocation, avant le salut final. Assieds-toi de la même façon qu’au premier tachahhoud, sur la fesse gauche.', tag: 'Indispensable' }
        ] },
        { type: 'h', text: 'Le qounoût de Fajr' },
        { type: 'p', text: 'À la prière de Fajr, il est recommandé de dire une invocation appelée qounoût, dans la deuxième rak‘a, après la récitation et avant l’inclinaison (on peut aussi la dire après l’inclinaison). On la dit à voix basse, sans lever les mains.' },
        { type: 'dhikr', items: [{ ar: 'اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ، وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ، وَنَخْنَعُ لَكَ وَنَخْلَعُ وَنَتْرُكُ مَنْ يَكْفُرُكَ. اللَّهُمَّ إِيَّاكَ نَعْبُدُ، وَلَكَ نُصَلِّي وَنَسْجُدُ، وَإِلَيْكَ نَسْعَى وَنَحْفِدُ، نَرْجُو رَحْمَتَكَ وَنَخَافُ عَذَابَكَ الْجِدَّ، إِنَّ عَذَابَكَ بِالْكَافِرِينَ مُلْحَقٌ', ph: 'Allâhoumma innâ nasta‘înouka wa nastaghfirouk, wa nou’minou bika wa natawakkalou ‘alayk, wa nakhna‘ou laka wa nakhla‘ou wa natrouka man yakfourouk. Allâhoumma iyyâka na‘boud, wa laka nousallî wa nasjoud, wa ilayka nas‘â wa nahfid, narjoû rahmatak, wa nakhâfou ‘adhâbaka l-djidd, inna ‘adhâbaka bi l-kâfirîna moulhaq.', fr: 'Ô Allah, nous implorons Ton aide et Ton pardon, nous croyons en Toi, nous nous en remettons à Toi, nous nous humilions devant Toi, nous renions et délaissons quiconque Te renie. Ô Allah, c’est Toi que nous adorons, pour Toi que nous prions et nous prosternons, vers Toi que nous nous empressons. Nous espérons Ta miséricorde et nous craignons Ton châtiment sévère : Ton châtiment atteindra ceux qui ne croient pas.', src: 'Texte donné dans la Risala d’Ibn Abi Zayd al-Qayrawânî' }] },
        { type: 'h', text: 'Le witr' },
        { type: 'p', text: 'Le witr est une prière impaire, faite après Icha et avant Fajr. On prie d’abord deux rak‘as (le chaf‘), saluées, puis une seule rak‘a (le witr). C’est une sunna confirmée : le Prophète ﷺ ne la délaissait jamais.' }
      ]
    },
    {
      slug: 'apres', title: 'Après la prière', ar: 'الأَذْكَارُ بَعْدَ الصَّلَاةِ',
      lead: 'Après le salut, reste assis quelques instants pour les invocations que le Prophète ﷺ disait après chaque prière obligatoire.',
      blocks: [
        { type: 'note', text: 'Les boutons d’écoute jouent un extrait d’un vrai enregistrement de la prière, pour entendre la prononciation. Les formules sans bouton n’ont pas d’enregistrement ici.' },
        { type: 'dhikr', items: [
          { ar: 'أَسْتَغْفِرُ اللَّهَ', ph: 'Astaghfirou llâh', fr: 'Je demande pardon à Allah.', count: 3 },
          { ar: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', ph: 'Allâhoumma anta s-salâmou wa minka s-salâm, tabârakta yâ dha l-djalâli wa l-ikrâm.', fr: 'Ô Allah, Tu es la Paix et de Toi vient la paix. Béni sois-Tu, ô Détenteur de la majesté et de la générosité.', count: 1, src: 'Rapporté par Muslim' },
          { ar: 'سُبْحَانَ اللَّهِ', ph: 'Soubhâna llâh', fr: 'Gloire à Allah.', count: 33 },
          { ar: 'الْحَمْدُ لِلَّهِ', ph: 'Al-hamdou lillâh', fr: 'Louange à Allah.', count: 33 },
          { ar: 'اللَّهُ أَكْبَرُ', ph: 'Allâhou akbar', fr: 'Allah est le plus grand.', count: 33 },
          { ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', ph: 'Lâ ilâha illa llâhou wahdahoû lâ charîka lah, lahou l-moulkou wa lahou l-hamd, wa houwa ‘alâ koulli chay’in qadîr.', fr: 'Il n’y a de divinité qu’Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.', count: 1, src: 'Complète la centaine. Rapporté par Muslim' }
        ] },
        { type: 'counter' },
        { type: 'h', text: 'Le verset du Trône (Âyat al-Koursî)' },
        { type: 'quran', ref: [2, 255, 255], intro: 'Le Prophète ﷺ a dit que celui qui le récite après chaque prière obligatoire, seule la mort le sépare du Paradis (rapporté par an-Nasâ’î).' },
        { type: 'p', text: 'Il est aussi recommandé de réciter les sourates Al-Ikhlâs, Al-Falaq et An-Nâs après chaque prière, et trois fois après Fajr et Maghrib. Tu les trouves à la fin du Coran, dans l’onglet Coran.' }
      ]
    },
    {
      slug: 'adhan', title: 'L’adhan et l’iqâma', ar: 'الأَذَانُ وَالإِقَامَةُ',
      lead: 'L’adhan annonce l’entrée du temps de la prière. L’iqâma, plus courte, annonce son début immédiat.',
      blocks: [
        { type: 'adhan' },
        { type: 'h', text: 'Répondre à l’adhan' },
        { type: 'p', text: 'Quand tu entends l’adhan, répète chaque phrase après le muezzin. À « Hayya ‘ala s-salâh » et « Hayya ‘ala l-falâh », dis plutôt :' },
        { type: 'dhikr', items: [{ ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', ph: 'Lâ hawla wa lâ qouwwata illâ billâh', fr: 'Il n’y a de force ni de puissance qu’en Allah.', src: 'Rapporté par Muslim' }] },
        { type: 'p', text: 'À la fin de l’adhan, prie sur le Prophète ﷺ puis dis :' },
        { type: 'dhikr', items: [{ ar: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ', ph: 'Allâhoumma rabba hâdhihi d-da‘wati t-tâmmah, wa s-salâti l-qâ’imah, âti Mouhammadan al-wasîlata wa l-fadîlah, wa b‘ath-hou maqâman mahmoûdan alladhî wa‘adtah.', fr: 'Ô Allah, Seigneur de cet appel parfait et de la prière qui va être accomplie, accorde à Muhammad l’intercession et le mérite, et ressuscite-le dans la station louable que Tu lui as promise.', src: 'Rapporté par al-Boukhârî' }] },
        { type: 'h', text: 'L’iqâma' },
        { type: 'p', text: 'L’iqâma reprend les phrases de l’adhan, chacune dite une seule fois, sauf « Allâhou akbar », dit deux fois au début et deux fois à la fin. Elle ajoute, avant le dernier takbîr :' },
        { type: 'dhikr', items: [{ ar: 'قَدْ قَامَتِ الصَّلَاةُ', ph: 'Qad qâmati s-salâh', fr: 'La prière commence.', count: 1 }] },
        { type: 'note', text: 'Dans le rite malikite, l’adhan compte dix-sept phrases : « Allâhou akbar » deux fois au début, puis chacune des deux attestations dite deux fois à voix basse et deux fois à voix haute (le tarjî‘). Les extraits audio servent surtout à entendre la prononciation de chaque phrase.' }
      ]
    },
    {
      slug: 'cas', title: 'Oublis et cas particuliers', ar: 'أَحْكَامٌ خَاصَّةٌ',
      lead: 'Tout le monde fait des erreurs dans la prière. L’islam prévoit des solutions simples pour les oublis, la maladie, le voyage ou le retard.',
      blocks: [
        { type: 'cards', items: [
          ['La prosternation de l’oubli', 'Elle répare une erreur par deux prosternations (soujoûd as-sahw). Si tu as oublié une sunna importante (comme le premier tachahhoud), fais-les avant le salut, après le tachahhoud final. Si tu as ajouté quelque chose par oubli (une rak‘a, une parole), fais-les après le salut, puis redis le tachahhoud et le salut. Si tu as oublié et ajouté en même temps, fais-les avant le salut. En cas de doute sur le nombre de rak‘as, retiens le plus petit nombre, complète, puis fais les deux prosternations après le salut.'],
          ['Oublier un pilier', 'Si tu oublies un élément indispensable, comme une inclinaison ou une prosternation, il faut le rattraper ou refaire la rak‘a, puis faire la prosternation de l’oubli. Si tu t’en rends compte peu de temps après le salut, reprends avec un nouveau takbîr et complète ; si c’est longtemps après, refais la prière.'],
          ['Une prière manquée', 'Si tu as dormi ou oublié, prie-la dès que tu t’en souviens : « c’est là son expiation » (rapporté par al-Boukhârî et Muslim). Les prières délaissées volontairement se rattrapent aussi, avec le repentir.'],
          ['Prier malade', 'Si tu ne peux pas te tenir debout, prie assis ; sinon allongé sur le côté, face à la Qibla, en faisant les gestes avec la tête. Allah ne demande à personne plus que ce qu’il peut.'],
          ['En voyage', 'À partir d’environ 80 km, on raccourcit les prières de quatre rak‘as à deux (al-qasr) : c’est une sunna confirmée. Maghrib et Fajr ne se raccourcissent pas. On peut aussi regrouper Dhohr avec Asr, et Maghrib avec Icha (al-djam‘), dans des conditions précises : demande conseil à ton imam.'],
          ['Arriver en retard à la prière en groupe', 'Rejoins l’imam dans la position où il se trouve, avec un takbîr. Si tu le rejoins avant qu’il se relève de l’inclinaison, la rak‘a compte. Après son salut, relève-toi pour compléter les rak‘as manquées.']
        ] },
        { type: 'h', text: 'Quand éviter les prières surérogatoires' },
        { type: 'list', items: [
          'Après Fajr, jusqu’à ce que le soleil soit bien levé (environ un quart d’heure après Chourouq).',
          'Après Asr, jusqu’au coucher du soleil.'
        ] },
        { type: 'p', text: 'Les prières obligatoires manquées peuvent, elles, être rattrapées à tout moment, dans la même forme qu’à l’heure.' },
        { type: 'note', text: 'Ce guide est une introduction. Pour approfondir, rapproche-toi d’un enseignant ou de l’imam de ta mosquée, qui pourra aussi corriger ta récitation.' }
      ]
    }
  ];
  window.MAWQUT_LEARN = CH.map(c => ({ slug: c.slug, title: c.title, ar: c.ar, lead: c.lead })); // sommaire, aussi utilisé par l'app télé

  // ---------- Écoute ----------
  const BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5c2.5-1.2 5.5-1.2 9 .8 3.5-2 6.5-2 9-.8V18c-2.5-1.2-5.5-1.2-9 .8-3.5-2-6.5-2-9-.8V6.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7.3V19" stroke="currentColor" stroke-width="1.6"/></svg>';
  const SPK = '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.6L12 18.5v-13L7.6 9.5H4Z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/></svg>';
  // Phrases de l'adhan d'Ahmed al-Imadi (repérées et vérifiées par reconnaissance vocale)
  const ADHAN_FILE = 'audio/adhan-imadi.mp3';
  const ADHAN_SEG = [[0.3, 20.7], [22.4, 33.0], [54.1, 67.0], [85.9, 95.0], [118.3, 126.2], null, [147.8, 159.5], [161.2, 177.6]];
  const seg = new Audio();
  const gain = () => (window.Mawqut && window.Mawqut.gain ? window.Mawqut.gain() : 1);
  window.addEventListener('mawqut:volume', () => { seg.volume = gain(); });
  seg.preload = 'none';
  let segEnd = 0, segRow = null;
  function stopSeg() { seg.pause(); segEnd = 0; if (segRow) segRow.classList.remove('is-playing'); segRow = null; }
  seg.addEventListener('timeupdate', () => { if (segEnd && seg.currentTime >= segEnd) stopSeg(); });
  seg.addEventListener('ended', stopSeg);
  async function playSeg(i, row) {
    const was = segRow === row;
    stopSeg();
    if (was) return;
    if (window.MawqutQuran && window.MawqutQuran.stop) window.MawqutQuran.stop();
    if (window.Mawqut && window.Mawqut.stopAlertSound) window.Mawqut.stopAlertSound();
    const [a, b] = ADHAN_SEG[i];
    try {
      if (!seg.src.endsWith(ADHAN_FILE)) seg.src = ADHAN_FILE;
      seg.currentTime = a;
      segEnd = b; segRow = row; row.classList.add('is-playing');
      seg.volume = gain();
      await seg.play();
    } catch (e) { stopSeg(); }
  }

  // Paroles de la prière : extrait d’un vrai enregistrement (voir CREDIT_AUDIO)
  async function playSay(file, el) {
    const was = segRow === el;
    stopSeg();
    if (was) return;
    if (window.MawqutQuran && window.MawqutQuran.stop) window.MawqutQuran.stop();
    if (window.Mawqut && window.Mawqut.stopAlertSound) window.Mawqut.stopAlertSound();
    try {
      seg.src = file;
      segEnd = 0; segRow = el; el.classList.add('is-playing');
      seg.volume = gain();
      await seg.play();
    } catch (e) { stopSeg(); }
  }

  // Fiches à imprimer : la mise en page papier est dans css/print.css (active avec html.print-fiche)
  const ICON_PRINT = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></g></svg>';
  const ICON_PDF = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 19h14"/></g></svg>';
  const markPrint = () => document.documentElement.classList.toggle('print-fiche', /^#apprendre/.test(location.hash));
  window.addEventListener('beforeprint', markPrint);
  window.addEventListener('afterprint', () => document.documentElement.classList.remove('print-fiche'));
  function printFiche() { markPrint(); window.print(); }

  const FICHES_SLUG = 'fiches', MEMO_SLUG = 'memo-priere';
  const fmtSize = kb => (kb >= 1000 ? (kb / 1024).toFixed(1).replace('.', ',') + ' Mo' : kb + ' Ko');
  const ficheMeta = slug => {
    const m = (window.MAWQUT_FICHES || {})[slug];
    return m ? `${m.pages} page${m.pages > 1 ? 's' : ''} · ${fmtSize(m.kb)}` : '';
  };
  const prayerSteps = () => CH.find(c => c.slug === 'priere').blocks.find(b => b.type === 'steps').items;

  // Mémo : les 15 étapes de la prière et ce qu'on dit, en deux pages
  function memoRowsHTML() {
    return prayerSteps().map((st, i) => {
      let q = '';
      if (st.quran) {
        const [s, a, b] = st.quran;
        const nm = (window.MawqutQuran && window.MawqutQuran.surah && window.MawqutQuran.surah(s) || [])[1];
        q = `<p class="memo-q">Sourate ${nm ? esc(nm) + ' ' : ''}(${s}:${a}${b > a ? '–' + b : ''})</p>`;
      }
      return `<li class="memo-row">
        <span class="step-n tnum">${i + 1}</span>
        <div class="memo-fig">${imgTag(POSTURE_IMG[st.fig])}</div>
        <div class="memo-what"><h4>${esc(st.title)}</h4><div class="step-tags">${tagHTML(st.tag)}${countHTML(st.count)}</div></div>
        <div class="memo-say">${q}${(st.say || []).map(s => `<div class="memo-f"><p class="memo-ar" lang="ar">${esc(s.ar)}</p>${s.ph ? `<p class="memo-ph">${esc(s.ph)}</p>` : ''}</div>`).join('')}</div>
      </li>`;
    }).join('');
  }
  function renderMemo() {
    renderNav(MEMO_SLUG);
    const fm = ficheMeta(MEMO_SLUG);
    content.innerHTML = `
      <header class="l-head">
        <p class="p-brand"><b>Amin</b><span>Guide pour débuter</span></p>
        <p class="l-step"><a class="l-back" href="#apprendre-${FICHES_SLUG}">Fiches à imprimer</a> · Mémo</p>
        <h2>La prière en un coup d’œil</h2>
        <p class="l-ar" lang="ar">صِفَةُ الصَّلَاةِ</p>
        <p class="l-lead">Les quinze étapes d’une prière de deux rak‘as, avec ce qu’on dit à chacune. À garder près du tapis le temps d’apprendre.</p>
        <div class="l-actions" role="group" aria-label="Fiche de ce mémo">
          <button type="button" class="btn btn-quiet" data-print>${ICON_PRINT}Imprimer le mémo</button>
          <a class="btn btn-quiet" href="fiches/${MEMO_SLUG}.pdf" download="Amin-memo-priere.pdf">${ICON_PDF}Télécharger en PDF${fm ? ` <small>${fm}</small>` : ''}</a>
        </div>
      </header>
      <ol class="memo">${memoRowsHTML()}</ol>
      <p class="p-foot">Mémo · Amin, horaires de prière et guide pour débuter</p>
      <nav class="l-pager" aria-label="Retour">
        <a class="l-prev" href="#apprendre-priere"><small>Chapitre complet</small>La prière pas à pas</a>
        <a class="l-next" href="#apprendre-${FICHES_SLUG}"><small>Retour</small>Fiches à imprimer</a>
      </nav>`;
  }

  // Liste des fiches PDF
  function renderFiches() {
    renderNav(FICHES_SLUG);
    const rows = [
      { slug: MEMO_SLUG, title: 'La prière en un coup d’œil', sub: 'Les quinze étapes et ce qu’on dit, sur deux pages : le mémo à garder près du tapis.', view: `#apprendre-${MEMO_SLUG}`, file: 'Amin-memo-priere', key: true },
      ...CH.map((c, i) => ({ slug: c.slug, title: c.title, sub: `Chapitre ${i + 1} : ${(c.lead.match(/^.*?[.!?](?=\s|$)/) || [c.lead])[0]}`, view: `#apprendre-${c.slug}`, file: `Amin-${c.slug}` })),
      { slug: 'guide-complet', title: 'Le guide complet', sub: 'Les huit chapitres à la suite, avec signets pour s’y retrouver.', file: 'Amin-guide-complet' }
    ];
    content.innerHTML = `
      <header class="l-head">
        <p class="l-step">Guide pour débuter</p>
        <h2>Fiches à imprimer</h2>
        <p class="l-lead">Chaque chapitre existe en fiche A4, en noir sur blanc, prête à imprimer. Une fois téléchargés, les PDF se lisent aussi sans connexion.</p>
      </header>
      <ul class="fiches">${rows.map(r => `<li class="fiche${r.key ? ' is-key' : ''}">
          <div class="fiche-tx"><h3>${esc(r.title)}</h3><p>${esc(r.sub)}</p><p class="fiche-meta tnum">${esc(ficheMeta(r.slug))}</p></div>
          <div class="fiche-go">
            <a class="btn btn-quiet" href="fiches/${r.slug}.pdf" download="${r.file}.pdf">${ICON_PDF}PDF</a>
            ${r.view ? `<a class="btn btn-quiet" href="${r.view}">Voir</a>` : ''}
          </div>
        </li>`).join('')}</ul>`;
  }

  // Mention obligatoire (licence CC BY 4.0) des enregistrements de la prière
  const CREDIT_AUDIO = `<p class="l-credit">Enregistrements des formules : extraits de « Islamic Salat Procedure » de Joseph Lloyd Zacker (<a href="https://archive.org/details/salah-3" target="_blank" rel="noopener noreferrer">archive.org</a>), sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Les extraits ont été découpés et leur volume égalisé.</p>`;

  // ---------- Rendu ----------
  const nav = $('#learnNav');
  const content = $('#learnContent');
  const sayFile = s => (window.MAWQUT_PRIERE && window.MAWQUT_PRIERE[s.ar]) || '';
  const sayHTML = s => `<div class="say${sayFile(s) ? ' has-audio' : ''}">
      ${sayFile(s) ? `<button type="button" class="l-play l-say" data-say="${esc(sayFile(s))}" aria-label="Écouter : ${esc(s.ph)}" title="Écouter la formule (extrait d’un enregistrement)">${SPK}</button>` : ''}
      <p class="say-ar" lang="ar">${esc(s.ar)}</p>
      ${s.ph ? `<p class="say-ph">${esc(s.ph)}</p>` : ''}
      <p class="say-fr">${esc(s.fr)}</p>
      ${s.src ? `<p class="say-src">${esc(s.src)}</p>` : ''}
    </div>`;
  const countHTML = n => (n ? `<span class="tag tag-count">${n > 1 ? `${n} fois` : '1 fois'}</span>` : '');
  const tagHTML = t => (t ? `<span class="tag ${/^Indispensable|^Obligatoire/.test(t) ? 'tag-must' : 'tag-sunna'}">${esc(t)}</span>` : '');
  function quranHTML(ref) {
    return `<div class="qblock" data-ref="${ref.join(',')}"><p class="hint">Chargement du texte…</p></div>`;
  }
  async function fillQuran(root) {
    for (const box of root.querySelectorAll('.qblock')) {
      const [s, a, b] = box.dataset.ref.split(',').map(Number);
      try {
        const d = await window.MawqutQuran.ensure(s);
        const meta = window.MawqutQuran.surah(s);
        let html = '';
        for (let v = a; v <= b; v++) {
          const tr = d.rm[v - 1].replace(/\[\d+\]/g, '');
          html += `<div class="qv" data-key="${s}:${v}"><div class="qv-top"><button type="button" class="l-play" data-key="${s}:${v}" aria-label="Écouter le verset ${s}:${v}">${SPK}</button><button type="button" class="l-explain" data-key="${s}:${v}" aria-label="Explication du verset ${s}:${v}" title="Explication du verset">${BOOK}</button></div><p class="qv-ar" lang="ar">${esc(d.ar[v - 1])} <span class="qv-mark">۝${String(v).replace(/\d/g, x => '٠١٢٣٤٥٦٧٨٩'[x])}</span></p><p class="say-ph">${esc(d.ph[v - 1])}</p><p class="say-fr">${esc(tr)}</p></div>`;
        }
        html += `<p class="say-src">Sourate ${esc(meta[1])} (${s}), ${a === b ? 'verset ' + a : 'versets ' + a + ' à ' + b} · traduction de Rachid Maach</p>`;
        box.innerHTML = html;
      } catch (e) { box.innerHTML = '<p class="hint">Texte indisponible hors connexion.</p>'; }
    }
  }
  const ADHAN = [
    ['اللَّهُ أَكْبَرُ', 'Allâhou akbar', 'Allah est le plus grand.', 2],
    ['أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ', 'Ach-hadou an lâ ilâha illa llâh', 'J’atteste qu’il n’y a de divinité qu’Allah.', '2 + 2'],
    ['أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ', 'Ach-hadou anna Mouhammadan rasoûlou llâh', 'J’atteste que Muhammad est le messager d’Allah.', '2 + 2'],
    ['حَيَّ عَلَى الصَّلَاةِ', 'Hayya ‘ala s-salâh', 'Venez à la prière.', 2],
    ['حَيَّ عَلَى الْفَلَاحِ', 'Hayya ‘ala l-falâh', 'Venez à la réussite.', 2],
    ['الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', 'As-salâtou khayroun mina n-nawm', 'La prière est meilleure que le sommeil.', 2, 'Seulement pour Fajr'],
    ['اللَّهُ أَكْبَرُ', 'Allâhou akbar', 'Allah est le plus grand.', 2],
    ['لَا إِلَهَ إِلَّا اللَّهُ', 'Lâ ilâha illa llâh', 'Il n’y a de divinité qu’Allah.', 1]
  ];

  function blockHTML(b) {
    switch (b.type) {
      case 'p': return `<p class="l-p">${esc(b.text)}</p>`;
      case 'h': return `<h3 class="l-h">${esc(b.text)}</h3>`;
      case 'note': return `<aside class="l-note"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10"/><rect x="7" y="7" width="10" height="10" transform="rotate(45 12 12)"/></g></svg><p>${esc(b.text)}</p></aside>`;
      case 'list': return `<ul class="l-list">${b.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      case 'cards': return `<div class="l-cards">${b.items.map(([t, d]) => `<div class="l-card"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join('')}</div>`;
      case 'glossary': return `<dl class="l-gloss">${b.items.map(([t, ar, d]) => `<div><dt><span>${esc(t)}</span><span lang="ar">${esc(ar)}</span></dt><dd>${esc(d)}</dd></div>`).join('')}</dl>`;
      case 'pillars': return `<ol class="l-pillars">${b.items.map(([id, ar, t], i) => `<li><button type="button" class="l-pillar" data-goto="${id}" aria-label="Aller au pilier ${i + 1} : ${esc(t)}"><span class="pn tnum" aria-hidden="true">${i + 1}</span><span class="pt">${esc(t)}</span><span class="pa" lang="ar" aria-hidden="true">${esc(ar)}</span></button></li>`).join('')}</ol>`;
      case 'pillar': return `<header class="l-pillar-h" id="${b.id}" tabindex="-1"><span class="pn tnum" aria-hidden="true">${b.n}</span><div class="pl-tx"><h3>${esc(b.title)}</h3><p>${esc(b.sub)}</p></div><span class="pl-ar" lang="ar">${esc(b.ar)}</span></header>`;
      case 'quran': return `${b.intro ? `<p class="l-p">${esc(b.intro)}</p>` : ''}${quranHTML(b.ref)}`;
      case 'table': return `<div class="l-table-wrap"><table class="l-table${b.plain ? ' is-plain' : ''}"><thead><tr>${b.head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
      case 'dhikr': return `<div class="l-dhikr">${b.items.map(d => `<div class="dhikr">${countHTML(d.count)}${sayHTML(d)}</div>`).join('')}</div>`;
      case 'adhan': return `<ol class="l-adhan">${ADHAN.map(([ar, ph, fr, n, note], i) => `<li class="${note ? 'is-fajr' : ''}">${ADHAN_SEG[i] ? `<button type="button" class="l-play" data-seg="${i}" aria-label="Écouter : ${esc(ph)}">${SPK}</button>` : '<span class="l-play-gap"></span>'}<div class="ad-ar" lang="ar">${esc(ar)}</div><div class="ad-tx"><p class="say-ph">${esc(ph)}</p><p class="say-fr">${esc(fr)}</p>${note ? `<p class="say-src">${esc(note)}</p>` : ''}</div><span class="tag tag-count">× ${n}</span></li>`).join('')}</ol>`;
      case 'counter': return `<div class="tasbih" id="tasbih">
          <button type="button" class="tasbih-btn" id="tasbihBtn" aria-live="polite">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring" id="tasbihRing"/></svg>
            <span class="tasbih-n tnum" id="tasbihN">0</span>
            <span class="tasbih-ar" lang="ar" id="tasbihAr">سُبْحَانَ اللَّهِ</span>
          </button>
          <div class="tasbih-side">
            <h4>Compteur de tasbîh</h4>
            <p id="tasbihLabel">Appuie pour compter « Soubhâna llâh ». Le compteur passe tout seul à la formule suivante après 33.</p>
            <button type="button" class="btn" id="tasbihReset">Recommencer</button>
          </div>
        </div>`;
      case 'steps': return `<ol class="l-steps ${b.kind === 'body' ? 'is-body' : ''}">${b.items.map((st, i) => `<li class="step">
          <div class="step-fig">${b.kind === 'body' ? bodySVG(st.zone) + imgTag(WUDU_IMG[i]) : postureSVG(st.fig) + imgTag(POSTURE_IMG[st.fig])}</div>
          <div class="step-main">
            <div class="step-top"><span class="step-n tnum">${i + 1}</span><h4>${esc(st.title)}</h4></div>
            <div class="step-tags">${tagHTML(st.tag)}${countHTML(st.count)}</div>
            <p class="step-text">${esc(st.text)}</p>
            ${st.quran ? quranHTML(st.quran) : ''}
            ${(st.say || []).map(sayHTML).join('')}
            ${st.after ? `<p class="step-after">${esc(st.after)}</p>` : ''}
          </div>
        </li>`).join('')}</ol>`;
      default: return '';
    }
  }

  function renderNav(active) {
    nav.innerHTML = `<p class="learn-kicker">Guide pour débuter</p><ol>${CH.map((c, i) => `<li><a href="#apprendre-${c.slug}" ${c.slug === active ? 'aria-current="page"' : ''}><span class="ln tnum">${i + 1}</span><span class="lt">${esc(c.title)}<small lang="ar">${esc(c.ar)}</small></span></a></li>`).join('')}<li class="ln-extra"><a href="#apprendre-${FICHES_SLUG}" ${active === FICHES_SLUG || active === MEMO_SLUG ? 'aria-current="page"' : ''}><span class="ln" aria-hidden="true">${ICON_PRINT}</span><span class="lt">Fiches à imprimer</span></a></li></ol>`;
    const cur = nav.querySelector('[aria-current]');
    if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
  }
  function renderChapter(slug) {
    const i = Math.max(0, CH.findIndex(c => c.slug === slug));
    const c = CH[i];
    renderNav(c.slug);
    const cur = nav.querySelector('[aria-current="page"]');
    if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
    const prev = CH[i - 1], next = CH[i + 1];
    content.innerHTML = `
      <header class="l-head">
        <p class="p-brand"><b>Amin</b><span>Guide pour débuter</span></p>
        <p class="l-step">Chapitre ${i + 1} sur ${CH.length}</p>
        <h2>${esc(c.title)}</h2>
        <p class="l-ar" lang="ar">${esc(c.ar)}</p>
        <p class="l-lead">${esc(c.lead)}</p>
        <div class="l-actions" role="group" aria-label="Fiche de ce chapitre">
          <button type="button" class="btn btn-quiet" data-print>${ICON_PRINT}Imprimer la fiche</button>
          <a class="btn btn-quiet" href="fiches/${c.slug}.pdf" download="Amin-${c.slug}.pdf">${ICON_PDF}Télécharger en PDF</a>
          ${c.slug === 'priere' ? `<a class="btn btn-quiet" href="#apprendre-${MEMO_SLUG}">Mémo en 2 pages</a>` : ''}
        </div>
      </header>
      ${c.blocks.map(blockHTML).join('')}
      <p class="p-foot">Fiche ${i + 1} sur ${CH.length} · Amin, horaires de prière et guide pour débuter</p>
      <nav class="l-pager" aria-label="Chapitres voisins">
        ${prev ? `<a class="l-prev" href="#apprendre-${prev.slug}"><small>Précédent</small>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="l-next" href="#apprendre-${next.slug}"><small>Suivant</small>${esc(next.title)}</a>` : '<span></span>'}
      </nav>`;
    if (content.querySelector('.has-audio')) {
      const pager = content.querySelector('.l-pager');
      if (pager) pager.insertAdjacentHTML('beforebegin', CREDIT_AUDIO);
    }
    fillQuran(content);
    setupCounter();
    wireImages(content);
  }
  content.addEventListener('keydown', e => {
    const f = e.target.closest && e.target.closest('.step-fig.has-img');
    if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openZoom(f); }
  });
  content.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) {
      const t = document.getElementById(go.dataset.goto);
      if (t) {
        const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        t.focus({ preventScroll: true });
      }
      return;
    }
    if (e.target.closest('[data-print]')) { printFiche(); return; }
    const f = e.target.closest('.step-fig.has-img');
    if (f) { openZoom(f); return; }
    const ex = e.target.closest('.l-explain');
    if (ex) { const [es, ev] = ex.dataset.key.split(':').map(Number); window.MawqutQuran.explain(es, ev); return; }
    const b = e.target.closest('.l-play');
    if (!b) return;
    if (b.dataset.seg) { playSeg(+b.dataset.seg, b.closest('li')); return; }
    if (b.dataset.say) { playSay(b.dataset.say, b.closest('.say')); return; }
    stopSeg();
    const [s, v] = b.dataset.key.split(':').map(Number);
    window.MawqutQuran.play(s, v, false);
  });

  // ---------- Compteur de tasbîh ----------
  const TASBIH = [
    { ar: 'سُبْحَانَ اللَّهِ', ph: 'Soubhâna llâh' },
    { ar: 'الْحَمْدُ لِلَّهِ', ph: 'Al-hamdou lillâh' },
    { ar: 'اللَّهُ أَكْبَرُ', ph: 'Allâhou akbar' }
  ];
  function setupCounter() {
    const btn = $('#tasbihBtn');
    if (!btn) return;
    let n = 0;
    const ring = $('#tasbihRing');
    const C = 2 * Math.PI * 52;
    ring.style.strokeDasharray = C;
    const update = () => {
      const phase = Math.min(2, Math.floor(n / 33));
      const inPhase = n >= 99 ? 33 : n % 33;
      const done = n >= 99;
      ring.style.strokeDashoffset = C * (1 - (done ? 1 : inPhase / 33));
      $('#tasbihN').textContent = done ? '100' : String(inPhase);
      $('#tasbihAr').textContent = done ? 'لَا إِلَهَ إِلَّا اللَّهُ' : TASBIH[phase].ar;
      $('#tasbihLabel').textContent = done
        ? 'Complète la centaine avec « Lâ ilâha illa llâhou wahdahoû lâ charîka lah… ». Qu’Allah l’accepte.'
        : `${TASBIH[phase].ph} : ${inPhase} sur 33.`;
      $('#tasbih').classList.toggle('is-done', done);
    };
    btn.addEventListener('click', () => {
      if (n >= 99) return;
      n++;
      if (n % 33 === 0 && navigator.vibrate) { try { navigator.vibrate(60); } catch (e) { /* rien */ } }
      update();
    });
    $('#tasbihReset').addEventListener('click', () => { n = 0; update(); });
    update();
  }

  // ---------- Navigation ----------
  function route() {
    const h = location.hash.replace('#', '');
    if (h !== 'apprendre' && !h.startsWith('apprendre-')) return;
    const slug = h.startsWith('apprendre-') ? h.slice(10) : CH[0].slug;
    if (slug === FICHES_SLUG) renderFiches();
    else if (slug === MEMO_SLUG) renderMemo();
    else renderChapter(slug);
    if (h.startsWith('apprendre-')) window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', route);
  route();
})();
