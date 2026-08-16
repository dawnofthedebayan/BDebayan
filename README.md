# debayan.dev — personal site

Static site. No build step, no framework, no dependencies. Open `index.html`
in a browser and it works; push it to GitHub Pages and it works there too.

```
index.html                        markup + section scaffolding
assets/css/site.css               the whole design system
assets/js/content.js              ← every word on the site (written by the CMS)
assets/js/life.js                 Conway's Life running behind the page (canvas)
assets/js/hero.js                 root-node photo interaction
assets/js/app.js                  renders sections, theming, project edges
assets/js/offclock.js             off-the-clock carousel + the ?edit composer
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
  diagram: 'assets/img/foo.svg',     // optional
  problem: '…',                      // the technical problem
  built: ['…', '…'],                 // array; HTML allowed (<em>, <code>)
  next: '…'                          // status / what is next
}
```

Positioning in the graph is set by `nth-child` rules in `site.css` under
"Staggered placement". Five cards are laid out by hand there; a sixth will fall
back to the grid flow — add another `nth-child(6)` rule to place it
deliberately. The connecting curves are computed at runtime from `links`, so
they follow whatever layout you choose.

**Smaller projects** go in the `notebook` array instead — one line each, no
detail view. That is the pressure valve so the site does not need every project
polished.

## 4. Adding a post

Also `content.js`, under `writing.posts`. `flagship: true` gets the large card
treatment (three of those is the right number); everything else drops into the
series list below. Posts are curated by hand deliberately — no RSS fetch, no
CORS proxy, nothing that can break silently when Substack changes its markup.

---

## 5. Off the clock

A horizontal carousel of records, films, books and whatever else. Cards scroll
by drag, arrow buttons, trackpad or keyboard, and expand into a shared drawer
underneath.

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

## 6. The CMS

`./cms/start.sh` opens an editor at `http://localhost:4000/admin/` with the
live site in a pane beside it. It covers identity and hero copy, sections,
projects, the notebook, posts, off-the-clock items, image uploads, and
publishing. Full details in [`cms/README.md`](cms/README.md).

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

## 7. Deploying

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
- For a custom domain: add a `CNAME` file containing the bare domain, point an
  `ALIAS`/`ANAME` (or four `A` records) at GitHub's IPs, and tick "Enforce
  HTTPS" once the certificate issues.

Local preview without the CMS:

```bash
python3 -m http.server 8000
```

Opening `index.html` over `file://` also works — content is a `window.SITE`
object rather than a `fetch`ed JSON file specifically so that it does.

## 8. The background

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

## 9. Light and dark

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

## 10. Palette and type

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
