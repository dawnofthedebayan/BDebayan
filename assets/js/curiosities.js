/* ============================================================================
   curiosities.js — one file, two homes.

     1. the carousel on the home page          (.cur   in index.html)
     2. the full library                       (.curp  in curiosities.html)

   Both read S.curiosities.items and share a single detail renderer, so a
   concept looks and reads the same wherever you meet it. The library adds
   search, tag filters, sorting, a graph view and per-concept permalinks;
   all of that state lives in the URL, so a filtered view can be shared and
   the back button does what you expect.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S || !S.curiosities) return;

  var C     = S.curiosities;
  var ITEMS = (C.items || []).slice();
  if (!ITEMS.length) return;

  /* ------------------------------------------------------------- helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function cssEsc(v) { return String(v).replace(/"/g, '\\"'); }
  function f(n) { return Math.round(n * 10) / 10; }
  function byId(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }

  var STATUS = {
    settled: { label: 'settled' },
    chewing: { label: 'chewing' },
    hunch:   { label: 'a hunch' }
  };
  function statusOf(it) { return STATUS[it.status] || { label: it.status || '' }; }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function niceDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return iso || '';
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }
  function ageDays(iso) {
    var t = Date.parse(iso);
    return isNaN(t) ? 1e9 : (Date.now() - t) / 86400000;
  }

  /* "new" is only information if it distinguishes something. On the day the
     section ships every concept is new, and eight amber badges say nothing —
     so the badge is switched off whenever most of the collection qualifies. */
  var FRESH_DAYS = 45;
  var BADGE_FRESH = (function () {
    var n = ITEMS.filter(function (it) { return ageDays(it.added) < FRESH_DAYS; }).length;
    return n > 0 && n <= Math.max(2, Math.round(ITEMS.length * 0.35));
  })();
  function isFresh(it) { return BADGE_FRESH && ageDays(it.added) < FRESH_DAYS; }

  /* Plain text of a concept, for searching. Strips the HTML that lives in
     `body` and `why` so a search for "lawsuit" is not defeated by an <em>. */
  function haystack(it) {
    if (it.__hay) return it.__hay;
    var raw = [it.title, it.gist, it.body, it.why, it.source, (it.tags || []).join(' ')].join(' ');
    it.__hay = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    return it.__hay;
  }

  /* ---------------------------------------------- generated constellation
     A concept without a picture still needs a face. The node cluster is
     derived from the id, so it is stable across reloads, every concept gets
     a different one, and the cards stay tied to the graph the rest of the
     site is built out of. */
  function seeded(str) {
    var s = 0;
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  var constCache = {};
  function constellation(id) {
    if (constCache[id]) return constCache[id];
    var r = seeded(id), pts = [], i, j, out = '';
    for (i = 0; i < 16; i++) pts.push({ x: 8 + r() * 84, y: 8 + r() * 84, w: r() < 0.2 });
    for (i = 0; i < pts.length; i++) {
      for (j = i + 1; j < pts.length; j++) {
        var d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 29) out += '<line x1="' + f(pts[i].x) + '" y1="' + f(pts[i].y) +
                           '" x2="' + f(pts[j].x) + '" y2="' + f(pts[j].y) + '"/>';
      }
    }
    pts.forEach(function (p, k) {
      out += '<circle class="' + (p.w ? 'w' : '') + '" cx="' + f(p.x) + '" cy="' + f(p.y) +
             '" r="' + f(k % 4 === 0 ? 2 : 1.15) + '"/>';
    });
    constCache[id] = '<svg class="cur-const" viewBox="0 0 100 100" ' +
      'preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + out + '</svg>';
    return constCache[id];
  }

  /* The face of a card: an uploaded image if there is one, the generated
     constellation if there is not. A broken path falls back to the
     constellation rather than to a grey box. */
  function faceHTML(it, big) {
    if (!it.image) return constellation(it.id);
    var alt = big ? esc(it.imageAlt || it.title) : '';
    return '<img class="cur-img-bg" src="' + esc(it.image) + '" alt="" aria-hidden="true" ' +
             'loading="lazy" onerror="this.style.display=\'none\'">' +
           '<img class="cur-img-fg" src="' + esc(it.image) + '" alt="' + alt + '" ' +
             'loading="lazy" onerror="var p=this.closest(\'[data-fallback]\');' +
             'if(p)p.innerHTML=p.dataset.fallback">';
  }
  function faceAttrs(it) {
    return (it.image ? '' : ' data-plain') + ' data-fallback="' + esc(constellation(it.id)) + '"';
  }

  function tagChips(tags, live) {
    return (tags || []).map(function (t) {
      return live
        ? '<button class="cur-tag" type="button" data-cur-tag="' + esc(t) + '">' + esc(t) + '</button>'
        : '<span class="cur-tag is-static">' + esc(t) + '</span>';
    }).join('');
  }

  /* ------------------------------------------------------ detail renderer
     opts.live — tag chips are clickable filters (library only)
     opts.open — show the "open in the library" button (home page only) */
  function detailHTML(it, opts) {
    opts = opts || {};
    var st = statusOf(it);

    var kicker = [
      st.label ? '<span class="cur-st is-' + esc(it.status || 'other') + '">' + esc(st.label) + '</span>' : '',
      it.added ? '<span>added ' + esc(niceDate(it.added)) + '</span>' : ''
    ].filter(Boolean).join('<span class="sep" aria-hidden="true">·</span>');

    var links = (it.links || []).map(function (l) {
      return '<a class="btn" href="' + esc(l.href) + '" target="_blank" rel="noopener">' +
             esc(l.label) + ' <span class="arw" aria-hidden="true">&#8599;</span></a>';
    }).join('');

    if (opts.open) {
      links = '<a class="btn btn-primary" href="curiosities.html#' + esc(it.id) + '">' +
              'Open in the library <span class="arw" aria-hidden="true">&#8594;</span></a>' + links;
    }
    links += '<button class="btn cur-copy" type="button" data-cur-copy="' + esc(it.id) + '">' +
             'Copy link</button>';

    var rel = (it.related || []).map(function (rid) {
      var r = byId(rid);
      if (!r) return '';
      return '<button class="cur-rel" type="button" data-cur-goto="' + esc(rid) + '">' +
               '<span class="dot" aria-hidden="true"></span>' + esc(r.title) +
             '</button>';
    }).filter(Boolean).join('');

    return '' +
      '<button class="cur-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="cur-d-grid">' +
        '<div class="cur-d-face"' + faceAttrs(it) + '>' + faceHTML(it, true) + '</div>' +
        '<div class="cur-d-body">' +
          '<div class="cur-d-kicker">' + kicker + '</div>' +
          '<h3>' + esc(it.title) + '</h3>' +
          (it.gist ? '<p class="cur-d-gist">' + esc(it.gist) + '</p>' : '') +
          (it.tags && it.tags.length
            ? '<div class="cur-d-tags">' + tagChips(it.tags, opts.live) + '</div>' : '') +
          (it.body ? '<div class="cur-d-text">' + it.body + '</div>' : '') +
          (it.why
            ? '<div class="cur-why"><h4>Why it stuck with me</h4><p>' + it.why + '</p></div>' : '') +
          (it.source ? '<p class="cur-d-source">' + esc(it.source) + '</p>' : '') +
          (links ? '<div class="cur-d-links">' + links + '</div>' : '') +
          (rel ? '<div class="cur-d-rel"><h4>Connected to</h4><div>' + rel + '</div></div>' : '') +
        '</div>' +
      '</div>';
  }

  /* Copy-link works from either surface, so it is delegated once here. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cur-copy]');
    if (!b) return;
    var url = location.origin +
              location.pathname.replace(/[^/]*$/, '') + 'curiosities.html#' + b.dataset.curCopy;
    var done = function () {
      var was = b.textContent;
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = was; }, 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
    else {
      var ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      ta.remove();
    }
  });

  /* ======================================================================
     A. THE HOME CAROUSEL
     Same mechanics as the off-the-clock rail — horizontal scroll by drag,
     buttons or keyboard, expanding into one shared drawer underneath.
     ==================================================================== */
  (function carousel() {
    var root     = document.querySelector('.cur');
    var track    = document.querySelector('.cur-track');
    var drawer   = document.getElementById('cur-drawer');
    var drawerIn = drawer && drawer.querySelector('.cur-drawer-in');
    if (!root || !track || !drawer) return;

    var openId = null;
    var dragMoved = false;

    function cardHTML(it) {
      var st = statusOf(it);
      var fresh = isFresh(it);
      return '' +
      '<button class="cur-card" type="button" role="listitem" data-id="' + esc(it.id) + '" ' +
              'aria-expanded="false" aria-controls="cur-drawer">' +
        '<span class="cur-node" aria-hidden="true"></span>' +
        '<span class="cur-face"' + faceAttrs(it) + '>' + faceHTML(it) +
          (fresh ? '<span class="cur-fresh">new</span>' : '') +
          '<span class="cur-stub is-' + esc(it.status || 'other') + '">' + esc(st.label) + '</span>' +
        '</span>' +
        '<span class="cur-meta">' +
          '<strong class="cur-title">' + esc(it.title) + '</strong>' +
          '<span class="cur-gist">' + esc(it.gist || '') + '</span>' +
          '<span class="cur-tagline">' + (it.tags || []).slice(0, 3).map(function (t) {
            return '<span>' + esc(t) + '</span>';
          }).join('') + '</span>' +
        '</span>' +
      '</button>';
    }

    function render() {
      track.innerHTML = ITEMS.map(cardHTML).join('');
      track.querySelectorAll('.cur-card').forEach(function (c) {
        c.addEventListener('click', function () {
          if (dragMoved) return;            // ignore the click that ends a drag
          toggle(c.dataset.id);
        });
      });
      updateRail();
    }

    function toggle(id) {
      if (openId === id) return close();
      var it = byId(id);
      if (!it) return;

      openId = id;
      drawerIn.innerHTML = detailHTML(it, { open: true });
      drawer.classList.add('is-open');
      root.classList.add('is-focus');

      track.querySelectorAll('.cur-card').forEach(function (c) {
        var on = c.dataset.id === id;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-expanded', String(on));
      });

      drawerIn.querySelector('.cur-close').addEventListener('click', function () {
        close();
        var card = track.querySelector('.cur-card[data-id="' + cssEsc(id) + '"]');
        if (card) card.focus();
      });

      // a "connected to" chip swaps the drawer over to that concept
      drawerIn.querySelectorAll('[data-cur-goto]').forEach(function (b) {
        b.addEventListener('click', function () {
          openId = null;
          toggle(b.dataset.curGoto);
        });
      });

      movePointer();
      scrollCardIntoView(id);
      revealDrawer();
    }

    /* If the drawer opened below the fold, bring it up — but never yank the
       page when it is already comfortably in view. */
    function revealDrawer() {
      setTimeout(function () {
        var r = drawerIn.getBoundingClientRect(), vh = window.innerHeight;
        if (r.top > vh - 140) {
          window.scrollBy({ top: r.top - Math.max(120, vh * 0.34), behavior: 'smooth' });
        }
      }, 460);
    }

    function close() {
      openId = null;
      drawer.classList.remove('is-open');
      root.classList.remove('is-focus');
      track.querySelectorAll('.cur-card').forEach(function (c) {
        c.classList.remove('is-active');
        c.setAttribute('aria-expanded', 'false');
      });
      setTimeout(function () { if (!openId) drawerIn.innerHTML = ''; }, 500);
    }

    /* the little bar on the drawer's top edge points back at the open card */
    function movePointer() {
      if (!openId) return;
      var card = track.querySelector('.cur-card[data-id="' + cssEsc(openId) + '"]');
      if (!card || !drawerIn) return;
      var c = card.getBoundingClientRect(), d = drawerIn.getBoundingClientRect();
      var x = c.left + c.width / 2 - d.left - 23;
      drawerIn.style.setProperty('--pointer', Math.max(20, Math.min(d.width - 66, x)) + 'px');
    }

    function scrollCardIntoView(id) {
      var card = track.querySelector('.cur-card[data-id="' + cssEsc(id) + '"]');
      if (!card) return;
      var c = card.getBoundingClientRect(), t = track.getBoundingClientRect();
      if (c.left < t.left + 8 || c.right > t.right - 8) {
        track.scrollBy({ left: c.left - t.left - 24, behavior: 'smooth' });
      }
    }

    /* -------------------------------------------------------- rail + nav */
    var prev     = document.querySelector('[data-cur-prev]');
    var next     = document.querySelector('[data-cur-next]');
    var railFill = document.querySelector('.cur-rail span');
    var countEl  = document.querySelector('[data-cur-count]');
    var allEl    = document.querySelector('[data-cur-all-n]');
    if (allEl) allEl.textContent = String(ITEMS.length);

    function page() {
      var card = track.querySelector('.cur-card');
      var w = card ? card.getBoundingClientRect().width + 16 : 280;
      return Math.max(w, Math.floor(track.clientWidth / w) * w - w);
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -page(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: page(), behavior: 'smooth' }); });

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function updateRail() {
      var max = track.scrollWidth - track.clientWidth;
      var visible = track.clientWidth / Math.max(1, track.scrollWidth);
      if (railFill) {
        railFill.style.width = Math.max(12, Math.min(100, visible * 100)) + '%';
        var travel = track.clientWidth - track.clientWidth * Math.max(0.12, visible);
        railFill.style.transform = 'translateX(' + (max > 0 ? (track.scrollLeft / max) * travel : 0) + 'px)';
      }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
      if (countEl) {
        var card = track.querySelector('.cur-card');
        var w = card ? card.getBoundingClientRect().width + 16 : 280;
        var idx = Math.min(ITEMS.length, Math.round(track.scrollLeft / w) + 1);
        countEl.textContent = pad(idx) + ' / ' + pad(ITEMS.length);
      }
    }

    track.addEventListener('scroll', function () { updateRail(); movePointer(); }, { passive: true });
    window.addEventListener('resize', function () { updateRail(); movePointer(); });

    /* drag to scroll — pointer events, so mouse and pen behave the same */
    var down = false, startX = 0, startScroll = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;   // native touch scrolling is better
      down = true; dragMoved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { dragMoved = true; track.classList.add('is-dragging'); }
      if (dragMoved) track.scrollLeft = startScroll - dx;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      track.addEventListener(ev, function () {
        down = false;
        track.classList.remove('is-dragging');
        setTimeout(function () { dragMoved = false; }, 0);
      });
    });

    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var cards = Array.prototype.slice.call(track.querySelectorAll('.cur-card'));
      var i = cards.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = cards[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (n) { n.focus(); n.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openId) close();
    });

    render();
  })();

  /* ======================================================================
     B. THE LIBRARY  (curiosities.html)
     ==================================================================== */
  (function library() {
    var page = document.querySelector('.curp');
    if (!page) return;

    var gridEl   = page.querySelector('.curp-grid');
    var graphEl  = page.querySelector('.curp-graph');
    var searchEl = page.querySelector('[data-curp-search]');
    var tagsEl   = page.querySelector('[data-curp-tags]');
    var sortEl   = page.querySelector('[data-curp-sort]');
    var statusEl = page.querySelector('[data-curp-status]');
    var countEl  = page.querySelector('[data-curp-count]');
    var emptyEl  = page.querySelector('.curp-empty');
    var clearEl  = page.querySelector('[data-curp-clear]');
    var randomEl = page.querySelector('[data-curp-random]');
    var viewBtns = Array.prototype.slice.call(page.querySelectorAll('[data-curp-view]'));

    /* Edges are undirected: a one-way `related` still counts for both ends,
       so I never have to remember to write the reciprocal link. */
    var DEG = {}, EDGES = [];
    (function buildGraph() {
      var seen = {};
      ITEMS.forEach(function (it) { DEG[it.id] = 0; });
      ITEMS.forEach(function (it) {
        (it.related || []).forEach(function (rid) {
          if (!byId(rid)) return;
          var k = [it.id, rid].sort().join('|');
          if (seen[k]) return;
          seen[k] = 1;
          EDGES.push([it.id, rid]);
          DEG[it.id]++; DEG[rid]++;
        });
      });
    })();

    var TAGS = (function () {
      var m = {};
      ITEMS.forEach(function (it) {
        (it.tags || []).forEach(function (t) { m[t] = (m[t] || 0) + 1; });
      });
      return Object.keys(m).sort().map(function (t) { return { tag: t, n: m[t] }; });
    })();

    var state = { q: '', tags: [], status: '', sort: 'new', view: 'grid' };
    var shown = [];
    var openId = null;
    var lastFocus = null;

    /* ------------------------------------------------------- URL as state */
    function readURL() {
      var p = new URLSearchParams(location.search);
      state.q      = p.get('q') || '';
      state.tags   = (p.get('tag') || '').split(',').filter(Boolean);
      state.status = p.get('status') || '';
      state.sort   = p.get('sort') || 'new';
      state.view   = p.get('view') === 'graph' ? 'graph' : 'grid';
    }
    function writeURL(push) {
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.tags.length) p.set('tag', state.tags.join(','));
      if (state.status) p.set('status', state.status);
      if (state.sort !== 'new') p.set('sort', state.sort);
      if (state.view !== 'grid') p.set('view', state.view);
      var qs = p.toString();
      var url = location.pathname + (qs ? '?' + qs : '') + (openId ? '#' + openId : '');
      if (push) history.pushState({ cur: openId }, '', url);
      else history.replaceState({ cur: openId }, '', url);
    }

    /* ---------------------------------------------------------- filtering */
    var SORTS = {
      new:   function (a, b) { return String(b.added || '').localeCompare(String(a.added || '')); },
      old:   function (a, b) { return String(a.added || '').localeCompare(String(b.added || '')); },
      az:    function (a, b) { return a.title.localeCompare(b.title); },
      wired: function (a, b) { return (DEG[b.id] || 0) - (DEG[a.id] || 0) || a.title.localeCompare(b.title); }
    };

    function filtered() {
      var q = state.q.trim().toLowerCase();
      var terms = q ? q.split(/\s+/) : [];
      var out = ITEMS.filter(function (it) {
        if (state.status && it.status !== state.status) return false;
        if (state.tags.length) {
          var t = it.tags || [];
          for (var i = 0; i < state.tags.length; i++) {
            if (t.indexOf(state.tags[i]) < 0) return false;      // AND across tags
          }
        }
        if (!terms.length) return true;
        var hay = haystack(it);
        return terms.every(function (w) { return hay.indexOf(w) > -1; });
      });
      return out.sort(SORTS[state.sort] || SORTS.new);
    }

    /* Highlights every run of a search term inside a plain string. */
    function mark(text, terms) {
      var s = esc(text);
      if (!terms.length) return s;
      terms.forEach(function (w) {
        var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        s = s.replace(re, '<mark>$1</mark>');
      });
      return s;
    }

    /* --------------------------------------------------------- grid render */
    function gridCard(it, terms) {
      var st = statusOf(it);
      var fresh = isFresh(it);
      var deg = DEG[it.id] || 0;
      return '' +
      '<article class="curp-card" data-id="' + esc(it.id) + '" tabindex="0" role="button" ' +
               'aria-label="Open ' + esc(it.title) + '">' +
        '<span class="cur-node" aria-hidden="true"></span>' +
        '<div class="curp-face"' + faceAttrs(it) + '>' + faceHTML(it) +
          (fresh ? '<span class="cur-fresh">new</span>' : '') +
        '</div>' +
        '<div class="curp-body">' +
          '<div class="curp-kick">' +
            '<span class="cur-stub is-' + esc(it.status || 'other') + '">' + esc(st.label) + '</span>' +
            (deg ? '<span class="curp-deg" title="' + deg + ' connections">' +
                   '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.4"/>' +
                   '<circle cx="18" cy="12" r="2.4"/><circle cx="7" cy="18" r="2.4"/>' +
                   '<path d="M6 6l12 6M18 12L7 18"/></svg>' + deg + '</span>' : '') +
          '</div>' +
          '<h3>' + mark(it.title, terms) + '</h3>' +
          '<p>' + mark(it.gist || '', terms) + '</p>' +
          '<div class="curp-tags">' + (it.tags || []).map(function (t) {
            return '<span class="cur-tag is-static' + (state.tags.indexOf(t) > -1 ? ' is-on' : '') + '">' +
                   esc(t) + '</span>';
          }).join('') + '</div>' +
        '</div>' +
      '</article>';
    }

    function renderGrid() {
      var terms = state.q.trim().toLowerCase().split(/\s+/)
        .filter(function (w) { return w.length > 1; });
      gridEl.innerHTML = shown.map(function (it) { return gridCard(it, terms); }).join('');
      gridEl.querySelectorAll('.curp-card').forEach(function (c) {
        c.addEventListener('click', function () { open(c.dataset.id, true); });
        c.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.dataset.id, true); }
        });
      });
    }

    /* -------------------------------------------------------- graph render
       A small spring layout, run to convergence once and then cached. With a
       few dozen nodes that is a handful of milliseconds, and doing it in one
       shot means no animation loop idling behind the page. */
    var LAYOUT = null;
    function layout() {
      if (LAYOUT) return LAYOUT;
      var n = ITEMS.length, pos = {}, i, j;
      var r = seeded('curiosities-layout');
      ITEMS.forEach(function (it, k) {
        var a = (k / n) * Math.PI * 2;
        pos[it.id] = { x: Math.cos(a) * 300 + (r() - 0.5) * 40,
                       y: Math.sin(a) * 300 + (r() - 0.5) * 40 };
      });

      var ids = ITEMS.map(function (it) { return it.id; });
      var K = 150;
      for (var step = 0; step < 320; step++) {
        var t = 22 * (1 - step / 320);                 // cooling schedule
        var disp = {};
        ids.forEach(function (id) { disp[id] = { x: 0, y: 0 }; });

        for (i = 0; i < ids.length; i++) {
          for (j = i + 1; j < ids.length; j++) {
            var a = pos[ids[i]], b = pos[ids[j]];
            var dx = a.x - b.x, dy = a.y - b.y;
            var d = Math.max(1, Math.hypot(dx, dy));
            var rep = (K * K) / d;
            disp[ids[i]].x += (dx / d) * rep; disp[ids[i]].y += (dy / d) * rep;
            disp[ids[j]].x -= (dx / d) * rep; disp[ids[j]].y -= (dy / d) * rep;
          }
        }
        EDGES.forEach(function (e) {
          var pa = pos[e[0]], pb = pos[e[1]];
          var ex = pa.x - pb.x, ey = pa.y - pb.y;
          var ed = Math.max(1, Math.hypot(ex, ey));
          var att = (ed * ed) / K;
          disp[e[0]].x -= (ex / ed) * att; disp[e[0]].y -= (ey / ed) * att;
          disp[e[1]].x += (ex / ed) * att; disp[e[1]].y += (ey / ed) * att;
        });
        ids.forEach(function (id) {
          var dd = disp[id], m = Math.max(1, Math.hypot(dd.x, dd.y));
          pos[id].x += (dd.x / m) * Math.min(m, t);
          pos[id].y += (dd.y / m) * Math.min(m, t);
          pos[id].x *= 0.995; pos[id].y *= 0.995;   // gentle pull to the middle
        });
      }

      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      ids.forEach(function (id) {
        minX = Math.min(minX, pos[id].x); maxX = Math.max(maxX, pos[id].x);
        minY = Math.min(minY, pos[id].y); maxY = Math.max(maxY, pos[id].y);
      });
      var pad = 90;
      LAYOUT = {
        pos: pos,
        box: [minX - pad, minY - pad, (maxX - minX) + pad * 2, (maxY - minY) + pad * 2]
      };
      return LAYOUT;
    }

    function renderGraph() {
      var L = layout();
      var live = {};
      shown.forEach(function (it) { live[it.id] = 1; });

      var lines = EDGES.map(function (p) {
        var a = L.pos[p[0]], b = L.pos[p[1]];
        var on = live[p[0]] && live[p[1]];
        return '<line class="' + (on ? 'is-live' : '') + '" data-pair="' + esc(p.join('|')) + '" ' +
               'x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>';
      }).join('');

      var nodes = ITEMS.map(function (it) {
        var p = L.pos[it.id];
        var rad = 7 + Math.min(9, (DEG[it.id] || 0) * 1.8);
        return '<g class="curp-n' + (live[it.id] ? ' is-live' : ' is-dim') + '" ' +
                  'data-id="' + esc(it.id) + '" tabindex="0" role="button" ' +
                  'transform="translate(' + f(p.x) + ',' + f(p.y) + ')">' +
                 '<title>' + esc(it.title) + '</title>' +
                 '<circle class="halo" r="' + f(rad + 13) + '"/>' +
                 '<circle class="core" r="' + f(rad) + '"/>' +
                 '<text y="' + f(rad + 21) + '">' + esc(it.title) + '</text>' +
               '</g>';
      }).join('');

      graphEl.innerHTML =
        '<svg viewBox="' + L.box.map(f).join(' ') + '" role="img" ' +
             'aria-label="Concept graph: ' + ITEMS.length + ' concepts and their connections">' +
          '<g class="curp-edges">' + lines + '</g>' +
          '<g class="curp-nodes">' + nodes + '</g>' +
        '</svg>';

      graphEl.querySelectorAll('.curp-n').forEach(function (g) {
        var id = g.dataset.id;
        g.addEventListener('click', function () { open(id, true); });
        g.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(id, true); }
        });
        g.addEventListener('pointerenter', function () { light(id); });
        g.addEventListener('pointerleave', function () { light(null); });
        g.addEventListener('focus', function () { light(id); });
        g.addEventListener('blur', function () { light(null); });
      });
    }

    function light(id) {
      if (!graphEl.firstChild) return;
      var near = {};
      if (id) {
        near[id] = 1;
        EDGES.forEach(function (p) {
          if (p[0] === id) near[p[1]] = 1;
          if (p[1] === id) near[p[0]] = 1;
        });
      }
      graphEl.classList.toggle('is-hover', !!id);
      graphEl.querySelectorAll('.curp-n').forEach(function (g) {
        g.classList.toggle('is-near', !!near[g.dataset.id]);
      });
      graphEl.querySelectorAll('.curp-edges line').forEach(function (l) {
        var pair = (l.dataset.pair || '').split('|');
        l.classList.toggle('is-lit', !!id && pair.indexOf(id) > -1);
      });
    }

    /* ---------------------------------------------------------- the modal */
    var modal   = page.querySelector('.curp-modal');
    var modalIn = modal && modal.querySelector('.curp-modal-in');

    function navHTML(id) {
      var i = shown.map(function (x) { return x.id; }).indexOf(id);
      if (i < 0) return '';
      var p = shown[i - 1], n = shown[i + 1];
      return '<div class="curp-walk">' +
        (p ? '<button type="button" class="prev" data-cur-goto="' + esc(p.id) + '">' +
             '&#8592; <span>' + esc(p.title) + '</span></button>' : '<span></span>') +
        '<span class="pos">' + (i + 1) + ' / ' + shown.length + '</span>' +
        (n ? '<button type="button" class="next" data-cur-goto="' + esc(n.id) + '">' +
             '<span>' + esc(n.title) + '</span> &#8594;</button>' : '<span></span>') +
      '</div>';
    }

    function open(id, push) {
      var it = byId(id);
      if (!it || !modal) return;
      if (!openId) lastFocus = document.activeElement;
      openId = id;
      modalIn.innerHTML = detailHTML(it, { live: true }) + navHTML(id);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cur-locked');
      modalIn.parentNode.scrollTop = 0;
      wireModal();
      writeURL(push);
      var c = modalIn.querySelector('.cur-close');
      if (c) c.focus();
    }

    function wireModal() {
      modalIn.querySelector('.cur-close').addEventListener('click', function () { close(true); });
      modalIn.querySelectorAll('[data-cur-goto]').forEach(function (b) {
        b.addEventListener('click', function () { open(b.dataset.curGoto, true); });
      });
      modalIn.querySelectorAll('[data-cur-tag]').forEach(function (b) {
        b.addEventListener('click', function () {
          var t = b.dataset.curTag;
          state.tags = state.tags.indexOf(t) > -1
            ? state.tags.filter(function (x) { return x !== t; })
            : state.tags.concat([t]);
          close(false);
          apply(true);
        });
      });
    }

    function close(push) {
      if (!openId) return;
      openId = null;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('cur-locked');
      setTimeout(function () { if (!openId) modalIn.innerHTML = ''; }, 320);
      writeURL(push);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.classList.contains('curp-scrim')) close(true);
      });
      /* keep tabbing inside the dialog while it is open */
      modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || !openId) return;
        var f = modal.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }

    /* --------------------------------------------------------- the toolbar */
    function renderTags() {
      if (!tagsEl) return;
      tagsEl.innerHTML = TAGS.map(function (t) {
        var on = state.tags.indexOf(t.tag) > -1;
        return '<button class="cur-tag' + (on ? ' is-on' : '') + '" type="button" ' +
               'aria-pressed="' + on + '" data-tag="' + esc(t.tag) + '">' +
               esc(t.tag) + '<span class="n">' + t.n + '</span></button>';
      }).join('');
      tagsEl.querySelectorAll('[data-tag]').forEach(function (b) {
        b.addEventListener('click', function () {
          var t = b.dataset.tag;
          state.tags = state.tags.indexOf(t) > -1
            ? state.tags.filter(function (x) { return x !== t; })
            : state.tags.concat([t]);
          apply(true);
        });
      });
    }

    function apply(push) {
      shown = filtered();

      if (countEl) {
        countEl.textContent = shown.length === ITEMS.length
          ? ITEMS.length + ' concepts'
          : shown.length + ' of ' + ITEMS.length;
      }
      if (emptyEl) emptyEl.hidden = shown.length > 0;
      if (clearEl) clearEl.hidden = !(state.q || state.tags.length || state.status);

      page.classList.toggle('is-graph', state.view === 'graph');
      viewBtns.forEach(function (b) {
        var on = b.dataset.curpView === state.view;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });

      renderTags();
      if (state.view === 'graph') renderGraph(); else renderGrid();

      if (sortEl && sortEl.value !== state.sort) sortEl.value = state.sort;
      if (statusEl && statusEl.value !== state.status) statusEl.value = state.status;
      if (searchEl && searchEl.value !== state.q) searchEl.value = state.q;
      writeURL(push);
    }

    if (searchEl) {
      var deb;
      searchEl.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () { state.q = searchEl.value; apply(false); }, 120);
      });
      searchEl.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { searchEl.value = ''; state.q = ''; apply(false); }
      });
    }
    if (sortEl)   sortEl.addEventListener('change', function () { state.sort = sortEl.value; apply(true); });
    if (statusEl) statusEl.addEventListener('change', function () { state.status = statusEl.value; apply(true); });
    viewBtns.forEach(function (b) {
      b.addEventListener('click', function () { state.view = b.dataset.curpView; apply(true); });
    });
    if (clearEl) clearEl.addEventListener('click', function () {
      state.q = ''; state.tags = []; state.status = '';
      apply(true);
      if (searchEl) searchEl.focus();
    });
    if (randomEl) randomEl.addEventListener('click', function () {
      var pool = shown.length ? shown : ITEMS;
      open(pool[Math.floor(Math.random() * pool.length)].id, true);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openId) { close(true); return; }
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === '/' && searchEl) { e.preventDefault(); searchEl.focus(); searchEl.select(); }
      if (openId && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        var i = shown.map(function (x) { return x.id; }).indexOf(openId);
        var n = shown[i + (e.key === 'ArrowRight' ? 1 : -1)];
        if (n) { e.preventDefault(); open(n.id, true); }
      }
    });

    /* back / forward moves between filtered views and open concepts */
    window.addEventListener('popstate', function () {
      readURL();
      shown = filtered();
      var want = location.hash.slice(1);
      if (want && byId(want)) {
        if (want !== openId) { openId = null; open(want, false); }
      } else if (openId) {
        openId = null;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('cur-locked');
        modalIn.innerHTML = '';
      }
      apply(false);
    });

    /* -------------------------------------------------------------- start */
    readURL();
    // Read the fragment before apply() runs: writeURL() rebuilds the whole URL
    // from `state` and nothing is open yet, so it would drop the hash first.
    var deep = location.hash.slice(1);
    apply(false);
    if (deep && byId(deep)) open(deep, false);
  })();
})();
