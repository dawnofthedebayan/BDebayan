/* ============================================================================
   offclock.js — the "off the clock" carousel.

   Cards scroll horizontally (drag, buttons, wheel, keyboard) and expand into a
   shared drawer underneath. Albums and films can carry a Spotify album ID; the
   player iframe is only created the first time that item is opened, so the
   page never ships three embeds it might not need.

   Items live in content.js. Adding `?edit` to the URL opens a composer that
   writes the content.js block for you — it saves nothing anywhere, it just
   formats the snippet to paste. Visitors never see it.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S || !S.offclock) return;

  var root = document.querySelector('.oc');
  var track = document.querySelector('.oc-track');
  var drawer = document.getElementById('oc-drawer');
  var drawerIn = drawer && drawer.querySelector('.oc-drawer-in');
  if (!root || !track || !drawer) return;

  var items = S.offclock.items || [];
  var openId = null;

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var KIND = { album: 'album', film: 'film', book: 'book', thing: 'note' };

  /* ------------------------------------------------- generated constellation
     Items without artwork get a small node graph derived from their id, so a
     missing image still looks deliberate rather than broken. */
  function seeded(str) {
    var s = 0;
    for (var i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function constellation(id) {
    var r = seeded(id), pts = [], i, j, out = '';
    for (i = 0; i < 14; i++) pts.push({ x: 10 + r() * 80, y: 10 + r() * 80, w: r() < 0.22 });
    for (i = 0; i < pts.length; i++) {
      for (j = i + 1; j < pts.length; j++) {
        var d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 30) out += '<line x1="' + f(pts[i].x) + '" y1="' + f(pts[i].y) +
                           '" x2="' + f(pts[j].x) + '" y2="' + f(pts[j].y) + '"/>';
      }
    }
    pts.forEach(function (p, k) {
      out += '<circle class="' + (p.w ? 'w' : '') + '" cx="' + f(p.x) + '" cy="' + f(p.y) +
             '" r="' + f(k % 5 === 0 ? 1.9 : 1.15) + '"/>';
    });
    return '<svg class="oc-const" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + out + '</svg>';
  }
  function f(n) { return Math.round(n * 10) / 10; }

  function artMarkup(it, big) {
    if (!it.art) return constellation(it.id);
    var alt = big ? esc(it.title) + (it.by ? ' — ' + esc(it.by) : '') : '';
    return '<img class="oc-art-bg" src="' + esc(it.art) + '" alt="" aria-hidden="true" ' +
             'loading="lazy" onerror="this.style.display=\'none\'">' +
           '<img class="oc-art-fg" src="' + esc(it.art) + '" alt="' + alt + '" ' +
             'loading="lazy" onerror="this.closest(\'.oc-art,.oc-d-art\').innerHTML=' +
             'this.closest(\'.oc-art,.oc-d-art\').dataset.fallback||\'\'">';
  }

  /* --------------------------------------------------------------- render */
  function cardHTML(it) {
    var hasPlay = !!it.spotify;
    return '' +
    '<button class="oc-card" type="button" role="listitem" data-id="' + esc(it.id) + '" ' +
            'data-kind="' + esc(it.kind) + '" aria-expanded="false" aria-controls="oc-drawer">' +
      '<span class="oc-node" aria-hidden="true"></span>' +
      '<span class="oc-art"' + (it.art ? '' : ' data-const') + ' data-fallback="' + esc(constellation(it.id)) + '">' +
        artMarkup(it) +
        '<span class="oc-kind">' + esc(KIND[it.kind] || it.kind) + '</span>' +
        (hasPlay ? '<span class="oc-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg></span>' : '') +
      '</span>' +
      '<span class="oc-meta">' +
        (it.badge ? '<span class="oc-badge">' + esc(it.badge) + '</span>' : '') +
        '<strong class="oc-title">' + esc(it.title) + '</strong>' +
        '<span class="oc-by">' + esc(it.by || it.meta || '') + '</span>' +
      '</span>' +
    '</button>';
  }

  function render() {
    track.innerHTML = items.map(cardHTML).join('');
    track.querySelectorAll('.oc-card').forEach(function (c) {
      c.addEventListener('click', function () {
        if (dragMoved) return;               // ignore the click that ends a drag
        toggle(c.dataset.id);
      });
    });
    updateRail();
  }

  /* --------------------------------------------------------------- drawer */
  function toggle(id) {
    if (openId === id) return close();
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) return;

    openId = id;
    drawerIn.innerHTML = detailHTML(it);
    drawer.classList.add('is-open');
    root.classList.add('is-focus');

    track.querySelectorAll('.oc-card').forEach(function (c) {
      var on = c.dataset.id === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-expanded', String(on));
    });

    drawerIn.querySelector('.oc-close').addEventListener('click', function () {
      close();
      var card = track.querySelector('.oc-card[data-id="' + cssEsc(id) + '"]');
      if (card) card.focus();
    });

    movePointer();
    scrollCardIntoView(id);
    revealDrawer();
  }

  /* If the drawer opened below the fold, bring it up — but never yank the
     page when it is already comfortably in view. */
  function revealDrawer() {
    setTimeout(function () {
      var r = drawerIn.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.top > vh - 140) {
        window.scrollBy({ top: r.top - Math.max(120, vh * 0.34), behavior: 'smooth' });
      }
    }, 460);
  }

  function close() {
    openId = null;
    drawer.classList.remove('is-open');
    root.classList.remove('is-focus');
    track.querySelectorAll('.oc-card').forEach(function (c) {
      c.classList.remove('is-active');
      c.setAttribute('aria-expanded', 'false');
    });
    // let the collapse animation finish before tearing the player down
    setTimeout(function () { if (!openId) drawerIn.innerHTML = ''; }, 500);
  }

  function detailHTML(it) {
    var kicker = [KIND[it.kind] || it.kind, it.meta].filter(Boolean).join(' · ');
    var links = (it.links || []).map(function (l) {
      return '<a class="btn" href="' + esc(l.href) + '" target="_blank" rel="noopener">' +
             esc(l.label) + ' <span class="arw" aria-hidden="true">↗</span></a>';
    }).join('');

    var embed = '';
    if (it.spotify) {
      embed =
        '<div class="oc-embed">' +
          '<iframe src="https://open.spotify.com/embed/album/' + esc(it.spotify) + '?utm_source=generator" ' +
            'title="Spotify player — ' + esc(it.title) + '" loading="lazy" allowfullscreen ' +
            'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
          '<p class="oc-embed-note">Full playback if you are signed in to Spotify — a 30-second preview otherwise.</p>' +
        '</div>';
    }

    return '' +
      '<button class="oc-close" type="button" aria-label="Close">×</button>' +
      '<div class="oc-d-grid">' +
        '<div class="oc-d-art oc-art"' + (it.art ? '' : ' data-const') +
             ' data-fallback="' + esc(constellation(it.id)) + '">' + artMarkup(it, true) + '</div>' +
        '<div class="oc-d-body">' +
          '<div class="oc-d-kicker">' + esc(kicker) + '</div>' +
          '<h3>' + esc(it.title) + '</h3>' +
          (it.by ? '<p class="oc-d-by">' + esc(it.by) + '</p>' : '') +
          '<p class="oc-d-text">' + (it.body || esc(it.blurb || '')) + '</p>' +
          (links ? '<div class="oc-d-links">' + links + '</div>' : '') +
          embed +
        '</div>' +
      '</div>';
  }

  function cssEsc(v) { return String(v).replace(/"/g, '\\"'); }

  /* the little bar on the drawer's top edge points back at the open card */
  function movePointer() {
    if (!openId) return;
    var card = track.querySelector('.oc-card[data-id="' + cssEsc(openId) + '"]');
    if (!card || !drawerIn) return;
    var c = card.getBoundingClientRect(), d = drawerIn.getBoundingClientRect();
    var x = c.left + c.width / 2 - d.left - 23;
    drawerIn.style.setProperty('--pointer', Math.max(20, Math.min(d.width - 66, x)) + 'px');
  }

  function scrollCardIntoView(id) {
    var card = track.querySelector('.oc-card[data-id="' + cssEsc(id) + '"]');
    if (!card) return;
    var c = card.getBoundingClientRect(), t = track.getBoundingClientRect();
    if (c.left < t.left + 8 || c.right > t.right - 8) {
      track.scrollBy({ left: c.left - t.left - 24, behavior: 'smooth' });
    }
  }

  /* ------------------------------------------------------------- carousel */
  var prev = document.querySelector('[data-oc-prev]');
  var next = document.querySelector('[data-oc-next]');
  var railFill = document.querySelector('.oc-rail span');
  var countEl = document.querySelector('[data-oc-count]');

  function page() {
    var card = track.querySelector('.oc-card');
    var w = card ? card.getBoundingClientRect().width + 16 : 260;
    return Math.max(w, Math.floor(track.clientWidth / w) * w - w);
  }
  if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -page(), behavior: 'smooth' }); });
  if (next) next.addEventListener('click', function () { track.scrollBy({ left: page(), behavior: 'smooth' }); });

  function updateRail() {
    var max = track.scrollWidth - track.clientWidth;
    var visible = track.clientWidth / Math.max(1, track.scrollWidth);
    if (railFill) {
      railFill.style.width = Math.max(12, Math.min(100, visible * 100)) + '%';
      var travel = (track.clientWidth - track.clientWidth * Math.max(0.12, visible));
      railFill.style.transform = 'translateX(' + (max > 0 ? (track.scrollLeft / max) * travel : 0) + 'px)';
    }
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft > max - 4;
    if (countEl && items.length) {
      var card = track.querySelector('.oc-card');
      var w = card ? card.getBoundingClientRect().width + 16 : 260;
      var idx = Math.min(items.length, Math.round(track.scrollLeft / w) + 1);
      countEl.textContent = pad(idx) + ' / ' + pad(items.length);
    }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  track.addEventListener('scroll', function () { updateRail(); movePointer(); }, { passive: true });
  window.addEventListener('resize', function () { updateRail(); movePointer(); });

  /* drag to scroll — pointer events so it works for mouse and pen alike */
  var down = false, startX = 0, startScroll = 0, dragMoved = false;
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

  /* keyboard: arrows move between cards once focus is inside the track */
  track.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var cards = Array.prototype.slice.call(track.querySelectorAll('.oc-card'));
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

  /* ================================================================ EDITOR
     Opt-in via ?edit (or #edit). Builds a content.js block from a form.
     Nothing is persisted — this only formats text for you to paste.
     -------------------------------------------------------------------- */
  if (!/(\?|&)edit\b/.test(location.search) && location.hash !== '#edit') return;

  var FIELDS = [
    ['title', 'Title', 'input', 'Revolver'],
    ['by', 'By / artist / author', 'input', 'The Beatles'],
    ['meta', 'Meta line', 'input', '1966 · Parlophone'],
    ['badge', 'Badge (optional)', 'input', 'On the turntable'],
    ['art', 'Artwork path', 'input', 'art/revolver.jpg'],
    ['spotify', 'Spotify album ID (optional)', 'input', '3PRoXYsngSwjEQWR5PsHWR'],
    ['blurb', 'One-line card blurb', 'textarea', ''],
    ['body', 'The long version', 'textarea', '']
  ];

  var box = document.createElement('div');
  box.className = 'oc-composer';
  box.innerHTML =
    '<button class="close-x" type="button" aria-label="Close composer">×</button>' +
    '<h4>Add to off the clock</h4>' +
    '<p class="hint">Nothing here is saved — this builds the block for you to paste into ' +
      '<code>assets/js/content.js</code>. Preview drops it into the carousel for this page load only.</p>' +
    '<div class="row">' +
      '<label>Kind<select data-k="kind">' +
        ['album', 'film', 'book', 'thing'].map(function (k) { return '<option>' + k + '</option>'; }).join('') +
      '</select></label>' +
      '<label>id<input data-k="id" placeholder="revolver"></label>' +
    '</div>' +
    FIELDS.map(function (f) {
      return '<label>' + f[1] +
        (f[2] === 'textarea'
          ? '<textarea data-k="' + f[0] + '"></textarea>'
          : '<input data-k="' + f[0] + '" placeholder="' + f[3] + '">') +
        '</label>';
    }).join('') +
    '<div class="acts">' +
      '<button class="btn btn-primary" data-a="copy" type="button">Copy block</button>' +
      '<button class="btn" data-a="preview" type="button">Preview</button>' +
      '<button class="btn" data-a="clear" type="button">Clear</button>' +
    '</div>' +
    '<pre data-out>// fill the form above</pre>';
  document.body.appendChild(box);

  var out = box.querySelector('[data-out]');

  function collect() {
    var o = {};
    box.querySelectorAll('[data-k]').forEach(function (el) {
      var v = el.value.trim();
      if (v) o[el.dataset.k] = v;
    });
    if (!o.id && o.title) {
      o.id = o.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    }
    return o;
  }

  function snippet() {
    var o = collect();
    var order = ['id', 'kind', 'title', 'by', 'meta', 'badge', 'art', 'blurb', 'spotify', 'body'];
    var lines = order.filter(function (k) { return o[k]; }).map(function (k) {
      return '        ' + k + ': ' + JSON.stringify(o[k]).replace(/^"|"$/g, "'").replace(/\\"/g, '"');
    });
    return '      {\n' + lines.join(',\n') + '\n      },';
  }

  function refresh() { out.textContent = snippet(); }
  box.addEventListener('input', refresh);
  refresh();

  box.querySelector('[data-a="clear"]').addEventListener('click', function () {
    box.querySelectorAll('[data-k]').forEach(function (el) { if (el.tagName !== 'SELECT') el.value = ''; });
    refresh();
  });

  box.querySelector('[data-a="preview"]').addEventListener('click', function () {
    var o = collect();
    if (!o.id || !o.title) return;
    items = items.filter(function (x) { return x.id !== o.id; }).concat([o]);
    render();
  });

  box.querySelector('[data-a="copy"]').addEventListener('click', function (e) {
    var text = snippet(), btn = e.currentTarget;
    var done = function () {
      var was = btn.textContent; btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = was; }, 1400);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(out);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { document.execCommand('copy'); done(); } catch (err) {}
    }
  });

  box.querySelector('.close-x').addEventListener('click', function () { box.remove(); });
})();
