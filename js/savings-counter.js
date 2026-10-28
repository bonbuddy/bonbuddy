/* ════════════════════════════════════════════════
   BonBuddy Ersparnis-Zähler
   ────────────────────────────────────────────────
   Einbinden (beliebig oft pro Seite):

   <div data-savings-counter data-city="luedinghausen" hidden>
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
  var REQUEST_TIMEOUT_MS = 8000;
  var ANIMATION_MS = 1200;

  var numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function formatEuro(euros) {
    return numberFormat.format(euros) + ' €';
  }

  // Abrunden statt runden: 1.234,56 € → „1.234 €“, 0,99 € → 0 (ausgeblendet).
  function centsToEuros(cents) {
    return Math.floor(Math.max(0, cents) / 100);
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
    this.frame = null;
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
      this.stop();
      this.current = null;
      return;
    }

    // Screenreader lesen nur den Endwert; kein aria-live, also keine Ansage bei Updates.
    this.text.textContent = formatEuro(euros);
    this.animateTo(euros);
  };

  Counter.prototype.animateTo = function (target) {
    var self = this;
    var from = this.current === null ? 0 : this.current;
    this.stop();

    if (from === target || (reducedMotion && reducedMotion.matches)) {
      this.show(target);
      return;
    }

    var start = null;
    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / ANIMATION_MS);
      var eased = 1 - Math.pow(1 - t, 3);
      self.show(Math.round(from + (target - from) * eased));
      self.frame = t < 1 ? requestAnimationFrame(step) : null;
    }
    this.frame = requestAnimationFrame(step);
  };

  Counter.prototype.show = function (euros) {
    this.current = euros;
    this.anim.textContent = formatEuro(euros);
  };

  Counter.prototype.stop = function () {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
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
