/* ============================================================================
   app.js — renders every section from content.js, wires the project graph
   edges, the expand-in-place detail panels, scroll-spy nav and reveals.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S) return;

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* =============================================================== THEME
     The initial value is already on <html> (set by the inline script in the
     head, before first paint). This only handles switching and persistence.
     Other modules listen for the `themechange` event.
     -------------------------------------------------------------------- */
  var THEME_COLOR = { dark: '#0A0C16', light: '#F4F6FC' };

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function setTheme(next, remember) {
    document.documentElement.setAttribute('data-theme', next);
    var meta = document.querySelector('[data-theme-color]');
    if (meta) meta.setAttribute('content', THEME_COLOR[next]);

    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label',
        next === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    });

    // architecture diagrams ship in two variants; swap to the matching one
    document.querySelectorAll('.diagram img[data-src-base]').forEach(function (img) {
      img.src = diagramSrc(img.dataset.srcBase, next);
    });

    if (remember) { try { localStorage.setItem('theme', next); } catch (e) {} }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  }

  function diagramSrc(base, theme) {
    return theme === 'light' ? base.replace(/\.svg$/, '-light.svg') : base;
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
    });
  });

  // follow the OS only while the visitor has not made an explicit choice
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onOS = function (e) {
      var saved; try { saved = localStorage.getItem('theme'); } catch (err) {}
      if (saved !== 'light' && saved !== 'dark') setTheme(e.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onOS);
    else if (mq.addListener) mq.addListener(onOS);
  }

  setTheme(currentTheme(), false);

  /* ====================================================== BIND + SECTIONS */
  // data-bind takes a dotted path into SITE, so any string in content.js can
  // be surfaced in the markup without another line of glue.
  function get(path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, S);
  }

  document.querySelectorAll('[data-bind]').forEach(function (el) {
    var v = get(el.getAttribute('data-bind'));
    if (v == null || v === '') { el.textContent = ''; return; }
    el.innerHTML = String(v);
  });

  document.querySelectorAll('[data-href]').forEach(function (a) {
    var key = a.getAttribute('data-href');
    var v = key === 'email' ? 'mailto:' + S.identity.email : S.identity[key];
    if (v) a.href = v; else a.remove();
  });

  var facts = document.querySelector('[data-hero-facts]');
  if (facts && S.hero && S.hero.facts) {
    facts.innerHTML = S.hero.facts.map(function (t) { return '<span>' + t + '</span>'; }).join('');
  }

  /* Sections are data: order, visibility, headings and nav labels all come
     from S.sections. Anything not listed there is removed from the page. */
  var main = document.querySelector('main.page');
  var SECTIONS = (S.sections || []).slice();

  function fillSection(el, sec) {
    var q = function (sel) { return el.querySelector(sel); };
    if (q('[data-sec-label]')) q('[data-sec-label]').innerHTML = sec.label || '';
    if (q('[data-sec-title]')) q('[data-sec-title]').innerHTML = sec.title || '';
    var intro = q('[data-sec-intro]');
    if (intro) {
      intro.innerHTML = sec.intro || '';
      intro.style.display = sec.intro ? '' : 'none';
    }
  }

  function customSection(sec) {
    var el = document.createElement('section');
    el.className = 'section';
    el.id = sec.id;
    el.setAttribute('data-section', sec.id);
    el.innerHTML =
      '<div class="wrap">' +
        '<div class="section-head rv">' +
          '<div class="section-label" data-sec-label></div>' +
          '<h2 data-sec-title></h2>' +
          '<p data-sec-intro></p>' +
        '</div>' +
        '<div class="cs-blocks"></div>' +
      '</div>';
    var wrap = el.querySelector('.cs-blocks');
    var blocks = sec.blocks || [];
    if (!blocks.length) { wrap.remove(); return el; }
    wrap.innerHTML = blocks.map(function (b) {
      var inner =
        (b.meta ? '<div class="date">' + esc(b.meta) + '</div>' : '') +
        (b.title ? '<h3>' + esc(b.title) + '</h3>' : '') +
        (b.text ? '<p class="note">' + b.text + '</p>' : '') +
        (b.href ? '<span class="go">' + esc(b.linkLabel || 'Open') +
                  ' <span class="arw" aria-hidden="true">↗</span></span>' : '');
      return b.href
        ? '<a class="post rv" href="' + esc(b.href) + '" target="_blank" rel="noopener">' + inner + '</a>'
        : '<div class="post rv is-static">' + inner + '</div>';
    }).join('');
    return el;
  }

  function applySections() {
    var nav = document.querySelector('[data-nav]');
    var toggle = nav && nav.querySelector('.theme-toggle');
    if (nav) nav.innerHTML = '';

    var live = {};
    SECTIONS.forEach(function (sec) {
      var el = main.querySelector('[data-section="' + sec.id + '"]');
      if (!el && sec.type === 'custom') el = customSection(sec);
      if (!el) return;
      if (sec.enabled === false) { el.remove(); return; }

      main.appendChild(el);            // appending in config order = reordering
      fillSection(el, sec);
      live[sec.id] = true;

      if (nav && sec.inNav !== false) {
        nav.insertAdjacentHTML('beforeend',
          '<a href="#' + esc(sec.id) + '">' +
            '<span class="lbl-full">' + esc(sec.nav || sec.label) + '</span>' +
            '<span class="lbl-short">' + esc(sec.navShort || sec.nav || sec.label) + '</span>' +
          '</a>');
      }
    });

    // drop anything the config no longer mentions
    main.querySelectorAll('[data-section]').forEach(function (el) {
      if (!live[el.dataset.section]) el.remove();
    });

    if (nav && toggle) nav.appendChild(toggle);

    var skip = document.querySelector('.skip');
    var first = SECTIONS.filter(function (x) { return x.enabled !== false; })[0];
    if (skip && first && live[first.id]) {
      skip.href = '#' + first.id;
      skip.textContent = 'Skip to ' + (first.nav || first.label);
    }
  }

  if (main) applySections();

  /* Projects, writing, curiosities and off-the-clock all render through
     shelf.js + collections.js now — one rail on the home page, one page each
     for the whole collection. They used to be three different things built
     three different ways (a node graph, a card grid, a list); none of that
     code lives here any more. */

  /* ================================================== NAV SCROLL-SPY etc. */
  var nav = document.querySelector('.nav');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  /* On a subpage these hrefs are "index.html#writing" — not a valid selector,
     and not a section on this page either. Resolve only same-page fragments,
     and keep links and sections index-aligned by filtering them together. */
  var sections = [];
  links = links.filter(function (a) {
    var href = a.getAttribute('href') || '';
    var i = href.indexOf('#');
    var el = i === 0 && href.length > 1 ? document.querySelector(href) : null;
    if (el) sections.push(el);
    return !!el;
  });

  window.addEventListener('scroll', function () {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
    var y = window.scrollY + window.innerHeight * 0.32;
    var active = -1;
    sections.forEach(function (s, i) { if (s.offsetTop <= y) active = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
  }, { passive: true });

  /* ============================================================== REVEAL */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    document.querySelectorAll('.rv').forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i, 5) * 55) + 'ms';
      io.observe(el);
    });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* year */
  var y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
