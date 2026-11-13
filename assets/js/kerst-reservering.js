/* ============================================================
   KERSTDINER — zwevende knop + reserveringspaneel
   Losstaand van main.js. Alles wat je later wilt wijzigen staat in
   KERST hieronder; daaronder hoef je niets aan te raken.
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     INSTELLINGEN — hier pas je alles aan.

     >>> TE CONTROLEREN / IN TE VULLEN <<<
     De menunamen, omschrijvingen en prijzen hieronder zijn PLAATSHOUDERS.
     Er stond nog geen kerstmenu op de site, en die gegevens verzinnen we
     niet. Zolang `tiencheck: true` op een menu staat, toont de kaart een
     geel label "nog invullen" en rekent de samenvatting geen totaal uit.
     Vul naam, omschrijving en prijs in en haal `tiencheck` weg.
     ------------------------------------------------------------------ */
  var KERST = {
    aan: true,

    /* Na deze dag verdwijnt de knop vanzelf van de site. */
    toonTot: '2026-12-27',

    /* Waar de aanvraag heen gaat. Het endpoint gebruikt dezelfde
       Resend-instellingen als het gewone contactformulier. */
    endpoint: '/api/reserve',

    /* Alleen deze datums zijn te kiezen. */
    datums: ['2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'],

    personen: { min: 1, max: 20, start: 2 },

    /* Openingstijden in minuten na middernacht, index = getDay() (0 = zondag).
       Een sluitingstijd boven 1440 loopt door in de volgende dag. */
    uren: [
      { open: 15 * 60, dicht: 24 * 60 + 60 },    // zondag    15:00 - 01:00
      { open: 15 * 60, dicht: 24 * 60 + 60 },    // maandag   15:00 - 01:00
      { open: 15 * 60, dicht: 24 * 60 + 60 },    // dinsdag   15:00 - 01:00
      { open: 15 * 60, dicht: 24 * 60 + 60 },    // woensdag  15:00 - 01:00
      { open: 15 * 60, dicht: 24 * 60 + 60 },    // donderdag 15:00 - 01:00
      { open: 15 * 60, dicht: 24 * 60 + 150 },   // vrijdag   15:00 - 02:30
      { open: 15 * 60, dicht: 24 * 60 + 150 }    // zaterdag  15:00 - 02:30
    ],

    /* Reserveringstijden zijn bewust NIET gelijk aan de openingstijden.
       >>> TE BEVESTIGEN <<< onderstaande waarden zijn een aanname.
         eersteTijd  — vroegste tijd die te boeken is (null = bij opening)
         laatsteVoorSluiten — hoeveel minuten vóór sluitingstijd de laatste
                              tafel nog geboekt kan worden
         stapMinuten — afstand tussen twee tijden in de lijst */
    tijden: { eersteTijd: 17 * 60, laatsteVoorSluiten: 90, stapMinuten: 30 },

    /* >>> TE MAKEN <<< er is nog geen privacypagina op de site.
       Zet hier de juiste URL zodra die er is. */
    privacyUrl: 'contact.html',
    privacyLabel: 'privacyverklaring en voorwaarden',

    /* Landnummers voor het telefoonveld. */
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

    /* Eén menu per datum. `datums` mag meerdere dagen bevatten, maar twee
       menu's mogen nooit dezelfde datum delen — zie controleMenus(). */
    menus: [
      {
        id: 'kerst-23',
        datums: ['2026-12-23'],
        naam: 'Kerstmenu 23 december',
        tekst: 'Omschrijving van het menu van 23 december.',
        afbeelding: 'assets/img/keuken-1.jpg',
        prijs: null,
        tiencheck: true
      },
      {
        id: 'kerst-24',
        datums: ['2026-12-24'],
        naam: 'Kerstmenu 24 december',
        tekst: 'Omschrijving van het menu van kerstavond.',
        afbeelding: 'assets/img/keuken-3.jpg',
        prijs: null,
        tiencheck: true
      },
      {
        id: 'kerst-25',
        datums: ['2026-12-25'],
        naam: 'Kerstmenu 25 december',
        tekst: 'Omschrijving van het menu van eerste kerstdag.',
        afbeelding: 'assets/img/keuken-2.jpg',
        prijs: null,
        tiencheck: true
      },
      {
        id: 'kerst-26',
        datums: ['2026-12-26'],
        naam: 'Kerstmenu 26 december',
        tekst: 'Omschrijving van het menu van tweede kerstdag.',
        afbeelding: 'assets/img/keuken-1.jpg',
        prijs: null,
        tiencheck: true
      },
      {
        id: 'kerst-27',
        datums: ['2026-12-27'],
        naam: 'Kerstmenu 27 december',
        tekst: 'Omschrijving van het menu van 27 december.',
        afbeelding: 'assets/img/keuken-3.jpg',
        prijs: null,
        tiencheck: true
      }
    ],

    /* Tekst van de popover bij "Beschikbaar voor jouw selectie". */
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
  function tijdTekst(min) { return pad(Math.floor(min / 60) % 24) + ':' + pad(min % 60); }

  /* "2026-12-23" -> Date in lokale tijd. new Date('2026-12-23') leest als UTC
     en kan er een dag naast zitten. */
  function naarDatum(sleutel) {
    var p = sleutel.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function datumSleutel(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function datumTekst(sleutel) {
    var d = naarDatum(sleutel);
    return DAGEN[d.getDay()] + ' ' + d.getDate() + ' ' + MAANDEN[d.getMonth()];
  }
  function euro(bedrag) {
    return '€ ' + bedrag.toFixed(2).replace('.', ',');
  }

  /* Vandaag in de tijdzone van de zaak, zodat de knop rond middernacht niet
     op de klok van de bezoeker afgaat. */
  function vandaagSleutel() {
    try {
      var f = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'
      });
      return f.format(new Date());
    } catch (e) {
      return datumSleutel(new Date());
    }
  }

  if (vandaagSleutel() > KERST.toonTot) return;

  /* Twee menu's op dezelfde dag is een invoerfout: dan is niet te bepalen
     wat de gast krijgt. Melden in de console en de dubbele negeren. */
  function controleMenus() {
    var gezien = {};
    KERST.menus.forEach(function (m) {
      m.datums.forEach(function (d) {
        if (gezien[d]) {
          console.error('Kerstmenu: meer dan één menu op ' + d +
                        ' (' + gezien[d] + ' en ' + m.id + '). Alleen het eerste wordt gebruikt.');
        } else { gezien[d] = m.id; }
      });
    });
    KERST.datums.forEach(function (d) {
      if (!gezien[d]) console.warn('Kerstmenu: geen menu ingesteld voor ' + d + '.');
    });
  }
  controleMenus();

  function menuVoorDatum(sleutel) {
    for (var i = 0; i < KERST.menus.length; i++) {
      if (KERST.menus[i].datums.indexOf(sleutel) !== -1) return KERST.menus[i];
    }
    return null;
  }

  function tijdenVoor(sleutel) {
    var u = KERST.uren[naarDatum(sleutel).getDay()];
    if (!u) return [];
    var eerste = KERST.tijden.eersteTijd === null
      ? u.open : Math.max(u.open, KERST.tijden.eersteTijd);
    var laatste = u.dicht - KERST.tijden.laatsteVoorSluiten;
    var lijst = [];
    for (var m = eerste; m <= laatste; m += KERST.tijden.stapMinuten) lijst.push(m);
    return lijst;
  }

  /* ---------- opbouw ---------- */
  var el = function (tag, cls, tekst) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (tekst !== undefined) n.textContent = tekst;
    return n;
  };

  var staat = {
    personen: KERST.personen.start,
    datum: KERST.datums[0],
    tijd: null,
    menuId: null,
    taal: 'nl',
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
  fab.innerHTML = ICOON_AGENDA + '<span class="kerst-fab__lang">Kerstdiner reserveren</span>' +
                  '<span class="kerst-fab__kort" hidden>Kerstdiner</span>';
  /* Op smalle schermen het korte label; CSS verbergt de lange variant. */
  if (window.matchMedia('(max-width: 480px)').matches) {
    fab.querySelector('.kerst-fab__kort').hidden = false;
  }

  var paneel = el('div', 'kerst-paneel');
  paneel.hidden = true;
  paneel.innerHTML =
    '<div class="kerst-paneel__veil" data-sluit></div>' +
    '<div class="kerst-paneel__blad" role="dialog" aria-modal="true"' +
    '     aria-labelledby="kerst-titel" tabindex="-1">' +
    '  <div class="kerst-kop">' +
    '    <div>' +
    '      <h2 id="kerst-titel">Kerstdiner reserveren</h2>' +
    '      <p>Café United · Bergweg 199A, Rotterdam</p>' +
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
    '    <p class="kerst-voet__klein">Dit is een reserveringsaanvraag. Je reservering staat' +
    '      pas vast zodra je een bevestiging van ons hebt ontvangen.</p>' +
    '  </div>' +
    '</div>';

  document.body.appendChild(fab);
  document.body.appendChild(paneel);

  var blad     = paneel.querySelector('.kerst-paneel__blad');
  var form     = paneel.querySelector('form');
  var melding  = paneel.querySelector('[data-melding]');
  var vakKeuze = paneel.querySelector('[data-stap-keuze]');
  var vakMenu  = paneel.querySelector('[data-stap-menu]');
  var vakSam   = paneel.querySelector('[data-stap-sam]');
  var vakCont  = paneel.querySelector('[data-stap-contact]');
  var knopVerstuur = paneel.querySelector('[data-verstuur]');
  var voet     = paneel.querySelector('.kerst-voet');

  /* ---------- stap 1: personen, datum, tijd ---------- */
  function bouwKeuze() {
    vakKeuze.innerHTML = '';
    vakKeuze.appendChild(el('h3', 'kerst-stap__titel', 'Jouw reservering'));

    var wrap = el('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '14px';

    /* personen */
    var vP = el('div', 'kerst-veld');
    var lP = el('label', null, 'Aantal personen');
    lP.htmlFor = 'kerst-personen';
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

    function zetPersonen(n) {
      n = Math.max(KERST.personen.min, Math.min(KERST.personen.max, n || KERST.personen.min));
      staat.personen = n; inp.value = n;
      min.disabled = n <= KERST.personen.min;
      plus.disabled = n >= KERST.personen.max;
      bouwSamenvatting();
    }
    min.addEventListener('click', function () { zetPersonen(staat.personen - 1); });
    plus.addEventListener('click', function () { zetPersonen(staat.personen + 1); });
    inp.addEventListener('change', function () { zetPersonen(parseInt(inp.value, 10)); });

    /* datum */
    var vD = el('div', 'kerst-veld');
    var lD = el('label', null, 'Datum');
    lD.htmlFor = 'kerst-datum';
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
      staat.menuId = null;            // menu hoort bij de datum, dus opnieuw kiezen
      bouwTijden();
      bouwMenus();
      bouwSamenvatting();
    });
    vD.appendChild(selD);

    /* tijd */
    var vT = el('div', 'kerst-veld');
    var lT = el('label', null, 'Tijd');
    lT.htmlFor = 'kerst-tijd';
    vT.appendChild(lT);
    var selT = el('select'); selT.id = 'kerst-tijd';
    vT.appendChild(selT);
    vT.appendChild(el('span', 'kerst-fout'));

    wrap.appendChild(vP); wrap.appendChild(vD); wrap.appendChild(vT);
    vakKeuze.appendChild(wrap);

    zetPersonen(staat.personen);
    bouwTijden();
  }

  function bouwTijden() {
    var sel = paneel.querySelector('#kerst-tijd');
    if (!sel) return;
    sel.innerHTML = '';
    var lijst = tijdenVoor(staat.datum);
    if (!lijst.length) {
      var o = el('option', null, 'Geen tijden beschikbaar');
      o.value = ''; sel.appendChild(o); staat.tijd = null; return;
    }
    if (lijst.indexOf(staat.tijd) === -1) staat.tijd = lijst[0];
    lijst.forEach(function (m) {
      /* Een tijd boven 1440 valt na middernacht; dat zeggen we erbij,
         anders lijkt 00:30 eerder dan 23:00. */
      var label = tijdTekst(m) + (m >= 24 * 60 ? ' (na middernacht)' : '');
      var o = el('option', null, label);
      o.value = String(m);
      if (m === staat.tijd) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      staat.tijd = parseInt(sel.value, 10);
      bouwSamenvatting();
    };
    bouwSamenvatting();
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
    var pop = el('div', 'kerst-info__pop');
    pop.hidden = true;

    var talen = el('div', 'kerst-info__talen');
    var tekstP = el('p', null, KERST.infoTekst[staat.taal]);
    tekstP.style.margin = '0';
    [['nl', 'Nederlands'], ['pap', 'Papiamentu']].forEach(function (t) {
      var b = el('button', null, t[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', staat.taal === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () {
        staat.taal = t[0];
        tekstP.textContent = KERST.infoTekst[t[0]];
        talen.querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
      });
      talen.appendChild(b);
    });
    pop.appendChild(talen); pop.appendChild(tekstP);

    iKnop.addEventListener('click', function () {
      var open = pop.hidden;
      pop.hidden = !open;
      iKnop.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        /* Binnen het paneel houden: tegen de rechterrand naar binnen klappen. */
        pop.classList.remove('kerst-info__pop--links');
        var r = pop.getBoundingClientRect();
        var b = blad.getBoundingClientRect();
        if (r.right > b.right - 8) pop.classList.add('kerst-info__pop--links');
      }
    });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !info.contains(e.target)) {
        pop.hidden = true; iKnop.setAttribute('aria-expanded', 'false');
      }
    });

    info.appendChild(iKnop); info.appendChild(pop);
    titel.appendChild(info);
    vakMenu.appendChild(titel);

    var menu = menuVoorDatum(staat.datum);
    var lijst = el('div', 'kerst-menus');

    if (!menu) {
      lijst.appendChild(el('p', 'kerst-leeg',
        'Voor ' + datumTekst(staat.datum) + ' is nog geen kerstmenu ingesteld.'));
      staat.menuId = null;
      vakMenu.appendChild(lijst);
      return;
    }

    /* Precies één menu per datum: dat staat vast en is meteen gekozen.
       De kaart blijft een knop zodat de keuze zichtbaar bevestigd is. */
    staat.menuId = menu.id;

    var kaart = el('button', 'kerst-menu');
    kaart.type = 'button';
    kaart.setAttribute('aria-pressed', 'true');

    var img = el('img');
    img.src = menu.afbeelding;
    img.alt = '';
    img.loading = 'lazy';
    kaart.appendChild(img);

    var tekstVak = el('div');
    tekstVak.appendChild(el('div', 'kerst-menu__dag', datumTekst(menu.datums[0])));
    tekstVak.appendChild(el('div', 'kerst-menu__naam', menu.naam));
    tekstVak.appendChild(el('p', 'kerst-menu__tekst', menu.tekst));
    if (menu.prijs !== null && menu.prijs !== undefined) {
      tekstVak.appendChild(el('div', 'kerst-menu__prijs', euro(menu.prijs) + ' p.p.'));
    }
    if (menu.tiencheck) {
      tekstVak.appendChild(el('span', 'kerst-menu__todo', 'Menugegevens nog invullen'));
    }
    kaart.appendChild(tekstVak);
    lijst.appendChild(kaart);
    vakMenu.appendChild(lijst);
  }

  /* ---------- stap 3: samenvatting ---------- */
  function bouwSamenvatting() {
    vakSam.innerHTML = '';
    vakSam.appendChild(el('h3', 'kerst-stap__titel', 'Samenvatting'));

    var menu = menuVoorDatum(staat.datum);
    var doos = el('div', 'kerst-sam');
    var dl = el('dl');

    function regel(naam, waarde) {
      dl.appendChild(el('dt', null, naam));
      dl.appendChild(el('dd', null, waarde));
    }
    regel('Personen', String(staat.personen));
    regel('Datum', datumTekst(staat.datum));
    regel('Tijd', staat.tijd === null ? '—'
      : tijdTekst(staat.tijd) + (staat.tijd >= 24 * 60 ? ' (na middernacht)' : ''));
    regel('Menu', menu ? menu.naam : 'Nog niet ingesteld');
    regel('Prijs p.p.', menu && menu.prijs != null ? euro(menu.prijs) : 'Nog niet bekend');
    doos.appendChild(dl);

    var tot = el('div', 'kerst-sam__totaal');
    tot.appendChild(el('span', null, 'Totaal'));
    tot.appendChild(el('strong', null,
      menu && menu.prijs != null ? euro(menu.prijs * staat.personen) : 'Nog niet bekend'));
    doos.appendChild(tot);
    vakSam.appendChild(doos);
  }

  /* ---------- stap 4: contactgegevens ---------- */
  function bouwContact() {
    vakCont.innerHTML = '';
    vakCont.appendChild(el('h3', 'kerst-stap__titel', 'Jouw gegevens'));

    var wrap = el('div');
    wrap.style.display = 'grid';
    wrap.style.gap = '14px';

    function veld(id, label, verplicht) {
      var v = el('div', 'kerst-veld');
      v.dataset.veld = id;
      var l = el('label');
      l.htmlFor = 'kerst-' + id;
      l.appendChild(document.createTextNode(label + ' '));
      if (verplicht) {
        var s = el('span', 'kerst-req', '*');
        l.appendChild(s);
      }
      v.appendChild(l);
      return v;
    }

    var vN = veld('naam', 'Volledige naam', true);
    var iN = el('input'); iN.type = 'text'; iN.id = 'kerst-naam';
    iN.autocomplete = 'name'; iN.name = 'naam';
    vN.appendChild(iN); vN.appendChild(el('span', 'kerst-fout'));

    var vE = veld('email', 'E-mailadres', true);
    var iE = el('input'); iE.type = 'email'; iE.id = 'kerst-email';
    iE.autocomplete = 'email'; iE.name = 'email';
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
    iT.autocomplete = 'tel-national'; iT.name = 'telefoon'; iT.placeholder = '6 12345678';
    tel.appendChild(selLand); tel.appendChild(iT);
    vT.appendChild(tel); vT.appendChild(el('span', 'kerst-fout'));

    var vO = veld('opmerking', 'Opmerkingen of wensen', false);
    var iO = el('textarea'); iO.id = 'kerst-opmerking'; iO.name = 'opmerking';
    iO.placeholder = 'Allergieën, een kinderstoel, een plek bij het raam…';
    vO.appendChild(iO);

    var vA = el('div', 'kerst-veld');
    vA.dataset.veld = 'akkoord';
    var lab = el('label', 'kerst-akkoord');
    var chk = el('input'); chk.type = 'checkbox'; chk.id = 'kerst-akkoord';
    var sp = el('span');
    sp.appendChild(document.createTextNode('Ik ga akkoord met de '));
    var a = el('a', null, KERST.privacyLabel);
    a.href = KERST.privacyUrl; a.target = '_blank'; a.rel = 'noopener';
    sp.appendChild(a);
    sp.appendChild(document.createTextNode(' van Café United. '));
    var ster = el('span', 'kerst-req', '*');
    sp.appendChild(ster);
    lab.appendChild(chk); lab.appendChild(sp);
    vA.appendChild(lab); vA.appendChild(el('span', 'kerst-fout'));

    [vN, vE, vT, vO, vA].forEach(function (v) { wrap.appendChild(v); });
    vakCont.appendChild(wrap);
  }

  /* ---------- controle ---------- */
  function zetFout(veldId, bericht) {
    var v = paneel.querySelector('[data-veld="' + veldId + '"]');
    if (!v) return;
    v.classList.toggle('kerst-veld--fout', !!bericht);
    var f = v.querySelector('.kerst-fout');
    if (f) f.textContent = bericht || '';
  }

  function leesWaarden() {
    return {
      naam: (paneel.querySelector('#kerst-naam') || {}).value || '',
      email: (paneel.querySelector('#kerst-email') || {}).value || '',
      land: (paneel.querySelector('#kerst-land') || {}).value || '',
      telefoon: (paneel.querySelector('#kerst-telefoon') || {}).value || '',
      opmerking: (paneel.querySelector('#kerst-opmerking') || {}).value || '',
      akkoord: !!(paneel.querySelector('#kerst-akkoord') || {}).checked
    };
  }

  function controleer() {
    var w = leesWaarden();
    var fouten = 0;

    ['naam', 'email', 'telefoon', 'akkoord'].forEach(function (k) { zetFout(k, ''); });

    if (!w.naam.trim()) { zetFout('naam', 'Vul je naam in.'); fouten++; }
    if (!w.email.trim()) { zetFout('email', 'Vul je e-mailadres in.'); fouten++; }
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(w.email.trim())) {
      zetFout('email', 'Dit e-mailadres klopt nog niet.'); fouten++;
    }
    var cijfers = w.telefoon.replace(/\D/g, '');
    if (!cijfers) { zetFout('telefoon', 'Vul je telefoonnummer in.'); fouten++; }
    else if (cijfers.length < 6) { zetFout('telefoon', 'Dit nummer lijkt te kort.'); fouten++; }
    if (!w.akkoord) { zetFout('akkoord', 'Je moet hiermee akkoord gaan om te kunnen reserveren.'); fouten++; }

    if (staat.tijd === null) { fouten++; }
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
      var eerste = paneel.querySelector('.kerst-veld--fout input, .kerst-veld--fout select');
      if (eerste) eerste.focus();
      return;
    }

    var menu = menuVoorDatum(staat.datum);
    var pot = form.elements.website;

    /* Eén id per poging; de server negeert een herhaling met hetzelfde id,
       zodat dubbelklikken of een herstelde verbinding niet twee aanvragen maakt. */
    if (!staat.aanvraagId) {
      staat.aanvraagId = 'k-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    var lading = {
      aanvraagId: staat.aanvraagId,
      personen: staat.personen,
      datum: staat.datum,
      datumTekst: datumTekst(staat.datum),
      tijd: tijdTekst(staat.tijd),
      naMiddernacht: staat.tijd >= 24 * 60,
      menuId: menu ? menu.id : null,
      menuNaam: menu ? menu.naam : null,
      prijsPP: menu && menu.prijs != null ? menu.prijs : null,
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
          throw new Error(data.error || ('HTTP ' + r.status));
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
        ' om ' + lading.tijd + ' met ' + lading.personen +
        (lading.personen === 1 ? ' persoon' : ' personen') + ' staat bij ons in de inbox.'));
      melding.appendChild(el('p', null,
        'Je krijgt een bevestiging per e-mail zodra we de reservering hebben vastgelegd. ' +
        'De aanvraag staat dus nog niet vast.'));
      /* Paneel laten staan zodat de bevestiging gelezen kan worden. */
      form.parentNode.insertBefore(melding, form);
      staat.aanvraagId = null;
    }).catch(function (err) {
      console.error('Kerstreservering versturen mislukt:', err && err.message);
      toonMelding('err', [
        'We konden je aanvraag niet bij ons krijgen. Probeer het zo nog eens, of bel ons ' +
        'op 06 16 05 01 92 — dan regelen we het meteen.'
      ]);
    }).then(function () {
      staat.bezig = false;
      knopVerstuur.disabled = false;
      knopVerstuur.textContent = oudeTekst;
    });
  }

  knopVerstuur.addEventListener('click', verstuur);
  form.addEventListener('submit', function (e) { e.preventDefault(); verstuur(); });

  /* ---------- openen en sluiten ---------- */
  var laatsteFocus = null;

  function open() {
    laatsteFocus = document.activeElement;
    paneel.hidden = false;
    fab.classList.add('is-weg');
    fab.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    /* eerst tonen, dan pas de klasse: anders is er geen frame om vanaf te animeren */
    requestAnimationFrame(function () { paneel.classList.add('is-open'); });
    blad.focus();
  }

  function sluit() {
    paneel.classList.remove('is-open');
    fab.classList.remove('is-weg');
    fab.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    var klaar = function () { paneel.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) klaar();
    else setTimeout(klaar, 340);
    if (laatsteFocus && laatsteFocus.focus) laatsteFocus.focus();
  }

  fab.addEventListener('click', open);
  paneel.addEventListener('click', function (e) {
    if (e.target.closest('[data-sluit]')) sluit();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !paneel.hidden) sluit();
  });

  /* Focus binnen het paneel houden zolang het open is. */
  blad.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var items = blad.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    var zichtbaar = Array.prototype.filter.call(items, function (n) {
      return n.offsetParent !== null && !n.disabled;
    });
    if (!zichtbaar.length) return;
    var eerste = zichtbaar[0], laatste = zichtbaar[zichtbaar.length - 1];
    if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
    else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
  });

  bouwKeuze();
  bouwMenus();
  bouwSamenvatting();
  bouwContact();
})();
