/* ============================================================================
   hero.js — the root node.

   He follows the cursor. Not in three zones like the old build did, but
   continuously: the shoot in photos/ is one full clockwise revolution of his
   head, and tools/analyse_hero_pose.py measured which way he is pointing in
   every frame of it. tools/bake_hero.py then sampled 72 of those frames at
   even 5° steps and packed them into one WebP grid.

   So the whole trick at runtime is: take the angle from the centre of the
   photo well to the cursor, ease toward it, and blit the matching cell of
   the sheet into a canvas. Everything the sheet needs to describe itself —
   cell size, grid shape, which angle cell 0 holds — comes from
   assets/hero/gaze.js, so re-baking never means touching this file.

   Layered on top, unchanged from before: a continuous tilt/parallax on the
   node, and the easter-egg pose.

   On narrow screens there is one more layer: as you scroll past the hero,
   the head "docks" into the little dot beside the name in the nav — see
   the DOCK section near the bottom. It draws from the same sprite sheet
   into a second, tiny canvas, so its rotation is always exactly the frame
   the big head last had, just re-sampled at a different angle (a direct
   function of how far you have scrolled through the hero, not of cur/aim),
   which is what keeps it in sync without coupling to whichever pointer
   branch — cursor or scroll — happens to be driving the big head.

   Degrees follow the screen: atan2(dy, dx) with y pointing down, so -90 is
   up, 180 is screen-left, +90 is down, 0 is screen-right.

   Fallbacks, in order of how little the browser is willing to give us:
     no JS / no canvas / reduced motion / save-data  → the poster still image
     coarse pointer (touch)                          → scroll spins his head
     everything works                                → cursor tracking
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('.rootnode');
  if (!root) return;

  var inner = root.querySelector('.rootnode-inner');
  var well = root.querySelector('.photo-well');
  var hero = document.querySelector('.hero');
  var hint = root.querySelector('.hero-hint');

  var PHOTOS = (window.SITE && window.SITE.photos) || {};
  var GAZE = window.HERO_GAZE || null;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches ||
               !window.matchMedia('(hover: hover)').matches;
  var conn = navigator.connection || {};
  var thrifty = conn.saveData === true;
  // "mobile" here means viewport width, same 760px the nav itself collapses
  // at — deliberately independent of "coarse" (pointer capability), because
  // the dock is a small-screen layout behaviour, not a touch behaviour.
  var mobile = window.matchMedia('(max-width: 760px)').matches;

  /* ------------------------------------------------------------ the well */
  // The poster is already in index.html — it carries the alt text and is what
  // anyone without JS, without canvas or on save-data is left with. Only its
  // src is content-driven. The sheet canvas goes on top of it, the egg on top
  // of that; paint order is DOM order, so no z-index is needed.
  var poster = well.querySelector('.well-img');
  if (!poster) {                       // markup changed under us — rebuild it
    poster = document.createElement('img');
    poster.className = 'well-img is-on';
    poster.alt = 'Debayan Bhattacharya';
    poster.decoding = 'async';
    poster.draggable = false;
    poster.src = (GAZE && GAZE.poster) || 'assets/hero/gaze-poster.webp';
    well.appendChild(poster);
  }
  if (PHOTOS.poster) poster.src = PHOTOS.poster;
  poster.addEventListener('error', function () {
    var alt = (GAZE && GAZE.posterFallback) || 'assets/hero/gaze-poster.jpg';
    if (poster.src.slice(-4) !== '.jpg') poster.src = alt;
  });

  var canvas = document.createElement('canvas');
  canvas.className = 'well-sheet';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (ctx) well.appendChild(canvas);

  // The egg is never the first thing you see, so it waits for the page to
  // finish loading before it costs anything.
  var eggImg = null;
  var eggSrc = PHOTOS.egg || (GAZE && GAZE.egg);
  if (eggSrc && !coarse && !reduced) {
    eggImg = document.createElement('img');
    eggImg.alt = '';
    eggImg.className = 'well-img well-egg';
    eggImg.setAttribute('aria-hidden', 'true');
    eggImg.decoding = 'async';
    eggImg.draggable = false;
    eggImg.addEventListener('error', function () { eggImg.dataset.broken = '1'; });
    well.appendChild(eggImg);
    var arm = function () { eggImg.src = eggSrc; };
    if (document.readyState === 'complete') setTimeout(arm, 0);
    else window.addEventListener('load', arm);
  }

  /* ---------------------------------------------------------- the sheet */
  var sheet = null;        // the variant record out of gaze.js
  var img = null;          // the decoded atlas
  var ready = false;
  var slot = -1;

  function loadSheet() {
    if (!ctx || !GAZE || reduced || thrifty) return;
    sheet = coarse ? GAZE.coarse : GAZE.fine;
    if (!sheet) return;

    img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) img.fetchPriority = 'low';
    img.addEventListener('load', function () {
      ready = true;
      resize();
      root.classList.add('has-sheet');
      draw(true);
      dockTick();
    });
    img.addEventListener('error', function () { sheet = null; });
    img.src = sheet.src;
  }

  // The well is sized in %, so the backing store has to be recomputed on
  // resize. Capped at 2x, and never larger than a cell — past that we would
  // just be paying to upscale, which the compositor does for free anyway.
  function resize() {
    if (!ready) return;
    var r = well.getBoundingClientRect();
    if (!r.width) return;
    var px = Math.min(Math.round(r.width * Math.min(window.devicePixelRatio || 1, 2)),
                      sheet.tile);
    if (px === canvas.width) return;
    canvas.width = px;
    canvas.height = px;
    slot = -1;                     // force a redraw into the new backing store
  }

  function draw(force) {
    if (!ready) return;
    var k = slotFor(cur);
    if (k === slot && !force) return;
    slot = k;
    var t = sheet.tile;
    ctx.drawImage(img, (k % sheet.cols) * t, Math.floor(k / sheet.cols) * t, t, t,
                  0, 0, canvas.width, canvas.height);
  }

  // Cell k holds startAngle - step*k, so invert that and wrap.
  function slotFor(deg) {
    var off = (sheet.startAngle - deg) % 360;
    if (off < 0) off += 360;
    return Math.round(off / sheet.step) % sheet.count;
  }

  /* ------------------------------------------------------------- easing */
  var REST = GAZE ? (GAZE.fine || GAZE.coarse).startAngle : -90;   // he looks up
  var cur = REST, aim = REST;

  function shortest(from, to) {
    var d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  /* ------------------------------------------------------ easter egg zone */
  // Two ways in, and they clear differently: hovering "Get in touch" holds it
  // until you leave, while the idle one has to let go the moment you move
  // again — hence two flags rather than one lock.
  var eggHover = false, eggIdle = false, idleTimer = null;

  function egg() {
    var on = (eggHover || eggIdle) && !!eggImg && eggImg.dataset.broken !== '1';
    root.classList.toggle('is-egg', on);
    root.classList.toggle('show-hint', on || root.classList.contains('is-tracking'));
  }

  document.querySelectorAll('[data-egg]').forEach(function (el) {
    var set = function (v) { return function () { eggHover = v; egg(); }; };
    el.addEventListener('pointerenter', set(true));
    el.addEventListener('pointerleave', set(false));
    el.addEventListener('focus', set(true));
    el.addEventListener('blur', set(false));
  });

  function resetIdle() {
    clearTimeout(idleTimer);
    if (eggIdle) { eggIdle = false; egg(); }
    if (coarse || reduced) return;
    idleTimer = setTimeout(function () {
      if (!inView()) return;
      eggIdle = true;
      egg();
    }, 9000);
  }

  function inView() {
    var r = hero.getBoundingClientRect();
    return r.bottom > 120 && r.top < window.innerHeight * 0.6;
  }

  /* ------------------------------------------------------- fine pointer */
  // Tracking is viewport-wide: the angle is measured from the centre of the
  // well to the cursor wherever it is, so he keeps watching you as you read
  // down the page. Tilt still uses position within the hero, because that is
  // a parallax and only makes sense while the hero is on screen.
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  // Crossing the centre of the well would otherwise spin him a full turn for
  // a few pixels of cursor movement, so inside this radius we hold the last
  // angle. 0.62 of the well radius — comfortably inside his face.
  var DEAD = 0.62;

  function onMove(e) {
    if (e.pointerType === 'touch') return;
    if (!inView()) { release(); return; }

    var w = well.getBoundingClientRect();
    var wx = w.left + w.width / 2, wy = w.top + w.height / 2;
    var dx = e.clientX - wx, dy = e.clientY - wy;

    if (Math.hypot(dx, dy) > w.width / 2 * DEAD) {
      aim = Math.atan2(dy, dx) * 180 / Math.PI;
    }

    var r = hero.getBoundingClientRect();
    tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);

    root.classList.add('is-tracking', 'show-hint');
    queue();
    resetIdle();
  }

  function release() {
    aim = REST;
    tx = 0; ty = 0;
    root.classList.remove('is-tracking');
    egg();                      // drops the hint unless the egg is holding it
    queue();
  }

  function queue() { if (raf === null) raf = requestAnimationFrame(tick); }

  function tick() {
    raf = null;
    var da = shortest(cur, aim);
    cur += da * 0.18;
    cx += (tx - cx) * 0.14;
    cy += (ty - cy) * 0.14;
    draw(false);
    apply(cx, cy);
    if (Math.abs(da) > 0.25 ||
        Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) queue();
  }

  function apply(x, y) {
    if (reduced) { inner.style.transform = ''; return; }
    inner.style.transform =
      'rotateX(' + (-y * 7).toFixed(2) + 'deg) rotateY(' + (x * 9).toFixed(2) + 'deg) ' +
      'translate3d(' + (x * 12).toFixed(1) + 'px,' + (y * 8).toFixed(1) + 'px,0)';
  }

  /* --------------------------------------------- coarse pointer fallback */
  // No cursor to follow, so scroll drives it instead: one full turn of his
  // head per SPIN pixels of page, which lands at a bit over one revolution
  // for a typical read of this page.
  var SPIN = 1400;

  function onScroll() {
    aim = REST - (window.scrollY / SPIN) * 360;
    cur = aim;                      // scroll is already the easing
    draw(false);
    if (!reduced) {
      var r = hero.getBoundingClientRect();
      ty = (clamp(-r.top / Math.max(1, r.height), 0, 1) - 0.3) * 0.8;
      queue();
    }
  }

  /* ------------------------------------------------------------- dock ---
     <=760px only. As the hero scrolls past the fixed nav, the head docks
     into the dot beside the name — see .nav-head / .mark-slot in the CSS
     and the wrapper markup around .dot in index.html.

     Deliberately its own small system rather than reusing cur/aim: those
     are driven by whichever of onMove/onScroll is wired below, which
     differs by pointer type, and coupling the dock to that would mean a
     mouse user on a narrow window gets no dock rotation at all (their head
     is cursor-driven, not scroll-driven). The dock instead reads scroll
     position directly, same as the coarse-pointer fallback does, so it
     behaves the same for every visitor a small screen actually reaches:
     touch or mouse, narrow window or phone.

     progress is 0 at the top of the page and reaches 1 exactly when the
     hero's bottom edge reaches the nav — i.e. once the whole hero has
     scrolled by, which is the plainest reading of "the end of the home
     page". The rotation is one full turn mapped onto that same range, so
     it completes its revolution and settles back to REST (his resting,
     looking-up pose) right as it finishes docking — and because the dock
     transform and the rotation are both pure functions of progress, nothing
     here needs its own easing loop; scrolling up undocks it exactly as it
     docked, frame for frame. */
  var navHead = document.querySelector('.nav-head');
  var navHeadCanvas = navHead && navHead.querySelector('canvas');
  var navHeadCtx = navHeadCanvas && navHeadCanvas.getContext ? navHeadCanvas.getContext('2d') : null;
  var navDot = document.querySelector('.nav-mark .dot');

  // Same fallback ladder as the sheet itself: no canvas, no gaze data, a
  // reduced-motion or save-data visitor — the dot just stays a dot.
  var canDock = mobile && !!navHead && !!navHeadCtx && !!ctx && !!GAZE && !reduced && !thrifty;

  function sizeNavHead() {
    if (!navHeadCanvas) return;
    var px = Math.round(24 * Math.min(window.devicePixelRatio || 1, 2));
    if (px === navHeadCanvas.width) return;
    navHeadCanvas.width = px;
    navHeadCanvas.height = px;
  }

  function heroProgress() {
    // window.scrollY rather than hero.getBoundingClientRect().top: the hero
    // sits at document-top and the nav is a fixed overlay that doesn't push
    // it down, so scrollY alone already *is* "how far past the top of the
    // hero you've scrolled" — no extra offset to subtract. Using the rect
    // instead double-counts the nav's own height as a false head start:
    // it makes the overlap (navH pixels of hero permanently sit behind the
    // fixed nav) read as scroll progress, so the bubble was already a few
    // percent visible before the visitor had scrolled at all.
    var total = Math.max(1, hero.offsetHeight);
    return clamp(window.scrollY / total, 0, 1);
  }

  function drawDockFrame(progress) {
    if (!ready) return;                // sheet not decoded yet — nothing to draw
    var k = slotFor(REST - progress * 360);
    var t = sheet.tile;
    navHeadCtx.clearRect(0, 0, navHeadCanvas.width, navHeadCanvas.height);
    navHeadCtx.drawImage(img, (k % sheet.cols) * t, Math.floor(k / sheet.cols) * t, t, t,
                          0, 0, navHeadCanvas.width, navHeadCanvas.height);
  }

  function dockTick() {
    if (!canDock) return;
    var p = heroProgress();
    navHead.style.opacity = p.toFixed(3);
    navHead.style.transform = 'scale(' + (0.4 + p * 0.6).toFixed(3) + ')';
    if (navDot) navDot.style.opacity = (1 - p).toFixed(3);
    drawDockFrame(p);
  }

  if (canDock) {
    sizeNavHead();
    window.addEventListener('scroll', dockTick, { passive: true });
    dockTick();
  }

  /* ------------------------------------------------------------- wiring */
  loadSheet();

  if (coarse) {
    root.classList.add('show-hint');
    if (hint) hint.textContent = PHOTOS.hintTouch || 'scroll to look around';
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  } else if (!reduced) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', release);
    window.addEventListener('blur', release);
    resetIdle();
  }

  window.addEventListener('resize', function () {
    resize();
    draw(true);
    if (canDock) { sizeNavHead(); dockTick(); }
  });

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* --------------------------------- satellite nodes + connecting edges */
  // Placed on a circle around the root and wired back to it, so the hero
  // reads as the origin node of the graph the rest of the page continues.
  // Editable in content.js under hero.satellites. Angles should avoid the
  // 60–120° band, which is where the hint text sits under the node.
  var SATS = ((window.SITE && window.SITE.hero && window.SITE.hero.satellites) || []).map(function (s) {
    return { label: s.label, deg: Number(s.deg) || 0, cls: s.tone || '' };
  });

  var svg = root.querySelector('.rootnode-edges');
  SATS.forEach(function (s) {
    var rad = s.deg * Math.PI / 180;
    var R = 48;                              // % of the box, just outside the ring
    var x = 50 + Math.cos(rad) * R;
    var y = 50 + Math.sin(rad) * R;

    var el = document.createElement('a');
    el.className = 'sat ' + s.cls + (x < 50 ? ' flip' : '');
    el.href = '#projects';
    el.innerHTML = '<i></i><span>' + s.label + '</span>';
    el.style.left = x + '%';
    el.style.top = y + '%';
    inner.appendChild(el);

    if (svg) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50%');
      line.setAttribute('y1', '50%');
      line.setAttribute('x2', x + '%');
      line.setAttribute('y2', y + '%');
      svg.appendChild(line);
    }
  });
})();
