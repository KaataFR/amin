/* Amin — passages recommandés à certains moments (page « À réciter » du site et app télé). */
(() => {
  // Passages : parts = [[sourate, premier verset, dernier verset], …] ; 0 = jusqu'à la fin de la sourate
  const P = {
    kahf:    { title: 'Sourate Al-Kahf', ar: 'سُورَةُ الكَهْف', what: 'La Caverne · 110 versets', parts: [[18, 1, 0]] },
    baqara:  { title: 'Sourate Al-Baqara', ar: 'سُورَةُ البَقَرَة', what: 'La Vache · 286 versets', parts: [[2, 1, 0]] },
    kursi:   { title: 'Âyat al-Kursî', ar: 'آيَةُ الكُرْسِيّ', what: 'Le verset du Trône · Al-Baqara, verset 255', parts: [[2, 255, 255]] },
    amana:   { title: 'Les deux derniers versets d’Al-Baqara', ar: 'آمَنَ الرَّسُول', what: 'Al-Baqara, versets 285 et 286', parts: [[2, 285, 286]] },
    quls:    { title: 'Al-Ikhlâs, Al-Falaq et An-Nâs', ar: 'المُعَوِّذَات', what: 'Les trois dernières sourates · 112, 113 et 114', parts: [[112, 1, 0], [113, 1, 0], [114, 1, 0]] },
    mulk:    { title: 'Sourate Al-Mulk', ar: 'سُورَةُ المُلْك', what: 'La Royauté · 30 versets', parts: [[67, 1, 0]] },
    sajda:   { title: 'Sourate As-Sajda', ar: 'سُورَةُ السَّجْدَة', what: 'La Prosternation · 30 versets', parts: [[32, 1, 0]] },
    kafirun: { title: 'Sourate Al-Kâfirûn', ar: 'سُورَةُ الكَافِرُون', what: 'Les Mécréants · 6 versets', parts: [[109, 1, 0]] }
  };
  // Moments : chaque entrée reprend un passage avec la parole du Prophète ﷺ qui le recommande à ce moment-là
  const GROUPS = [
    { id: 'vendredi', title: 'Le vendredi', when: 'Dans la journée du vendredi, ou dès la veille au soir.', items: [
      { p: 'kahf', why: '« Quiconque lit la sourate Al-Kahf le jour du vendredi, une lumière l’éclairera entre les deux vendredis. »', src: 'Rapporté par al-Hâkim et al-Bayhaqî, authentifié par al-Albânî' }
    ] },
    { id: 'jour', title: 'À la maison', when: 'En journée ou le soir, en une fois ou par parties.', items: [
      { p: 'baqara', why: '« Ne faites pas de vos maisons des tombes. Satan fuit la maison où l’on récite la sourate Al-Baqara. »', src: 'Rapporté par Muslim' }
    ] },
    { id: 'nuit', title: 'Le soir, avant de dormir', when: 'Une fois couché, avant de t’endormir.', items: [
      { p: 'kursi', why: '« Quand tu vas te coucher, récite Âyat al-Kursî : un gardien venant d’Allah restera auprès de toi et aucun démon ne t’approchera jusqu’au matin. »', src: 'Rapporté par al-Bukhârî' },
      { p: 'amana', why: '« Celui qui récite, la nuit, les deux derniers versets de la sourate Al-Baqara, ils lui suffisent. »', src: 'Rapporté par al-Bukhârî et Muslim' },
      { p: 'quls', times: 3, why: 'Chaque nuit, en se couchant, le Prophète ﷺ joignait ses mains, y soufflait, récitait ces trois sourates, puis passait ses mains sur tout ce qu’il pouvait de son corps. Il le faisait trois fois.', src: 'Rapporté par al-Bukhârî' },
      { p: 'mulk', why: '« Une sourate de trente versets a intercédé pour un homme jusqu’à ce qu’il soit pardonné : c’est “Béni soit Celui qui détient la royauté”. »', src: 'Rapporté par Abû Dâwud et at-Tirmidhî' },
      { p: 'sajda', why: 'Le Prophète ﷺ ne dormait pas avant d’avoir récité la sourate As-Sajda et la sourate Al-Mulk.', src: 'Rapporté par at-Tirmidhî, authentifié par al-Albânî' },
      { p: 'kafirun', why: '« Récite “Dis : ô vous les mécréants”, puis endors-toi après l’avoir terminée : elle est un désaveu du polythéisme. »', src: 'Rapporté par Abû Dâwud et at-Tirmidhî' }
    ] },
    { id: 'matin', title: 'Matin et soir', when: 'Après la prière de l’aube, puis en fin d’après-midi ou au coucher du soleil.', items: [
      { p: 'quls', times: 3, why: '« Récite “Dis : Il est Allah, Unique” et les deux sourates protectrices trois fois le soir et trois fois le matin : elles te suffiront contre toute chose. »', src: 'Rapporté par Abû Dâwud et at-Tirmidhî' },
      { p: 'kursi', why: 'Celui qui récite Âyat al-Kursî le matin est protégé jusqu’au soir, et celui qui la récite le soir est protégé jusqu’au matin.', src: 'Rapporté par an-Nasâ’î et at-Tabarânî, authentifié par al-Albânî' }
    ] },
    { id: 'priere', title: 'Après chaque prière', when: 'Une fois la prière obligatoire terminée, après les invocations.', items: [
      { p: 'kursi', why: '« Celui qui récite Âyat al-Kursî après chaque prière obligatoire, rien ne le sépare du Paradis sinon la mort. »', src: 'Rapporté par an-Nasâ’î, authentifié par al-Albânî' },
      { p: 'quls', why: '‘Uqba ibn ‘Âmir a dit : « Le Messager d’Allah ﷺ m’a ordonné de réciter les sourates protectrices après chaque prière. »', src: 'Rapporté par Abû Dâwud et an-Nasâ’î' }
    ] }
  ];
  const NOW = {
    vendredi: { group: 'vendredi', kicker: 'C’est vendredi', p: 'kahf' },
    nuit:     { group: 'nuit', kicker: 'Ce soir, avant de dormir', p: 'kursi' },
    matin:    { group: 'matin', kicker: 'Ce matin', p: 'quls', times: 3 },
    jour:     { group: 'jour', kicker: 'À la maison, aujourd’hui', p: 'baqara' }
  };

  window.MAWQUT_MOMENTS = { P, GROUPS, NOW };
})();
