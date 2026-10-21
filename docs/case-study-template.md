# Case study template — the editorial system

The four "Just. Case Study" pages (`case-groww-v2.html`, `case-firstpost-v2.html`,
`case-breathe-esg-v2.html`, `case-shyft-mindhouse-v2.html`) are built by one
template:

| File | What it is |
| --- | --- |
| `assets/case-editorial.css` | the layout, the type, the containers |
| `assets/case-editorial.js` | turns a case's data into the page |
| `assets/cases.js` | the copy, one object per case |
| `assets/work.js` + `assets/work/<folder>/` | the images |

The benchmark was Ashfall's Aptos case study (ashfall.studio/work/aptos),
measured at 1440 px: a 20 px gutter, a four-column grid, every image in a
4 px-radius container, full-width plates stacked one gutter apart, large
statements between groups of plates, and body copy held to one column. The
structure follows it; the look stays ours (black ground, F37 Analog, the
client's colour as the only accent).

---

## 1. The grid

| Token | Value | Notes |
| --- | --- | --- |
| `--ce-g` | `clamp(14px, 1.4vw, 24px)` (12 px under 760 px) | page gutter **and** the gap between stacked containers |
| `--ce-w` | `min(100vw − 2·g, 1760px)` | content width; centred, so very wide screens get margins |
| `--ce-col` | `--ce-w / 4` | one column. Four columns, no inner gaps — gaps come from the gutter |
| `--ce-r` | `4px` | the one corner radius on the page |

At 1440 px: gutter 20, content 1400, column 350 — identical to Aptos.

## 2. The page, top to bottom

1. **Hero** — the cover in the hero container (centred, columns 2–3); 56–96 px
   below it the **meta line** (client · sector / case n of N / status / year,
   11.5 px caps) on a hairline; the **title** as a statement with its first
   line indented one column; the **ledger** (the case's four facts, 4 columns
   on a hairline) and the **tags**.
2. **Body** — the blocks of the case, each one of five components (§4).
3. **Other projects** — a statement-size heading and the next two cases as
   cards (§3).
4. The site footer.

The navbar is the shared one (`assets/site-nav.js`), as on every page.

## 3. Image containers

One component, `.ce-box`, in four sizes. All of them:

- `border-radius: 4px; overflow: hidden;`
- **no** border, shadow, inner padding or matte — the work is the frame
- background `#0e0e10` while loading; until a file exists the slot shows the
  contour placeholder in the client's colour with the file it is waiting for
- the image fills it (`object-fit: cover`)

| Container | Width | Aspect | Where |
| --- | --- | --- | --- |
| **hero** | 2 columns (700 @1440), centred | 16:10 | top of the page, the cover |
| **full** | 4 columns (1400 @1440) | **16:10** default · 3:2 · 16:9 | most plates |
| **half** | 2 columns − ½ gutter (690 @1440) | **4:5** | beside its copy, in a pair |
| **card** | 2 columns − ½ gutter | **7:5** | Other projects |

Full-width ratios are snapped: whatever `ratio` a figure asks for becomes
16:9 (≥ 1.7), 16:10 (≥ 1.55) or 3:2 (below). Three shapes keep the stack
calm; the snapping means a new case cannot introduce a fourth by accident.

**Captions** sit 10 px under the container on the same grid: `Fig. 01` in
column 1 (in the client's colour), the label and caption from column 2,
13 px, muted.

**Artwork guidance** (for whoever exports the images):

| Container | Export at | Notes |
| --- | --- | --- |
| hero | 1600 × 1000 | cover; 16:10 |
| full 16:10 | 2800 × 1750 | 2× the 1400 container |
| full 3:2 | 2800 × 1867 | |
| full 16:9 | 2800 × 1575 | |
| half 4:5 | 1400 × 1750 | phones, portrait screens, single details |
| card 7:5 | 1400 × 1000 | usually the cover again, recropped |

WebP first (JPG and PNG are tried after it). Keep the subject inside the
central ~85 % — the containers crop by aspect, not by content.

## 4. Body components

| Component | Built from | Layout |
| --- | --- | --- |
| **row** | `text` (with a heading), `points` | heading in column 1; paragraphs in column 4 (3–4 under 1024 px); a points list spans columns 3–4, numbered `01 …` in the client's colour |
| **pair** | a `text` block followed by a `figure` | heading + paragraphs at the top of one half; the figure in a **half** container in the other; sides alternate |
| **full** | `figure` | a **full** container + caption |
| **numbers** | `stats` | label, then up to four figures across, statement-size, on the odometer |
| **statement** | `quote`, or a short `text` with no heading | statement-size, first line indented a column; a quote carries its source |
| *bespoke* | `hyper`, `origin`, `globe` (assets/case-sections.js) | their own full-bleed layouts, given a section's room |

**When does text + figure become a pair?** On every second such couple, so a
page runs *full · pair · full · pair…* without anyone arranging it. Override
per figure in `cases.js`:

```js
{ k: 'figure', label: 'The therapy flow', ratio: '16 / 10', caption: '…', layout: 'half' }  // always a pair
{ k: 'figure', label: 'Competitive teardown', ratio: '16 / 9', caption: '…', layout: 'full' }  // never
```

## 5. Type

| Role | Size | Leading | Tracking |
| --- | --- | --- | --- |
| statement (title, quotes, Other projects) | `clamp(30px, 4.1vw, 66px)` (28–40 px on phones) | 1.02 | −0.035em |
| body, row/pair headings | `clamp(16px, 1.25vw, 19px)` | 1.32 | −0.005em |
| labels (meta, ledger keys, figure numbers) | 11.5 px caps | — | +0.14em |
| captions | 13 px | — | — |

Body copy never runs wider than one column on desktop (~350 px at 1440,
around 40 characters) — the narrow measure is most of what makes the page
read as editorial.

## 6. Rhythm

- **Containers** (full, pairs) stack **one gutter** apart — they read as one
  run of plates.
- **Anything that isn't a container** (rows, statements, numbers, bespoke
  sections) gets `clamp(96px, 16vh, 200px)` above it, and the same before
  the next thing below it.
- The body starts `clamp(80px, 12vh, 140px)` under the ledger; Other projects
  sits `clamp(120px, 20vh, 240px)` under the body.
- Each block rises 24 px and fades in as it enters the view (off with
  reduced motion).

## 7. Phones (≤ 760 px)

One column. The gutter drops to 12 px; containers keep their aspect ratios
(the hero widens to full); pairs stack, copy first; the statement loses its
indent; the meta line and ledger go two-up; numbers go two-up; the cards
stack.

## 8. Adding a case study

1. Add the case to `SUMMITS` (or `MORE`) in `assets/work.js` — key, folder,
   page file, sector, year, one-line summary.
2. Add its copy to `assets/cases.js`: `client`, `colour`, `title`, `tags`,
   four `meta` facts, and `blocks`.
3. Copy any case page shell and change `data-case`.
4. Drop images into `assets/work/<folder>/` named after the figure labels
   (`'Groww Feed'` → `groww-feed.webp`), plus `cover`.

Nothing in the template needs touching. Guidelines that keep new cases
consistent:

- **Order the blocks as a story in groups**: a row or statement, then two to
  four containers, then the next row. Long runs of text with no plates, or of
  plates with no text, lose the rhythm.
- **Pick the shape from the content**: 16:10 for screens and spreads, 3:2 for
  photography, 16:9 for film stills, 4:5 for phones and portrait detail. Don't
  add a fifth.
- **One accent**: the client's colour is used for figure numbers, list
  numbers, the status and the reading bar — nowhere else.
- **Captions are labels, not sentences**: name the plate; one short clause of
  context at most.
- **Statements are rare**: the title, a quote, at most one more. They are the
  page's headlines, not section headers.
- If a future case needs a layout the five components don't cover, add it as
  a bespoke kind in `assets/case-sections.js` (a `html()` and a `mount()`)
  rather than special-casing the template.
