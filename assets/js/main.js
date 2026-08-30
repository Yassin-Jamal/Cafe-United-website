/* ============================================================
   CAFÉ UNITED — site behaviour
   Sticky header · mobile nav · palm parallax · scroll reveals
   opening-hours logic · form → WhatsApp / e-mail
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     SITE DETAILS — the only place these live. Change here, not in the HTML.
     ------------------------------------------------------------------ */
  var SITE = {
    name:    'Café United',
    phone:   '06 16 05 01 92',        // as displayed
    phoneIntl: '+31616050192',        // as dialled
    whatsapp: '31616050192',            // wa.me format, no + or spaces
    email:   'cafeunitedrotterdam@gmail.com',
    street:  'Bergweg 199A',
    zip:     '3037 EJ',
    city:    'Rotterdam'
  };

  /* Opening hours, indexed by JS getDay() (0 = Sunday).
     Minutes from midnight; a close past 1440 runs into the next day. */
  var HOURS = [
    { open: 15 * 60, close: 24 * 60 + 60 },   // zondag    15:00 - 01:00
    null,                                      // maandag   gesloten
    { open: 15 * 60, close: 24 * 60 + 60 },   // dinsdag   15:00 - 01:00
    { open: 15 * 60, close: 24 * 60 + 60 },   // woensdag  15:00 - 01:00
    { open: 15 * 60, close: 24 * 60 + 60 },   // donderdag 15:00 - 01:00
    { open: 15 * 60, close: 24 * 60 + 150 },  // vrijdag   15:00 - 02:30
    { open: 15 * 60, close: 24 * 60 + 150 }   // zaterdag  15:00 - 02:30
  ];
  var DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(mins) { return pad(Math.floor(mins / 60) % 24) + ':' + pad(mins % 60); }

  /* ---------- Opening hours ---------- */
  /* A session that closes after midnight still belongs to the previous day,
     so 00:30 on Saturday is covered by Friday's 15:00-02:30 block. */
  function openState(now) {
    now = now || new Date();
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();

    var today = HOURS[day];
    if (today && mins >= today.open && mins < today.close) {
      return { open: true, until: today.close };
    }
    var prevDay = (day + 6) % 7;
    var prev = HOURS[prevDay];
    if (prev && prev.close > 1440 && mins + 1440 < prev.close) {
      return { open: true, until: prev.close - 1440 };
    }
    // find the next opening moment, scanning up to a week ahead
    for (var i = 0; i < 8; i++) {
      var d = (day + i) % 7;
      var h = HOURS[d];
      if (!h) continue;
      if (i === 0 && mins >= h.open) continue;   // today's slot already passed
      return { open: false, nextDay: d, nextAt: h.open, daysAhead: i };
    }
    return { open: false };
  }

  function renderOpenBadges() {
    var els = document.querySelectorAll('[data-open-badge]');
    if (!els.length) return;
    var s = openState();
    els.forEach(function (el) {
      var label, cls;
      if (s.open) {
        cls = 'badge badge--open';
        label = 'Nu open · tot ' + fmt(s.until);
      } else {
        cls = 'badge badge--closed';
        if (s.nextDay === undefined) label = 'Gesloten';
        else if (s.daysAhead === 0) label = 'Gesloten · vandaag vanaf ' + fmt(s.nextAt);
        else if (s.daysAhead === 1) label = 'Gesloten · morgen vanaf ' + fmt(s.nextAt);
        else label = 'Gesloten · ' + DAY_NAMES[s.nextDay] + ' vanaf ' + fmt(s.nextAt);
      }
      el.className = cls;
      el.innerHTML = '<span class="badge__dot" aria-hidden="true"></span>' + label;
    });
  }

  function markToday() {
    var today = new Date().getDay();
    document.querySelectorAll('[data-hours-table]').forEach(function (table) {
      table.querySelectorAll('tr[data-day]').forEach(function (tr) {
        var isToday = Number(tr.getAttribute('data-day')) === today;
        tr.classList.toggle('is-today', isToday);
        if (isToday) {
          var th = tr.querySelector('th');
          if (th && !th.querySelector('.today-mark')) {
            th.insertAdjacentHTML('beforeend', ' <span class="today-mark muted">(vandaag)</span>');
          }
        }
      });
    });
  }

  renderOpenBadges();
  markToday();
  setInterval(renderOpenBadges, 60000);

  var yearEl = document.querySelectorAll('[data-year]');
  yearEl.forEach(function (e) { e.textContent = new Date().getFullYear(); });


  /* ---------- Sticky header ---------- */
  var header = document.querySelector('.site-header');
  function onScrollHeader() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 30);
  }

  /* ---------- Palm parallax ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  function updateParallax() {
    var vh = window.innerHeight;
    var i;
    /* Read every rect first, then write every --py, so we never force a layout
       flush per element. No off-screen shortcut: a layer that gets skipped is
       never positioned at all, so a deep link that jumps straight to a section
       would leave its wallpaper hundreds of px out of place. */
    var rects = [];
    for (i = 0; i < parallaxEls.length; i++) {
      var p = parallaxEls[i].parentElement;
      rects.push(p ? p.getBoundingClientRect() : null);
    }
    for (i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var rect = rects[i];
      if (!rect) continue;
      var speed = parseFloat(el.getAttribute('data-parallax'));
      if (isNaN(speed)) speed = 0.2;
      /* Measure the untransformed parent, never the element itself — the
         element carries the --py written last frame and getBoundingClientRect
         reports post-transform geometry, which would feed output back into
         input. speed 1 pins the layer to the viewport centre: it stops moving
         and the section's overflow:hidden becomes a window sliding over it. */
      var offset = (rect.top + rect.height / 2) - vh / 2;
      el.style.setProperty('--py', (-offset * speed).toFixed(1) + 'px');
    }
  }

  /* ---------- Scroll reveals ---------- */
  /* Position-driven, not IntersectionObserver: IO only re-evaluates on change,
     so an instant jump (deep link, reload part-way down, scroll restoration)
     can leave every skipped section stranded at opacity 0. */
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function syncReveals() {
    if (reduceMotion) {
      while (pending.length) pending.pop().classList.add('is-in');
      return;
    }
    var trigger = window.innerHeight * 0.92;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < trigger) {
        pending[i].classList.add('is-in');
        pending.splice(i, 1);
      }
    }
  }

  /* ---------- One scroll loop ---------- */
  var rafId = 0;
  function applyScrollState() {
    rafId = 0;
    onScrollHeader();
    syncReveals();
    if (!reduceMotion) updateParallax();
  }
  /* Cancel-and-reschedule, not a boolean latch: a latch raised before a
     requestAnimationFrame that never fires (throttled/backgrounded tab) stays
     raised forever and freezes the header, reveals and parallax for good. */
  function onScroll() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(applyScrollState);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) onScroll();
  });

  onScrollHeader();
  syncReveals();
  if (!reduceMotion) updateParallax();
  window.addEventListener('load', function () {
    syncReveals();
    if (!reduceMotion) updateParallax();
  });


  /* ---------- Off-canvas nav ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  var openPanel = null, lastFocused = null;

  function cancelPendingClose(panel) {
    if (panel._closeDone) { panel.removeEventListener('transitionend', panel._closeDone); panel._closeDone = null; }
    if (panel._closeTimer) { clearTimeout(panel._closeTimer); panel._closeTimer = null; }
  }

  function show(panel, trigger) {
    if (openPanel && openPanel !== panel) hide(openPanel);
    cancelPendingClose(panel);
    openPanel = panel;
    lastFocused = trigger || document.activeElement;
    panel.hidden = false;
    document.body.classList.add('is-locked');
    // flush layout so the transition has a start value; deliberately not rAF,
    // which is throttled to a standstill in background tabs
    void panel.offsetHeight;
    panel.classList.add('is-open');
    if (trigger && trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector(FOCUSABLE);
    if (first) first.focus();
  }

  function hide(panel) {
    panel.classList.remove('is-open');
    cancelPendingClose(panel);
    var burgerBtn = document.querySelector('.burger');
    if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false');
    if (openPanel === panel) openPanel = null;

    var done = function (e) {
      if (e && e.target !== panel &&
          !e.target.classList.contains('panel__body') &&
          !e.target.classList.contains('panel__backdrop')) return;
      panel.removeEventListener('transitionend', done);
      panel._closeDone = null;
      if (panel._closeTimer) { clearTimeout(panel._closeTimer); panel._closeTimer = null; }
      if (openPanel === panel) return;      // re-opened meanwhile
      panel.hidden = true;
    };

    if (reduceMotion) {
      done();
    } else {
      panel._closeDone = done;
      panel.addEventListener('transitionend', done);
      // .panel is a fixed inset:0 layer — if transitionend never fires it would
      // keep swallowing every click invisibly, so guarantee the close
      panel._closeTimer = setTimeout(function () { done(); }, 800);
    }
    document.body.classList.toggle('is-locked', openPanel !== null);
    if (lastFocused) { lastFocused.focus(); lastFocused = null; }
  }

  var burger = document.querySelector('.burger');
  var navPanel = document.getElementById('navPanel');
  if (burger && navPanel) {
    burger.addEventListener('click', function () {
      if (openPanel === navPanel) hide(navPanel); else show(navPanel, burger);
    });
  }
  document.querySelectorAll('[data-close-panel]').forEach(function (el) {
    el.addEventListener('click', function () {
      var p = el.closest('.panel'); if (p) hide(p);
    });
  });
  document.querySelectorAll('.panel__nav a').forEach(function (a) {
    a.addEventListener('click', function () { var p = a.closest('.panel'); if (p) hide(p); });
  });

  document.addEventListener('keydown', function (e) {
    if (!openPanel) return;
    if (e.key === 'Escape') { hide(openPanel); return; }
    if (e.key !== 'Tab') return;

    var items = openPanel.querySelectorAll(FOCUSABLE);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    // a click on dead panel space puts focus on <body>, which matches neither
    // end — Tab would then walk straight out of the dialog
    if (!openPanel.contains(document.activeElement)) {
      e.preventDefault(); (e.shiftKey ? last : first).focus(); return;
    }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });


  /* ---------- Forms ----------
     There is no backend. Each form builds a readable message and hands it to
     WhatsApp or the visitor's mail client, so nothing is silently lost. */
  function fieldLabel(form, el) {
    /* A radio's own <label> is the option text ("Koken"), not the question.
       data-label carries the group's name so the message reads
       "Wat je wilt doen: Koken" rather than "Koken: Koken". */
    var group = el.getAttribute && el.getAttribute('data-label');
    if (group) return group;
    var lab = form.querySelector('label[for="' + el.id + '"]');
    var txt = lab ? lab.textContent : (el.name || el.id);
    return txt.replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ').trim();
  }

  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli',
                'augustus', 'september', 'oktober', 'november', 'december'];

  /* "2026-08-15" -> "zaterdag 15 augustus 2026". Built from the parts rather
     than new Date(str), which parses a bare date as UTC and can slip a day. */
  function prettyDate(value) {
    var p = value.split('-');
    if (p.length !== 3) return value;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d.getTime())) return value;
    return DAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* Every named field that carries a value, as {label, value} pairs. One shape,
     used both for the e-mail the backend sends and the WhatsApp fallback. */
  function collectFields(form) {
    var out = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'button') return;
      if (el.name === 'website') return;                 // honeypot, never forwarded
      // an unchecked radio still reports its value attribute — without this
      // every option in the group would land in the message, not the chosen one
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      var v = (el.value || '').trim();
      if (!v) return;
      if (el.type === 'date') v = prettyDate(v);
      out.push({ label: fieldLabel(form, el), value: v });
    });
    return out;
  }

  function buildMessage(form) {
    var heading = form.getAttribute('data-message-title') || 'Aanvraag';
    var lines = [heading + ' via de website', ''];
    collectFields(form).forEach(function (f) { lines.push(f.label + ': ' + f.value); });
    return lines.join('\n');
  }

  document.querySelectorAll('form[data-contact-form]').forEach(function (form) {
    var status = form.querySelector('.form__status');
    var sending = false;

    /* Bots fill in every input they find; people never see this one. */
    var potWrap = document.createElement('div');
    potWrap.setAttribute('aria-hidden', 'true');
    potWrap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    potWrap.innerHTML = '<label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(potWrap);

    function setStatus(kind, build) {
      if (!status) return;
      status.classList.remove('form__status--ok', 'form__status--err');
      status.classList.add('form__status', 'form__status--' + kind, 'is-shown');
      status.textContent = '';
      build(status);
      status.setAttribute('tabindex', '-1');
      status.focus();
      status.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function para(text, bold) {
      var p = document.createElement('p');
      p.style.margin = '0 0 12px';
      if (bold) {
        var strong = document.createElement('strong');
        strong.textContent = bold;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(' '));
      }
      // never innerHTML: some of this is visitor input echoed back
      p.appendChild(document.createTextNode(text));
      return p;
    }

    function linkRow(links) {
      var row = document.createElement('div');
      row.className = 'btn-row';
      links.forEach(function (a) {
        var link = document.createElement('a');
        link.className = a.cls;
        link.href = a.href;
        link.textContent = a.text;
        if (a.blank) { link.target = '_blank'; link.rel = 'noopener'; }
        row.appendChild(link);
      });
      return row;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      if (!form.reportValidity()) return;

      var msg = buildMessage(form);
      var subject = form.getAttribute('data-message-title') || 'Aanvraag';
      var wa = 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(msg);
      var mail = 'mailto:' + SITE.email +
                 '?subject=' + encodeURIComponent(subject + ' — ' + SITE.name) +
                 '&body=' + encodeURIComponent(msg);

      var btn = form.querySelector('[type="submit"]');
      var btnText = btn ? btn.textContent : '';

      /* No fetch (or no status area to report into) means no backend to talk
         to — hand the visitor the WhatsApp/mail route straight away. */
      if (!window.fetch || !status) {
        if (!status) { window.location.href = wa; return; }
        return offerFallback('We konden het formulier niet versturen. Stuur je ' +
          'aanvraag even op een van deze manieren — dan pakken we het meteen op.');
      }

      function offerFallback(text) {
        setStatus('err', function (el) {
          el.appendChild(para(text, 'Versturen lukte niet.'));
          el.appendChild(linkRow([
            { cls: 'btn btn--primary btn--sm', href: wa, text: 'Via WhatsApp', blank: true },
            { cls: 'btn btn--ghost btn--sm', href: mail, text: 'Via e-mail' },
            { cls: 'btn btn--ghost btn--sm', href: 'tel:' + SITE.phoneIntl, text: 'Bel ' + SITE.phone }
          ]));
        });
      }

      sending = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Versturen…'; }

      var pot = form.elements.website;
      // so a reply from the café lands in the visitor's inbox, not ours
      var mailField = form.querySelector('input[type="email"]');

      fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: subject,
          fields: collectFields(form),
          replyTo: mailField ? mailField.value.trim() : '',
          website: pot ? pot.value : ''
        })
      }).then(function (r) {
        return r.text().then(function (raw) {
          var data = {};
          try { data = JSON.parse(raw); } catch (e) { /* not JSON — see log below */ }
          if (!r.ok) {
            // The visitor gets a friendly line; this is for whoever debugs it.
            console.error('POST /api/send faalde —', r.status, r.statusText,
                          '· antwoord:', raw.slice(0, 300));
            throw new Error(data.error || ('HTTP ' + r.status));
          }
          return data;
        });
      }).then(function () {
        form.reset();
        setStatus('ok', function (el) {
          el.appendChild(para('Je bericht staat bij ons in de inbox — we reageren zo snel ' +
            'mogelijk. Liever direct iemand spreken?', 'Verstuurd!'));
          el.appendChild(linkRow([
            { cls: 'btn btn--ghost btn--sm', href: 'tel:' + SITE.phoneIntl, text: 'Bel ' + SITE.phone },
            { cls: 'btn btn--ghost btn--sm', href: 'https://wa.me/' + SITE.whatsapp, text: 'WhatsApp', blank: true }
          ]));
        });
      }).catch(function (err) {
        console.error('Formulier versturen mislukt:', err && err.message);
        offerFallback('We konden je bericht niet bij ons krijgen. Stuur het even op een ' +
          'van deze manieren — dan pakken we het meteen op.');
      }).then(function () {
        sending = false;
        if (btn) { btn.disabled = false; btn.textContent = btnText; }
      });
    });
  });

  /* ---------- Menu category tabs ----------
     Categories across the top; clicking one swaps the panel underneath.
     Deep-linkable via #hash, and driven with real tab semantics so arrow
     keys work and screen readers announce the selection. */
  var tablist = document.querySelector('[data-menu-tabs]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;                 // roving tabindex
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      var id = tab.getAttribute('data-cat');
      if (id && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + id);
      }
      syncReveals();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { selectTab(tab); });
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab), next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); selectTab(next, true); }
      });
    });

    // open the category named in the URL, else the first one
    var wanted = decodeURIComponent(window.location.hash.replace('#', ''));
    var start = tabs.filter(function (t) { return t.getAttribute('data-cat') === wanted; })[0] || tabs[0];
    if (start) selectTab(start);
  }


  /* ---------- Reels ---------- */
  document.querySelectorAll('[data-reel]').forEach(function (reel) {
    var video = reel.querySelector('video');
    if (!video) return;

    // Autoplay is only permitted while muted. Under reduced-motion, don't
    // start it at all — offer the native controls instead.
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.controls = true;
      var sr = reel.querySelector('[data-sound]');
      if (sr) sr.remove();
      return;
    }

    var play = video.play();
    if (play && play.catch) play.catch(function () { video.controls = true; });

    var btn = reel.querySelector('[data-sound]');
    if (!btn) return;
    function render() {
      var on = !video.muted;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Geluid uitzetten' : 'Geluid aanzetten');
      btn.querySelector('[data-icon-on]').hidden = !on;
      btn.querySelector('[data-icon-off]').hidden = on;
    }
    btn.addEventListener('click', function () { video.muted = !video.muted; render(); });
    render();
  });


  /* Vacancies: "Solliciteer op deze plek" jumps to the form — carry the role
     across so the visitor does not have to pick it from the select again.
     Matched on the option's text, so a renamed vacancy simply falls back to
     leaving the select untouched rather than selecting the wrong role. */
  var roleSelect = document.getElementById('vac-role');
  if (roleSelect) {
    document.querySelectorAll('[data-vac]').forEach(function (link) {
      link.addEventListener('click', function () {
        var wanted = link.getAttribute('data-vac');
        Array.prototype.forEach.call(roleSelect.options, function (opt) {
          if (opt.text === wanted) roleSelect.value = opt.value || opt.text;
        });
      });
    });
  }

  /* Reservation form: never allow a date in the past, and warn on a Monday */
  var resDate = document.getElementById('res-date');
  if (resDate) {
    var t = new Date();
    resDate.min = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    var warn = document.getElementById('res-date-warning');
    resDate.addEventListener('change', function () {
      if (!warn) return;
      var parts = resDate.value.split('-');
      if (parts.length !== 3) { warn.textContent = ''; return; }
      // construct locally; new Date('YYYY-MM-DD') parses as UTC and can slip a day
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      warn.textContent = HOURS[d.getDay()] ? '' : 'Let op: op maandag zijn we gesloten.';
    });
  }


  /* Reservation form: we only take bookings from 6 people up. Smaller groups
     are welcome, just without a table held for them — so this blocks the
     submit rather than letting a request through we would have to refuse. */
  var MIN_PARTY = 6;
  var resPeople = document.getElementById('res-people');
  if (resPeople) {
    var peopleWarn = document.getElementById('res-people-warning');
    var checkParty = function () {
      var n = Number(resPeople.value);
      var tooSmall = resPeople.value !== '' && n < MIN_PARTY;
      resPeople.setCustomValidity(tooSmall
        ? 'Reserveren kan vanaf ' + MIN_PARTY + ' personen.' : '');
      if (!peopleWarn) return;
      peopleWarn.textContent = tooSmall
        ? 'Reserveren kan pas vanaf ' + MIN_PARTY + ' personen. Met een kleiner gezelschap ' +
          'ben je van harte welkom zonder reservering — aan de bar is bijna altijd plek.'
        : '';
      peopleWarn.classList.toggle('hint--warn', tooSmall);
    };
    resPeople.addEventListener('input', checkParty);
    resPeople.addEventListener('change', checkParty);
    checkParty();
  }

  /* ------------------------------------------------------------------
     APPLICATION WIZARD (vacatures) — one question per screen.
     The markup ships as a plain top-to-bottom form so it still works with
     scripting off; everything below is what turns it into the stepped flow.
     ------------------------------------------------------------------ */
  document.querySelectorAll('form[data-apply]').forEach(function (form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-apply-step]'));
    if (!steps.length) return;

    var head    = form.querySelector('.apply__head');
    var barWrap = form.querySelector('.apply__bar');
    var bar     = form.querySelector('[data-apply-bar]');
    var count   = form.querySelector('[data-apply-count]');
    var eta     = form.querySelector('[data-apply-eta]');
    var prevBtn = form.querySelector('[data-apply-prev]');
    var nextBtn = form.querySelector('[data-apply-next]');
    var sendBtn = form.querySelector('[data-apply-submit]');
    var summary = form.querySelector('[data-apply-summary]');
    var reveal  = form.querySelector('[data-apply-reveal]');
    var status  = form.querySelector('.form__status');
    var at = 0;

    // hand the chrome over to JS now that we know it will be driven
    [head, barWrap, count, nextBtn].forEach(function (el) { if (el) el.hidden = false; });
    if (sendBtn) sendBtn.hidden = true;

    function etaFor(i) {
      if (i >= steps.length - 2) return 'Bijna klaar…';
      var mins = Math.max(1, Math.ceil((steps.length - 1 - i) * 0.4));
      return 'Nog ongeveer ' + mins + ' min.';
    }

    /* Only the fields on the step you can actually see may block you. Validating
       the rest would raise an error pointing at something off-screen. */
    function validate(step) {
      var err = step.querySelector('[data-apply-err]');
      var msg = '';
      var radios = step.querySelectorAll('input[type="radio"]');

      if (radios.length) {
        var picked = null;
        Array.prototype.forEach.call(radios, function (r) { if (r.checked) picked = r; });
        if (!picked) msg = 'Kies een van de opties om verder te gaan.';
        // "Vanaf een datum" is not an answer until the date itself is filled in
        else if (reveal && step.contains(reveal) && /vanaf/i.test(picked.value)) {
          var d = reveal.querySelector('input');
          if (d && !d.value) msg = 'Vul de datum in waarop je kunt beginnen.';
        }
      }

      if (!msg) {
        Array.prototype.forEach.call(step.querySelectorAll('input:not([type="radio"])'), function (el) {
          if (msg || el.type === 'date') return;
          if (!el.value.trim()) { msg = 'Vul dit veld nog even in.'; return; }
          if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value)) {
            msg = 'Dit e-mailadres klopt nog niet.';
          }
          if (el.type === 'number') {
            var n = Number(el.value);
            if (!n || n < 15 || n > 99) msg = 'Vul een leeftijd tussen 15 en 99 in.';
          }
        });
      }

      if (err) { err.textContent = msg; err.classList.toggle('is-shown', !!msg); }
      if (msg) {
        var first = step.querySelector('input:not([type="radio"])') ||
                    step.querySelector('input[type="radio"]');
        if (first) first.focus();
      }
      return !msg;
    }

    /* form.elements[name] is a RadioNodeList for a radio group, whose .value is
       the checked value — but empty when nothing is checked, so read it directly. */
    function val(name) {
      var el = form.elements[name];
      if (!el) return '';
      if (typeof el.length === 'number' && el[0] && el[0].type === 'radio') {
        for (var i = 0; i < el.length; i++) { if (el[i].checked) return el[i].value; }
        return '';
      }
      return (el.value || '').trim();
    }

    function fillSummary() {
      if (!summary) return;
      summary.textContent = '';
      var start = val('startmoment');
      if (/vanaf/i.test(start) && val('startdatum')) start = 'Vanaf ' + prettyDate(val('startdatum'));
      [
        ['Wat je wilt doen', val('rol')],
        ['Ervaring',         val('ervaring')],
        ['Sociale Hygiëne', val('hygiene')],
        ['Beschikbaar',      val('beschikbaarheid')],
        ['Startmoment',      start],
        ['Naam',             (val('voornaam') + ' ' + val('achternaam')).trim()],
        ['Leeftijd',         val('leeftijd') ? val('leeftijd') + ' jaar' : ''],
        ['Telefoon',         val('telefoon')],
        ['E-mail',           val('email')]
      ].forEach(function (row) {
        if (!row[1]) return;
        var dt = document.createElement('dt'); dt.textContent = row[0];
        var dd = document.createElement('dd'); dd.textContent = row[1];   // never innerHTML: visitor input
        summary.appendChild(dt); summary.appendChild(dd);
      });
    }

    function show(i, focus) {
      at = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach(function (s, n) { s.classList.toggle('is-active', n === at); });
      if (bar) bar.style.width = Math.round((at / (steps.length - 1)) * 100) + '%';
      if (count) count.textContent = 'Vraag ' + (at + 1) + ' van ' + steps.length;
      if (eta) eta.textContent = etaFor(at);
      if (prevBtn) prevBtn.hidden = at === 0;

      var last = at === steps.length - 1;
      if (nextBtn) nextBtn.hidden = last;
      if (sendBtn) sendBtn.hidden = !last;
      if (last) fillSummary();

      var greet = steps[at].querySelector('[data-apply-greet]');
      if (greet) greet.textContent = 'Leuk je te ontmoeten, ' + (val('voornaam') || 'jij') + '.';

      if (focus) {
        var target = steps[at].querySelector('input:not([type="radio"])') ||
                     steps[at].querySelector('input[type="radio"]');
        if (target) { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }
        var top = form.getBoundingClientRect().top + window.pageYOffset - 110;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    function next() { if (validate(steps[at])) show(at + 1, true); }

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', function () { show(at - 1, true); });

    /* Auto-advance only when the choice came from a pointer. Arrow-keying
       through a radio group fires change on every option it passes, and
       advancing on those would yank the step away mid-selection — so keyboard
       users confirm with Volgende instead. Modality is tracked rather than read
       off the event: a click forwarded from a <label> arrives on the input with
       detail 0, exactly like a keyboard-driven one, so the event cannot tell
       the two apart. */
    var viaPointer = false;
    form.addEventListener('pointerdown', function () { viaPointer = true; });
    form.addEventListener('keydown', function () { viaPointer = false; }, true);

    form.addEventListener('change', function (e) {
      var r = e.target;
      if (!r || r.type !== 'radio') return;
      var step = r.closest ? r.closest('[data-apply-step]') : null;
      // "Vanaf een datum" opens the date field and waits there instead
      if (reveal && step && step.contains(reveal)) {
        var wants = /vanaf/i.test(r.value);
        reveal.classList.toggle('is-shown', wants);
        if (wants) { var d = reveal.querySelector('input'); if (d) d.focus(); return; }
      }
      if (!viaPointer) return;
      setTimeout(next, 180);
    });

    // typing clears a stale error on the step you are on
    form.addEventListener('input', function (e) {
      var err = steps[at].querySelector('[data-apply-err]');
      if (err && err.classList.contains('is-shown') && steps[at].contains(e.target)) {
        err.textContent = ''; err.classList.remove('is-shown');
      }
    });

    // Enter means "next", not "submit", until the final step
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || at === steps.length - 1) return;
      if (e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      next();
    });

    form.addEventListener('submit', function () {
      if (status) status.scrollIntoView({ block: 'nearest' });
    });

    show(0, false);
  });

})();
