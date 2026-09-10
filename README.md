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
| Bottom of the dock | Comments. Click the bar to collapse them and hand their height back to the controls; the state is remembered, and a collapsed bar still shows the count, in the accent if something is uncommitted. See below. |

The dock does not rebuild a page's controls — it **moves** them. `wb.adopt()` in
`assets/workbench.js` picks up `#ui` or `#tune` and appends it into the dock,
and because moving a node keeps its listeners, every slider still drives the
animation it was wired to with nothing changed in the page itself.

## Comments

The dock's comments are a repo artefact, not browser state. Writing one POSTs it
to the dev server, which appends it to **`notes.js`** — a tracked file. Commit
that with the change the note is about and the next person to pull sees it
alongside the work.

```bash
node dev-server.mjs          # the endpoint the comments need
git add notes.js && git commit -m "Range: trail glow note"
```

Away from the dev server — on Vercel, or opening a file directly — there is
nothing to take the note, so it is held in `localStorage`, flagged
**uncommitted** in the panel, and the **notes.js** button downloads the file to
commit by hand. A note that arrives in `notes.js` from someone else's commit
stops being a local draft the next time the page loads.

Notes are filed against a page's `id` in the manifest. Renaming a page's
`label` or `file` keeps its notes; changing its `id` orphans them.

## Sections and pages

| Section | Pages |
| --- | --- |
| **Final website** | `final-website.html` — stub |
| Hero section | Contour Ridge, Scroll hero, Three summits, Range, Peak |
| Metrics · Brands · Extra case studies · Our services · Our testimonials · Our studio · Footer | one stub each |
| Our summits | Three summits and Range — copies of the hero pages, free to diverge |
| About us — hero · description · team · foundations, and About us itself | one stub each |
| Contact page · Services page | one stub each |
| Miscellaneous animations | Dither Lab |

Adding a page means adding a line to `assets/manifest.js`. The index and the
menu on every page both read it, so nothing else needs touching.

A stub is a real page with nothing designed into it — the type, the workbench
and a placeholder saying which section it is. Replace everything between the
comment markers and drop `assets/stub.css`.

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

**tibba-peak.html** — the summit's three accent rings are their own object, so
they lift and brighten on hover without the mountain moving with them. Clicking
them runs one GSAP timeline: the camera closes the distance, a leader draws from
the rings to the definition, and an odometer runs to the elevation underneath the
sentence being revealed. **Esc** returns.

All of them respect `prefers-reduced-motion`.

## Tuning

Everything worth changing sits at the top of each file's `<script>`:

- `CFG` — resolution, contour count, line widths, `OUTLINE` thickness and
  `OUTLINE_OFFSET`, `MASK_TH` (where the mountain is considered to end),
  `DOTTED_LEVELS`, accent colour, camera reaction, aerial fade. In
  `topo-hero-scroll.html` it also holds `LOCK_YAW`, `LOCK_SCALE`, `LOCK_X`,
  `LOCK_Y` and `LOCK_OPACITY`; `LOCK_X` is in normalised device coordinates,
  where -1 to 1 spans the viewport.
- `SATS` / `PEAKS` — the summits, as position, height, width and sharpness. In
  `topo-peaks.html` each entry also carries its own name, elevation and fact.
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
no output directory. The comments endpoint is local only — on a deployment the
dock still shows every committed note and still lets you write one, but the note
has to be downloaded and committed by hand.

## State

The control panels are tuning surfaces for these previews. In production they
come out, and the same values become Framer property controls.

The mountain facts in `topo-peaks.html` are standard, well-established ones, but
worth checking before the page goes public, as with any copy.
