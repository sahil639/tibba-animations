# Tibba Animations — Contour Ridge

Interactive WebGL topographic animations for a studio hero section. Each file is
self-contained: no build step, no dependencies, no network requests. Open one in a
browser and it runs.

## Files

| File | What it is |
| --- | --- |
| `index.html` | **All three behind one page**, switched from a nav in the top-left. Start here. |
| `topo-hero.html` | *Contour Ridge* — the hero. One mountain, cursor-reactive, with a tuning panel. |
| `topo-hero-scroll.html` | *Scroll hero* — the same ridge wired into a page: it locks to the left on scroll, with a figure grid as section two. |
| `topo-peaks.html` | *Three Summits* — three real mountains in one scene; scrolling moves focus between them. |
| `tibba-range.html` | *Range* — the studio page: a scroll-driven Three.js range with case cards. Its own page at `/tibba-range`, and it carries the same switcher so you can get back. |
| `dither-lab.html` | A separate experiment that lives in the same folder. |

The three standalone files are what you drop into a page or port to Framer. The
combined file carries three copies of the engine (163 KB), so it is for review and
sharing rather than production.

In `index.html` the mode is written to the URL hash, so `#ridge`,
`#scroll` and `#peaks` each deep-link to one animation.

## Deploying

The combined viewer *is* `index.html`, so `/` resolves natively on any static host
with no configuration. `vercel.json` only turns on `cleanUrls`, so the standalone
files are reachable without the extension, and redirects the old
`/contour-ridge-studies` path to the root.

| URL | Serves |
| --- | --- |
| `/` | the combined viewer, all three animations |
| `/topo-hero` | Contour Ridge on its own |
| `/topo-hero-scroll` | the scroll hero |
| `/topo-peaks` | Three Summits |
| `/tibba-range` | Range |
| `/#ridge`, `/#scroll`, `/#peaks` | the combined viewer, opened on one animation |

On Vercel the project needs **Framework Preset: Other** with no build command and
no output directory — these are plain static files with nothing to build.

## How they are drawn

A heightfield is generated procedurally at load, contour lines are extracted from
it with marching squares, and those lines are drawn as screen-space ribbons so
stroke widths stay exact at any pixel density. Each ribbon is mitred at its joins,
so a stroke keeps one width all the way round a corner.

Every contour is snapped back onto its own level set, resampled at an even step,
then corner-cut twice with Chaikin's algorithm, which converges on a quadratic
B-spline. Closed rings are treated as closed throughout, so there is no seam and no
flat spot where a loop meets itself.

The terrain is solid, not hollow. A depth-only pass renders the surface invisibly
so contours behind a mountain are genuinely occluded. That same pass tags each
fragment with how much it belongs to the mountain in focus, and a further pass
reads the boundary of that region as a screen-space distance field — a single
outline sitting entirely outside the mountain, offset by an adjustable margin.

WebGL2 is needed for the outline; WebGL1 renders everything else.

`tibba-range.html` is the exception to all of the above: it is a separate piece that
uses Three.js and GSAP from a CDN and Google Fonts, so unlike the contour files it
needs a network connection at runtime.

## Interaction

**topo-hero.html** — the scene tilts with the cursor and the terrain bulges under
the pointer, with a ray cast against the heightfield each frame so the reaction
lands where you actually point. Clicking the orange summit ring opens its marker
panel. Controls sit top-right; **H** hides them.

- Line weight, Viewing angle, Depth, Topography, Cursor strength
- Outline on/off, and Outline offset (how far clear of the mountain it sits)
- Background and line colour — the panel inverts itself on dark grounds
- New landform — reseeds the terrain

**topo-hero-scroll.html** — the ridge owns the first viewport, then rotates, scales
down and locks to the left at 45% opacity as the page scrolls. Once locked it keeps
its micro-animation: dotted rings drifting along their arc length, mid-flank
undulation, and the cursor wave. Section two is a 2×2 figure grid clear of the
locked ridge.

**topo-peaks.html** — Kilimanjaro, Fuji and the Matterhorn, each modelled to its own
character. Scroll, drag, arrow keys or the rail move focus between them; the section
owns the wheel, so the page itself never scrolls. Unfocused summits settle downward
and fade back.

All three respect `prefers-reduced-motion`.

## Tuning

Everything worth changing sits at the top of each file's `<script>`:

- `CFG` — resolution, contour count, line widths, `OUTLINE` thickness and
  `OUTLINE_OFFSET`, `MASK_TH` (where the mountain is considered to end),
  `DOTTED_LEVELS`, accent colour, camera reaction, aerial fade. In
  `topo-hero-scroll.html` it also holds `LOCK_YAW`, `LOCK_SCALE`, `LOCK_X`,
  `LOCK_Y` and `LOCK_OPACITY`; `LOCK_X` is in normalised device coordinates, where
  -1 to 1 spans the viewport.
- `SATS` / `PEAKS` — the summits, as position, height, width and sharpness. In
  `topo-peaks.html` each entry also carries its own name, elevation and fact.
- `CAM` — distance, field of view, framing

For a completely uniform stroke with no weight hierarchy, set `LINE_MIN` equal to
`LINE_MAX`.

## State

`topo-hero.html` is the most developed of the three: it carries the reference
terrain, the rounded-join contour pipeline and the outer-stroke outline.
`topo-hero-scroll.html` and `topo-peaks.html` still run the earlier terrain and line
pipeline — those improvements can be ported across.

The control panels are tuning surfaces for these previews. In production they come
out, and the same values become Framer property controls.

The mountain facts in `topo-peaks.html` are standard, well-established ones, but
worth checking before the page goes public, as with any copy.
