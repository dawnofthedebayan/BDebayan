# debayan.dev — personal site

Static site. No build step, no framework, no dependencies. Open `index.html`
in a browser and it works; push it to GitHub Pages and it works there too.

```
index.html                        markup + section scaffolding
assets/css/site.css               the whole design system
assets/js/content.js              ← every word on the site (written by the CMS)
assets/js/life.js                 Conway's Life running behind the page (canvas)
assets/js/hero.js                 root-node photo interaction
assets/js/app.js                  renders sections and theming
assets/js/shelf.js                how a collection behaves: rail, page, graph
assets/js/collections.js          what each collection puts inside a card
assets/css/shelf.css              the look of a collection, on both surfaces
projects.html                     ⎫
writing.html                      ⎬ a page per collection: search, filters,
curiosities.html                  ⎪ sort, grid or graph, detail modal
offclock.html                     ⎭
assets/img/vault-llm-architecture.svg       (and -light.svg)
assets/hero/                      the baked head-rotation sprite sheets (deployed)
photos/                           the raw head-rotation shoot (NOT deployed)
art/                              album / poster / jacket art (placeholders for now)
tools/analyse_hero_pose.py        measures head angle per frame → tools/hero_pose.json
tools/bake_hero.py                packs frames into assets/hero/*.webp
.nojekyll                         stops GitHub Pages running Jekyll
make_placeholders.py              regenerates the placeholder hero photos
make_art_placeholders.py          regenerates the placeholder carousel artwork
.github/workflows/deploy.yml      deploys to Pages on every push to main
.gitignore                        keeps cms/ and the raw frames out of the repository
cms/                              the local content manager — NOT pushed
```

---

## 0. The short version

```bash
./cms/start.sh          # edit everything at http://localhost:4000/admin/
```

Edit, hit save, watch the live preview, then **Publish** — which commits,
pushes, and lets the GitHub Actions workflow redeploy the site.

Everything below is the detail underneath that loop. See
[`cms/README.md`](cms/README.md) for the CMS itself.

### Every section is a collection

Projects, writing, curiosities and off-the-clock are all the same thing: a set
of items worth looking through. So they all work the same way, and there is
only one implementation of it.

| surface | what it is | where |
|---|---|---|
| the rail | cards on the home page that expand into a drawer underneath, with a **Browse all …** button at the end | `.shelf` in `index.html` |
| the page | the whole collection — search, filter chips, sorting, grid or graph, a detail modal, all of it shareable as a URL | `.lib` in `<collection>.html` |

`assets/js/shelf.js` is all of the behaviour and none of the content: it is
handed a config and never looks at what an item actually is.
`assets/js/collections.js` holds those four configs — title, one-line gist,
card art, what you can filter by, what connects two items, and what the opened
detail looks like. `assets/css/shelf.css` styles both surfaces.

Adding a fifth collection is a config in `collections.js`, a `.shelf` block in
`index.html`, and a copy of one of the four pages with its `data-collection`
changed. Nothing else needs to know about it.

Two details worth knowing, because they are decisions rather than accidents:

- **The chips on a card and the chips you can filter by are not the same set.**
  A card shows everything informative; the filter row keeps only what actually
  groups things, drops any facet that every item carries (filtering by "2026"
  when everything is from 2026 does nothing), and hides itself when nothing
  qualifies. Anything dropped is still findable by search.
- **The graph needs real relations.** Projects and curiosities have them
  hand-written (`links` / `related`). Writing threads a series in the order it
  was written. Off-the-clock joins things of the same kind, which is the only
  honest relation that list has.

---

## 1. Hero photos — what to shoot

The hero is a flipbook. `photos/` holds one continuous take of a **360° head
roll** — start looking straight up, roll clockwise (from your own point of
view) through left, down and right, and come back to looking up. Export it as
`photos/frame_%06d.png`. The current take is 580 frames at 1080×1080, and the
revolution closes at frame 430; the tail is just holding the up-look and gets
dropped.

- **Do not move the camera or yourself.** Tripod, marked feet, one take. The
  head roll should be the only thing that changes between frames.
- Roll steadily. The bake samples by *angle*, not by time, so an uneven speed
  is survivable — but a long pause becomes a stretch of near-identical cells.
- Turn the **eyes** with the head. A head that turns while the eyes stay
  centred reads as nothing at all.
- Square crop, plain background. The photo sits in a circular well, so the
  corners are cropped away regardless.
- Expression is yours to play with — it is a different frame every 5°, and the
  variety is half the charm.

`photos/egg.png` is separate: the easter-egg pose, straight at the lens,
clearly different (a wink, a smirk).

Nothing in `photos/` is deployed. It is ~400 MB and `.gitignore`d.

### Re-baking after a new shoot

Two steps, and only the first needs anything installed:

```bash
pip install mediapipe opencv-python numpy
python3 tools/analyse_hero_pose.py     # → tools/hero_pose.json  (slow, one-off)
python3 tools/bake_hero.py             # → assets/hero/*         (needs only Pillow)
```

`analyse_hero_pose.py` runs face-landmark detection over every frame and works
out which way the head is pointing in each one, in screen degrees (−90 up, 180
screen-left, +90 down, 0 screen-right). It writes that table to
`tools/hero_pose.json`.

`bake_hero.py` then samples frames at even angle steps and packs them into two
WebP grids — 72 poses at 384px for cursor tracking (~450 KB) and 36 at 224px
for the touch fallback (~90 KB) — plus a poster still, a shrunk easter egg, and
`assets/hero/gaze.js`. That last file is what `hero.js` reads: grid shape, cell
size, and which angle cell 0 holds. Change the pose count or cell size in
`VARIANTS` and nothing in the JavaScript needs touching.

---

## 2. How the hero interaction works

**Mouse (fine pointer)**
- The angle from the centre of the photo well to the cursor picks a cell of the
  sprite sheet, so his head points at the cursor **anywhere in the viewport** —
  he keeps watching you as you read down the page.
- The angle is eased toward its target at 18% per frame rather than snapped, so
  a flick across the page reads as a head turn rather than a cut. Cells are 5°
  apart; the easing crosses several of them on the way.
- Inside 62% of the well's radius there is a dead zone where the angle holds.
  Without it, nudging the cursor a few pixels across his face would spin his
  head a full turn.
- On top of that the whole node tilts and drifts with the cursor
  (`rotateX/rotateY` + translate, eased per frame). Satellites sit on a further
  Z plane and parallax against the photo.
- Leaving the window, or scrolling the hero out of view, eases him back to
  looking up.
- **Easter egg:** hovering "Get in touch" swaps to the egg pose. So does nine
  seconds of stillness while the hero is on screen — that one clears again the
  moment you move.

**Touch (coarse pointer)**
- No cursor, so scroll position drives it instead: one full revolution of his
  head per 1400px of page. The smaller 36-pose sheet is used.
- The node moves above the copy on small screens so it is the first thing seen.

**Degradation**, in order of how little the browser is willing to give us:

| Condition | What you get |
|---|---|
| No JS, no `<canvas>` | `assets/hero/gaze-poster.webp`, straight out of the markup |
| `prefers-reduced-motion` | the poster; no sheet is downloaded at all |
| `Save-Data` header | the poster; no sheet is downloaded at all |
| Sheet 404s or fails to decode | the poster stays up, tilt still works |
| Everything works | cursor tracking |

The poster ships in `index.html` rather than being injected by `hero.js`, so it
is the LCP element and paints without waiting for a script. The sheet is
fetched at low priority and fades in over the top; the easter egg waits for the
`load` event before it costs anything.

**Cost.** One 450 KB WebP, decoded once, then a single `drawImage` per pose
change into a canvas capped at the well's own size. No layout, no per-frame
allocation.

---

## 3. Adding a project

Everything lives in `assets/js/content.js`. Copy an existing block:

```js
{
  id: 'my-thing',                    // unique; used for graph edges
  tier: 1,                           // 1 = flagship, 2 = standard
  name: 'My Thing',
  kicker: 'Category · stack',
  status: 'Shipped',                 // keep it SHORT — it renders as a chip
  statusKind: 'shipped',             // 'shipped' (cyan) | 'active' (amber) | ''
  pitch: 'One line. What it is and why it is interesting.',
  stack: ['TypeScript', 'Python'],
  links: ['vault-llm'],              // draws an edge to that project's node
  cta: [{ label: 'Repo', href: '…' }],   // optional
  image: 'assets/img/foo.jpg',       // optional card art
  diagram: 'assets/img/foo.svg',     // optional
  problem: '…',                      // the technical problem
  built: ['…', '…'],                 // array; HTML allowed (<em>, <code>)
  next: '…'                          // status / what is next
}
```

Order in the array is the order on the rail. `links` draws the edges in the
graph view on `projects.html`, and both ends light up — a one-way link is
enough. With no `image` the card draws a constellation from the `id`, which is
a real choice rather than a gap.

## 4. Adding a post

Also `content.js`, under `writing.posts`. Posts are curated by hand
deliberately — no RSS fetch, no CORS proxy, nothing that can break silently
when Substack changes its markup. `flagship: true` tags one as featured; posts
whose title carries `writing.seriesName` are threaded together in the order
they were written, which is what the graph view on `writing.html` draws.

---

## 5. Off the clock

Records, films, books and whatever else, on the same rail as everything else.
An entry's `badge` ("On the turntable", "Reading now") is what shows on the
card; `kind` decides the colour and is what the filter dropdown on
`offclock.html` groups by.

### Adding an item

Two ways, same result.

**By hand** — copy a block in the `offclock.items` array in `content.js`:

```js
{
  id: 'kind-of-blue',              // unique, kebab-case
  kind: 'album',                   // album | film | book | thing
  title: 'Kind of Blue',
  by: 'Miles Davis',
  meta: '1959 · Columbia',         // small line in the drawer kicker
  badge: 'On the turntable',       // optional pill on the card
  art: 'art/kind-of-blue.jpg',     // optional
  blurb: 'One line for the card.',
  spotify: '1weenld61qoidwYuZ1GESA', // optional; album ID only
  body: 'The long version. <em>HTML allowed.</em>',
  links: [{ label: 'Sleeve notes', href: '…' }]   // optional
}
```

**With the CMS** — `./cms/start.sh`, then the *Off the clock* tab. This is
the main path now; the two below still work if you would rather not start a
server.

**With the in-page composer** — open the site with `?edit` on the end
(`…/index.html?edit`, or `#edit`). A panel appears bottom-right: fill the
form, hit *Preview* to drop it into the carousel for that page load, hit *Copy
block* to get the snippet, paste it into `content.js`. It saves nothing
anywhere — no backend, no localStorage, nothing that could mislead you into
thinking a change was published. **Visitors never see it**; the panel is only
created when that query string is present.

### Music

Albums with a `spotify` field get an embedded player in the drawer. The value
is the album ID only — from `open.spotify.com/album/`**`3PRoXYsngSwjEQWR5PsHWR`**,
take the bold part. Films can carry one too; *Arrival* points at the
Jóhannsson score.

The iframe is created the first time that item is opened and destroyed when
the drawer closes, so the page never ships three embeds on load and nothing
keeps playing after you close it. Visitors signed in to Spotify hear the full
album; everyone else gets a 30-second preview. Spotify controls the player's
appearance — it does not follow the site theme.

### Artwork

Drop images into `art/` and reference them by path. Any aspect ratio works:
the card puts a blurred copy behind a sharp one, so square album covers and
2:3 posters both sit correctly in the same square frame without cropping.
Around 800–1200px on the long edge is plenty.

Items with no `art`, or whose image fails to load, fall back to a
constellation generated from the item's `id` — deterministic, so the same item
always draws the same figure. That is why the `thing` cards (biryani,
handstands) look intentional rather than empty.

One note on rights: album covers, posters and book jackets are somebody else's
copyright. Small editorial use on a personal site is normal practice, but the
placeholders shipped here are generated, so nothing you did not choose to add
is in your repo.

## 6. My curiosities

Concepts, written out in my own words. Like every other section it feeds two
surfaces — the rail on the home page and `curiosities.html` — through
`shelf.js` and its config in `collections.js`. It is the collection with the
richest per-item content, so the shape below is worth knowing.

### The shape of a concept

```js
{
  id: 'streisand-effect',        // the permalink and the graph key
  title: 'The Streisand effect',
  gist: 'One line. This is what the card shows.',
  tags: ['psychology', 'internet'],
  status: 'settled',             // settled | chewing | hunch
  added: '2026-08-16',           // YYYY-MM-DD, drives newest-first
  source: 'Who named it, and when.',
  image: 'art/streisand.jpg',    // optional
  imageCaption: 'optional',
  body: 'The explanation. <br><br> between paragraphs, <em> works.',
  why: 'Why it stuck with you — pulled out into its own block.',
  links: [{ label: 'Wikipedia', href: 'https://…' }],
  related: ['cunninghams-law']   // edges in the graph view
}
```

`status` is the honest bit: **settled** means I think I understand it,
**chewing** means I am still turning it over, **hunch** means I might be wrong.
It shows as a pill on every card and filters on the library page.

`related` is treated as undirected — writing it on one side is enough, the
graph draws the edge and both detail panels show the chip.

### The collection page

This part is the same on all four pages. Search matches everything the config
puts in its haystack — for a concept that is the title, gist, body, why and
tags — with the HTML stripped first, so a word buried inside an `<em>` still
finds it. Multiple words are ANDed. Filter chips are ANDed too: pick two and
you get only what carries both.

Everything is in the URL: `?q=`, `?tag=a,b`, `?status=`, `?sort=`,
`?view=graph`, and `#concept-id` for a single concept. A filtered view is a
link you can send someone, and the back button steps through the states you
actually visited.

`/` focuses the search box. `Escape` closes what is open. `←` and `→` walk
through the filtered list without closing it. The dice button opens one at
random from whatever is currently filtered in.

### The graph view

Nodes are items, edges are whatever that collection counts as a relation, and
node size is how many connections a node has. The layout is a small spring simulation run once at open and
cached — no animation loop sitting behind the page. Hovering isolates a
neighbourhood; filtering dims what falls outside it rather than removing it,
so you can see what you excluded.

### A note on the eight starter concepts

The ones that shipped with this section are **my prose, not yours** — they are
scaffolding so the page had something in it. The whole premise is "in my own
words", so rewrite them. The CMS makes that quick: *Curiosities* tab, expand a
row, and the two fields that matter are **In your own words** and **Why it
stuck with you**.

### Pictures

Optional. A concept with no picture draws a constellation seeded from its id —
stable across reloads, different for every concept, and it keeps the cards
tied to the node-graph the rest of the site is made of. Add one through the
CMS (*Media* tab or the **Choose** button on the concept) if a diagram or a
photograph says it better.

---

## 7. The CMS

`./cms/start.sh` opens an editor at `http://localhost:4000/admin/` with the
live site in a pane beside it. It covers identity and hero copy, sections, the
four collections and their page headings, image uploads, and publishing. Full
details in [`cms/README.md`](cms/README.md).

Two things worth stating plainly:

**It never reaches GitHub.** `cms/` is the first line of `.gitignore`, so it is
not tracked, not committed, not pushed, and not in the artifact the deploy
workflow uploads. Clone the repo somewhere else and you will not get the CMS
with it — copy the folder over by hand.

**It writes `content.js` and nothing else.** That file is a plain JSON
assignment (`window.SITE = { … }`) precisely so a machine can rewrite it
safely. A backup goes into `cms/backups/` before every save; a save that would
produce invalid JSON is refused rather than written.

Hand-editing still works exactly as before, and the two approaches can be
mixed — the CMS reads whatever is on disk when it starts.

### Sections

Sections are data now, not markup. `content.js` carries a `sections` array:

```js
{
  id: 'projects',        // also the #anchor
  type: 'projects',      // projects | writing | offclock | contact | custom
  enabled: true,         // false hides it, keeping the content
  inNav: true,
  nav: 'projects',       // nav text; falls back to `label`
  navShort: 'projects',  // nav text under 760px
  label: 'Projects',     // the small phosphor label
  title: 'Five nodes, one graph.',
  intro: '…'
}
```

Array order is page order. Anything not in the array is removed from the page
entirely, which is how deleting a section works. A `type: 'custom'` section
also carries `blocks: [{ title, meta, text, href, linkLabel }]`, rendered as
cards in the same style as the writing section.

## 8. Deploying

Push to `main` and `.github/workflows/deploy.yml` does the rest: it checks that
`content.js` still parses and reports what it found, then uploads the repo and
deploys it to Pages. No build, no npm install, no lockfile.

**One-time setup:** Settings → Pages → Build and deployment → Source →
**GitHub Actions**. (Not "Deploy from a branch" — that is the older path and it
ignores the workflow.)

Then, from a clean checkout:

```bash
cd path/to/dawnofthedebayan.github.io
# copy the site in, with index.html at the repo root
git add -A
git commit -m "New site"
git push origin main
```

The Actions tab shows the run; the first one takes a couple of minutes.

Notes:

- `.nojekyll` is included and matters — without it GitHub runs the files
  through Jekyll, which ignores directories beginning with an underscore.
- Every path in the site is relative, so it also works from a project repo
  served at `/repo-name/`.
- The canonical URL is **https://www.bdebayan.com** — see below.

### The custom domain

The site answers on **www.bdebayan.com**. Two things make that work, and only
two:

1. **Settings → Pages → Custom domain** = `www.bdebayan.com`.
2. A DNS `CNAME` record: `www` → `dawnofthedebayan.github.io`.

There is **no `CNAME` file in this repo, and there should not be.** That file
is how the older "deploy from a branch" path carries the domain. This repo
deploys from a custom Actions workflow, and GitHub's docs are explicit that in
that case the file is ignored and not required — the domain lives in the Pages
setting alone. Adding one does nothing; adding a *wrong* one does nothing
either, which is worse, because it looks like it should work.

The apex (`bdebayan.com` with no `www`) is a redirect to `www`, done at the
DNS layer rather than by GitHub.

Absolute URLs — `canonical`, `og:url`, `sitemap.xml`, the `Sitemap:` line in
`robots.txt` — all name `https://www.bdebayan.com`. Everything else in the
site is a relative path, so nothing else has to change if the domain ever does.

### Cloudflare in front

Cloudflare proxies the domain. The order of operations matters and is not
recoverable if you get it wrong on the first pass:

1. DNS records go in **DNS-only** (grey cloud) first.
2. Wait for GitHub to issue the Let's Encrypt certificate — Settings → Pages
   stops saying "certificate not yet created". Usually minutes.
3. Tick **Enforce HTTPS** in the Pages settings.
4. *Then* flip the records to **Proxied** (orange cloud).

If you proxy first, GitHub cannot reach the domain to validate it, the
certificate never issues, and "Enforce HTTPS" stays greyed out.

One setting is non-negotiable: **SSL/TLS → Overview → Full** (or Full strict).
The default on some accounts is *Flexible*, which talks to GitHub over plain
HTTP; GitHub answers by redirecting to HTTPS; Cloudflare follows it back to
itself, and the browser gives up with `ERR_TOO_MANY_REDIRECTS`. It is not a
subtle failure and it is the single most common way this setup breaks.

What Cloudflare is actually here for, in order of how much it matters:

- **Seeing the traffic GoatCounter cannot.** The analytics beacon is
  JavaScript, so it only ever sees browsers that run it. Scrapers do not.
  Cloudflare sits in the request path, so its analytics count every request —
  which bots, how often, what they asked for.
- **Enforcing `robots.txt` instead of asking.** The AI-crawler rules in
  `robots.txt` are advisory; a scraper that ignores the file is not stopped by
  it. Cloudflare's **Block AI bots** toggle blocks the same crawlers at the
  edge, where "no" means no.
- **Caching.** Pages has a 100 GB/month soft bandwidth limit. Cached requests
  never reach it.

It is *not* meaningfully a security layer, and it is worth being clear about
why: this is static HTML on someone else's CDN. There is no server to
compromise, no database, no login, no form that writes anywhere. A WAF in
front of it is guarding a building with no doors.

Local preview without the CMS:

```bash
python3 -m http.server 8000
```

Opening `index.html` over `file://` also works — content is a `window.SITE`
object rather than a `fetch`ed JSON file specifically so that it does.

## 9. The background

Conway's Game of Life, B3/S23, running behind everything on a canvas.

**It is interactive.** Click any genuinely empty part of the page and it stamps
a pattern — the click cycles through a glider, an r-pentomino, a lightweight
spaceship, an acorn and a pulsar seed, each randomly rotated and reflected, so
no two clicks look the same. Drag across the background to paint individual
cells. The cell under the cursor is outlined so you can see what you are about
to hit.

Clicks on anything usable — a link, a button, a card, a heading, a paragraph —
are ignored. `life.js` decides this with a *blocklist* rather than an
allowlist, so markup you add later defaults to being clickable background
rather than silently inert. A one-line hint appears after a couple of seconds
and disappears the first time you click, or after eleven seconds.

**It does not die.** Any Life soup collapses into still lifes and short
oscillators within a couple of minutes, which for a background means it
freezes. Three things prevent that: the grid is a torus so gliders wrap around
the viewport instead of falling off the edge; if the population drops below 5%
a fresh colony is dropped in; and if the population stops moving for four
seconds — the signature of nothing but still lifes — it gets an acorn or an
r-pentomino to chew on. There is also a small chance per generation of ambient
churn, so it never settles into the same arrangement twice.

**It stays a background.** A vignette dims cells behind the reading column so
text always wins, and the field lives mostly in the margins. Live cells render
as nodes with wires between settled neighbours, which keeps the graph motif —
colonies genuinely look like clusters forming and dissolving.

Settings live in `content.js` under `background`, or in the CMS under
*Site & hero*:

```js
background: {
  cell: 17,        // px per cell; 14–22 is the useful range
  fps: 7,          // generations per second; above ~12 it flickers
  density: 0.14,   // how much of a seeded colony starts alive
  links: true      // wire adjacent live cells together
}
```

`prefers-reduced-motion` stops the simulation entirely: you get one static
generation, and clicking advances it by exactly one step. Tab hidden pauses it.

**On cost.** Generations run at 7/s but the display refreshes at 60, so
redrawing the whole grid every frame would be waste. Each generation compiles
its cells into `Path2D` objects once; a frame is then a dozen fill calls at
different alphas, with only newborn cells rebuilt per frame, capped at 30fps,
and skipped altogether once the tween settles. Measured in a software
rasteriser with no GPU at 1920×1080, the page runs at 28.9fps with Life on
versus 31.5fps with the canvas hidden — i.e. the simulation is close to free
relative to what the renderer costs anyway.

From the console: `LIFE.reseed()`, `LIFE.clear()`, `LIFE.population()`,
`LIFE.stamp('glider', x, y)`, `LIFE.patterns`.

## 10. Light and dark

There are two themes and a toggle in the nav (the knob is a graph node
travelling along an edge). Resolution order:

1. A saved choice in `localStorage` under the key `theme` wins.
2. Otherwise the OS preference (`prefers-color-scheme`) decides, and the site
   keeps following the OS live — flipping macOS to dark flips the site — right
   up until the visitor touches the toggle, at which point their choice sticks.

An inline script in `<head>` sets `data-theme` on `<html>` **before first
paint**, so there is no white flash on a dark-mode load. Don't move it below
the stylesheet.

Everything theme-dependent lives in two token blocks at the top of `site.css`
(`:root` for dark, `[data-theme="light"]` for light). Nothing downstream
hardcodes a colour, so retinting the whole site — including the background
canvas — is a matter of editing those two blocks.

Three things worth knowing if you change it:

- **The canvas reads its palette from CSS.** `life.js` pulls `--life-cell`,
  `--life-born`, `--life-warm`, `--life-link` (bare `r,g,b` triples, no
  `rgb()` wrapper) and re-reads them on the `themechange` event. Keep the
  format.
- **Light is not an inversion.** The phosphor cyan darkens to `#097266` so
  small mono labels still clear 4.5:1 on paper; glows become shadows; the
  scanline overlay drops from 0.55 to 0.20 opacity.
- **Type shifts with the theme, deliberately.** Dark-on-light reads thinner
  than light-on-dark, so light mode runs Space Grotesk at 415/530 instead of
  400/500, opens mono tracking by 0.015em, and turns off `-webkit-font-
  smoothing: antialiased`. This is why the font is loaded as a variable font
  (`wght@400..700`) rather than fixed weights.

**Diagrams need two files.** Anything in a `diagram:` field ships as a pair —
`foo.svg` and `foo-light.svg` — because an SVG loaded through `<img>` can't see
the page's CSS. `app.js` swaps the `src` on theme change. If you add a diagram
and skip the light variant, it will 404 in light mode.

## 11. Palette and type

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0A0C16` | `#F4F6FC` | substrate |
| `--surface` | `#121629` | `#FFFFFF` | cards |
| `--phos` | `#34E2C0` | `#097266` | nodes, links, active state |
| `--amber` | `#F2A44E` | `#A65E0B` | active/hovered edges, in-progress status |
| `--violet` | `#7C6BF0` | `#4F40C4` | secondary node type |
| `--text` | `#E9ECF8` | `#0E1322` | primary ink |
| `--life-cell` | `52,226,192` | `14,156,134` | Life cells (bare `r,g,b`) |
| `--life-born` | `150,255,226` | `8,110,96` | the flash as a cell is born |
| `--w-body` / `--w-head` | 400 / 500 | 415 / 530 | type weights |

Type is **Space Grotesk** (display and body, variable weight) and **IBM Plex
Mono** (labels, metadata, stack chips), loaded from Google Fonts.
