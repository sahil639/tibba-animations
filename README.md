# Tibba Design Studio — working site

Every section of the site, and every page built for that section, behind one
index. Each page is a self-contained HTML file: no build step, no bundler.
`node dev-server.mjs` and open <http://localhost:8794>.

## The shape of it

`index.html` is the index — it renders `assets/manifest.js` and nothing else.
One entry per section; under each, the pages built for it. At the top, on its
own, sits **Tibba Design Studio — final website**: the assembled site, which is
where all the sections below eventually land.

Every page carries the same chrome, from three lines in its `<head>`:

| Where | What |
| --- | --- |
| Top left | The site menu. Collapsed by default; open it and the whole index is there, so you can go from any page to any other without going home. |
| Right edge | The dock. That page's own controls, full height, resizable by dragging its left edge, `\` to show and hide. |

The dock does not rebuild a page's controls — it **moves** them. `wb.adopt()` in
`assets/workbench.js` picks up `#ui` or `#tune` and appends it into the dock,
and because moving a node keeps its listeners, every slider still drives the
animation it was wired to with nothing changed in the page itself.

## The full page

Every page on the index has a checkbox. Tick the sections you want and
**Open full page** (the bar above the sections) stacks them, in index order,
on `full-page.html` — the site read as one page. The choice is kept in this
browser (`localStorage`, `tibba.fullpage`).

Each ticked page is a block as tall as its own page, holding a sticky,
viewport-sized frame of it whose document is scrolled along with the outer
page — so pinned scenes pin and scroll reveals run exactly as they do on
their own. Inside a frame `assets/workbench.js` runs in embed mode: no menu,
no dock, no panel, and wheel/touch are handed to the outer page. Frames load
as they come near the screen and unload when far away (`FULLPAGE_CONFIG`).

Top left is the mark (`assets/logo-morph.js`, `LOGO_MORPH`): the peak with
the up-arrow cut out of it, in five forms — the mark, turned, centred, with a
shoulder peak, a range — collapsing into its base and springing up as the
next form every `logoStep` viewports of scroll, and cycling while hovered.

## What's new

The index opens with **Since your last visit**: every page changed in the last
48 hours, newest first, with what changed. Each of those pages also carries a
**New** tag on its index row and a dot in the site menu on every page.

What counts as changed is written by hand in `assets/manifest.js`, as two fields
on the page's entry:

```js
{ id: 'summits-four', updated: '2026-09-28T19:09:00+07:00',
  change: 'New: four peaks, Bézier trails, cards bottom-left', ... }
```

By hand on purpose: a site-wide edit touches every file, and a date read off
git would flag the whole site. Set `updated` to now when a page changes in a
way worth pointing at.

What counts as seen is per browser (`localStorage`, key `tibba.seen`), so each
person clears their own tags and nobody else's. A tag clears once it has been
on screen long enough to play, once its page is opened, or all at once with
**Mark all as seen**. Changing a page again brings its tag back.
The logic is `assets/whats-new.js`.

## Sections and pages

| Section | Pages |
| --- | --- |
| **Final website** | `final-website.html` — the assembled home page |
| Hero section | Contour Ridge, Scroll hero, Three summits, Range, Peak |
| Metrics · Brands · Extra case studies · Our services · Our testimonials · Our studio · Footer | one stub each |
| Our summits | Three summits and Range — copies of the hero pages, free to diverge |
| About us — hero · description · team · foundations, and About us itself | one stub each |
| Case study pages | Groww, Firstpost, Breathe ESG, Shyft & Mindhouse |
| Contact page · Services page | one stub each |
| Miscellaneous animations | Diagonal Roll, Card Fan, Dither Lab |

Adding a page means adding a line to `assets/manifest.js`. The index and the
menu on every page both read it, so nothing else needs touching.

A stub is a real page with nothing designed into it — the type, the workbench
and a placeholder saying which section it is. Replace everything between the
comment markers and drop `assets/stub.css`.

## The site

`final-website.html`, `about.html` and the four `case-*.html` files are the site
itself rather than studies for it. They share five files, and nothing in them is
duplicated between pages:

| File | What it is |
| --- | --- |
| `assets/site.css` | The tokens, the 1600px cap, the nav, the footer, the odometer's reels |
| `assets/site-chrome.js` | The nav and footer markup, rendered into every page |
| `assets/odometer.js` | Both odometers — see below |
| `assets/range-scene.js` | The mountain, lifted out of `tibba-range.html` |
| `assets/cases.js` · `case.js` · `case.css` | One case study template, four data objects |

The palette is measured off the live site rather than invented: the ground is
`#161617`, body copy sits on a warm `#E8E3DC` rather than white, and the single
accent is `#E85D3D`, the orange on the summit rings. The face is the same F37
Analog the reference uses.

## The odometer

The site's one piece of signature motion, and the reference's own. Two
mechanisms, because a word and a measurement do not roll the same way.

**`roll()`, for type.** Every character becomes a reel and rolls a fixed
distance onto itself. The glyphs it passes through are not random. Read the
live site's DOM and a `T` comes out as `T·0·7·E·T`, an `A` as `A·H·O·V·A`, an
`S` as `S·Z·6·D·S` — that is the 36-glyph ring `A–Z0–9` stepped by **seven**,
three steps out and back:

    ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
    T = 19 → 26 '0' → 33 '7' → 40 mod 36 = 4 'E' → back to 19 'T'

A fixed stride around a fixed ring is what gives every character in a word the
same rhythm, and the strip opens and closes on the real glyph, so a word is
never briefly wrong — only briefly in motion.

Each reel is sized to **its own character**, with a hidden copy of that glyph
holding the box open and the moving strip laid over it. Sizing a cell to its
widest glyph instead is what turns a heading into `Ti bba Desi gn`: an `i`
takes a `0`'s width and the spacing comes apart.

**`count()`, for measurements.** Reels of 0–9, each column offset by its own
place's continuous value, so a column turns over at the moment the one to its
right passes nine. The units wheel turns continuously and every wheel above it
stands still until it is carried. Lifted from `tibba-peak.html`, where the
summit's elevation does the same thing.

Mark up with `data-odo` or `data-odo-count` and it fires once, when it is
first actually on screen. `data-odo-hover` re-rolls a label on hover;
`data-odo-hold` on an ancestor means something else owns the timing, which is
how the loader drives the hero title.

## The mountain, twice

`assets/range-scene.js` is `tibba-range.html`'s scene with that page taken out
of it. What came out: the case cards, the progress rail, the phase machine, the
pill nav, the scroll handler, the keyboard walk and the tuning panel. What
stayed is every line that makes the mountain look the way it looks.

Nothing in the drawing was retuned, and the two modes are not two scenes — they
are one scene with a different peak revealed, driven through the same
`rangeReveal` number the original faded the range up with:

- **`mode: 'hero'`** — the studio's massif alone. The four client summits are
  still in the heightfield, because they are part of the same terrain, but are
  never revealed.
- **`mode: 'range'`** — the four clients, as line, walked one at a time. The
  studio's peak stays in the foreground, which is where the original leaves it
  once the hero has drained. Holding it back does not remove it: the terrain is
  one mesh and its depth still occludes, so an unrevealed peak is a
  mountain-shaped hole with no contours on it.

One thing the extraction had to put back. On `tibba-range.html` the hero
camera's station was never computed explicitly — the tuning panel bound a
slider to `HERO_CAM.elev` and ran it once on setup, and *that* was what first
filled `H_POS` and `H_TGT`. Strip the panel for production, as this had to, and
the camera sits at the origin inside the mountain. `applyHeroCam(false)` is now
called where the constants are declared.

## The walk through the summits

Section four is the original page's case walk, with the studio peak's ink phase
taken off the front of it — that phase is the hero now, and running it twice on
one page would be the same move twice. Everything after it is unchanged: the
survey camera flies to a summit, the rest of the range recedes, the route walks
up it in the project's colour, the summit's marker lands, and the band comes up
at the foot of the frame.

Four bands over a 500vh sentinel, one per summit. There is no wide
establishing shot in front of them: the section **opens** on the first summit —
`openOn(0)` puts the camera on that station at boot rather than flying to it —
so the first frame of the section anybody sees is the shot itself. What plays
on arrival is the climb.

A band, not a point. A flight takes between 1.5 and 3 seconds depending on how
far the camera has to go, and the climb takes another 2.4 on top of it, so a
summit needs a stretch of scroll long enough to finish arriving before the next
one is asked for. That is also why the index is quantised rather than scrubbed:
you cannot scrub a flight, and a camera given a new destination sixty times a
second never reaches any of them. The flight's duration comes back out of
`walkTo()` because the band has to be timed against it — it is different for
every hop, so it cannot be a constant on the page.

The stage is `100svh` with no `min-height`. A minimum is what breaks the
promise that it fills the viewport and no more: on any window shorter than it,
the stage runs past the bottom of the screen and the band at its foot goes with
it. `svh` — the small viewport height — also means it does not resize when a
mobile browser's chrome slides away mid-scroll.

The section's furniture is positioned **absolutely inside the sticky stage**,
where the original used `position: fixed`. The original could, because the range
owned the whole document; here it is one section of seven, and a fixed band
would float over the services on the way past. A viewport-sized sticky box puts
absolute children in the same place and stops them existing at the section edge.

## There is no sky colour

Worth knowing before trying to change the background of either scene: none of
its materials declare `fog: true`, so `THREE.Fog` was never reaching them. The
aerial fade is the shaders' own `vFog`, and it fades **alpha** rather than
mixing toward a colour — so the distance haze is literally whatever is painted
behind the canvas. **The sky of this scene is the page's own background**, and
there is no sky colour in the scene to set.

Which is why the range section is `background: #000` and the ground plane is
black: match them and the horizon has no seam in it at all. The navy the scene
used to carry lived in three places — the ground plane, the `paper` tone a
drained peak settles onto, and a dead `THREE.Fog` — and all three are neutral
now. The contour lines keep their blue: they are the drawing, not the ground.

## The hero's three states

One 300vh sentinel, read as a fraction rather than as counted wheel events — a
trackpad emits forty events for one flick and a mouse emits one, so counting
them makes the hero behave differently on different hardware, and a count
cannot be scrubbed backwards.

| Fraction | State |
| --- | --- |
| 0.00 – 0.12 | The zoomed-out range the loader ends on. Nothing happens on the first nudge. |
| 0.12 – 0.52 | The ink: the fill drains out of the peak and it is redrawn as its own contours. |
| 0.52 – 0.88 | Back in close on the summit, with the hover rings live. |

The rings only come on where they are legible — they need line-work under them,
which the ink state produces, and they need the close camera, or a ring around
one contour at 126 units out is a hairline.

The loader is not a spinner in front of a page that is still arriving: the
scene is already running underneath it, camera in among the contours near the
summit, and the sheet is over the top of it while the heightfield builds. When
it lifts, what is revealed is the camera already pulling back. It lifts on a
timeout as well as on an animation frame, because a background tab gets no
frames at all and would otherwise sit on the loader indefinitely.

## What is waiting on assets

The case study pages are carried on the clients' own screenshots, which are not
in this repo. Every one of those is a labelled plate at the right size in the
right place in the scroll, captioned with what belongs in it. The layout, the
rhythm and the scroll are finished; the images are the one part waiting on a
hand-off.

The brand logos (`assets/logos/`, viewBoxes cropped to their ink) and the team
cut-outs (`assets/people/`) are in. Firstpost is the one brand still set as a
wordmark: no artwork for it came with the logos.

## Type

**F37 Analog**, in `assets/fonts`, declared once in `assets/type.css` and linked
by every page. It replaced Hanken Grotesk, Lora and the system monospace the
control panels used to be set in; the panels keep tabular figures so a readout
does not jump a pixel as a slider moves. These are the trial cuts — swapping in
the licensed ones means changing six `url()`s in that one file.

## How the animations are drawn

A heightfield is generated procedurally at load, contour lines are extracted
from it with marching squares, and those lines are drawn as screen-space ribbons
so stroke widths stay exact at any pixel density. Each ribbon is mitred at its
joins, so a stroke keeps one width all the way round a corner.

Every contour is snapped back onto its own level set, resampled at an even step,
then corner-cut twice with Chaikin's algorithm, which converges on a quadratic
B-spline. Closed rings are treated as closed throughout, so there is no seam and
no flat spot where a loop meets itself.

The terrain is solid, not hollow. A depth-only pass renders the surface
invisibly so contours behind a mountain are genuinely occluded. That same pass
tags each fragment with how much it belongs to the mountain in focus, and a
further pass reads the boundary of that region as a screen-space distance field
— a single outline sitting entirely outside the mountain, offset by an
adjustable margin.

WebGL2 is needed for the outline; WebGL1 renders everything else.

`tibba-range.html`, `summits-range.html` and `tibba-peak.html` are the exception:
they use Three.js and GSAP from a CDN, so unlike the contour files they need a
network connection at runtime. They run the same field → marching squares →
ribbons pipeline, ported to Three.js.

## Atmosphere

The ridge pages carry a shared sky layer: outlined clouds drifting right to left
and a few small birds. It is a 2D canvas over the scene rather than scene
geometry, so it costs one draw and drops onto either engine without touching a
shader — the trade is that clouds pass in front of the peaks rather than between
them. Each cloud is the union silhouette of a row of puffs, sampled as an upper
envelope: stroking the puffs individually draws their internal edges and reads
as a fence, and a radially modulated circle reads as a starburst.

## Interaction

**topo-hero.html** — the scene tilts with the cursor and the terrain bulges under
the pointer, with a ray cast against the heightfield each frame so the reaction
lands where you actually point. Clicking the orange summit ring opens its marker
panel.

**topo-hero-scroll.html** — the ridge owns the first viewport, then rotates,
scales down and locks to the left at 45% opacity as the page scrolls. Once locked
it keeps its micro-animation: dotted rings drifting along their arc length,
mid-flank undulation, and the cursor wave.

**topo-peaks.html** — Kilimanjaro, Fuji and the Matterhorn, each modelled to its
own character. Scroll, drag, arrow keys or the rail move focus between them; the
section owns the wheel, so the page itself never scrolls.

**tibba-range.html** — a scroll-driven range with case cards, the route to each
summit drawn as a screen-space ribbon in the client's colour.

**misc-diagonal-roll.html** — a procession of objects crossing the frame on one
diagonal, bottom-right to top-left, forever. Built against a frame-by-frame read
of the Studio Loop hero: the travel angle (-144°), the pace (0.133 viewport-widths
per second), the tile size (~19% of the viewport) and the stacking order are
measured off a capture of it rather than guessed.

That capture also showed what the eye misses — the reference does not drift, it
moves in kicks, roughly one every 1.3 s decaying to a stop, because that hero is
driven by the scroll wheel. `motion: 'pulse'` reproduces that cadence from the
measured numbers and `motion: 'scroll'` hands it back to the wheel; the default,
`drift`, is the continuous crossing. Every control is in the dock.

**misc-card-fan.html** — a hand of cards on an arc; hovering one springs it up
and letting go drops it back past its resting place before it settles. Measured
off the Studio Loop footer: cards 21.4% of the viewport wide, 16° of turn
between neighbours, the outermost sitting 14.9% lower than the middle one. On
hover a card lifts 24% of its own height **along its own axis** — a card leaning
17° goes up and to the left — and rotates 5.5° *further* from vertical rather
than straightening.

The bounce is one spring per card (ζ = 0.33, ω = 10 rad/s, both measured), not a
tween: a value, a velocity and a target, integrated every frame. Everything
visible — lift, rotation, scale, shadow, stacking — is driven off that one
number, and the recoil is simply the spring passing its rest position on the way
back, overshooting by a third of the lift with a 0.33 s half-swing. A spring is
also what makes a flicked cursor survivable: it takes a new target and keeps its
velocity, where a tween would have to be interrupted and restarted.

**tibba-peak.html** — the summit's three accent rings are their own object, so
they lift and brighten on hover without the mountain moving with them. Clicking
them runs one GSAP timeline: the camera closes the distance, a leader draws from
the rings to the definition, and an odometer runs to the elevation underneath the
sentence being revealed. **Esc** returns.

All of them respect `prefers-reduced-motion`.

## Tuning

### The config objects

Each page below keeps every tunable in one named object, and its panel (the
dock, `\` to show) writes into that same object live. Where a page has a
**Copy config** button, it puts the current values on the clipboard as a
ready-to-paste literal — paste it over the object to make them the defaults.

| Page | Object (file) | What it holds |
| --- | --- | --- |
| Four Summits | `SUMMITS_CONFIG` (`assets/four-summits.js`) | `scroll.thresholds` / `hysteresis` / `height` — when each summit takes over; `camera.duration` / `ease` / framing; `path.defaults` + `path.perSummit[i]` — draw duration & ease per summit, `afterCamera`, width; `cards` — side, `clearance`, `offsetX/Y`, per-summit overrides, fade in/out, delay, slide |
| Metrics | `METRICS_CONFIG` (`assets/metrics.js`) | `scroll.openAt` / `closeBelow`, `stagger`, `open` / `close` duration & ease, `order`, `layout` (cluster frame and each box's x/y/w/h) |
| Brands, Brands — mosaic | `LOGO_CONFIG` (`assets/brand-logos.js`) | optical `size`, `maxWidth` / `maxHeight` (× tile) and `…Px` caps, `grayscale`, `restOpacity`, `hoverDuration` / `hoverEase`; per-logo `weight` and `lift` in `LOGOS` |
| Case reel | `CAPTION` (`case-studies-reel.html`) | `padX`, `padBottom`, `activeAt` + `hysteresis`, fade in/out, delay, rise |
| Shifting Topo, Compass | `SERVICES_SPLIT_CONFIG` (`assets/services-split.js`) | `boxGap`, `boxPad`, `subGap`, `subAlign` (top · center · bottom), `boxMinHeight` |
| Compass | `COMPASS_OVERLAYS` (`services-compass.html`) | one flag per removed vector overlay (rings, dot ring, inner ring, brackets, chevrons) |
| Shifting Topo | `THREE_PEAKS_CONFIG` (`assets/three-peaks.js`) | per-peak `height`, `radius`, `x` / `z` (screen-aligned), `heightScale`, `spacing`, `shape`, `contour.interval` (density), `lineWidth`, `indexWidth`, `summitRings`, `view` |
| Polaroids | `POLAROID_CONFIG` (`studio-polaroids.html`) | `scale`, `baseWidth`, `shadow`, `spring` (stiffness, damping, stagger, travel, spin), `cards[i]` = x / y / r. **Bake layout** saves to `localStorage` (`tibba.polaroids.layout`) and copies the literal |
| Footer — green range | `MEADOW_CONFIG` (`assets/footer-meadow.js`) | `mountains` (height, subdivisions, peaks, noise, variation, seed), `moss`, `interaction` (intensity, radius, follow, parallax), `animation` (speed, wind) |
| About — description | `DESCRIPTION_CONFIG` + `R` (`about-description.html`) | `maxWidth` (vw), `distance` (vh; `null` = auto), `startAt`; the unit / timing / look dials |
| About — hero | `STONE` (`assets/about-stone.js`), `AIM` (`about-hero.html`) | the stone: cut depth, rough sides, grain, lean to pointer, raking light, idle float; the aim line's word reveal |
| About — team | `TEAM_CONFIG` (`about-team.html`) | `back` / `front` mountain width, x, y, peak, levels; `person.height`; `dither` intensity, cell, duration, contrast, colours; `hover.part` |
| About — campsite | `CAMPSITE_CONFIG` (`assets/campsite.js`) | `smoke` (height, speed, spiral, spread, opacity, count), `loops` (flicker, tent breath, embers, wind), `scene` (scale, offsetX/Y), `interaction`, `overflow` |
| About — foundations | `FOUNDATION_CONFIG` (`about-foundations.html`) | `tilt` (max, responsiveness, perspective), `depth` per layer, `shadow` (depth, blur, opacity), `glare`, `entrance` (duration, ease, stagger) |
| Summits v2, v3 | `SUMMITS2_CONFIG` (`assets/summits-v2.js`) | `camera` (dist, elev, lift, liftDist, bearings, aside, tilt), `focus.chase`, `fill` (count, seed, height, ridges → range-scene `opts.fill`), `path` (turns, wander, start, duration, shadow, fadeIn) |
| Compass v2, v3 | `layout: 'boxes'` (`assets/services-split.js`) | services as boxed brick bonds; the page CSS fixes the compass row |
| Brands — mosaic (mobile) | `MOBILE_BRANDS` (`brands-mosaic.html`) | rows of `[logo, span]`, start offset, drift duration, logo size overrides |
| Full page | `FULLPAGE_CONFIG` (`full-page.html`), `LOGO_MORPH` (`assets/logo-morph.js`) | logo step, load/unload distance; collapse time, spring, hover interval |
| Contact | `CARABINER_CONFIG` (`assets/carabiner.js`) | `size`, `thickness` (line weight), `detail` (tessellation), `stoneSize` |

### Elsewhere

Everything worth changing sits at the top of each file's `<script>`:

- `CFG` — resolution, contour count, line widths, `OUTLINE` thickness and
  `OUTLINE_OFFSET`, `MASK_TH` (where the mountain is considered to end),
  `DOTTED_LEVELS`, accent colour, camera reaction, aerial fade. In
  `topo-hero-scroll.html` it also holds `LOCK_YAW`, `LOCK_SCALE`, `LOCK_X`,
  `LOCK_Y` and `LOCK_OPACITY`; `LOCK_X` is in normalised device coordinates,
  where -1 to 1 spans the viewport.
- `SATS` / `PEAKS` — the summits, as position, height, width and sharpness. In
  `topo-peaks.html` each entry also carries its own name, elevation and fact.
- In `misc-card-fan.html`, `CardFan.DEFAULTS` is the control surface. Spacing,
  turn and arc depth are three independent numbers rather than one tangent
  radius, because the reference is not tangent to a circle — its spacing implies
  a 13.5° step while its arc depth implies 16°, so no single radius reproduces
  it. `springDamping` below 1 is what produces the recoil; at 1.0 the cards
  glide home with no bounce.
- In `misc-diagonal-roll.html`, `DiagonalRollHero.DEFAULTS` is the whole control
  surface, and `cfg.responsive` holds the bands that trade tile count against
  tile size on narrow screens. The seam-free loop rests on two things: tiles are
  recycled only at path positions that are off-screen at the default offsets,
  and `speedVariance` is a bounded offset rather than a per-tile multiplier —
  a multiplier collapses the procession into one clump after a few crossings.
- In `tibba-peak.html`, `CFG` also holds the plain's own survey (`G_*`) and
  `ACCENT_TOP`, the number of rings down from the summit that wear the accent;
  `PK` is the single massif, `WIDE` and `FOCUS` the two camera framings, and
  `ELEV` the number the odometer counts to.
- `CAM` — distance, field of view, framing

For a completely uniform stroke with no weight hierarchy, set `LINE_MIN` equal
to `LINE_MAX`.

## Deploying

Static files, so `/` resolves natively on any host. `vercel.json` turns on
`cleanUrls`, so every page is reachable without its extension, and redirects the
old `/contour-ridge-studies` and `/tibba-studio` paths to the index.

On Vercel the project needs **Framework Preset: Other** with no build command and
no output directory.

## State

The control panels are tuning surfaces for these previews. In production they
come out, and the same values become Framer property controls.

The mountain facts in `topo-peaks.html` are standard, well-established ones, but
worth checking before the page goes public, as with any copy.
