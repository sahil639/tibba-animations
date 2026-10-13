# Rive files

The site plays these with `assets/rive-slot.js`, using the runtime bundled in `assets/vendor/rive/` (@rive-app/canvas 2.21.6, MIT).

| File | Plays in |
|---|---|
| `groww.riv` | the Groww card (Base Camp, and every Our Summits layout with a Rive box) |
| `firstpost.riv` | the Firstpost card |
| `breathe-esg.riv` | the Breathe ESG card |
| `shyft-mindhouse.riv` | the Shyft & Mindhouse card |
| `summits.riv` (optional) | any Rive box with no file of its own |
| `peak.riv` (optional) | not wired in yet: the Base Camp peak dot is CSS (see below) |

The four case thumbnails as delivered have one artboard (928 × 486), one state machine (`State Machine 1`) and no inputs. So the page drives them by playing and pausing:

- **Active:** the card in focus plays.
- **Hovered:** the card under the pointer plays.
- **Inactive:** every other card holds its current frame, desaturated.

The summit's colour is a CSS tint over the canvas, set by the Rive accent tint slider in the panel.

## To let the page drive the files directly

Add these to each file's state machine. They are optional, and anything missing is simply skipped.

| Input | Type | Set by the page |
|---|---|---|
| `active` | boolean | `true` while the card is the one in focus |
| `hover` | boolean | `true` while the pointer is over the card |
| `project` | number | 0–3, the project in focus (lets one shared file serve every card) |

A suggested layout for the state machine:

```
Entry → Idle (a held, quiet frame)
Idle  → Playing   when active
Playing → Idle    when !active
Any   → Hover     when hover   (a small lift or accent sweep, blended over Playing or Idle)
Hover → (previous) when !hover
```

For colour, give the accent elements a single fill. When the runtime's data binding is used, bind that fill to a colour property named `accent`. The page will then set it to the summit's colour (`#4DD9C0` Groww, `#E05555` Firstpost, `#4CAF70` Breathe ESG, `#7B8FF5` Shyft & Mindhouse). Until then, the CSS tint does that job.

## The peak dot

The focused summit's glowing, pulsing dot is CSS (`summits-basecamp.html`, `.fs-peak.bc-mark`), driven by the panel: dot on/off, pulse period and pulse intensity. A Rive version is not wired in yet. The plan is a `peak.riv` that plays inside the focused summit's mark, with the same `active` input and the dot left off. Mounting that file is the part still to add.
