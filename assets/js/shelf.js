/* ============================================================================
   shelf.js — one collection, two surfaces.

   Every section of this site is the same idea: a set of things worth looking
   through. So they all get the same two surfaces, and this file is both of
   them:

     1. the rail on the home page   (.shelf  — cards that expand into a
                                     drawer underneath, drag/buttons/keys)
     2. the full collection page    (.lib    — search, facet chips, sorting,
                                     a grid or a graph, and a detail modal
                                     whose state lives in the URL)

   What differs between projects, writing, curiosities and off-the-clock is
   only what goes *inside* a card and what counts as a connection between
   two items. That part is supplied by collections.js as a config object;
   everything here is mechanics and is deliberately content-blind.

   The config a collection passes to Shelf.mount():

     key         string    matches data-collection="…" in the markup
     page        string    the collection's own page, for permalinks
     noun        {one,many} for counts — "7 concepts", "1 of 4"
     items       array     every item needs a stable, unique .id
     titleOf     (it)      -> string
     gistOf      (it)      -> string          one line under the title
     face        (it,big)  -> html            art inside the card face
     faceAttrs   (it)      -> attr string     fallback art, data-plain
     stubOf      (it)      -> {label,kind}|null  small pill on the face
     chipsOf     (it)      -> [string]        the facets you can filter by
     chipsLabel  string    what those facets are called, for the aria-label
     relatedOf   (it)      -> [id]            edges, both ways, deduped
     haystack    (it)      -> lowercase string searched by the search box
     detail      (it,opts) -> html            drawer and modal body
     sorts       [{value,label,cmp}]          first one is the default
     statuses    [{value,label}]              '' entry = "any"; omit to hide
     statusOf    (it)      -> string
     freshOf     (it)      -> bool            shows the "new" flash

   Several collections live on the home page at once, so every lookup here
   is scoped to that collection's own root element. Nothing reaches for a
   class name globally.
   ========================================================================== */
window.Shelf = (function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function cssEsc(v) { return String(v).replace(/"/g, '\\"'); }
  function f(n) { return Math.round(n * 10) / 10; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Deterministic PRNG from a string — the same id always draws the same
     art, on every visit and every device, with nothing stored anywhere. */
  function seeded(str) {
    var s = 0;
    for (var i = 0; i < String(str).length; i++) s = (s * 31 + String(str).charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* Art for anything without a picture: a little node graph derived from the
     id, so a missing image reads as deliberate rather than broken. */
  var constCache = {};
  function constellation(id) {
    if (constCache[id]) return constCache[id];
    var r = seeded(id), pts = [], i, j, out = '';
    for (i = 0; i < 14; i++) pts.push({ x: 10 + r() * 80, y: 10 + r() * 80, w: r() < 0.22 });
    for (i = 0; i < pts.length; i++) {
      for (j = i + 1; j < pts.length; j++) {
        var d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 30) {
          out += '<line x1="' + f(pts[i].x) + '" y1="' + f(pts[i].y) +
                 '" x2="' + f(pts[j].x) + '" y2="' + f(pts[j].y) + '"/>';
        }
      }
    }
    pts.forEach(function (p, k) {
      out += '<circle class="' + (p.w ? 'w' : '') + '" cx="' + f(p.x) + '" cy="' + f(p.y) +
             '" r="' + f(k % 5 === 0 ? 1.9 : 1.15) + '"/>';
    });
    constCache[id] = '<svg class="shelf-const" viewBox="0 0 100 100" ' +
      'preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + out + '</svg>';
    return constCache[id];
  }

  /* A picture if there is one, the constellation if there is not, and the
     constellation again if the picture 404s. */
  function picture(src, alt, id) {
    if (!src) return constellation(id);
    return '<img class="shelf-img-bg" src="' + esc(src) + '" alt="" aria-hidden="true" ' +
             'loading="lazy" onerror="this.style.display=\'none\'">' +
           '<img class="shelf-img-fg" src="' + esc(src) + '" alt="' + esc(alt || '') + '" ' +
             'loading="lazy" onerror="var p=this.closest(\'[data-fallback]\');' +
             'if(p)p.innerHTML=p.dataset.fallback">';
  }
  function pictureAttrs(src, id) {
    return (src ? '' : ' data-plain') + ' data-fallback="' + esc(constellation(id)) + '"';
  }

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                 jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  /* Accepts both shapes the content file uses: "2026-08-16" and "4 Aug 2026".
     Returns a sortable number; anything unparseable sorts last. */
  function stamp(v) {
    if (!v) return 0;
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);
    var human = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(v);
    if (human) return Date.UTC(+human[3], MONTHS[human[2].toLowerCase()] || 0, +human[1]);
    var t = Date.parse(v);
    return isNaN(t) ? 0 : t;
  }
  function niceDate(v) {
    var t = stamp(v);
    if (!t) return String(v || '');
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function ageDays(v) {
    var t = stamp(v);
    return t ? (Date.now() - t) / 86400000 : 1e9;
  }

  /* Strips the HTML that lives in the longer content fields, so searching
     finds words the reader can actually see. */
  function textOf(html) {
    return String(html == null ? '' : html).replace(/<[^>]*>/g, ' ');
  }

  /* ====================================================================== */
  function mount(cfg) {
    if (!cfg || !cfg.items || !cfg.items.length) return;

    var ITEMS = cfg.items.slice();
    var byIdMap = {};
    ITEMS.forEach(function (it) { byIdMap[it.id] = it; });
    function byId(id) { return byIdMap[id]; }

    var noun = cfg.noun || { one: 'item', many: 'items' };
    function counted(n) { return n + ' ' + (n === 1 ? noun.one : noun.many); }

    /* Edges are undirected and deduped: a one-way relation still counts for
       both ends, so nothing has to remember to write the reciprocal. */
    var DEG = {}, EDGES = [];
    (function buildGraph() {
      var seen = {};
      ITEMS.forEach(function (it) { DEG[it.id] = 0; });
      ITEMS.forEach(function (it) {
        (cfg.relatedOf ? cfg.relatedOf(it) || [] : []).forEach(function (rid) {
          if (rid === it.id || !byId(rid)) return;
          var k = [it.id, rid].sort().join('|');
          if (seen[k]) return;
          seen[k] = 1;
          EDGES.push([it.id, rid]);
          DEG[it.id]++; DEG[rid]++;
        });
      });
    })();

    /* The chips on a card and the chips you can filter by are not always the
       same set. A card wants to be informative — every library a project
       uses, the kind of thing this is. The filter row wants to be useful,
       which is a stricter test: a facet that every single item carries
       ("2026", when everything was written in 2026) filters nothing, and a
       wall of one-off facets is a list, not a filter. So the row keeps only
       what actually groups things, and hides itself when nothing does. */
    var FACETS = (function () {
      var m = {};
      var pick = cfg.facetsOf || cfg.chipsOf;
      if (!pick) return [];
      ITEMS.forEach(function (it) {
        (pick(it) || []).forEach(function (t) { m[t] = (m[t] || 0) + 1; });
      });
      var min = cfg.facetMin || 1;
      return Object.keys(m)
        .filter(function (t) { return m[t] >= min && m[t] < ITEMS.length; })
        .sort()
        .map(function (t) { return { tag: t, n: m[t] }; });
    })();
    var FACET_NAMES = FACETS.map(function (t) { return t.tag; });

    var SORTS = cfg.sorts && cfg.sorts.length ? cfg.sorts : [
      { value: 'az', label: 'A – Z', cmp: function (a, b) {
        return cfg.titleOf(a).localeCompare(cfg.titleOf(b)); } }
    ];
    function cmpFor(value) {
      for (var i = 0; i < SORTS.length; i++) if (SORTS[i].value === value) return SORTS[i].cmp;
      return SORTS[0].cmp;
    }
    var DEFAULT_SORT = SORTS[0].value;

    function chipsOf(it) { return (cfg.chipsOf ? cfg.chipsOf(it) : []) || []; }
    function stubOf(it) { return cfg.stubOf ? cfg.stubOf(it) : null; }
    function statusOf(it) { return cfg.statusOf ? cfg.statusOf(it) || '' : ''; }
    function haystack(it) {
      if (cfg.haystack) return cfg.haystack(it);
      return [cfg.titleOf(it), cfg.gistOf(it), chipsOf(it).join(' ')].join(' ').toLowerCase();
    }
    function degOf(it) { return DEG[it.id] || 0; }

    /* The pill and the flash on a card face, shared by rail and grid. */
    function faceExtras(it) {
      var st = stubOf(it);
      return (cfg.freshOf && cfg.freshOf(it) ? '<span class="shelf-fresh">new</span>' : '') +
             (st ? '<span class="shelf-stub is-' + esc(st.kind || 'other') + '">' +
                   esc(st.label) + '</span>' : '');
    }

    /* Copy-link: one delegated listener per collection, pointed at its own
       page so a copied link always lands somewhere that can open it. */
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-shelf-copy="' + cssEsc(cfg.key) + '"]');
      if (!b) return;
      var url = location.origin + location.pathname.replace(/[^/]*$/, '') +
                cfg.page + '#' + b.dataset.id;
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

    /* ====================================================================
       A. THE RAIL  (home page)
       ================================================================== */
    (function rail() {
      var root = document.querySelector('.shelf[data-collection="' + cssEsc(cfg.key) + '"]');
      if (!root) return;
      var track    = root.querySelector('.shelf-track');
      var drawer   = root.querySelector('.shelf-drawer');
      var drawerIn = drawer && drawer.querySelector('.shelf-drawer-in');
      if (!track || !drawer || !drawerIn) return;

      var drawerId = drawer.id || (cfg.key + '-drawer');
      drawer.id = drawerId;

      var openId = null;
      var dragMoved = false;

      function cardHTML(it) {
        return '' +
        '<button class="shelf-card" type="button" role="listitem" data-id="' + esc(it.id) + '" ' +
                'aria-expanded="false" aria-controls="' + esc(drawerId) + '">' +
          '<span class="shelf-node" aria-hidden="true"></span>' +
          '<span class="shelf-face"' + cfg.faceAttrs(it) + '>' + cfg.face(it) + faceExtras(it) +
          '</span>' +
          '<span class="shelf-meta">' +
            '<strong class="shelf-title">' + esc(cfg.titleOf(it)) + '</strong>' +
            '<span class="shelf-gist">' + esc(cfg.gistOf(it) || '') + '</span>' +
            '<span class="shelf-tagline">' + chipsOf(it).slice(0, 3).map(function (t) {
              return '<span>' + esc(t) + '</span>';
            }).join('') + '</span>' +
          '</span>' +
        '</button>';
      }

      function render() {
        track.innerHTML = ITEMS.map(cardHTML).join('');
        track.querySelectorAll('.shelf-card').forEach(function (c) {
          c.addEventListener('click', function () {
            if (dragMoved) return;             // ignore the click that ends a drag
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
        drawerIn.innerHTML = cfg.detail(it, { open: true, key: cfg.key, page: cfg.page });
        drawer.classList.add('is-open');
        root.classList.add('is-focus');

        track.querySelectorAll('.shelf-card').forEach(function (c) {
          var on = c.dataset.id === id;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-expanded', String(on));
        });

        var closeBtn = drawerIn.querySelector('.shelf-close');
        if (closeBtn) closeBtn.addEventListener('click', function () {
          close();
          var card = track.querySelector('.shelf-card[data-id="' + cssEsc(id) + '"]');
          if (card) card.focus();
        });

        // a "connected to" chip swaps the drawer over to that item
        drawerIn.querySelectorAll('[data-shelf-goto]').forEach(function (b) {
          b.addEventListener('click', function () {
            openId = null;
            toggle(b.dataset.shelfGoto);
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
        track.querySelectorAll('.shelf-card').forEach(function (c) {
          c.classList.remove('is-active');
          c.setAttribute('aria-expanded', 'false');
        });
        setTimeout(function () { if (!openId) drawerIn.innerHTML = ''; }, 500);
      }

      /* the little bar on the drawer's top edge points back at the open card */
      function movePointer() {
        if (!openId) return;
        var card = track.querySelector('.shelf-card[data-id="' + cssEsc(openId) + '"]');
        if (!card) return;
        var c = card.getBoundingClientRect(), d = drawerIn.getBoundingClientRect();
        var x = c.left + c.width / 2 - d.left - 23;
        drawerIn.style.setProperty('--pointer', Math.max(20, Math.min(d.width - 66, x)) + 'px');
      }

      function scrollCardIntoView(id) {
        var card = track.querySelector('.shelf-card[data-id="' + cssEsc(id) + '"]');
        if (!card) return;
        var c = card.getBoundingClientRect(), t = track.getBoundingClientRect();
        if (c.left < t.left + 8 || c.right > t.right - 8) {
          track.scrollBy({ left: c.left - t.left - 24, behavior: 'smooth' });
        }
      }

      /* ------------------------------------------------------ rail + nav */
      var prev     = root.querySelector('[data-shelf-prev]');
      var next     = root.querySelector('[data-shelf-next]');
      var railFill = root.querySelector('.shelf-rail span');
      var countEl  = root.querySelector('[data-shelf-count]');
      var allEl    = root.querySelector('[data-shelf-all-n]');
      if (allEl) allEl.textContent = String(ITEMS.length);

      function pageStep() {
        var card = track.querySelector('.shelf-card');
        var w = card ? card.getBoundingClientRect().width + 16 : 280;
        return Math.max(w, Math.floor(track.clientWidth / w) * w - w);
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -pageStep(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: pageStep(), behavior: 'smooth' }); });

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
          var card = track.querySelector('.shelf-card');
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
        var cards = Array.prototype.slice.call(track.querySelectorAll('.shelf-card'));
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

    /* ====================================================================
       B. THE COLLECTION PAGE
       ================================================================== */
    (function library() {
      var page = document.querySelector('.lib[data-collection="' + cssEsc(cfg.key) + '"]');
      if (!page) return;

      var gridEl   = page.querySelector('.lib-grid');
      var graphEl  = page.querySelector('.lib-graph');
      var searchEl = page.querySelector('[data-lib-search]');
      var chipsEl  = page.querySelector('[data-lib-chips]');
      var sortEl   = page.querySelector('[data-lib-sort]');
      var statusEl = page.querySelector('[data-lib-status]');
      var countEl  = page.querySelector('[data-lib-count]');
      var emptyEl  = page.querySelector('.lib-empty');
      var clearEl  = page.querySelector('[data-lib-clear]');
      var randomEl = page.querySelector('[data-lib-random]');
      var viewBtns = Array.prototype.slice.call(page.querySelectorAll('[data-lib-view]'));

      /* The two dropdowns are filled from the config, so a page never has to
         restate the vocabulary its own collection uses. */
      if (sortEl) {
        sortEl.innerHTML = SORTS.map(function (s) {
          return '<option value="' + esc(s.value) + '">' + esc(s.label) + '</option>';
        }).join('');
      }
      if (statusEl) {
        if (cfg.statuses && cfg.statuses.length) {
          statusEl.innerHTML = cfg.statuses.map(function (s) {
            return '<option value="' + esc(s.value) + '">' + esc(s.label) + '</option>';
          }).join('');
        } else if (statusEl.parentNode) {
          statusEl.parentNode.hidden = true;
        }
      }

      var state = { q: '', chips: [], status: '', sort: DEFAULT_SORT, view: 'grid' };
      var shown = [];
      var openId = null;
      var lastFocus = null;

      /* ----------------------------------------------------- URL as state */
      function readURL() {
        var p = new URLSearchParams(location.search);
        state.q      = p.get('q') || '';
        state.chips  = (p.get('tag') || '').split(',').filter(Boolean);
        state.status = p.get('status') || '';
        state.sort   = p.get('sort') || DEFAULT_SORT;
        state.view   = p.get('view') === 'graph' ? 'graph' : 'grid';
      }
      function writeURL(push) {
        var p = new URLSearchParams();
        if (state.q) p.set('q', state.q);
        if (state.chips.length) p.set('tag', state.chips.join(','));
        if (state.status) p.set('status', state.status);
        if (state.sort !== DEFAULT_SORT) p.set('sort', state.sort);
        if (state.view !== 'grid') p.set('view', state.view);
        var qs = p.toString();
        var url = location.pathname + (qs ? '?' + qs : '') + (openId ? '#' + openId : '');
        if (push) history.pushState({ open: openId }, '', url);
        else history.replaceState({ open: openId }, '', url);
      }

      /* -------------------------------------------------------- filtering */
      function filtered() {
        var q = state.q.trim().toLowerCase();
        var terms = q ? q.split(/\s+/) : [];
        var out = ITEMS.filter(function (it) {
          if (state.status && statusOf(it) !== state.status) return false;
          if (state.chips.length) {
            var t = chipsOf(it);
            for (var i = 0; i < state.chips.length; i++) {
              if (t.indexOf(state.chips[i]) < 0) return false;      // AND across chips
            }
          }
          if (!terms.length) return true;
          var hay = haystack(it);
          return terms.every(function (w) { return hay.indexOf(w) > -1; });
        });
        return out.sort(cmpFor(state.sort));
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

      /* ------------------------------------------------------ grid render */
      function gridCard(it, terms) {
        var st = stubOf(it);
        var deg = degOf(it);
        return '' +
        '<article class="lib-card" data-id="' + esc(it.id) + '" tabindex="0" role="button" ' +
                 'aria-label="Open ' + esc(cfg.titleOf(it)) + '">' +
          '<span class="shelf-node" aria-hidden="true"></span>' +
          '<div class="lib-face"' + cfg.faceAttrs(it) + '>' + cfg.face(it) +
            (cfg.freshOf && cfg.freshOf(it) ? '<span class="shelf-fresh">new</span>' : '') +
          '</div>' +
          '<div class="lib-body">' +
            '<div class="lib-kick">' +
              (st ? '<span class="shelf-stub is-' + esc(st.kind || 'other') + '">' +
                    esc(st.label) + '</span>' : '') +
              (deg ? '<span class="lib-deg" title="' + deg + ' connections">' +
                     '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.4"/>' +
                     '<circle cx="18" cy="12" r="2.4"/><circle cx="7" cy="18" r="2.4"/>' +
                     '<path d="M6 6l12 6M18 12L7 18"/></svg>' + deg + '</span>' : '') +
            '</div>' +
            '<h3>' + mark(cfg.titleOf(it), terms) + '</h3>' +
            '<p>' + mark(cfg.gistOf(it) || '', terms) + '</p>' +
            '<div class="lib-tags">' + chipsOf(it).map(function (t) {
              return '<span class="shelf-tag is-static' + (state.chips.indexOf(t) > -1 ? ' is-on' : '') + '">' +
                     esc(t) + '</span>';
            }).join('') + '</div>' +
          '</div>' +
        '</article>';
      }

      function renderGrid() {
        var terms = state.q.trim().toLowerCase().split(/\s+/)
          .filter(function (w) { return w.length > 1; });
        gridEl.innerHTML = shown.map(function (it) { return gridCard(it, terms); }).join('');
        gridEl.querySelectorAll('.lib-card').forEach(function (c) {
          c.addEventListener('click', function () { open(c.dataset.id, true); });
          c.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.dataset.id, true); }
          });
        });
      }

      /* ----------------------------------------------------- graph render
         A small spring layout, run to convergence once and then cached. With
         a few dozen nodes that is a handful of milliseconds, and doing it in
         one shot means no animation loop idling behind the page. */
      var LAYOUT = null;
      function layout() {
        if (LAYOUT) return LAYOUT;
        var n = ITEMS.length, pos = {}, i, j;
        var r = seeded(cfg.key + '-layout');
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
        var pad2 = 90;
        LAYOUT = {
          pos: pos,
          box: [minX - pad2, minY - pad2, (maxX - minX) + pad2 * 2, (maxY - minY) + pad2 * 2]
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
          var rad = 7 + Math.min(9, degOf(it) * 1.8);
          return '<g class="lib-n' + (live[it.id] ? ' is-live' : ' is-dim') + '" ' +
                    'data-id="' + esc(it.id) + '" tabindex="0" role="button" ' +
                    'transform="translate(' + f(p.x) + ',' + f(p.y) + ')">' +
                   '<title>' + esc(cfg.titleOf(it)) + '</title>' +
                   '<circle class="halo" r="' + f(rad + 13) + '"/>' +
                   '<circle class="core" r="' + f(rad) + '"/>' +
                   '<text y="' + f(rad + 21) + '">' + esc(cfg.titleOf(it)) + '</text>' +
                 '</g>';
        }).join('');

        graphEl.innerHTML =
          '<svg viewBox="' + L.box.map(f).join(' ') + '" role="img" ' +
               'aria-label="Graph: ' + counted(ITEMS.length) + ' and how they connect">' +
            '<g class="lib-edges">' + lines + '</g>' +
            '<g class="lib-nodes">' + nodes + '</g>' +
          '</svg>';

        graphEl.querySelectorAll('.lib-n').forEach(function (g) {
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
        graphEl.querySelectorAll('.lib-n').forEach(function (g) {
          g.classList.toggle('is-near', !!near[g.dataset.id]);
        });
        graphEl.querySelectorAll('.lib-edges line').forEach(function (l) {
          var pair = (l.dataset.pair || '').split('|');
          l.classList.toggle('is-lit', !!id && pair.indexOf(id) > -1);
        });
      }

      /* -------------------------------------------------------- the modal */
      var modal   = page.querySelector('.lib-modal');
      var modalIn = modal && modal.querySelector('.lib-modal-in');

      function navHTML(id) {
        var i = shown.map(function (x) { return x.id; }).indexOf(id);
        if (i < 0) return '';
        var p = shown[i - 1], n = shown[i + 1];
        return '<div class="lib-walk">' +
          (p ? '<button type="button" class="prev" data-shelf-goto="' + esc(p.id) + '">' +
               '&#8592; <span>' + esc(cfg.titleOf(p)) + '</span></button>' : '<span></span>') +
          '<span class="pos">' + (i + 1) + ' / ' + shown.length + '</span>' +
          (n ? '<button type="button" class="next" data-shelf-goto="' + esc(n.id) + '">' +
               '<span>' + esc(cfg.titleOf(n)) + '</span> &#8594;</button>' : '<span></span>') +
        '</div>';
      }

      function open(id, push) {
        var it = byId(id);
        if (!it || !modal) return;
        if (!openId) lastFocus = document.activeElement;
        openId = id;
        modalIn.innerHTML = cfg.detail(it, {
          live: true, key: cfg.key, page: cfg.page, facets: FACET_NAMES
        }) + navHTML(id);
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('shelf-locked');
        modalIn.parentNode.scrollTop = 0;
        wireModal();
        writeURL(push);
        var c = modalIn.querySelector('.shelf-close');
        if (c) c.focus();
      }

      function wireModal() {
        var c = modalIn.querySelector('.shelf-close');
        if (c) c.addEventListener('click', function () { close(true); });
        modalIn.querySelectorAll('[data-shelf-goto]').forEach(function (b) {
          b.addEventListener('click', function () { open(b.dataset.shelfGoto, true); });
        });
        modalIn.querySelectorAll('[data-shelf-chip]').forEach(function (b) {
          b.addEventListener('click', function () {
            var t = b.dataset.shelfChip;
            state.chips = state.chips.indexOf(t) > -1
              ? state.chips.filter(function (x) { return x !== t; })
              : state.chips.concat([t]);
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
        document.body.classList.remove('shelf-locked');
        setTimeout(function () { if (!openId) modalIn.innerHTML = ''; }, 320);
        writeURL(push);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }

      if (modal) {
        modal.addEventListener('click', function (e) {
          if (e.target === modal || e.target.classList.contains('lib-scrim')) close(true);
        });
        /* keep tabbing inside the dialog while it is open */
        modal.addEventListener('keydown', function (e) {
          if (e.key !== 'Tab' || !openId) return;
          var f2 = modal.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]');
          if (!f2.length) return;
          var first = f2[0], last = f2[f2.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
      }

      /* ------------------------------------------------------ the toolbar */
      function renderChips() {
        if (!chipsEl) return;
        if (!FACETS.length) { chipsEl.hidden = true; return; }
        chipsEl.innerHTML = FACETS.map(function (t) {
          var on = state.chips.indexOf(t.tag) > -1;
          return '<button class="shelf-tag' + (on ? ' is-on' : '') + '" type="button" ' +
                 'aria-pressed="' + on + '" data-chip="' + esc(t.tag) + '">' +
                 esc(t.tag) + '<span class="n">' + t.n + '</span></button>';
        }).join('');
        chipsEl.querySelectorAll('[data-chip]').forEach(function (b) {
          b.addEventListener('click', function () {
            var t = b.dataset.chip;
            state.chips = state.chips.indexOf(t) > -1
              ? state.chips.filter(function (x) { return x !== t; })
              : state.chips.concat([t]);
            apply(true);
          });
        });
      }

      function apply(push) {
        shown = filtered();

        if (countEl) {
          countEl.textContent = shown.length === ITEMS.length
            ? counted(ITEMS.length)
            : shown.length + ' of ' + ITEMS.length;
        }
        if (emptyEl) emptyEl.hidden = shown.length > 0;
        if (clearEl) clearEl.hidden = !(state.q || state.chips.length || state.status);

        page.classList.toggle('is-graph', state.view === 'graph');
        viewBtns.forEach(function (b) {
          var on = b.dataset.libView === state.view;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });

        renderChips();
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
        b.addEventListener('click', function () { state.view = b.dataset.libView; apply(true); });
      });
      if (clearEl) clearEl.addEventListener('click', function () {
        state.q = ''; state.chips = []; state.status = '';
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

      /* back / forward moves between filtered views and open items */
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
          document.body.classList.remove('shelf-locked');
          modalIn.innerHTML = '';
        }
        apply(false);
      });

      /* ------------------------------------------------------------ start */
      readURL();
      // Read the fragment before apply() runs: writeURL() rebuilds the whole
      // URL from `state`, and with nothing open yet it would drop the hash.
      var deep = location.hash.slice(1);
      apply(false);
      if (deep && byId(deep)) open(deep, false);
    })();
  }

  return {
    mount: mount,
    esc: esc,
    f: f,
    seeded: seeded,
    constellation: constellation,
    picture: picture,
    pictureAttrs: pictureAttrs,
    stamp: stamp,
    niceDate: niceDate,
    ageDays: ageDays,
    textOf: textOf
  };
})();
