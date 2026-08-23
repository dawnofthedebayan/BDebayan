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

  /* ============================================================ PROJECTS */
  var cardsEl = document.querySelector('.pcards');
  var edgesEl = document.querySelector('.pedges');
  var graphEl = document.querySelector('.pgraph');

  if (cardsEl) {
    S.projects.forEach(function (p) {
      cardsEl.insertAdjacentHTML('beforeend', card(p));
    });
    wireCards();
    layoutEdges();
    window.addEventListener('resize', debounce(layoutEdges, 140));
    if ('ResizeObserver' in window) new ResizeObserver(debounce(layoutEdges, 60)).observe(cardsEl);
  }

  function card(p) {
    var stack = (p.stack || []).map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('');
    var cta = (p.cta || []).map(function (c) {
      return '<a class="btn" href="' + esc(c.href) + '" target="_blank" rel="noopener">' +
             esc(c.label) + ' <span class="arw" aria-hidden="true">↗</span></a>';
    }).join('');
    var built = (p.built || []).map(function (b) { return '<li>' + b + '</li>'; }).join('');
    var diagram = p.diagram
      ? '<figure class="diagram"><img src="' + esc(diagramSrc(p.diagram, currentTheme())) +
        '" data-src-base="' + esc(p.diagram) + '" alt="' + esc(p.name) +
        ' architecture diagram" loading="lazy"><figcaption>' + esc(p.name) +
        ' — memory tiers and the local inference path</figcaption></figure>'
      : '';

    return '' +
    '<article class="pcard rv" data-id="' + esc(p.id) + '" data-tier="' + esc(p.tier) + '">' +
      '<div class="pcard-top">' +
        '<div>' +
          '<div class="pcard-kicker">' + esc(p.kicker) + '</div>' +
          '<h3>' + esc(p.name) + '</h3>' +
        '</div>' +
        '<span class="chip ' + esc(p.statusKind || '') + '">' + esc(p.status) + '</span>' +
      '</div>' +
      '<p class="pcard-pitch">' + esc(p.pitch) + '</p>' +
      '<div class="stack">' + stack + '</div>' +
      '<button class="expand" aria-expanded="false" aria-controls="d-' + esc(p.id) + '">' +
        '<span class="ico" aria-hidden="true">+</span><span class="lbl">Open node</span>' +
      '</button>' +
      '<div class="pdetail" id="d-' + esc(p.id) + '"><div><div class="pdetail-in">' +
        '<div class="pdetail-cols">' +
          '<div class="dblock"><h4>The problem</h4><p>' + esc(p.problem) + '</p></div>' +
          '<div class="dblock"><h4>What was built</h4><ul>' + built + '</ul></div>' +
        '</div>' +
        '<div class="dblock" style="margin-top:26px"><h4>Status / what is next</h4>' +
          '<p class="next-note">' + esc(p.next) + '</p></div>' +
        (cta ? '<div class="dlinks">' + cta + '</div>' : '') +
        diagram +
      '</div></div></div>' +
    '</article>';
  }

  function wireCards() {
    cardsEl.querySelectorAll('.pcard').forEach(function (c) {
      var btn = c.querySelector('.expand');
      btn.addEventListener('click', function () {
        var open = c.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.querySelector('.lbl').textContent = open ? 'Collapse' : 'Open node';
        graphEl.classList.toggle('is-focus', !!cardsEl.querySelector('.pcard.is-open'));
        lightEdges();
        setTimeout(layoutEdges, 460);
        if (!open) {
          var top = c.getBoundingClientRect().top;
          if (top < 70) window.scrollTo({ top: window.scrollY + top - 100, behavior: 'smooth' });
        }
      });

      // hovering a node lights the edges it participates in
      c.addEventListener('pointerenter', function () { lightEdges(c.dataset.id); });
      c.addEventListener('pointerleave', function () { lightEdges(); });
    });
  }

  function lightEdges(id) {
    if (!edgesEl) return;
    var openCard = cardsEl.querySelector('.pcard.is-open');
    var key = id || (openCard && openCard.dataset.id);
    edgesEl.querySelectorAll('path').forEach(function (p) {
      var pair = (p.dataset.pair || '').split('|');
      p.classList.toggle('is-lit', !!key && pair.indexOf(key) > -1);
    });
  }

  /* Draw the backlinks between project nodes. Anchor is the little dot on
     each card (top-left), so the curves attach where the eye expects. */
  function layoutEdges() {
    if (!edgesEl || !cardsEl) return;
    if (window.innerWidth <= 940) { edgesEl.innerHTML = ''; return; }

    var box = cardsEl.getBoundingClientRect();
    edgesEl.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    edgesEl.setAttribute('width', box.width);
    edgesEl.setAttribute('height', box.height);

    var pos = {};
    cardsEl.querySelectorAll('.pcard').forEach(function (c) {
      var r = c.getBoundingClientRect();
      pos[c.dataset.id] = { x: r.left - box.left + 35, y: r.top - box.top };
    });

    var seen = {}, out = '';
    S.projects.forEach(function (p) {
      (p.links || []).forEach(function (to) {
        var k = [p.id, to].sort().join('|');
        if (seen[k] || !pos[p.id] || !pos[to]) return;
        seen[k] = 1;
        var a = pos[p.id], b = pos[to];
        var dy = b.y - a.y;
        var dir = dy === 0 ? 1 : (dy > 0 ? 1 : -1);
        // Control points must lean *toward* the other node, otherwise a curve
        // running upward overshoots past the top of the section.
        var off = Math.min(170, Math.max(48, Math.abs(dy) * 0.4));
        var d;
        if (Math.abs(dy) < 40) {
          // near-horizontal pair: bow it downward so it reads as an edge
          var mid = (a.x + b.x) / 2, sag = Math.min(90, Math.abs(b.x - a.x) * 0.22 + 30);
          d = 'M' + a.x + ',' + a.y + ' Q' + mid + ',' + (a.y + sag) + ' ' + b.x + ',' + b.y;
        } else {
          d = 'M' + a.x + ',' + a.y +
              ' C' + a.x + ',' + (a.y + dir * off) + ' ' +
                     b.x + ',' + (b.y - dir * off) + ' ' + b.x + ',' + b.y;
        }
        out += '<path data-pair="' + k + '" d="' + d + '"/>';
      });
    });
    edgesEl.innerHTML = out;
    lightEdges();
  }

  /* ============================================================ NOTEBOOK */
  var nb = document.querySelector('.nb-list');
  if (nb && S.notebook) {
    nb.innerHTML = S.notebook.map(function (n) {
      var note = n.href
        ? esc(n.note) + ' <a href="' + esc(n.href) + '" target="_blank" rel="noopener">→</a>'
        : esc(n.note);
      return '<div class="nb-item"><b>' + esc(n.name) + '</b><span>' + note + '</span></div>';
    }).join('');
  }

  /* ============================================================= WRITING */
  var postsEl = document.querySelector('.posts');
  var seriesEl = document.querySelector('.series ol');
  if (postsEl && S.writing) {
    postsEl.innerHTML = S.writing.posts.filter(function (p) { return p.flagship; })
      .map(function (p) {
        return '<a class="post rv" href="' + esc(p.href) + '" target="_blank" rel="noopener">' +
          '<div class="date">' + esc(p.date) + '</div>' +
          '<h3>' + esc(p.title) + '</h3>' +
          (p.sub ? '<p class="sub">' + esc(p.sub) + '</p>' : '') +
          '<p class="note">' + esc(p.note || '') + '</p>' +
          '<span class="go">Read on Substack <span class="arw" aria-hidden="true">↗</span></span>' +
        '</a>';
      }).join('');

    if (seriesEl) {
      var rest = S.writing.posts.filter(function (p) { return !p.flagship; });
      seriesEl.innerHTML = rest.map(function (p, i) {
        return '<li><a href="' + esc(p.href) + '" target="_blank" rel="noopener">' +
          '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="t">' + esc(p.title) + '</span>' +
          '<span class="d">' + esc(p.date) + '</span></a></li>';
      }).join('');
    }
  }

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
