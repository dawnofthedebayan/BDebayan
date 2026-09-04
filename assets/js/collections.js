/* ============================================================================
   collections.js — what each section puts inside a card.

   shelf.js knows how a collection behaves; this file knows what one is made
   of. Four configs, one per section, each answering the same short list of
   questions: what is the title, what is the one-line gist, what art goes on
   the face, what can you filter by, what connects two of these to each
   other, and what does the opened detail look like.

   Everything reads from window.SITE, so the CMS stays the only place any of
   this is edited. Adding a fifth collection means adding a fifth config here
   and a page that mirrors one of the existing four.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.SITE;
  if (!S || !window.Shelf) return;

  var esc  = Shelf.esc;
  var pic  = Shelf.picture;
  var picA = Shelf.pictureAttrs;

  /* Every detail body is the same skeleton, so one helper builds all four and
     the differences stay visible at the call site rather than buried in four
     near-identical template strings. */
  function detailShell(o) {
    return '' +
      '<button class="shelf-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="shelf-d-grid">' +
        '<div class="shelf-d-face"' + o.faceAttrs + '>' + o.face + '</div>' +
        '<div class="shelf-d-body">' +
          (o.kicker ? '<div class="shelf-d-kicker">' + o.kicker + '</div>' : '') +
          '<h3>' + esc(o.title) + '</h3>' +
          (o.gist ? '<p class="shelf-d-gist">' + esc(o.gist) + '</p>' : '') +
          (o.chips ? '<div class="shelf-d-tags">' + o.chips + '</div>' : '') +
          (o.body || '') +
          (o.links ? '<div class="shelf-d-links">' + o.links + '</div>' : '') +
          (o.related ? '<div class="shelf-d-rel"><h4>Connected to</h4><div>' + o.related + '</div></div>' : '') +
        '</div>' +
      '</div>';
  }

  /* Chips are filters on the collection page and plain labels in the drawer
     on the home page, where there is nothing to filter. A chip is only a
     button if it is one of the facets the toolbar actually offers — clicking
     something that filters down to a single item, with no chip in the row to
     show it is on, is a dead end rather than a filter. */
  function chipHTML(list, opts) {
    var live = opts && opts.live;
    var facets = (opts && opts.facets) || [];
    return (list || []).map(function (t) {
      return live && facets.indexOf(t) > -1
        ? '<button class="shelf-tag" type="button" data-shelf-chip="' + esc(t) + '">' + esc(t) + '</button>'
        : '<span class="shelf-tag is-static">' + esc(t) + '</span>';
    }).join('');
  }

  function linkBtn(label, href) {
    return '<a class="btn" href="' + esc(href) + '" target="_blank" rel="noopener">' +
           esc(label) + ' <span class="arw" aria-hidden="true">&#8599;</span></a>';
  }

  /* The two buttons every detail ends with: open the full page (from the
     home drawer only, where there is somewhere further to go) and copy a
     link that lands on this exact item. */
  function tailLinks(it, opts, page, word) {
    var out = '';
    if (opts.open) {
      out += '<a class="btn btn-primary" href="' + esc(page) + '#' + esc(it.id) + '">' +
             'Open ' + esc(word) + ' <span class="arw" aria-hidden="true">&#8594;</span></a>';
    }
    out += '<button class="btn" type="button" data-shelf-copy="' + esc(opts.key) +
           '" data-id="' + esc(it.id) + '">Copy link</button>';
    return out;
  }

  function relatedHTML(ids, titleFor) {
    return (ids || []).map(function (rid) {
      var t = titleFor(rid);
      if (!t) return '';
      return '<button class="shelf-rel" type="button" data-shelf-goto="' + esc(rid) + '">' +
               '<span class="dot" aria-hidden="true"></span>' + esc(t) + '</button>';
    }).filter(Boolean).join('');
  }

  /* ======================================================================
     1. PROJECTS
     Related projects are already written into each entry as `links`, so the
     graph is the one the content file describes rather than one inferred.
     ==================================================================== */
  (function projects() {
    var items = (S.projects || []).filter(function (p) { return p && p.id; });
    if (!items.length) return;

    var byId = {};
    items.forEach(function (p) { byId[p.id] = p; });

    /* The content file writes status two ways — a free-text `status` for the
       card and a tidier `statusKind` where someone remembered to add one.
       Normalise to the second, falling back to a slug of the first. */
    function kindOf(p) {
      var k = p.statusKind || String(p.status || '').toLowerCase().replace(/[^a-z]/g, '');
      if (/ship|releas|live/.test(k)) return 'shipped';
      if (/sunset|archiv|retir/.test(k)) return 'sunset';
      if (/develop|build|progress|wip/.test(k)) return 'building';
      return 'other';
    }
    var STATUS_LABEL = { shipped: 'Shipped', sunset: 'Sunsetted', building: 'Developing', other: 'In progress' };

    Shelf.mount({
      key: 'projects',
      page: 'projects.html',
      noun: { one: 'project', many: 'projects' },
      items: items,
      titleOf: function (p) { return p.name || p.id; },
      gistOf:  function (p) { return p.pitch || ''; },
      face:     function (p) { return pic(p.image, p.name, p.id); },
      faceAttrs: function (p) { return picA(p.image, p.id); },
      stubOf:   function (p) { return { label: p.status || STATUS_LABEL[kindOf(p)], kind: kindOf(p) }; },
      chipsOf:  function (p) { return p.stack || []; },
      /* Cards list the whole stack; the filter row keeps only the parts of it
         that two or more projects share, so it reads as "what I keep reaching
         for" rather than as an inventory. The rest is still searchable. */
      facetMin: 2,
      statusOf: kindOf,
      statuses: [
        { value: '',         label: 'any state' },
        { value: 'shipped',  label: 'shipped' },
        { value: 'building', label: 'in development' },
        { value: 'sunset',   label: 'sunsetted' }
      ],
      relatedOf: function (p) { return p.links || []; },
      haystack: function (p) {
        return [p.name, p.pitch, p.kicker, p.problem, (p.stack || []).join(' '),
                Shelf.textOf((p.built || []).join(' ')), Shelf.textOf(p.next)]
               .join(' ').toLowerCase();
      },
      sorts: [
        { value: 'featured', label: 'featured first',
          cmp: function (a, b) { return (a.tier || 9) - (b.tier || 9) ||
                                        (a.name || '').localeCompare(b.name || ''); } },
        { value: 'az',    label: 'A – Z',
          cmp: function (a, b) { return (a.name || '').localeCompare(b.name || ''); } },
        { value: 'wired', label: 'most connected',
          cmp: function (a, b) { return (b.links || []).length - (a.links || []).length ||
                                        (a.name || '').localeCompare(b.name || ''); } }
      ],
      detail: function (p, opts) {
        var built = (p.built || []).map(function (b) { return '<li>' + b + '</li>'; }).join('');
        var body =
          (p.problem ? '<div class="shelf-d-text"><h4>The problem</h4><p>' + p.problem + '</p></div>' : '') +
          (built ? '<div class="shelf-d-text"><h4>What it does</h4><ul>' + built + '</ul></div>' : '') +
          (p.next ? '<div class="shelf-why"><h4>Where it goes next</h4><p>' + p.next + '</p></div>' : '');

        var links = (p.cta || []).map(function (c) { return linkBtn(c.label, c.href); }).join('') +
                    tailLinks(p, opts, 'projects.html', 'the project');

        return detailShell({
          faceAttrs: picA(p.image, p.id),
          face: pic(p.image, p.name, p.id),
          kicker: [
            '<span class="shelf-st is-' + kindOf(p) + '">' + esc(p.status || STATUS_LABEL[kindOf(p)]) + '</span>',
            p.kicker ? '<span>' + esc(p.kicker) + '</span>' : ''
          ].filter(Boolean).join('<span class="sep" aria-hidden="true">·</span>'),
          title: p.name,
          gist: p.pitch,
          chips: chipHTML(p.stack, opts),
          body: body,
          links: links,
          related: relatedHTML(p.links, function (id) { return byId[id] && byId[id].name; })
        });
      }
    });
  })();

  /* ======================================================================
     2. WRITING
     Posts carry no ids and no relations of their own, so both are derived:
     an id from the title, and edges along each series so the graph shows
     the threads rather than a field of loose dots.
     ==================================================================== */
  (function writing() {
    var W = S.writing || {};
    var posts = (W.posts || []).slice();
    if (!posts.length) return;

    function slug(s) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '').slice(0, 60) || 'post';
    }

    /* "Building my second brain — Part 3" and its siblings are one thread;
       everything else stands alone. The series name comes from the content
       file so renaming it there renames it here. */
    var SERIES = W.seriesName || 'Building My Second Brain';
    var seriesRe = new RegExp(SERIES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'i');
    function inSeries(p) { return seriesRe.test(p.title || ''); }

    var seen = {};
    var items = posts.map(function (p) {
      var id = slug(p.title);
      while (seen[id]) id += '-x';                 // two posts, one title
      seen[id] = 1;
      return {
        id: id,
        title: p.title,
        sub: p.sub || '',
        note: p.note || '',
        date: p.date || '',
        href: p.href || W.url || '',
        flagship: !!p.flagship,
        series: inSeries(p)
      };
    });

    /* The series in the order it was written, linked end to end. */
    var thread = items.filter(function (p) { return p.series; })
      .sort(function (a, b) { return Shelf.stamp(a.date) - Shelf.stamp(b.date); });
    var neighbours = {};
    thread.forEach(function (p, i) {
      neighbours[p.id] = [thread[i - 1], thread[i + 1]]
        .filter(Boolean).map(function (x) { return x.id; });
    });

    function chipsFor(p) {
      var out = [];
      if (p.series) out.push('the series');
      else out.push('standalone');
      if (p.flagship) out.push('featured');
      var y = p.date && String(new Date(Shelf.stamp(p.date)).getFullYear());
      if (y && y !== 'NaN') out.push(y);
      return out;
    }

    Shelf.mount({
      key: 'writing',
      page: 'writing.html',
      noun: { one: 'post', many: 'posts' },
      items: items,
      titleOf: function (p) { return p.title; },
      gistOf:  function (p) { return p.sub || p.note || ''; },
      face:     function (p) { return Shelf.constellation(p.id); },
      faceAttrs: function (p) { return picA('', p.id); },
      stubOf:   function (p) {
        return { label: p.series ? 'the series' : 'essay', kind: p.series ? 'building' : 'shipped' };
      },
      chipsOf: chipsFor,
      /* Series-or-standalone is already the dropdown, so the row is left with
         years — which stay hidden until there is more than one of them. */
      facetsOf: function (p) {
        var y = p.date && String(new Date(Shelf.stamp(p.date)).getFullYear());
        return y && y !== 'NaN' ? [y] : [];
      },
      statusOf: function (p) { return p.series ? 'series' : 'standalone'; },
      statuses: [
        { value: '',           label: 'everything' },
        { value: 'series',     label: 'the series' },
        { value: 'standalone', label: 'standalone posts' }
      ],
      relatedOf: function (p) { return neighbours[p.id] || []; },
      haystack: function (p) {
        return [p.title, p.sub, p.note, p.date].join(' ').toLowerCase();
      },
      freshOf: function (p) { return Shelf.ageDays(p.date) < 30; },
      sorts: [
        { value: 'new', label: 'newest first',
          cmp: function (a, b) { return Shelf.stamp(b.date) - Shelf.stamp(a.date); } },
        { value: 'old', label: 'oldest first',
          cmp: function (a, b) { return Shelf.stamp(a.date) - Shelf.stamp(b.date); } },
        { value: 'az',  label: 'A – Z',
          cmp: function (a, b) { return a.title.localeCompare(b.title); } }
      ],
      detail: function (p, opts) {
        var links = (p.href ? linkBtn('Read on Substack', p.href) : '') +
                    tailLinks(p, opts, 'writing.html', 'the post');
        return detailShell({
          faceAttrs: picA('', p.id),
          face: Shelf.constellation(p.id),
          kicker: [
            p.date ? '<span>' + esc(p.date) + '</span>' : '',
            '<span>' + esc(p.series ? SERIES : 'Standalone') + '</span>'
          ].filter(Boolean).join('<span class="sep" aria-hidden="true">·</span>'),
          title: p.title,
          gist: p.sub,
          chips: chipHTML(chipsFor(p), opts),
          body: p.note ? '<div class="shelf-d-text"><p>' + esc(p.note) + '</p></div>' : '',
          links: links,
          related: relatedHTML(neighbours[p.id], function (id) {
            var m = items.filter(function (x) { return x.id === id; })[0];
            return m && m.title;
          })
        });
      }
    });
  })();

  /* ======================================================================
     3. CURIOSITIES
     The one collection that was already written this way. Relations are
     hand-written in `related`, and longer items carry body/why prose.
     ==================================================================== */
  (function curiosities() {
    var C = S.curiosities || {};
    var items = (C.items || []).filter(function (c) { return c && c.id; });
    if (!items.length) return;

    var byId = {};
    items.forEach(function (c) { byId[c.id] = c; });

    var STATUS = {
      settled:  { label: 'settled',  kind: 'settled' },
      chewing:  { label: 'chewing',  kind: 'chewing' },
      hunch:    { label: 'a hunch',  kind: 'hunch' }
    };
    /* "new" is only information if it distinguishes something: when half the
       collection went up on the same day, a flash on every card says nothing.
       So it only appears once the entries have spread out over time. */
    var days = items.map(function (c) { return Shelf.ageDays(c.added); })
      .filter(function (d) { return d < 1e8; }).sort(function (a, b) { return a - b; });
    var SPREAD = days.length > 2 && (days[days.length - 1] - days[0]) > 45;

    Shelf.mount({
      key: 'curiosities',
      page: 'curiosities.html',
      noun: { one: 'concept', many: 'concepts' },
      items: items,
      titleOf: function (c) { return c.title; },
      gistOf:  function (c) { return c.gist || ''; },
      face:     function (c) { return pic(c.image, c.imageAlt || c.title, c.id); },
      faceAttrs: function (c) { return picA(c.image, c.id); },
      stubOf:   function (c) { return STATUS[c.status] || { label: c.status || '', kind: 'other' }; },
      chipsOf:  function (c) { return c.tags || []; },
      statusOf: function (c) { return c.status || ''; },
      statuses: [
        { value: '',        label: 'any state' },
        { value: 'settled', label: 'settled' },
        { value: 'chewing', label: 'chewing' },
        { value: 'hunch',   label: 'a hunch' }
      ],
      relatedOf: function (c) { return c.related || []; },
      haystack: function (c) {
        return [c.title, c.gist, (c.tags || []).join(' '), Shelf.textOf(c.body),
                Shelf.textOf(c.why), c.source].join(' ').toLowerCase();
      },
      freshOf: function (c) { return SPREAD && Shelf.ageDays(c.added) < 45; },
      sorts: [
        { value: 'new', label: 'newest first',
          cmp: function (a, b) { return String(b.added || '').localeCompare(String(a.added || '')); } },
        { value: 'old', label: 'oldest first',
          cmp: function (a, b) { return String(a.added || '').localeCompare(String(b.added || '')); } },
        { value: 'az',  label: 'A – Z',
          cmp: function (a, b) { return a.title.localeCompare(b.title); } },
        { value: 'wired', label: 'most connected',
          cmp: function (a, b) { return (b.related || []).length - (a.related || []).length ||
                                        a.title.localeCompare(b.title); } }
      ],
      detail: function (c, opts) {
        var st = STATUS[c.status] || { label: c.status || '', kind: 'other' };
        var links = (c.links || []).map(function (l) { return linkBtn(l.label, l.href); }).join('') +
                    tailLinks(c, opts, 'curiosities.html', 'in the library');
        return detailShell({
          faceAttrs: picA(c.image, c.id),
          face: pic(c.image, c.imageAlt || c.title, c.id),
          kicker: [
            st.label ? '<span class="shelf-st is-' + esc(st.kind) + '">' + esc(st.label) + '</span>' : '',
            c.added ? '<span>added ' + esc(Shelf.niceDate(c.added)) + '</span>' : ''
          ].filter(Boolean).join('<span class="sep" aria-hidden="true">·</span>'),
          title: c.title,
          gist: c.gist,
          chips: chipHTML(c.tags, opts),
          body: (c.body ? '<div class="shelf-d-text">' + c.body + '</div>' : '') +
                (c.why ? '<div class="shelf-why"><h4>Why it stuck with me</h4><p>' + c.why + '</p></div>' : '') +
                (c.source ? '<p class="shelf-d-source">' + esc(c.source) + '</p>' : ''),
          links: links,
          related: relatedHTML(c.related, function (id) { return byId[id] && byId[id].title; })
        });
      }
    });
  })();

  /* ======================================================================
     4. OFF THE CLOCK
     Records, films, books and opinions. Nothing here links to anything by
     hand, so the graph joins things of the same kind — which is the only
     honest relation this list actually has.
     ==================================================================== */
  (function offclock() {
    var items = ((S.offclock || {}).items || []).filter(function (o) { return o && o.id; });
    if (!items.length) return;

    var KIND = { album: 'album', film: 'film', book: 'book', thing: 'note' };

    var sameKind = {};
    items.forEach(function (o) {
      (sameKind[o.kind] = sameKind[o.kind] || []).push(o.id);
    });

    Shelf.mount({
      key: 'offclock',
      page: 'offclock.html',
      noun: { one: 'thing', many: 'things' },
      items: items,
      titleOf: function (o) { return o.title; },
      gistOf:  function (o) { return o.blurb || o.by || o.meta || ''; },
      face:     function (o) { return pic(o.art, o.title + (o.by ? ' — ' + o.by : ''), o.id); },
      faceAttrs: function (o) { return picA(o.art, o.id); },
      /* The badge is the interesting label — "on the turntable", "reading
         now" — so it takes the pill, and the kind falls back to it when an
         entry has no badge of its own. */
      stubOf:   function (o) {
        return { label: o.badge || KIND[o.kind] || o.kind || 'note', kind: o.kind || 'other' };
      },
      chipsOf:  function (o) { return [KIND[o.kind] || o.kind].filter(Boolean); },
      /* No filter row here: the only thing worth grouping by is the kind, and
         that is the dropdown. Badges like "on the turntable" belong to one
         record each, so they stay labels on the card. */
      facetsOf: function () { return []; },
      statusOf: function (o) { return o.kind || ''; },
      statuses: [
        { value: '',      label: 'everything' },
        { value: 'album', label: 'records' },
        { value: 'film',  label: 'films' },
        { value: 'book',  label: 'books' },
        { value: 'thing', label: 'opinions' }
      ],
      relatedOf: function (o) {
        return (sameKind[o.kind] || []).filter(function (id) { return id !== o.id; });
      },
      haystack: function (o) {
        return [o.title, o.by, o.meta, o.badge, o.blurb, Shelf.textOf(o.body)]
               .join(' ').toLowerCase();
      },
      sorts: [
        { value: 'kind', label: 'grouped by kind',
          cmp: function (a, b) { return String(a.kind).localeCompare(String(b.kind)) ||
                                        a.title.localeCompare(b.title); } },
        { value: 'az',   label: 'A – Z',
          cmp: function (a, b) { return a.title.localeCompare(b.title); } }
      ],
      detail: function (o, opts) {
        var embed = o.spotify
          ? '<div class="shelf-embed">' +
              '<iframe src="https://open.spotify.com/embed/album/' + esc(o.spotify) + '?utm_source=generator" ' +
                'title="Spotify player — ' + esc(o.title) + '" loading="lazy" allowfullscreen ' +
                'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
              '<p class="shelf-embed-note">Full playback if you are signed in to Spotify — ' +
              'a 30-second preview otherwise.</p>' +
            '</div>'
          : '';
        var links = (o.links || []).map(function (l) { return linkBtn(l.label, l.href); }).join('') +
                    tailLinks(o, opts, 'offclock.html', 'the entry');

        return detailShell({
          faceAttrs: picA(o.art, o.id),
          face: pic(o.art, o.title + (o.by ? ' — ' + o.by : ''), o.id),
          kicker: [KIND[o.kind] || o.kind, o.meta].filter(Boolean)
            .map(function (x) { return '<span>' + esc(x) + '</span>'; })
            .join('<span class="sep" aria-hidden="true">·</span>'),
          title: o.title,
          gist: o.by || '',
          chips: '',
          body: '<div class="shelf-d-text">' + (o.body || esc(o.blurb || '')) + '</div>' + embed,
          links: links,
          related: ''
        });
      }
    });
  })();
})();
