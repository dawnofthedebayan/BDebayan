/* ============================================================================
   life.js — Conway's Game of Life, running behind the whole page.

   B3/S23 on a toroidal grid, so gliders wrap around the viewport instead of
   falling off the edge. Live cells are drawn as nodes and adjacent live cells
   are wired together, which keeps the site's graph motif intact: colonies
   form, connect, and dissolve on their own.

   Interaction: click any empty part of the page to stamp a pattern, drag to
   paint cells. Clicks that land on a card, link, heading or any other real
   content are ignored, so nothing usable gets hijacked.

   Performance note — this is a *background*, so it has to cost close to
   nothing. Generations run at ~7/s but the display refreshes at 60. Rather
   than walk the whole grid every frame, each generation compiles its cells
   into Path2D objects once; a frame is then a handful of fill calls at
   different alphas. Only newborn cells, a small minority, are rebuilt per
   frame, and frames are skipped entirely once the tween has settled.

   Colours come from CSS custom properties and are re-read on `themechange`,
   so light and dark live in the stylesheet rather than being duplicated here.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('life-bg') || document.getElementById('graph-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  var TAU = Math.PI * 2;

  var CFG = Object.assign({
    cell: 17,        // px per cell on desktop
    fps: 7,          // generations per second
    density: 0.14,   // how much of a seeded colony starts alive
    links: true      // wire adjacent live cells together
  }, (window.SITE && window.SITE.background) || {});

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  /* ------------------------------------------------------------- palette */
  var P = {};
  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    var v = function (n, d) { return (cs.getPropertyValue(n) || d).trim(); };
    P.cell = v('--life-cell', '52,226,192');
    P.born = v('--life-born', '150,255,226');
    P.warm = v('--life-warm', '124,107,240');
    P.link = v('--life-link', '120,142,205');
    P.hover = v('--life-hover', '52,226,192');
    P.a = parseFloat(v('--life-a', '0.32')) || 0.32;
    P.linkA = parseFloat(v('--life-link-a', '0.10')) || 0.1;
  }
  readPalette();
  window.addEventListener('themechange', function () { readPalette(); draw(1); });

  /* ---------------------------------------------------------------- grid */
  var W = 0, H = 0, DPR = 1, CELL = CFG.cell, COLS = 0, ROWS = 0, N = 0;
  var bufA, bufB, cur, prev, warmMask;
  var pop = [], hover = -1, dirty = true, hoverMoved = false;

  function idx(x, y) { return y * COLS + x; }
  function wrapX(x) { return ((x % COLS) + COLS) % COLS; }
  function wrapY(y) { return ((y % ROWS) + ROWS) % ROWS; }

  function allocate() {
    N = COLS * ROWS;
    bufA = new Uint8Array(N);
    bufB = new Uint8Array(N);
    cur = bufA; prev = bufB;
    // a fixed minority render in the secondary colour — deterministic, so a
    // colony keeps its speckle as it drifts
    warmMask = new Uint8Array(N);
    for (var i = 0; i < N; i++) warmMask[i] = (i % 11 === 3) ? 1 : 0;
  }

  /* Seed rough elliptical colonies rather than uniform noise: noise spread
     evenly across the grid reads as television static, not as life. */
  function colony(cx, cy, rx, ry, density) {
    // Loop bounds must be whole numbers — a fractional index into a typed
    // array is silently dropped, which would make the colony a no-op.
    var x0 = Math.round(cx - rx), x1 = Math.round(cx + rx);
    var y0 = Math.round(cy - ry), y1 = Math.round(cy + ry);
    var d = (density == null ? CFG.density : density) * 3.2;
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        if (Math.random() < d) cur[idx(wrapX(x), wrapY(y))] = 1;
      }
    }
    dirty = true;
  }

  /* ------------------------------------------------------------ patterns */
  var PATTERNS = {
    glider: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
    lwss: [[0, 0], [3, 0], [4, 1], [0, 2], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3]],
    rPentomino: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    pulsarSeed: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2], [0, 3], [2, 3]],
    acorn: [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]]
  };
  var CYCLE = ['glider', 'rPentomino', 'lwss', 'acorn', 'pulsarSeed'];
  var cycleAt = 0;

  function stamp(name, cx, cy) {
    var src = PATTERNS[name];
    if (!src) return;
    var rot = (Math.random() * 4) | 0, flip = Math.random() < 0.5;
    var mx = 0, my = 0, i;
    for (i = 0; i < src.length; i++) { mx = Math.max(mx, src[i][0]); my = Math.max(my, src[i][1]); }

    var pts = [];
    for (i = 0; i < src.length; i++) {
      var x = flip ? mx - src[i][0] : src[i][0], y = src[i][1], t, ax = mx, ay = my;
      for (var r = 0; r < rot; r++) { t = x; x = ay - y; y = t; t = ax; ax = ay; ay = t; }
      pts.push([x, y]);
    }
    var ox = cx - ((mx / 2) | 0), oy = cy - ((my / 2) | 0);
    for (i = 0; i < pts.length; i++) {
      var k = idx(wrapX(ox + pts[i][0]), wrapY(oy + pts[i][1]));
      cur[k] = 1; prev[k] = 0;                 // prev = 0 so it fades in
    }
    dirty = true;
  }

  function seed() {
    cur.fill(0); prev.fill(0);
    var colonies = Math.max(5, Math.round(N / 1400));
    for (var i = 0; i < colonies; i++) {
      colony((Math.random() * COLS) | 0, (Math.random() * ROWS) | 0,
             7 + Math.random() * 12, 6 + Math.random() * 9);
    }
    for (var g = 0; g < 5; g++) {
      stamp('glider', (Math.random() * COLS) | 0, (Math.random() * ROWS) | 0);
    }
    prev.set(cur);
    pop = [];
    dirty = true;
  }

  /* ----------------------------------------------------------------- step */
  function step() {
    var src = cur, dst = (cur === bufA) ? bufB : bufA;
    dst.fill(0);
    var alive = 0;

    for (var y = 0; y < ROWS; y++) {
      var up = (y === 0 ? ROWS - 1 : y - 1) * COLS;
      var mid = y * COLS;
      var dn = (y === ROWS - 1 ? 0 : y + 1) * COLS;

      for (var x = 0; x < COLS; x++) {
        var xl = x === 0 ? COLS - 1 : x - 1;
        var xr = x === COLS - 1 ? 0 : x + 1;
        var n = src[up + xl] + src[up + x] + src[up + xr] +
                src[mid + xl] + src[mid + xr] +
                src[dn + xl] + src[dn + x] + src[dn + xr];
        if (src[mid + x] ? (n === 2 || n === 3) : (n === 3)) { dst[mid + x] = 1; alive++; }
      }
    }
    prev = src; cur = dst;

    /* Left alone, almost any soup settles into still lifes and short
       oscillators within a couple of minutes, and the background freezes.
       Watch the population and intervene rather than letting it die quietly. */
    pop.push(alive);
    if (pop.length > 26) pop.shift();

    if (alive < N * 0.05) {
      colony((Math.random() * COLS) | 0, (Math.random() * ROWS) | 0,
             8 + Math.random() * 5, 6 + Math.random() * 4);
    } else if (Math.random() < 0.035) {
      // ambient churn, so it never settles on the same still lifes
      if (Math.random() < 0.45) {
        stamp(CYCLE[(Math.random() * CYCLE.length) | 0],
              (Math.random() * COLS) | 0, (Math.random() * ROWS) | 0);
      } else {
        colony((Math.random() * COLS) | 0, (Math.random() * ROWS) | 0,
               4 + Math.random() * 4, 3 + Math.random() * 4);
      }
    } else if (pop.length === 26) {
      // population flat for four seconds means nothing is going anywhere
      var lo = Math.min.apply(null, pop), hi = Math.max.apply(null, pop);
      if (hi - lo <= Math.max(2, alive * 0.012)) {
        stamp(Math.random() < 0.5 ? 'acorn' : 'rPentomino',
              (Math.random() * COLS) | 0, (Math.random() * ROWS) | 0);
        pop = [];
      }
    }
    dirty = true;
  }

  /* -------------------------------------------------------- compile paths
     Once per generation. Everything whose geometry does not change during the
     tween becomes a Path2D; a frame is then a few fills at different alphas. */
  // Four vignette levels, applied per cell at compile time. A CSS mask over a
  // full-screen animated canvas costs an offscreen composite on every single
  // frame; bucketing the alpha here costs nothing and looks the same, because
  // the cells are 3px dots and the banding is invisible at that size.
  var VIG = [0.30, 0.55, 0.79, 1.0];
  var pStable = [], pDying = [], pLinks = null, bornXY = [];
  var RAD = 3;

  function vigBucket(px, py) {
    var nx = (px / W - 0.5) / 0.36;
    var ny = (py / H - 0.44) / 0.32;
    var d = Math.sqrt(nx * nx + ny * ny);
    if (d < 0.55) return 0;
    if (d < 0.85) return 1;
    if (d < 1.15) return 2;
    return 3;
  }

  function compile() {
    RAD = Math.max(1.1, CELL * 0.17);
    var half = CELL / 2, c, v;
    pStable = []; pDying = [];
    for (c = 0; c < 2; c++) {
      pStable[c] = []; pDying[c] = [];
      for (v = 0; v < 4; v++) { pStable[c][v] = new Path2D(); pDying[c][v] = new Path2D(); }
    }
    pLinks = new Path2D();
    bornXY = [];
    var wireable = CFG.links !== false && CELL >= 12;

    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var i = idx(x, y), now = cur[i], was = prev[i];
        if (!now && !was) continue;
        var px = x * CELL + half, py = y * CELL + half;

        if (now && was) {
          var p = pStable[warmMask[i]][vigBucket(px, py)];
          p.moveTo(px + RAD, py);
          p.arc(px, py, RAD, 0, TAU);

          if (wireable) {                        // only wire settled neighbours
            var a, b, c, d;
            if (x + 1 < COLS) { a = idx(x + 1, y); if (cur[a] && prev[a]) { pLinks.moveTo(px, py); pLinks.lineTo(px + CELL, py); } }
            if (y + 1 < ROWS) {
              b = idx(x, y + 1); if (cur[b] && prev[b]) { pLinks.moveTo(px, py); pLinks.lineTo(px, py + CELL); }
              if (x + 1 < COLS) { c = idx(x + 1, y + 1); if (cur[c] && prev[c]) { pLinks.moveTo(px, py); pLinks.lineTo(px + CELL, py + CELL); } }
              if (x > 0) { d = idx(x - 1, y + 1); if (cur[d] && prev[d]) { pLinks.moveTo(px, py); pLinks.lineTo(px - CELL, py + CELL); } }
            }
          }
        } else if (now) {
          bornXY.push(px, py, vigBucket(px, py)); // radius tweens, so per frame
        } else {
          var q = pDying[warmMask[i]][vigBucket(px, py)];
          q.moveTo(px + RAD * 0.82, py);
          q.arc(px, py, RAD * 0.82, 0, TAU);
        }
      }
    }
    dirty = false;
  }

  /* ----------------------------------------------------------------- draw */
  function draw(t) {
    if (dirty) compile();
    ctx.clearRect(0, 0, W, H);

    if (pLinks) {
      ctx.strokeStyle = 'rgba(' + P.link + ',' + P.linkA.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke(pLinks);
    }

    var c, v, rgb;
    for (c = 0; c < 2; c++) {
      rgb = c ? P.warm : P.cell;
      for (v = 0; v < 4; v++) {
        ctx.fillStyle = 'rgba(' + rgb + ',' + (P.a * VIG[v]).toFixed(3) + ')';
        ctx.fill(pStable[c][v]);
      }
    }

    var fade = (1 - t) * P.a;
    if (fade > 0.012) {
      for (c = 0; c < 2; c++) {
        rgb = c ? P.warm : P.cell;
        for (v = 0; v < 4; v++) {
          ctx.fillStyle = 'rgba(' + rgb + ',' + (fade * VIG[v]).toFixed(3) + ')';
          ctx.fill(pDying[c][v]);
        }
      }
    }

    if (bornXY.length && t > 0.01) {
      var r = RAD * (1 + (1 - t) * 0.5), i;
      for (v = 0; v < 4; v++) {
        ctx.beginPath();
        var any = false;
        for (i = 0; i < bornXY.length; i += 3) {
          if (bornXY[i + 2] !== v) continue;
          ctx.moveTo(bornXY[i] + r, bornXY[i + 1]);
          ctx.arc(bornXY[i], bornXY[i + 1], r, 0, TAU);
          any = true;
        }
        if (!any) continue;
        ctx.fillStyle = 'rgba(' + P.born + ',' + (P.a * t * VIG[v]).toFixed(3) + ')';
        ctx.fill();
      }
    }

    if (hover >= 0) {
      var hx = (hover % COLS) * CELL, hy = ((hover / COLS) | 0) * CELL;
      ctx.fillStyle = 'rgba(' + P.hover + ',0.10)';
      ctx.fillRect(hx, hy, CELL, CELL);
      ctx.strokeStyle = 'rgba(' + P.hover + ',0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx + 0.5, hy + 0.5, CELL - 1, CELL - 1);
    }
  }

  /* ----------------------------------------------------------------- loop */
  var raf = null, last = 0, acc = 0, lastDraw = 0;
  var interval = 1000 / Math.max(1, Math.min(20, CFG.fps));
  var MIN_FRAME = 1000 / 30;    // the tween is 140ms long; 30fps is ample

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(250, now - last);
    last = now;
    acc += dt;
    var stepped = false;
    while (acc >= interval) { step(); acc -= interval; stepped = true; }

    var t = acc / interval;
    // Nothing new to show once the tween has settled, and no point redrawing
    // faster than the eye resolves it.
    if (!stepped && !hoverMoved && (t >= 0.98 || now - lastDraw < MIN_FRAME)) return;
    hoverMoved = false;
    lastDraw = now;
    draw(t);
  }

  function start() { if (!reduced && raf === null) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  /* --------------------------------------------------------------- resize */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    CELL = W < 700 ? Math.max(12, CFG.cell - 4) : CFG.cell;
    COLS = Math.ceil(W / CELL);
    ROWS = Math.ceil(H / CELL);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    allocate();
    seed();
    draw(1);
  }

  /* ---------------------------------------------------------- interaction */
  // Anything that is real content, or sits inside real content, is off limits.
  // Everything left over — section padding, grid gutters, the space around the
  // hero — is fair game. A blocklist is used rather than an allowlist so new
  // markup defaults to being clickable background, not to being inert.
  var BLOCK = 'a, button, input, textarea, select, label, iframe, ' +
              '.nav, .pcard, .oc, .oc-drawer, .post, .rootnode, .notebook, ' +
              '.series, .cs-blocks, .diagram, .life-hint, .oc-composer';
  var TEXT = 'h1, h2, h3, h4, h5, p, li, code, em, strong, b, i, span, svg, img, figure, figcaption';

  function isBackdrop(el) {
    if (!el || el === document.body || el === document.documentElement) return true;
    if (!el.closest) return false;
    if (el.closest(BLOCK)) return false;       // inside something you can use
    if (el.matches(TEXT)) return false;        // text you might want to select
    return true;
  }

  function cellAt(e) {
    var x = Math.floor(e.clientX / CELL), y = Math.floor(e.clientY / CELL);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
    return idx(x, y);
  }

  var down = false, moved = false, painted = -1;

  document.addEventListener('pointermove', function (e) {
    var ok = isBackdrop(e.target);
    var i = ok ? cellAt(e) : -1;

    if (down && ok && e.pointerType !== 'touch' && i >= 0 && i !== painted) {
      painted = i; moved = true;                // drag to paint individual cells
      cur[i] = 1; prev[i] = 0;
      dirty = true;
      if (reduced || raf === null) draw(1);
    }
    if (i !== hover) { hover = i; hoverMoved = true; if (reduced || raf === null) draw(1); }
  }, { passive: true });

  document.addEventListener('pointerleave', function () { hover = -1; hoverMoved = true; });

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!isBackdrop(e.target)) return;
    down = true; moved = false; painted = -1;
  }, { passive: true });

  document.addEventListener('pointerup', function (e) {
    if (!down) return;
    down = false;
    hint(false);
    if (moved) return;                          // that was a paint, not a click
    if (!isBackdrop(e.target)) return;

    var i = cellAt(e);
    if (i < 0) return;
    stamp(CYCLE[cycleAt++ % CYCLE.length], i % COLS, (i / COLS) | 0);
    // let analytics.js know somebody found the background (no-op if unwired)
    try { window.dispatchEvent(new CustomEvent("life:seed")); } catch (e) {}
    if (reduced) { step(); draw(1); } else { draw(1); }
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener('resize', debounce(resize, 180));
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ------------------------------------------------------------- the hint */
  // An interactive background nobody realises is interactive is just a
  // background. One quiet line, gone the moment it has done its job.
  var hintEl = null;
  function hint(show) {
    if (show) {
      if (hintEl || coarse) return;
      hintEl = document.createElement('div');
      hintEl.className = 'life-hint';
      hintEl.innerHTML = '<b></b> Conway’s Game of Life · click the background to seed it';
      document.body.appendChild(hintEl);
      requestAnimationFrame(function () { if (hintEl) hintEl.classList.add('in'); });
      setTimeout(function () { hint(false); }, 11000);
    } else if (hintEl) {
      hintEl.classList.remove('in');
      var el = hintEl; hintEl = null;
      setTimeout(function () { el.remove(); }, 700);
    }
  }

  /* ------------------------------------------------------------------- go */
  resize();
  if (reduced) draw(1); else start();
  setTimeout(function () { hint(true); }, 2600);

  // a small handle for the console, and for anyone who views source
  window.LIFE = {
    population: function () {
      var n = 0; for (var i = 0; i < N; i++) n += cur[i];
      return { alive: n, cells: N, pct: +(n / N * 100).toFixed(2) };
    },
    reseed: function () { seed(); draw(1); },
    clear: function () { cur.fill(0); prev.fill(0); dirty = true; draw(1); },
    stamp: function (name, x, y) { stamp(name, x | 0, y | 0); draw(1); },
    patterns: Object.keys(PATTERNS)
  };
})();
