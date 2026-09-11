/* ============================================================
   BonBuddy · Cookie-Consent
   Ein zentrales, schlankes Banner für alle Seiten.
   - "Alle akzeptieren" / "Nur notwendige" gleich prominent (1 Klick)
   - "Einstellungen" für eine granulare, eigene Auswahl
     (dort lässt sich alles Optionale mit einem Klick abwählen)
   - Kein Ausweichen ohne Entscheidung: kein X, kein Klick daneben
   - Speichert die Wahl in localStorage & steuert Google Consent Mode v2
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'bb_cookie_consent';
  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function safeGtag(payload) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', payload);
    }
  }

  function readConsent() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    // Alte Werte (vor dem Redesign) migrieren: einfache Strings.
    if (raw === 'accepted') return { necessary: true, analytics: true };
    if (raw === 'declined') return { necessary: true, analytics: false };
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
    return null;
  }

  function writeConsent(consent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {}
  }

  function applyConsent(consent) {
    safeGtag({
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.analytics ? 'granted' : 'denied'
    });
  }

  var CSS = ''
    + '#bbc-banner,#bbc-banner *{box-sizing:border-box;}'
    + '#bbc-banner{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;'
    + 'padding:24px;overflow-y:auto;background:rgba(20,28,26,.55);backdrop-filter:blur(3px);'
    + '-webkit-backdrop-filter:blur(3px);'
    + 'font-family:"Jost",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
    + 'animation:bbc-in .28s ease;}'
    + '#bbc-banner[hidden]{display:none!important;}'
    + '@keyframes bbc-in{from{opacity:0;}to{opacity:1;}}'
    + '#bbc-card{width:100%;max-width:480px;min-width:0;max-height:calc(100vh - 48px);overflow-y:auto;'
    + 'background:#fff;border:1px solid #E6EDEA;border-radius:26px;'
    + 'box-shadow:0 24px 70px rgba(10,16,14,.35);padding:30px 30px 26px;color:#1E2422;'
    + 'animation:bbc-pop .32s cubic-bezier(.2,.9,.3,1.2);}'
    + '@keyframes bbc-pop{from{opacity:0;transform:scale(.94) translateY(10px);}to{opacity:1;transform:none;}}'
    + '#bbc-main{display:flex;align-items:flex-start;gap:16px;margin-bottom:18px;}'
    + '#bbc-main>div{min-width:0;}'
    + '#bbc-icon{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:5px;font-size:34px;'
    + 'line-height:1;padding-top:2px;}'
    + '#bbc-icon span{display:inline-block;}'
    + '#bbc-cart{font-size:25px;opacity:.55;}'
    + '#bbc-title{margin:0 0 6px;font-size:19px;font-weight:700;letter-spacing:-.01em;}'
    + '#bbc-text{margin:0;font-size:14.5px;line-height:1.55;color:#4b5a56;}'
    + '#bbc-text a{color:#519E8A;font-weight:600;text-decoration:underline;text-decoration-color:rgba(81,158,138,.4);}'
    + '#bbc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;}'
    + '#bbc-actions[hidden]{display:none;}'
    + '.bbc-btn{flex:1 1 auto;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:700;'
    + 'font-family:inherit;cursor:pointer;text-align:center;transition:background .18s,border-color .18s,transform .12s;}'
    + '.bbc-btn:active{transform:scale(.97);}'
    + '.bbc-btn-primary{order:3;flex-basis:100%;background:#519E8A;color:#fff;border:1px solid #519E8A;}'
    + '.bbc-btn-primary:hover{background:#3f7c6c;}'
    + '.bbc-btn-ghost{order:2;flex-basis:100%;background:transparent;color:#1E2422;border:1px solid rgba(30,36,34,.18);}'
    + '.bbc-btn-ghost:hover{border-color:#519E8A;color:#3f7c6c;}'
    + '.bbc-link{order:1;flex-basis:100%;background:none;border:none;padding:4px 2px;font:inherit;font-size:13.5px;'
    + 'font-weight:600;color:#6b7d78;text-decoration:underline;text-decoration-color:rgba(107,125,120,.4);'
    + 'cursor:pointer;text-align:center;}'
    + '.bbc-link:hover{color:#3f7c6c;}'
    + '#bbc-settings{display:flex;flex-direction:column;gap:14px;margin-top:4px;}'
    + '#bbc-settings[hidden]{display:none;}'
    + '.bbc-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;'
    + 'border-top:1px solid #EEF3F1;}'
    + '.bbc-row:first-child{border-top:none;padding-top:0;}'
    + '.bbc-row-title{margin:0;font-size:14px;font-weight:700;}'
    + '.bbc-row-desc{margin:2px 0 0;font-size:13px;line-height:1.45;color:#6b7d78;}'
    + '.bbc-switch{position:relative;flex:0 0 auto;width:44px;height:26px;border-radius:999px;background:#DCE7E3;'
    + 'display:inline-block;cursor:pointer;transition:background .18s;}'
    + '.bbc-switch input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer;}'
    + '.bbc-switch .bbc-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;'
    + 'background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .18s;}'
    + '.bbc-switch input:checked ~ .bbc-knob{transform:translateX(18px);}'
    + '.bbc-switch.bbc-on,.bbc-switch:has(input:checked){background:#519E8A;}'
    + '.bbc-switch-locked{background:#BFD8CF;opacity:.85;cursor:default;}'
    + '.bbc-switch-locked .bbc-knob{transform:translateX(18px);}'
    + '#bbc-settings-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;'
    + 'margin-top:4px;}'
    + '#bbc-settings-actions .bbc-btn{flex:0 0 auto;order:0;}'
    + '#bbc-close{position:absolute;top:16px;right:18px;background:none;border:none;font-size:19px;line-height:1;'
    + 'color:#9aa9a4;cursor:pointer;padding:4px;}'
    + '#bbc-close:hover{color:#3f7c6c;}'
    + '.bbc-anim #bbc-cookie{animation:bbc-fly .6s ease-in forwards;}'
    + '.bbc-anim #bbc-cart{animation:bbc-bounce .4s ease-out .5s;}'
    + '@keyframes bbc-fly{0%{transform:translate(0,0) scale(1) rotate(0);opacity:1;}'
    + '65%{transform:translate(22px,-9px) scale(.8) rotate(-18deg);opacity:1;}'
    + '100%{transform:translate(38px,7px) scale(.25) rotate(-40deg);opacity:0;}}'
    + '@keyframes bbc-bounce{0%,100%{transform:scale(1);}50%{transform:scale(1.3) rotate(-8deg);}}'
    + '#bbc-banner.bbc-leaving{animation:bbc-in .26s ease reverse forwards;}'
    + '#bbc-banner.bbc-leaving #bbc-card{animation:bbc-out .26s ease forwards;}'
    + '@keyframes bbc-out{to{opacity:0;transform:scale(.95);}}'
    + '@media (min-width:640px){'
    + '.bbc-btn-primary,.bbc-btn-ghost,.bbc-link{flex-basis:auto;}'
    + '.bbc-btn-primary{order:2;}'
    + '.bbc-btn-ghost{order:1;}'
    + '.bbc-link{order:0;margin-right:auto;flex-basis:100%;}'
    + '}';

  var HTML = ''
    + '<div id="bbc-card">'
    + '  <div id="bbc-main">'
    + '    <div id="bbc-icon" aria-hidden="true"><span id="bbc-cookie">🍪</span><span id="bbc-cart">🛒</span></div>'
    + '    <div>'
    + '      <p id="bbc-title">Ein paar Kekse für BonBuddy?</p>'
    + '      <p id="bbc-text">Sie helfen uns zu sehen, wie die App genutzt wird, und unser App-Marketing gezielter '
    + '      zu machen – verkauft wird damit nichts. Mehr in der '
    + '      <a href="/datenschutz.html">Datenschutzerklärung</a>.</p>'
    + '    </div>'
    + '  </div>'
    + '  <div id="bbc-actions">'
    + '    <button type="button" id="bbc-settings-toggle" class="bbc-link">Einstellungen</button>'
    + '    <button type="button" id="bbc-reject" class="bbc-btn bbc-btn-ghost">Nur notwendige</button>'
    + '    <button type="button" id="bbc-accept" class="bbc-btn bbc-btn-primary">Alle akzeptieren</button>'
    + '  </div>'
    + '  <div id="bbc-settings" hidden>'
    + '    <div class="bbc-row">'
    + '      <div><p class="bbc-row-title">Notwendig</p>'
    + '      <p class="bbc-row-desc">Damit BonBuddy technisch funktioniert – immer aktiv.</p></div>'
    + '      <span class="bbc-switch bbc-switch-locked" aria-hidden="true"><span class="bbc-knob"></span></span>'
    + '    </div>'
    + '    <div class="bbc-row">'
    + '      <div><p class="bbc-row-title">Statistik &amp; Marketing</p>'
    + '      <p class="bbc-row-desc">Google Analytics – zeigt uns, was funktioniert, und hilft beim App-Marketing.</p></div>'
    + '      <label class="bbc-switch"><input type="checkbox" id="bbc-toggle-stats"><span class="bbc-knob"></span></label>'
    + '    </div>'
    + '    <div id="bbc-settings-actions">'
    + '      <button type="button" id="bbc-clear-all" class="bbc-link">Alles abwählen</button>'
    + '      <button type="button" id="bbc-save" class="bbc-btn bbc-btn-primary">Auswahl speichern</button>'
    + '    </div>'
    + '  </div>'
    + '</div>';

  function injectStyle() {
    if (document.getElementById('bbc-style')) return;
    var style = document.createElement('style');
    style.id = 'bbc-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function closeBanner(banner) {
    if (reduceMotion) { banner.remove(); return; }
    banner.classList.add('bbc-leaving');
    setTimeout(function () { banner.remove(); }, 320);
  }

  function build(opts) {
    opts = opts || {};
    injectStyle();

    var existing = document.getElementById('bbc-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'bbc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML = HTML;
    document.body.appendChild(banner);

    var actions = banner.querySelector('#bbc-actions');
    var settings = banner.querySelector('#bbc-settings');
    var statsToggle = banner.querySelector('#bbc-toggle-stats');
    var card = banner.querySelector('#bbc-card');

    if (opts.dismissable) {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.id = 'bbc-close';
      closeBtn.setAttribute('aria-label', 'Schließen');
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', function () { closeBanner(banner); });
      card.style.position = 'relative';
      card.appendChild(closeBtn);
    }

    var current = readConsent();
    statsToggle.checked = !!(current && current.analytics);
    function syncSwitch() {
      statsToggle.parentElement.classList.toggle('bbc-on', statsToggle.checked);
    }
    syncSwitch();
    statsToggle.addEventListener('change', syncSwitch);

    if (opts.openSettings) {
      actions.hidden = true;
      settings.hidden = false;
    }

    function finish(consent, animate) {
      writeConsent(consent);
      applyConsent(consent);
      if (animate && !reduceMotion) {
        banner.classList.add('bbc-anim');
        setTimeout(function () { closeBanner(banner); }, 550);
      } else {
        closeBanner(banner);
      }
    }

    banner.querySelector('#bbc-settings-toggle').addEventListener('click', function () {
      actions.hidden = true;
      settings.hidden = false;
    });

    banner.querySelector('#bbc-accept').addEventListener('click', function () {
      finish({ necessary: true, analytics: true }, true);
    });

    banner.querySelector('#bbc-reject').addEventListener('click', function () {
      finish({ necessary: true, analytics: false }, false);
    });

    banner.querySelector('#bbc-clear-all').addEventListener('click', function () {
      statsToggle.checked = false;
      syncSwitch();
    });

    banner.querySelector('#bbc-save').addEventListener('click', function () {
      var analytics = statsToggle.checked;
      finish({ necessary: true, analytics: analytics }, analytics);
    });
  }

  function init() {
    var consent = readConsent();
    if (consent) {
      applyConsent(consent);
      return;
    }
    build({ dismissable: false, openSettings: false });
  }

  // Erlaubt einen späteren erneuten Aufruf, z. B. über einen Footer-Link,
  // um die getroffene Wahl nachträglich zu ändern.
  window.bbcOpenSettings = function () {
    build({ dismissable: true, openSettings: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
