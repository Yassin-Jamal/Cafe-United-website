/* ============================================================
   KERST — zwevende knop, hoekpopup en lichte kerstsfeer
   Losstaand van main.js. Alles wat je later wilt wijzigen staat in
   KERST hieronder; daaronder hoef je niets aan te raken.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     INSTELLINGEN — hier pas je alles aan.
     ------------------------------------------------------------------ */
  var KERST = {
    aan: true,

    /* Na deze dag verdwijnen de knop, het lint, het kerstlogo en het
       kerstblok vanzelf van de site. */
    toonTot: '2026-12-27',

    /* Lichte kerstsfeer. Elk onderdeel los uit te zetten.
       `vlokken` is het aantal sneeuwvlokken; 0 zet de sneeuw uit. */
    sfeer: {
      lint: true,
      logo: true,
      homepageBlok: true,
      sneeuw: true,
      vlokken: 34,
      heroBadge: true,
      footerRand: true
    },

    endpoint: '/api/reserve',

    datums: ['2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'],

    personen: { min: 1, max: 20, start: 2 },

    /* Drie tijdsloten van twee uur. De site houdt geen plaatsen bij: elke
       aanvraag gaat per mail naar de zaak, die hem zelf bevestigt. */
    shifts: [
      { id: 'shift-1', van: '14:00', tot: '16:00', naam: 'Middag' },
      { id: 'shift-2', van: '17:00', tot: '19:00', naam: 'Vroege avond' },
      { id: 'shift-3', van: '20:00', tot: '22:00', naam: 'Late avond' }
    ],

    /* >>> TE MAKEN <<< er is nog geen privacypagina op de site. */
    privacyUrl: 'contact.html',
    privacyLabel: 'privacyverklaring en voorwaarden',

    landen: [
      { code: '+31',  naam: 'NL +31' },
      { code: '+32',  naam: 'BE +32' },
      { code: '+49',  naam: 'DE +49' },
      { code: '+599', naam: 'CW +599' },
      { code: '+297', naam: 'AW +297' },
      { code: '+44',  naam: 'UK +44' },
      { code: '+33',  naam: 'FR +33' },
      { code: '+34',  naam: 'ES +34' },
      { code: '+351', naam: 'PT +351' },
      { code: '+1',   naam: 'US/CA +1' }
    ],
    landStandaard: '+31',

    /* Eén menu per datum. Twee menu's op dezelfde dag is een invoerfout;
       dat meldt controleMenus() in de console. */
    menus: [
      {
        id: 'kerstmenu',
        datums: ['2026-12-25', '2026-12-26'],
        naam: 'Christmas Dinner',
        /* Per taal: de omschrijving en de bijbehorende kaart. De taalknop
           bovenin de popup schakelt hiertussen.
           >>> NA TE LEZEN <<< de Papiamentse tekst is overgenomen van de
           kaart; laat iemand die de taal spreekt er even naar kijken. */
        talen: {
          en: {
            tekst: 'Appetizers: sùlt, ayaka and Christmas glazed ham. Main course (pick one): ' +
                   'garlic shrimp & salmon, roasted chicken in béchamel sauce, tenderloin ' +
                   'steak with mushroom sauce, or stewed beef. ' +
                   'Dessert: flan or stained glass cake.',
            kaart: 'assets/img/kerstmenu.jpg'
          },
          pap: {
            tekst: 'Promé plato: sùlt, ayaka i ham di pasku. Plato prinsipal (skohe ùn): ' +
                   'garlic shrimp & salmon, galiña na fornu ku béchamel sauce, ' +
                   'lomito ku mushroom sauce of karni stobá. Dèsert: kesio of bolo di glas.',
            kaart: 'assets/img/kerstmenu-pap.jpg'
          }
        },
        afbeelding: 'assets/img/kerstmenu.jpg',
        prijs: 55,
        prijsKind: 15
      },
      /* >>> IN TE VULLEN <<< voor 23, 24 en 27 december is nog geen kaart
         aangeleverd. Zodra die er is: een eigen blok maken zoals het
         kerstmenu hierboven (naam, talen, prijs, kaart) en de datum uit
         `datums` hieronder halen. Is er die dag geen kerstdiner, schrap de
         datum dan uit `KERST.datums` bovenaan. */
      {
        id: 'kerst-later',
        datums: ['2026-12-23', '2026-12-24', '2026-12-27'],
        nogOnbekend: true,
        naam: 'Menu nog niet bekend',
        talen: {
          en: { tekst: 'The menu for this date is not available yet. Send your request ' +
                       'anyway: we will mail you the menu and the price as soon as the ' +
                       'kitchen has it ready.' },
          pap: { tekst: 'E menu pa e fecha aki no ta disponibel ainda. Manda bo petishon ' +
                        'tòg: nos ta manda bo e menu ku e preis pa mail asina kosina tin ' +
                        'esaki klar.' }
        },
        prijs: null,
        prijsKind: null
      }
    ],

    infoTekst: {
      nl: 'Het beschikbare kerstmenu is afhankelijk van de datum die je hebt ' +
          'geselecteerd. Je kunt hieronder bekijken welk menu op jouw gekozen ' +
          'datum beschikbaar is.',
      pap: 'E menu di Pasco ku ta disponibel ta dependé di e fecha ku bo a skohe. ' +
           'Abou bo por wak kua menu ta disponibel pa e fecha ku bo a skohe.'
    }
  };

  /* ================= vanaf hier niets meer aanpassen ================= */

  if (!KERST.aan) return;

  var DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  var MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
                 'augustus', 'september', 'oktober', 'november', 'december'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function naarDatum(sleutel) {
    var p = sleutel.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function datumTekst(sleutel) {
    var d = naarDatum(sleutel);
    return DAGEN[d.getDay()] + ' ' + d.getDate() + ' ' + MAANDEN[d.getMonth()];
  }
  function euro(b) { return '€ ' + Number(b).toFixed(2).replace('.', ','); }

  /* Vandaag in de tijdzone van de zaak, zodat de kerstmodus rond
     middernacht niet op de klok van de bezoeker afgaat. */
  function vandaagSleutel() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch (e) {
      var n = new Date();
      return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate());
    }
  }

  if (vandaagSleutel() > KERST.toonTot) return;

  function controleMenus() {
    var gezien = {};
    KERST.menus.forEach(function (m) {
      m.datums.forEach(function (d) {
        if (gezien[d]) {
          console.error('Kerstmenu: meer dan één menu op ' + d + ' (' + gezien[d] +
                        ' en ' + m.id + '). Alleen het eerste wordt gebruikt.');
        } else { gezien[d] = m.id; }
      });
    });
    KERST.datums.forEach(function (d) {
      if (!gezien[d]) console.warn('Kerstmenu: geen menu ingesteld voor ' + d + '.');
    });
  }
  controleMenus();

  var TAALNAAM = { en: 'Engels', nl: 'Nederlands', pap: 'Papiamentu' };

  /* Welke talen heeft dit menu? Leeg = geen vertaling ingesteld. */
  function menuTalen(menu) {
    if (!menu || !menu.talen) return [];
    return Object.keys(menu.talen);
  }

  /* De omschrijving in de gekozen taal, met terugval op wat er wél is. */
  function menuTekst(menu) {
    if (!menu) return '';
    if (menu.talen) {
      var t = menu.talen[staat.taal] || menu.talen[menuTalen(menu)[0]];
      if (t && t.tekst) return t.tekst;
    }
    return menu.tekst || '';
  }

  /* De kaart in de gekozen taal; anders de eerste die er is. */
  function menuKaart(menu) {
    if (!menu) return null;
    if (menu.talen) {
      var t = menu.talen[staat.taal] || menu.talen[menuTalen(menu)[0]];
      if (t && t.kaart) return t.kaart;
    }
    return menu.kaartUrl || menu.afbeelding || null;
  }

  function menuVoorDatum(sleutel) {
    for (var i = 0; i < KERST.menus.length; i++) {
      if (KERST.menus[i].datums.indexOf(sleutel) !== -1) return KERST.menus[i];
    }
    return null;
  }
  function shiftById(id) {
    for (var i = 0; i < KERST.shifts.length; i++) {
      if (KERST.shifts[i].id === id) return KERST.shifts[i];
    }
    return null;
  }

  var el = function (tag, cls, tekst) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (tekst !== undefined) n.textContent = tekst;
    return n;
  };

  /* ---------- lichte kerstsfeer ---------- */
  document.documentElement.classList.add('kerst-aan');

  if (KERST.sfeer.lint) {
    var lint = el('div', 'kerst-lint');
    lint.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(lint, document.body.firstChild);
  }

  if (KERST.sfeer.logo) {
    /* Alleen de bron wisselen; de verhouding verschilt van het gewone logo,
       dus width/height mee, anders rekt de browser het uit. */
    document.querySelectorAll('img.logo-img').forEach(function (img) {
      img.src = 'assets/img/logo-kerst.png';
      img.setAttribute('width', '602');
      img.setAttribute('height', '343');
    });
    var icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.href = 'assets/img/logo-kerst.png';
  }

  /* Sneeuw. Elke vlok krijgt eigen maat, snelheid, startpunt en drift, zodat
     het niet als een raster valt. Alleen transform en opacity animeren, dus
     het blijft op de compositor en kost geen layout per frame. */
  if (KERST.sfeer.sneeuw && KERST.sfeer.vlokken > 0 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var sneeuw = el('div', 'kerst-sneeuw');
    sneeuw.setAttribute('aria-hidden', 'true');
    for (var v = 0; v < KERST.sfeer.vlokken; v++) {
      var vlok = el('span', 'kerst-vlok');
      var maat = 3.5 + Math.random() * 5;
      vlok.style.width = maat.toFixed(1) + 'px';
      vlok.style.height = maat.toFixed(1) + 'px';
      vlok.style.left = (Math.random() * 100).toFixed(2) + '%';
      vlok.style.opacity = (0.55 + Math.random() * 0.4).toFixed(2);
      vlok.style.setProperty('--drift', (Math.random() * 90 - 45).toFixed(0) + 'px');
      vlok.style.animationDuration = (9 + Math.random() * 12).toFixed(1) + 's';
      /* Negatieve vertraging: de vlokken staan al verspreid over het scherm
         in plaats van allemaal tegelijk bovenaan te beginnen. */
      vlok.style.animationDelay = '-' + (Math.random() * 20).toFixed(1) + 's';
      sneeuw.appendChild(vlok);
    }
    document.body.appendChild(sneeuw);
  }

  /* Sneeuwrand bovenop de footer. */
  if (KERST.sfeer.footerRand) {
    var footer = document.querySelector('.site-footer');
    if (footer) {
      var rand = el('div', 'kerst-sneeuwrand');
      rand.setAttribute('aria-hidden', 'true');
      footer.appendChild(rand);
    }
  }

  /* ---------- paneel ---------- */
  var staat = {
    personen: KERST.personen.start,
    kinderen: 0,
    datum: KERST.datums[0],
    shiftId: KERST.shifts[0].id,
    taal: 'en',          // taal van het menu: 'en' of 'pap'
    infoTaal: 'nl',      // taal van het uitlegvenstertje: 'nl' of 'pap'
    bezig: false,
    aanvraagId: null
  };

  var ICOON_AGENDA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>';
  var ICOON_KRUIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"' +
    ' stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var fab = el('button', 'kerst-fab');
  fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = ICOON_AGENDA + '<span>Kerstdiner reserveren</span>';

  var pop = el('div', 'kerst-pop');
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'false');
  pop.setAttribute('aria-labelledby', 'kerst-titel');
  pop.tabIndex = -1;
  pop.innerHTML =
    '  <div class="kerst-kop">' +
    '    <div>' +
    '      <h2 id="kerst-titel">Kerstdiner reserveren</h2>' +
    '      <p>23 t/m 27 december</p>' +
    '    </div>' +
    '    <div class="kerst-taalvak">' +
    '      <div class="kerst-taal" role="group" aria-label="Taal van het menu">' +
    '        <button type="button" data-taal="en" aria-pressed="true">EN</button>' +
    '        <button type="button" data-taal="pap" aria-pressed="false">PAP</button>' +
    '      </div>' +
    /* De knop raakt alleen het menu; de rest van het formulier blijft
       Nederlands, en dat moet je niet hoeven raden. */
    '      <span class="kerst-taalvak__uitleg">taal van het menu</span>' +
    '    </div>' +
    '    <button class="kerst-kop__sluit" type="button" data-sluit aria-label="Sluiten">' +
          ICOON_KRUIS + '</button>' +
    '  </div>' +
    '  <form class="kerst-body" novalidate>' +
    '    <div class="kerst-melding" role="status" aria-live="polite" hidden data-melding></div>' +
    '    <div data-stap-keuze></div>' +
    '    <div data-stap-menu></div>' +
    '    <div data-stap-sam></div>' +
    '    <div data-stap-contact></div>' +
    '    <div class="kerst-pot" aria-hidden="true">' +
    '      <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
    '    </div>' +
    '  </form>' +
    '  <div class="kerst-voet">' +
    '    <button class="kerst-verstuur" type="button" data-verstuur>Aanvraag versturen</button>' +
    '    <p class="kerst-voet__klein">Je reservering is pas officieel zodra Caf&eacute; ' +
    'United op je mail heeft geantwoord.</p>' +
    '  </div>';

  document.body.appendChild(fab);
  document.body.appendChild(pop);

  var form     = pop.querySelector('form');
  var melding  = pop.querySelector('[data-melding]');
  var vakKeuze = pop.querySelector('[data-stap-keuze]');
  var vakMenu  = pop.querySelector('[data-stap-menu]');
  var vakSam   = pop.querySelector('[data-stap-sam]');
  var vakCont  = pop.querySelector('[data-stap-contact]');
  var knopVerstuur = pop.querySelector('[data-verstuur]');
  var voet     = pop.querySelector('.kerst-voet');

  /* ---------- stap 1: personen, datum, shift ---------- */
  function bouwKeuze() {
    vakKeuze.innerHTML = '';
    vakKeuze.appendChild(el('h3', 'kerst-stap__titel', 'Jouw reservering'));

    var wrap = el('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '12px';

    /* personen + kinderen naast elkaar */
    var rij2 = el('div', 'kerst-rij2');

    var vP = el('div', 'kerst-veld');
    var lP = el('label', null, 'Personen'); lP.htmlFor = 'kerst-personen';
    vP.appendChild(lP);
    var rij = el('div', 'kerst-aantal');
    var min = el('button', null, '−'); min.type = 'button';
    min.setAttribute('aria-label', 'Eén persoon minder');
    var inp = el('input'); inp.type = 'number'; inp.id = 'kerst-personen';
    inp.min = KERST.personen.min; inp.max = KERST.personen.max;
    inp.value = staat.personen; inp.inputMode = 'numeric';
    var plus = el('button', null, '+'); plus.type = 'button';
    plus.setAttribute('aria-label', 'Eén persoon meer');
    rij.appendChild(min); rij.appendChild(inp); rij.appendChild(plus);
    vP.appendChild(rij);

    var vK = el('div', 'kerst-veld');
    var lK = el('label', null, 'Waarvan kinderen'); lK.htmlFor = 'kerst-kinderen';
    vK.appendChild(lK);
    var inpK = el('input'); inpK.type = 'number'; inpK.id = 'kerst-kinderen';
    inpK.min = 0; inpK.max = KERST.personen.max; inpK.value = staat.kinderen;
    inpK.inputMode = 'numeric';
    vK.appendChild(inpK);
    /* De leeftijdsgrens hoort bij het veld zelf te staan, anders weet een
       gast niet wie er als kind telt. */
    vK.appendChild(el('span', 'kerst-hint', 'Kindertarief t/m 12 jaar'));

    rij2.appendChild(vP); rij2.appendChild(vK);

    function zetAantallen(p, k) {
      p = Math.max(KERST.personen.min, Math.min(KERST.personen.max, p || KERST.personen.min));
      k = Math.max(0, Math.min(p, isNaN(k) ? 0 : k));   // nooit meer kinderen dan personen
      staat.personen = p; staat.kinderen = k;
      inp.value = p; inpK.value = k; inpK.max = p;
      min.disabled = p <= KERST.personen.min;
      plus.disabled = p >= KERST.personen.max;
      bouwSamenvatting();
    }
    min.addEventListener('click', function () { zetAantallen(staat.personen - 1, staat.kinderen); });
    plus.addEventListener('click', function () { zetAantallen(staat.personen + 1, staat.kinderen); });
    inp.addEventListener('change', function () {
      zetAantallen(parseInt(inp.value, 10), staat.kinderen);
    });
    inpK.addEventListener('change', function () {
      zetAantallen(staat.personen, parseInt(inpK.value, 10));
    });

    /* datum */
    var vD = el('div', 'kerst-veld');
    var lD = el('label', null, 'Datum'); lD.htmlFor = 'kerst-datum';
    vD.appendChild(lD);
    var selD = el('select'); selD.id = 'kerst-datum';
    KERST.datums.forEach(function (d) {
      var o = el('option', null, datumTekst(d));
      o.value = d;
      if (d === staat.datum) o.selected = true;
      selD.appendChild(o);
    });
    selD.addEventListener('change', function () {
      staat.datum = selD.value;
      bouwMenus();
      bouwSamenvatting();
    });
    vD.appendChild(selD);

    /* shift */
    var vS = el('div', 'kerst-veld');
    vS.appendChild(el('span', 'kerst-veld__label', 'Tijdslot'));
    var shifts = el('div', 'kerst-shifts');
    KERST.shifts.forEach(function (s) {
      var b = el('button', 'kerst-shift');
      b.type = 'button';
      b.setAttribute('aria-pressed', s.id === staat.shiftId ? 'true' : 'false');
      b.appendChild(el('span', 'kerst-shift__tijd', s.van + ' – ' + s.tot));
      if (s.naam) b.appendChild(el('span', 'kerst-shift__naam', s.naam));

      b.addEventListener('click', function () {
        staat.shiftId = s.id;
        shifts.querySelectorAll('.kerst-shift').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
        bouwSamenvatting();
      });
      shifts.appendChild(b);
    });
    vS.appendChild(shifts);

    wrap.appendChild(rij2); wrap.appendChild(vD); wrap.appendChild(vS);
    vakKeuze.appendChild(wrap);
    zetAantallen(staat.personen, staat.kinderen);
  }

  /* ---------- stap 2: menu ---------- */
  function bouwMenus() {
    vakMenu.innerHTML = '';

    var titel = el('h3', 'kerst-stap__titel');
    titel.appendChild(document.createTextNode('Beschikbaar voor jouw selectie'));

    var info = el('span', 'kerst-info');
    var iKnop = el('button', 'kerst-info__knop', 'i');
    iKnop.type = 'button';
    iKnop.setAttribute('aria-expanded', 'false');
    iKnop.setAttribute('aria-label', 'Uitleg over het beschikbare menu');
    var popover = el('div', 'kerst-info__pop');
    popover.hidden = true;

    var talen = el('div', 'kerst-info__talen');
    var tekstP = el('p', null, KERST.infoTekst[staat.infoTaal]);
    tekstP.style.margin = '0';
    [['nl', 'Nederlands'], ['pap', 'Papiamentu']].forEach(function (t) {
      var b = el('button', null, t[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', staat.infoTaal === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        staat.infoTaal = t[0];
        tekstP.textContent = KERST.infoTekst[t[0]];
        talen.querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
      });
      talen.appendChild(b);
    });
    popover.appendChild(talen); popover.appendChild(tekstP);

    iKnop.addEventListener('click', function () {
      var open = popover.hidden;
      popover.hidden = !open;
      iKnop.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!popover.hidden && !info.contains(e.target)) {
        popover.hidden = true; iKnop.setAttribute('aria-expanded', 'false');
      }
    });

    info.appendChild(iKnop); info.appendChild(popover);
    titel.appendChild(info);
    vakMenu.appendChild(titel);

    var menu = menuVoorDatum(staat.datum);

    /* Is er nog geen kaart voor deze dag, dan valt er ook niets aan te
       tikken; de hint hoort er dan niet te staan. */
    if (menu && !menu.nogOnbekend) {
      vakMenu.appendChild(el('p', 'kerst-menu-uitleg', staat.taal === 'pap'
        ? 'Primi riba e karchi pa miré grandi.'
        : 'Tap the card to view it full size.'));
    }

    var lijst = el('div', 'kerst-menus');

    /* Een dag waarvan de kaart nog niet binnen is: gewoon zeggen dat de
       menugegevens later komen, zonder nepfoto en zonder prijs. */
    if (menu && menu.nogOnbekend) {
      var wacht = el('div', 'kerst-menu kerst-menu--later');
      wacht.appendChild(el('div', 'kerst-menu__dag', datumTekst(staat.datum)));
      wacht.appendChild(el('div', 'kerst-menu__naam', staat.taal === 'pap'
        ? 'Menu ainda no ta konosí'
        : 'Menu not yet available'));
      wacht.appendChild(el('p', 'kerst-menu__tekst', menuTekst(menu)));
      lijst.appendChild(wacht);
      vakMenu.appendChild(lijst);
      return;
    }

    if (!menu) {
      lijst.appendChild(el('p', 'kerst-leeg',
        'Voor ' + datumTekst(staat.datum) + ' is nog geen kerstmenu ingesteld.'));
      vakMenu.appendChild(lijst);
      return;
    }

    /* Precies één menu per datum, dus niets te kiezen: de kaart toont wat
       er die dag op tafel komt. */
    /* De kaart in de gekozen taal, als aanklikbare afbeelding. */
    var kaartUrlNu = menuKaart(menu);
    var kaart = el('div', 'kerst-menu');
    var beeld = kaartUrlNu
      ? el('a', 'kerst-menu__beeld') : el('span', 'kerst-menu__beeld');
    if (kaartUrlNu) {
      beeld.href = kaartUrlNu; beeld.target = '_blank'; beeld.rel = 'noopener';
      beeld.setAttribute('aria-label', 'De kerstkaart op ware grootte openen');
    }
    var img = el('img');
    img.src = kaartUrlNu || menu.afbeelding; img.alt = ''; img.loading = 'lazy';
    beeld.appendChild(img);
    kaart.appendChild(beeld);

    var tekstVak = el('div');
    tekstVak.appendChild(el('div', 'kerst-menu__dag',
      menu.datums.map(datumTekst).join(' · ')));
    tekstVak.appendChild(el('div', 'kerst-menu__naam', menu.naam));
    tekstVak.appendChild(el('p', 'kerst-menu__tekst', menuTekst(menu)));
    if (menu.prijs != null) {
      var prijs = euro(menu.prijs) + (staat.taal === 'pap' ? ' pa persona' : ' per person');
      if (menu.prijsKind != null) {
        prijs += ' · ' + euro(menu.prijsKind) +
          (staat.taal === 'pap' ? ' pa mucha' : ' per child');
      }
      tekstVak.appendChild(el('div', 'kerst-menu__prijs', prijs));
    }
    if (kaartUrlNu) {
      var a = el('a', 'kerst-menu__link',
        staat.taal === 'pap' ? 'Wak e karchi' : 'View the card');
      a.href = kaartUrlNu; a.target = '_blank'; a.rel = 'noopener';
      tekstVak.appendChild(a);
    }
    kaart.appendChild(tekstVak);
    lijst.appendChild(kaart);
    vakMenu.appendChild(lijst);
  }

  /* ---------- stap 3: samenvatting ---------- */
  function rekenTotaal(menu) {
    if (!menu || menu.prijs == null) return null;
    var kinderen = staat.kinderen;
    var volw = staat.personen - kinderen;
    var kindPrijs = menu.prijsKind != null ? menu.prijsKind : menu.prijs;
    return volw * menu.prijs + kinderen * kindPrijs;
  }

  function bouwSamenvatting() {
    vakSam.innerHTML = '';
    vakSam.appendChild(el('h3', 'kerst-stap__titel', 'Samenvatting'));

    var menu = menuVoorDatum(staat.datum);
    var s = shiftById(staat.shiftId);
    var doos = el('div', 'kerst-sam');
    var dl = el('dl');
    function regel(n, w) { dl.appendChild(el('dt', null, n)); dl.appendChild(el('dd', null, w)); }

    var wie = String(staat.personen);
    if (staat.kinderen > 0) {
      wie += ' (' + (staat.personen - staat.kinderen) + ' volw. + ' + staat.kinderen + ' kind' +
             (staat.kinderen === 1 ? '' : 'eren') + ')';
    }
    regel('Personen', wie);
    regel('Datum', datumTekst(staat.datum));
    regel('Tijdslot', s ? s.van + ' – ' + s.tot : '—');
    regel('Menu', menu ? menu.naam : 'Nog niet ingesteld');
    regel('Prijs p.p.', menu && menu.prijs != null ? euro(menu.prijs) : 'Nog niet bekend');
    if (staat.kinderen > 0 && menu && menu.prijsKind != null) {
      regel('Per kind', euro(menu.prijsKind));
    }
    doos.appendChild(dl);

    var totaal = rekenTotaal(menu);
    var tot = el('div', 'kerst-sam__totaal');
    tot.appendChild(el('span', null, 'Totaal'));
    tot.appendChild(el('strong', null, totaal == null ? 'Nog niet bekend' : euro(totaal)));
    doos.appendChild(tot);
    vakSam.appendChild(doos);
  }

  /* ---------- stap 4: contactgegevens ---------- */
  function bouwContact() {
    vakCont.innerHTML = '';
    vakCont.appendChild(el('h3', 'kerst-stap__titel', 'Jouw gegevens'));

    var wrap = el('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '12px';

    function veld(id, label, verplicht) {
      var v = el('div', 'kerst-veld');
      v.dataset.veld = id;
      var l = el('label');
      l.htmlFor = 'kerst-' + id;
      l.appendChild(document.createTextNode(label + ' '));
      if (verplicht) l.appendChild(el('span', 'kerst-req', '*'));
      v.appendChild(l);
      return v;
    }

    var vN = veld('naam', 'Volledige naam', true);
    var iN = el('input'); iN.type = 'text'; iN.id = 'kerst-naam'; iN.autocomplete = 'name';
    vN.appendChild(iN); vN.appendChild(el('span', 'kerst-fout'));

    var vE = veld('email', 'E-mailadres', true);
    var iE = el('input'); iE.type = 'email'; iE.id = 'kerst-email'; iE.autocomplete = 'email';
    vE.appendChild(iE); vE.appendChild(el('span', 'kerst-fout'));

    var vT = veld('telefoon', 'Telefoonnummer', true);
    var tel = el('div', 'kerst-tel');
    var selLand = el('select'); selLand.id = 'kerst-land';
    selLand.setAttribute('aria-label', 'Landnummer');
    KERST.landen.forEach(function (l) {
      var o = el('option', null, l.naam);
      o.value = l.code;
      if (l.code === KERST.landStandaard) o.selected = true;
      selLand.appendChild(o);
    });
    var iT = el('input'); iT.type = 'tel'; iT.id = 'kerst-telefoon';
    iT.autocomplete = 'tel-national'; iT.placeholder = '6 12345678';
    tel.appendChild(selLand); tel.appendChild(iT);
    vT.appendChild(tel); vT.appendChild(el('span', 'kerst-fout'));

    var vO = veld('opmerking', 'Opmerkingen of wensen', false);
    var iO = el('textarea'); iO.id = 'kerst-opmerking';
    iO.placeholder = 'Allergieën, keuze hoofdgerecht, een kinderstoel…';
    vO.appendChild(iO);

    [vN, vE, vT, vO].forEach(function (v) { wrap.appendChild(v); });
    vakCont.appendChild(wrap);
  }

  /* ---------- controle ---------- */
  function zetFout(veldId, bericht) {
    var v = pop.querySelector('[data-veld="' + veldId + '"]');
    if (!v) return;
    v.classList.toggle('kerst-veld--fout', !!bericht);
    var f = v.querySelector('.kerst-fout');
    if (f) f.textContent = bericht || '';
  }

  function controleer() {
    var w = {
      naam: (pop.querySelector('#kerst-naam') || {}).value || '',
      email: (pop.querySelector('#kerst-email') || {}).value || '',
      land: (pop.querySelector('#kerst-land') || {}).value || '',
      telefoon: (pop.querySelector('#kerst-telefoon') || {}).value || '',
      opmerking: (pop.querySelector('#kerst-opmerking') || {}).value || ''
    };
    var fouten = 0;
    ['naam', 'email', 'telefoon'].forEach(function (k) { zetFout(k, ''); });

    if (!w.naam.trim()) { zetFout('naam', 'Vul je naam in.'); fouten++; }
    if (!w.email.trim()) { zetFout('email', 'Vul je e-mailadres in.'); fouten++; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(w.email.trim())) {
      zetFout('email', 'Dit e-mailadres klopt nog niet.'); fouten++;
    }
    var cijfers = w.telefoon.replace(/\D/g, '');
    if (!cijfers) { zetFout('telefoon', 'Vul je telefoonnummer in.'); fouten++; }
    else if (cijfers.length < 6) { zetFout('telefoon', 'Dit nummer lijkt te kort.'); fouten++; }

    return fouten === 0 ? w : null;
  }

  function toonMelding(soort, regels) {
    melding.className = 'kerst-melding kerst-melding--' + soort;
    melding.hidden = false;
    melding.textContent = '';
    regels.forEach(function (r) { melding.appendChild(el('p', null, r)); });
    melding.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- versturen ---------- */
  function verstuur() {
    if (staat.bezig) return;
    melding.hidden = true;

    var w = controleer();
    if (!w) {
      toonMelding('err', ['Niet alles is ingevuld. Kijk de rood gemarkeerde velden na.']);
      var eerste = pop.querySelector('.kerst-veld--fout input, .kerst-veld--fout select');
      if (eerste) eerste.focus();
      return;
    }

    var menu = menuVoorDatum(staat.datum);
    var s = shiftById(staat.shiftId);
    var pot = form.elements.website;

    if (!staat.aanvraagId) {
      staat.aanvraagId = 'k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    var lading = {
      aanvraagId: staat.aanvraagId,
      personen: staat.personen,
      kinderen: staat.kinderen,
      datum: staat.datum,
      datumTekst: datumTekst(staat.datum),
      shiftId: staat.shiftId,
      shiftTekst: s ? s.van + ' – ' + s.tot + (s.naam ? ' (' + s.naam + ')' : '') : '',
      menuId: menu ? menu.id : null,
      menuNaam: menu ? menu.naam : null,
      prijsPP: menu && menu.prijs != null ? menu.prijs : null,
      prijsKind: menu && menu.prijsKind != null ? menu.prijsKind : null,
      totaal: rekenTotaal(menu),
      naam: w.naam.trim(),
      email: w.email.trim(),
      telefoon: (w.land + ' ' + w.telefoon).trim(),
      opmerking: w.opmerking.trim(),
      website: pot ? pot.value : ''
    };

    staat.bezig = true;
    knopVerstuur.disabled = true;
    var oudeTekst = knopVerstuur.textContent;
    knopVerstuur.textContent = 'Versturen…';

    if (!window.fetch) {
      staat.bezig = false; knopVerstuur.disabled = false; knopVerstuur.textContent = oudeTekst;
      toonMelding('err', ['Je browser kan dit formulier niet versturen. Bel ons op 06 16 05 01 92.']);
      return;
    }

    fetch(KERST.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lading)
    }).then(function (r) {
      return r.text().then(function (ruw) {
        var data = {};
        try { data = JSON.parse(ruw); } catch (e) { /* geen JSON, zie log */ }
        if (!r.ok) {
          console.error('POST ' + KERST.endpoint + ' faalde —', r.status, r.statusText,
                        '· antwoord:', ruw.slice(0, 300));
          var fout = new Error(data.error || ('HTTP ' + r.status));
          /* 409 = het slot zat vol terwijl de gast het formulier invulde.
             Dan is de melding van de server zelf het nuttigst. */
          fout.vanServer = r.status === 409 || r.status === 400;
          throw fout;
        }
        return data;
      });
    }).then(function () {
      form.hidden = true;
      voet.hidden = true;
      melding.hidden = false;
      melding.className = 'kerst-melding kerst-melding--ok';
      melding.textContent = '';
      melding.appendChild(el('p', null,
        'Bedankt ' + lading.naam.split(' ')[0] + '! Je aanvraag voor ' + lading.datumTekst +
        ', ' + lading.shiftTekst + ' met ' + lading.personen +
        (lading.personen === 1 ? ' persoon' : ' personen') + ' staat bij ons in de inbox.'));
      melding.appendChild(el('p', null,
        'Je reservering is pas officieel zodra Café United op je mail heeft ' +
        'geantwoord. We laten zo snel mogelijk weten of het rondkomt.'));
      pop.insertBefore(melding, form);
      staat.aanvraagId = null;
    }).catch(function (err) {
      console.error('Kerstreservering versturen mislukt:', err && err.message);
      if (err && err.vanServer) {
        toonMelding('err', [err.message]);
      } else {
        toonMelding('err', [
          'We konden je aanvraag niet bij ons krijgen. Probeer het zo nog eens, of bel ons ' +
          'op 06 16 05 01 92 — dan regelen we het meteen.'
        ]);
      }
    }).then(function () {
      staat.bezig = false;
      knopVerstuur.disabled = false;
      knopVerstuur.textContent = oudeTekst;
    });
  }

  /* Taalknop: wisselt de kaart, de omschrijving en de regel eronder. De rest
     van het formulier blijft Nederlands — dat is wat er gevraagd is. */
  pop.querySelectorAll('[data-taal]').forEach(function (b) {
    b.addEventListener('click', function () {
      staat.taal = b.getAttribute('data-taal');
      pop.querySelectorAll('[data-taal]').forEach(function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      bouwMenus();
    });
  });

  knopVerstuur.addEventListener('click', verstuur);
  form.addEventListener('submit', function (e) { e.preventDefault(); verstuur(); });

  /* ---------- openen en sluiten ---------- */
  var laatsteFocus = null;

  function openen() {
    laatsteFocus = document.activeElement;
    pop.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    /* Eerst tonen, dan pas de klasse, anders is er geen beginframe om vanaf
       te animeren. Een reflow afdwingen in plaats van requestAnimationFrame:
       die draait niet in een tabblad op de achtergrond, en dan zou de popup
       op .88 en opacity 0 blijven staan — open maar onzichtbaar. */
    void pop.offsetWidth;
    pop.classList.add('is-open');
    pop.focus();
  }

  function sluiten() {
    pop.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    var klaar = function () { pop.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) klaar();
    else setTimeout(klaar, 260);
    if (laatsteFocus && laatsteFocus.focus) laatsteFocus.focus();
  }

  fab.addEventListener('click', function () {
    if (pop.hidden) openen(); else sluiten();
  });
  pop.addEventListener('click', function (e) {
    if (e.target.closest('[data-sluit]')) sluiten();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) sluiten();
  });
  /* Buiten de popup klikken sluit hem; de knop zelf schakelt zelf.
     Knoppen met data-kerst-open (badge in de hero, knop in het kerstblok)
     zijn uitgezonderd: hun klik bereikt deze regel vlak nadat zij de popup
     hebben geopend, en zou hem dan meteen weer dichtgooien. */
  document.addEventListener('click', function (e) {
    if (pop.hidden) return;
    if (e.target.closest && e.target.closest('[data-kerst-open]')) return;
    /* Een tijdslot aanklikken bouwt het blok opnieuw op, waardoor de knop uit
       het document verdwijnt vóór deze regel draait. pop.contains() zegt dan
       "zat niet in de popup" en de popup ging dicht. Een losgekoppeld element
       komt per definitie niet van buiten de popup. */
    if (e.target.isConnected === false) return;
    if (!pop.contains(e.target) && !fab.contains(e.target)) sluiten();
  });

  bouwKeuze();
  bouwMenus();
  bouwSamenvatting();
  bouwContact();

  /* ---------- badge in de hero ---------- */
  /* Boven de ondertitel, zodat het eerste wat je ziet de kerstactie is
     zonder dat het logo of de knoppen verschuiven. */
  if (KERST.sfeer.heroBadge) {
    var heroSub = document.querySelector('.hero__content .hero__sub');
    if (heroSub) {
      var badge = el('button', 'kerst-badge');
      badge.type = 'button';
      badge.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2l2.1 4.6L19 7.3l-3.5 3.3.9 4.8L12 13.2l-4.4 2.2.9-4.8L5 7.3l4.9-.7z"/>' +
        '<path d="M11 16h2v6h-2z"/></svg>' +
        '<span>Kerstdiner · 23 t/m 27 december</span>';
      badge.setAttribute('data-kerst-open', '');
      badge.addEventListener('click', function () { if (pop.hidden) openen(); });
      heroSub.parentNode.insertBefore(badge, heroSub);
    }
  }

  /* ---------- kerstblok op de homepage ---------- */
  if (KERST.sfeer.homepageBlok) {
    var anker = document.querySelector('main .section--green');
    var kerstMenu = menuVoorDatum('2026-12-25');
    if (anker && kerstMenu) {
      var band = el('section', 'section kerst-band');
      /* Geen 'reveal': main.js verzamelt die elementen bij het laden, en dit
         blok komt er daarna pas bij. Het zou dan op opacity 0 blijven staan. */
      var wrapB = el('div', 'wrap center');
      wrapB.appendChild(el('p', 'eyebrow', 'Kerst bij United'));
      wrapB.appendChild(el('h2', 'title title--sm', 'Christmas Dinner'));

      var grid = el('div', 'kerst-band__grid');
      var aK = el('a', 'kerst-band__kaart');
      var bandTalen = menuTalen(kerstMenu);
      aK.href = menuKaart(kerstMenu) || kerstMenu.afbeelding;
      aK.target = '_blank'; aK.rel = 'noopener';
      aK.setAttribute('aria-label', 'De kerstkaart op ware grootte openen');
      var imgK = el('img');
      imgK.src = kerstMenu.afbeelding; imgK.loading = 'lazy'; imgK.decoding = 'async';
      imgK.width = 900; imgK.height = 1272;
      imgK.alt = 'Kerstkaart van Café United met voorgerechten, hoofdgerechten en dessert, ' +
                 '55 euro per persoon en 15 euro per kind.';
      aK.appendChild(imgK);
      grid.appendChild(aK);

      var tekstB = el('div');
      tekstB.appendChild(el('p', null,
        'Van 23 tot en met 27 december staat er een kerstdiner klaar. We werken met drie ' +
        'tijdsloten per dag, dus reserveer op tijd — vol is vol.'));
      tekstB.appendChild(el('p', null,
        euro(kerstMenu.prijs) + ' per persoon, ' + euro(kerstMenu.prijsKind) + ' per kind.'));
      var rijB = el('div', 'btn-row');
      var knopB = el('button', 'btn btn--primary', 'Reserveer het kerstdiner');
      knopB.type = 'button';
      knopB.setAttribute('data-kerst-open', '');
      knopB.addEventListener('click', function () { if (pop.hidden) openen(); });
      rijB.appendChild(knopB);
      /* Eén knop per taal waarin de kaart bestaat. */
      (bandTalen.length ? bandTalen : ['']).forEach(function (code) {
        var url = code ? kerstMenu.talen[code].kaart : kerstMenu.afbeelding;
        var kaartB = el('a', 'btn btn--ghost',
          bandTalen.length > 1 ? 'Kaart in ' + (TAALNAAM[code] || code) : 'Bekijk de kaart');
        kaartB.href = url; kaartB.target = '_blank'; kaartB.rel = 'noopener';
        rijB.appendChild(kaartB);
      });
      tekstB.appendChild(rijB);
      grid.appendChild(tekstB);

      wrapB.appendChild(grid);
      band.appendChild(wrapB);
      anker.parentNode.insertBefore(band, anker);
    }
  }
})();
