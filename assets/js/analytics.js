/* ============================================================================
   analytics.js — GoatCounter, wired for a one-page site.

   Does nothing at all unless `analytics.goatcounter` is set in content.js: no
   script tag is injected, no request is made, nothing is loaded. Leave it
   blank and this file is inert.

   Why events at all: a single-page portfolio gets exactly one pageview per
   visit, which tells you almost nothing. What is actually worth knowing is
   how far down people get, which project they open, and whether they click
   through to the Substack. Those are recorded as GoatCounter events — names
   only, no identifiers, no personal data, no cookies.

   Do Not Track is honoured before anything loads.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = (window.SITE && window.SITE.analytics) || {};
  var CODE = (CFG.goatcounter || '').trim();
  if (!CODE) return;

  // Respect DNT ourselves rather than relying on the vendor to do it.
  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  var endpoint = /^https?:\/\//.test(CODE)
    ? CODE
    : 'https://' + CODE + '.goatcounter.com/count';

  window.goatcounter = { path: location.pathname || '/' };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', endpoint);
  document.head.appendChild(s);

  /* Queue events until count.js has loaded, then flush. */
  var ready = false, queue = [];
  s.addEventListener('load', function () {
    ready = true;
    queue.splice(0).forEach(send);
  });

  var seen = Object.create(null);
  function send(name) {
    if (!window.goatcounter || !window.goatcounter.count) return;
    window.goatcounter.count({ path: name, title: name, event: true });
  }
  function track(name, once) {
    if (once !== false) {
      if (seen[name]) return;                 // one per page load
      seen[name] = 1;
    }
    if (ready) send(name); else queue.push(name);
  }

  /* ---- how far down the page people actually get ---------------------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        track('section-' + e.target.dataset.section);
        io.unobserve(e.target);
      });
      // Threshold-by-area does not work here: the projects section is taller
      // than the viewport, so 50% of it is never visible at once and the
      // event would never fire. Count a section as reached when any part of
      // it enters the middle band of the screen instead.
    }, { rootMargin: "-30% 0px -30% 0px", threshold: 0 });
    document.querySelectorAll('[data-section]').forEach(function (el) { io.observe(el); });
  }

  /* ---- what they open, and where they leave to ------------------------ */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    /* Every section is a shelf now, so one rule covers all four — the card
       that was opened, tagged with the collection it belongs to. */
    var card = t.closest('.shelf-card, .lib-card');
    if (card) {
      var holder = card.closest('[data-collection]');
      track((holder ? holder.dataset.collection : 'item') + '-' + (card.dataset.id || '?'));
    }

    if (t.closest('[data-theme-toggle]')) {
      // read after the toggle has run
      setTimeout(function () {
        track('theme-' + (document.documentElement.dataset.theme || '?'), false);
      }, 0);
    }

    var a = t.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (/^mailto:/i.test(href)) { track('out-email'); return; }
      if (/^https?:\/\//i.test(href)) {
        try {
          var host = new URL(href).hostname.replace(/^www\./, '');
          if (host !== location.hostname) track('out-' + host, false);
        } catch (err) {}
      }
    }
  }, true);

  /* ---- did anyone notice the background is alive? --------------------- */
  window.addEventListener('life:seed', function () { track('life-seed'); });
})();
