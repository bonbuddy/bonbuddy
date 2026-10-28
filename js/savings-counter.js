/* ════════════════════════════════════════════════
   BonBuddy Ersparnis-Zähler
   ────────────────────────────────────────────────
   Einbinden (beliebig oft pro Seite):

   <div data-savings-counter data-city="luedinghausen" hidden>
     <span class="bb-live"><span class="bb-live-dot" aria-hidden="true"></span>Live</span>
     <p>So viel hat Lüdinghausen mit BonBuddy schon gespart:</p>
     <p><span data-savings-anim aria-hidden="true"></span><span class="bb-sr-only" data-savings-text></span></p>
   </div>
   <link rel="stylesheet" href="css/savings-counter.css" />
   <script src="js/savings-counter.js" defer></script>

   Optionale Attribute am Element:
     data-refresh="60"                  → alle 60 s neu laden (ohne Seiten-Reload)
     data-savings-placeholder="#id"     → dieses Element wird statt des Zählers gezeigt,
                                          solange der Betrag unter MIN_EUR liegt

   Test (beeinflusst nur die Anzeige, keine Datenbank):
     ?mock_cents=123456                 → fester Wert
     ?mock_cents=123456&mock_step=5000  → steigt bei jeder Aktualisierung um 50 €
     ?mock_cents=error                  → simuliert, dass Supabase nicht erreichbar ist
     In der Konsole: BBSavings.render(98765)
════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://uxvjwzxvqvkanuudcnac.supabase.co';
  // Publishable Key, nur für get_city_savings. Niemals den Service-Role-Key hier eintragen.
  var SUPABASE_KEY = 'sb_publishable_O6JXEp2q7Nupzd3FBIUHqw_7AXO5zXR';

  var MIN_EUR = 1;               // Zähler erst ab diesem Betrag zeigen
  var SHOW_CENTS = true;         // true: „1.234,56 €“, false: „1.234 €“
  var REQUEST_TIMEOUT_MS = 8000;
  var ROLL_MS = 1600;            // Dauer, in der eine Ziffer rollt
  var STAGGER_MS = 90;           // Versatz von Ziffer zu Ziffer (links startet zuerst)

  var fractionDigits = SHOW_CENTS ? 2 : 0;
  var numberFormat = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
  var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function formatEuro(euros) {
    return numberFormat.format(euros) + ' €';
  }

  // Ohne Cent wird abgerundet statt gerundet: 1.234,56 € → „1.234 €“.
  // Unter MIN_EUR (z. B. 0,99 €) bleibt der Zähler in beiden Fällen ausgeblendet.
  function centsToEuros(cents) {
    var whole = Math.floor(Math.max(0, cents));
    return SHOW_CENTS ? whole / 100 : Math.floor(whole / 100);
  }

  /* ── Testparameter ── */
  var params = new URLSearchParams(window.location.search);
  var mockRaw = params.get('mock_cents');
  var mockStep = Number(params.get('mock_step')) || 0;
  var mockCalls = 0;

  function fetchMock() {
    if (mockRaw === 'error') return Promise.reject(new Error('mock error'));
    var value = Number(mockRaw) + mockStep * mockCalls++;
    return Promise.resolve(value);
  }

  /* ── Datenabruf ── */
  function fetchCents(city) {
    if (mockRaw !== null) return fetchMock();

    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
    var url = SUPABASE_URL + '/rest/v1/rpc/get_city_savings?p_city=' + encodeURIComponent(city);

    return fetch(url, {
      headers: { apikey: SUPABASE_KEY, Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (rows) {
        // Keine Zeile für die Stadt → noch nichts gespart.
        var cents = Array.isArray(rows) && rows.length ? Number(rows[0].total_cents) : 0;
        if (!isFinite(cents)) throw new Error('Ungültiger Wert');
        return cents;
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  /* ── Ein Zähler-Element ── */
  function Counter(el) {
    this.el = el;
    this.city = el.getAttribute('data-city');
    this.anim = el.querySelector('[data-savings-anim]');
    this.text = el.querySelector('[data-savings-text]');
    var placeholder = el.getAttribute('data-savings-placeholder');
    this.placeholder = placeholder ? document.querySelector(placeholder) : null;
    this.refreshMs = (Number(el.getAttribute('data-refresh')) || 0) * 1000;
    this.current = null;   // aktuell angezeigter Euro-Betrag (null = nichts angezeigt)
    this.layout = null;    // Zahlenformat des aufgebauten Zählwerks, z. B. „0.000 €“
    this.digits = [];
  }

  Counter.prototype.load = function () {
    var self = this;
    fetchCents(this.city)
      .then(function (cents) { self.render(cents); })
      .catch(function () {
        // Fehler still schlucken: letzte Zahl bleibt stehen.
        // Ohne bisherigen Wert wird (falls vorhanden) der Platzhalter gezeigt.
        if (self.current === null && self.placeholder) self.placeholder.hidden = false;
      })
      .then(function () {
        if (self.refreshMs) setTimeout(function () { self.load(); }, self.refreshMs);
      });
  };

  Counter.prototype.render = function (cents) {
    var euros = centsToEuros(cents);
    var visible = euros >= MIN_EUR;

    this.el.hidden = !visible;
    if (this.placeholder) this.placeholder.hidden = visible;
    if (!visible) {
      this.current = null;
      this.layout = null;   // beim nächsten Erscheinen wieder komplett durchrollen
      return;
    }

    // Screenreader lesen nur den Endwert; kein aria-live, also keine Ansage bei Updates.
    this.text.textContent = formatEuro(euros);
    this.show(euros);
  };

  /* ── Zählwerk: jede Ziffer rollt auf einem Streifen 0–9 0–9 immer vorwärts ── */
  function createDigit() {
    var cell = document.createElement('span');
    var strip = document.createElement('span');
    cell.className = 'bb-odo-digit';
    strip.className = 'bb-odo-strip';
    for (var i = 0; i < 20; i++) {
      var d = document.createElement('span');
      d.textContent = i % 10;
      strip.appendChild(d);
    }
    cell.appendChild(strip);
    return { cell: cell, strip: strip, row: 0, reset: null };
  }

  function placeDigit(digit, row, transition) {
    digit.row = row;
    digit.strip.style.transition = transition;
    digit.strip.style.transform = 'translateY(' + (-row * 5) + '%)';   // 20 Zeilen → 5 % pro Zeile
  }

  function rollDigit(digit, value, animate, delay) {
    clearTimeout(digit.reset);
    if (digit.row >= 10) placeDigit(digit, digit.row - 10, 'none');

    if (!animate) { placeDigit(digit, value, 'none'); return; }

    // Kleinere Ziffer → über die zweite Hälfte des Streifens weiterrollen statt rückwärts.
    var row = value >= digit.row ? value : value + 10;
    if (row === digit.row) return;
    placeDigit(digit, row, 'transform ' + ROLL_MS + 'ms cubic-bezier(.2,.7,.2,1) ' + delay + 'ms');

    // Danach unsichtbar auf die erste Hälfte zurückspringen, damit die nächste Änderung wieder vorwärts rollt.
    if (row >= 10) {
      digit.reset = setTimeout(function () { placeDigit(digit, row - 10, 'none'); }, ROLL_MS + delay);
    }
  }

  Counter.prototype.build = function (text, layout) {
    this.anim.textContent = '';
    this.digits = [];
    for (var i = 0; i < text.length; i++) {
      if (/\d/.test(text[i])) {
        var digit = createDigit();
        this.digits.push(digit);
        this.anim.appendChild(digit.cell);
      } else {
        var char = document.createElement('span');
        char.className = 'bb-odo-char';
        char.textContent = text[i];
        this.anim.appendChild(char);
      }
    }
    this.layout = layout;
  };

  Counter.prototype.show = function (euros) {
    var text = formatEuro(euros);
    var layout = text.replace(/\d/g, '0');
    var animate = !(reducedMotion && reducedMotion.matches);
    var fresh = layout !== this.layout;   // erstes Anzeigen oder neue Stellenzahl (z. B. 999 → 1.000)

    if (fresh) {
      this.build(text, layout);
      void this.anim.offsetHeight;        // Startposition 0 rendern, bevor gerollt wird
    }

    var values = text.replace(/\D/g, '');
    for (var i = 0; i < this.digits.length; i++) {
      var value = Number(values[i]);
      // Beim ersten Anzeigen dreht jede Ziffer einmal komplett durch, dann bis zum Wert.
      if (fresh && animate) {
        placeDigit(this.digits[i], 0, 'none');
        rollDigit(this.digits[i], value + 10, true, i * STAGGER_MS);
      } else {
        rollDigit(this.digits[i], value, animate, i * STAGGER_MS);
      }
    }
    this.current = euros;
  };

  /* ── Start ── */
  var counters = [];

  function init() {
    var els = document.querySelectorAll('[data-savings-counter]');
    for (var i = 0; i < els.length; i++) {
      var counter = new Counter(els[i]);
      counters.push(counter);
      counter.load();
    }
  }

  // Für Tests in der Konsole: BBSavings.render(123456)
  window.BBSavings = {
    render: function (cents) {
      counters.forEach(function (c) { c.render(cents); });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
