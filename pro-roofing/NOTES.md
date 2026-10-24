# pro-roofing — build notes

A rebuild of proroofingpros.com. Plain HTML, CSS and JS. No build step, no
dependencies, no package manager. Twelve pages, all relative paths, so the
folder can be lifted straight onto a domain.

Preview it from the SAMP folder, not from here:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Root .\pro-roofing
```

---

## Pages

| File | What it is |
|---|---|
| `index.html` | Home. Carries the 3D house and the scroll photography. |
| `commercial-roofing.html` | Every commercial system, with hand-drawn assembly cross-sections. |
| `wind-damage.html` | Article 01. |
| `hail-damage.html` | Article 02. |
| `tree-falls.html` | Article 03. Replaces the old Storm Damage page. |
| `articles.html` | Articles hub. Replaces the old "Other Services". |
| `roof-inspection.html` `roof-repair.html` `roof-replacement.html` `roof-installation.html` | Services. |
| `about.html` `contact.html` | Company and enquiry form. |

Nav changes against the old site: **Storm Damage → Tree Falls**, and
**Other Services → Articles**. The old `/storm-damage/` URL has no equivalent,
so set a redirect to `tree-falls.html` when this goes live.

---

## Design

Black foreground throughout, hard edges, hairline rules, no blur anywhere
(no `backdrop-filter`, no soft shadows).

**Brand colours were sampled from the logo raster, not guessed.**

| Token | Hex | Where it came from |
|---|---|---|
| `--green` | `#66BC45` | Logo sweep, and the old site's CSS |
| `--green-lt` | `#8EC63F` | Upper band of the sweep |
| `--green-pale` | `#C5DC6D` | Sweep highlight |
| `--blue-deep` | `#246297` | Top of the "PRO" gradient |
| `--cyan` | `#1BBCDB` | Bottom of the "PRO" gradient |
| `--blue` | `#1E73BE` | Old site accent blue |
| `--blue-lt` | `#5FC3E4` | Lightened for small accents on black |

**Type.** Display and body are **Archivo** at a wide optical width. Labels and
eyebrows are **Space Grotesk**, which keeps the squared technical character the
logo has without the monospace terminal look. The `--mono` token is kept as an
alias of `--label` so older rules still resolve.

**Footer credit.** The credit row is a three-column grid: copyright left,
"Powered by Yahshua Marketing" centred and linked to yahshuamarketing.com, licence right. It stacks to one
centred column below 880px.

**Where the blue runs.** Lightly, and only on small parts: card index numbers,
contents-list numerals, breadcrumb and phone hover, review attributions, the
required-field marks, the filmstrip eyebrows, and the glazing, gutters and
mullions in the 3D house. Green stays the primary accent.

---

## Logo

The old mark reads **PRO ROOFING / JES SERVICES, INC / SINCE 1987**. Both the
JES line and the "SINCE 1987" line beneath it are removed. The founding year
lives in the page copy instead.

**In use: `img/logo-trimmed.png` — the original crop, white outline.** The
solid-fill variant was built and compared, and the outline was preferred. Both
remain on disk: `logo-solid.png` (white fill) and `logo-solid-dark.png` (dark
ink, ready for a light mode).

In the source, "ROOFING" and the house are white with a thin grey keyline, a
knockout built for light backgrounds. Cropped straight out, that reads as
hollow outlined type on black, which was weaker than it should be. The solid
version fills those interiors.

Filling them took three attempts. The keyline is not a continuous contour in
the source, so a flood fill leaked straight out through the anti-aliasing gaps,
and a scanline parity test broke on the slanted letterforms. What works:
**dilate the ink by one pixel first** to close the gaps, label the gap regions,
then fill only those that touch a keyline which itself reaches the outside. A
letter body touches the outer keyline; a counter only touches its own keyline,
which is an island inside the letter, so counters correctly stay open. Solid
blue "PRO" is excluded by checking the class of the neighbouring keyline.

Three assets, all cropped to 307x110:

- **`logo-solid.png`** — white fill. What the site uses.
- **`logo-solid-dark.png`** — the same mark with dark ink, ready for a light
  mode. Not wired up.
- **`logo-trimmed.png`** — the untouched original crop, white outline. Kept as
  the archive, and it is what a light background would want if you prefer the
  original treatment.

`_logos.html` shows all four side by side on both black and paper. Delete it
before delivery.

**Resolution ceiling.** The source is 329x156. At the header (42px tall) and
footer (46px) that is a 2.6x downscale, so it stays crisp. The transition mark
is capped at 240px wide to stay inside native resolution. There is still no
vector anywhere on the live site; if the designer has the AI or EPS, that is
the real fix.

---

## Page transition

The logo alone, full screen, then it clears into the page. It plays **once per
page load**, held for 450ms and faded out over 380ms, half what it first was.

Three things were wrong earlier and are fixed:

- It also faded in on a link click, so the mark appeared twice per navigation,
  which read as a double load. The outgoing half is gone.
- It was timed from `window.load`, which waits for every photo on the page.
  With the filmstrips that is several megabytes, so the mark sat there for
  seconds. It is timed from DOM ready now.
- The hold was twice as long as it needed to be.

It cannot trap anyone. The overlay is inert in CSS and only becomes visible
when a one-line inline script in `<head>` adds `.js-intro` to `<html>`, so with
JavaScript off it never appears. Reduced-motion skips it.

---

## The 3D house

`js/roof3d.js`. **This now runs on Three.js** — see "Rebuilt on Three.js" at the
bottom of this file, which supersedes the Occlusion, Camera auto-fit and
Stationary-model sections below. Those describe the hand-rolled canvas 2D
rasteriser the model used to have, and are kept because they record why each
behaviour exists, not how it is implemented now.

Monochrome either way: one grey per material, no colour in the model at all.
Green and blue are reserved for the labels.

### Occlusion

Sorting faces back to front was never going to be enough. Painter's order
compares whole polygons, so the moment one piece genuinely stands in front of
another the order is wrong somewhere and you can see through the house. The
renderer now rasterises every triangle into a **software depth buffer** and
resolves occlusion per pixel, which is what makes the exterior solid from any
angle, the way it would be if you walked around the building.

Back faces are still culled first. That halves the work and stops the inside of
a far wall being drawn where the near wall was removed.

It renders into an offscreen buffer at 1.35x and scales down, which smooths the
edges, since a hand-written rasteriser has no antialiasing of its own.

Labels are depth tested against the same buffer, so a label for something on
the back of the house cannot float over the front of it.

**Shingles are real 3-tab**, laid to spec: 12 by 36 inch shingles, three tabs
each so a cutout every 12 inches, about 5 inches of exposure, and a 6 inch
offset course to course, which on a 12 inch tab is a half-tab stagger. That
stagger is what stops the cutouts lining up vertically. Course density follows
the camera, so the hero stays legible and a zoomed part shows the real pattern.
Walls are horizontal lap siding; the chimney is brick with staggered head
joints.

**Massing** is a two-storey block with a centre entrance gable and columned
porch, a dormer either side, a lower set-back wing with a **hipped** end and
garage doors, and a chimney with crown, flue and cricket. Viewed from a
distance at a low angle, the way a listing photograph frames a house.

### Labels

Each label sits **on the part it names** and disappears when that side turns
away, in place of long leader lines out to the frame edge. Where several would
collide, the most face-on one wins. Expect four to six visible at any rotation
out of eighteen; the rest come round as the house turns.

### Zooming

Scroll or use the plus and minus to move the camera freely. Clicking any label
opens that part: the camera flies to a framing chosen for it, the panel
explains what it is and why it matters, and "back to the whole roof" returns.
Eighteen parts are covered: ridge and ridge vent, hip, valley, rake edge, eave
and fascia and drip edge, soffit and intake vents, field shingles, starter
course, step and counter flashing, chimney cricket, pipe boot, box vent, dormer
cheek and valley, gable end and vent, decking and underlayment, lap siding,
chimney crown and flue, and gutter and downspout.

### No damage states

The damage selector is gone. It was placing marks on surfaces that are inside
the structure and cannot be seen, which was worse than not having it. Wind,
hail and tree fall are covered properly in the three articles.

### A note for whoever tests this

The model runs on `requestAnimationFrame`, so it pauses when the browser pane
is hidden or the window is behind another. A blank canvas and labels with no
`data-on` attribute mean the loop is paused, not broken. Bring the pane forward
and it resumes.

---

## Scroll photography

The photos were ranked by sharpness before any were used, scoring each on the
variance of its Laplacian at a normalised width. The top of the list:

| Score | File |
|---|---|
| 5605 | `roof-install.jpg` |
| 3911 | `roofig1.jpg` |
| 3413 | `slider3.jpg` |
| 3172 | `roofing-repair-6.jpg` |
| 2275 | `Storm-Damage.jpg` |
| 2119 | `slider1.jpg` |

Only those are used in the foreground treatments. Two full-bleed filmstrips on
the home page and one on About parallax gently as they pass, and a pair of
floating cards drift against each other on scroll. Everything is transform-only
inside a single `requestAnimationFrame`, and all of it stops under
reduced-motion.

---

## Articles: how they were sourced

Research went through IBHS, ASTM via ARMA and Professional Roofing, the
Haag/IIBEC wind papers, the Marshall and Herzog hail protocol via NRCA, UL 2218,
the National Weather Service, Virginia Cooperative Extension, the Applied
Technology Council, and the insurance regulators for Virginia, Maryland and DC.
Every article carries its own source list.

**Deliberately left out, because it could not be verified.** Each article
repeats the relevant item in an HTML comment at the top of the file:

- Brand-specific wind warranty speeds. GAF and Owens Corning conflict on nail
  count between sources, and the GAF bulletin returned a 403. The pages state
  the principle without an mph figure against a brand.
- Any hail size threshold for metal roofs, gutters or soft metals.
- A sealant activation temperature for cold-weather installation.
- Matching statutes for VA, MD or DC.
- DC's limitations period for first-party property suits.
- ARMA's position on blistering and granule loss.

**Two live disputes are presented as disputes**: whether a broken seal strip
with no crease counts as wind damage, and where the hail size threshold for
asphalt shingles actually sits.

**Check before printing:** `Va. Code § 59.1-618` is published on the Virginia
LIS with an effective date of **1 January 2027**. The guidance on the pages
holds either way and no page cites the section number in body text, but confirm
the operative version before using it in print.

The hail article states plainly that this region is wind-dominant and that DC
sits in a low-severity hail band. That is accurate and it builds trust with a
homeowner fending off storm-chasers. It will not help if the business wants to
sell hail claims hard.

---

## Before launch — only the owner can answer these

1. **Reviews.** The three quotes on `index.html` are verbatim from the live
   site. The job titles beside them there were leftover theme demo data and were
   not reproduced. Replace with real Google Business Profile reviews, and add no
   star rating or review count until it matches the real profile.
2. **Form delivery.** `contact.html` has `data-endpoint=""`, so the form opens
   the visitor's mail app. Create a Web3Forms or Formspree endpoint and paste
   the URL in. Biggest conversion fix on the site.
3. **Emergency hours.** The old site claimed 24/7 storm crews while listing
   Mon–Fri 09:00–16:30. Only the office hours are stated here.
4. **Insurance.** No carrier or coverage statement appeared on the old site.
   The licence number is published; general liability and workers' comp are not.
5. **Redirect** `/storm-damage/` → `tree-falls.html`.
6. **Canonical URLs** assume the pages sit at the domain root.

---

## Landing position

The browser restores the previous scroll offset on a same-page navigation,
which left the sticky header sitting over the hero instead of above it.
`history.scrollRestoration` is set to manual, the page scrolls to the top on
load, and clicking a nav link for the page you are already on scrolls back to
the top rather than reloading.

---

## Verified at build time

Twelve pages. No broken internal links, no missing images, no missing CSS or JS,
no duplicate IDs, no dead in-page anchors. Zero console errors. Zero horizontal
page overflow at 375px on every page; the wide comparison tables scroll inside
their own wrapper. The 3D house was exercised in all three damage modes, and the
page transition was caught mid-flight, in a real browser.

Two layout bugs were found and fixed this way: the 3D figure was computing a
width wider than its column from `min-height` plus `aspect-ratio`, and the
article tables were pushing whole pages sideways because a grid item defaults to
`min-width: auto`.

Images are the client's own, pulled from the live site.

---

## Navigation dropdowns

The Services and Articles panels used to sit 18px below their trigger. Moving
the cursor down crossed that dead zone, `:hover` dropped, and the menu closed
before anything could be clicked.

The panel now opens flush with the trigger (`top: 100%`, zero gap) and carries
its own 20px of transparent top padding, with the visible box moved onto an
inner wrapper. The padding is part of the panel, so it is hoverable: the whole
likely cursor path from trigger to menu item stays hot. There is also a
belt-and-braces `::before` bridge across the same span.

---

## Commercial diagrams

The layer names were `<text>` inside each SVG at hand-set coordinates. That
overflowed the figure on narrow columns, collided with itself where two labels
were close, and scaled to absurd sizes whenever a diagram sat full width, which
is what made the vegetated assembly look exploded.

The names are HTML now: an ordered list beside the drawing. They wrap, they
space by line-height, and `.asm__draw` is capped at 330px so no diagram can
blow up again regardless of the column it lands in. All nine were converted by
script rather than by hand, so they are consistent.

---

## Eave assembly and gutters

Earlier versions drew the gutter as a thin folded ribbon, which read as nothing
at the overview distance. It is now swept from a real **5 inch K-style
section**: 5 inch top opening front to back, about 3.5 inches high, 3.125 inch
bottom, half inch front lip, rolled from 11.75 inch coil. The face **leans
outward** and carries a concave break then a convex roll, which is what makes a
K gutter read as a gutter rather than a duct. The run has closed end caps and
hidden hangers bridging the open top every 30 inches.

Alongside it: a 1x8 fascia, a soffit panel turning back to the wall with vent
lines running along it, and a drip edge with a short leg over the fascia kicked
half an inch clear. The downspout is a 2x3 pipe with offset elbows at the
outlet, a turn-out at grade, and two straps.

`IN` converts inches to model units (one unit is about 46 inches). `TRIM`
exaggerates the thinnest trim by 1.6x, because at true scale a 3.5 inch gutter
is roughly one pixel at the overview distance. Proportions between trim parts
stay correct; only their absolute size is lifted.

### Why structures looked "missing"

They were not. A sweep of 108 camera positions (36 rotations x 3 pitches)
checked every face: **zero were never-visible**, and every material drew at some
angle. The pieces were there and correctly oriented, just too thin to resolve.
That is why the fix was real sections and a closer default camera, not culling
changes.

### Camera auto-fit

`fitHome()` measures the projected extent of every vertex and backs the camera
off until the whole house sits inside 86% of the frame, re-running on resize.
Nothing can clip at the edges, which is what previously read as hitting an
invisible wall. The figure is also landscape now, since the house is broad.

### Mass versus texture

Surface detail blends toward the colour of the surface it sits on, by distance.
At the overview it is at 16 to 30% so the house reads as concrete mass; as you
zoom into a part it comes up to full strength and the courses resolve. That is
what stopped it looking like highlighted vertices and lines.

### Still to do

The porch reads as a floating platform and needs tying into the wall. The
anatomy research only partly completed before its own tool limit: the shingle
and gutter envelope figures are sourced, the rest of the component list is
working knowledge and still wants verifying. A re-run fetch plan is in the
agent report.

**Debug handles left in `roof3d.js`:** `window.__r3d`, plus `_shade`, `_faces`
and `stats` on the instance. They are how the culling sweep above was run.
Remove before delivery.

---

## Stationary model, cached render

The house no longer rotates. That removed the cause of the shimmer: with the
camera still, the geometry is rasterised **once** and cached, and every
subsequent frame just blits that cache. Nothing re-rasterises while the model
sits idle, so there is no frame-to-frame crawl on the edges at all. The raster
only re-runs when the camera signature actually changes, which is when the user
drags, zooms, or opens a part.

Interactivity is hinted by a pulse instead: a slow ring travelling outward
across the ground from under the house, drawn as a perspective ellipse over the
cached image. It is overlay only, so the house itself is untouched by it. It
pauses while dragging or while a part is open, and is skipped entirely under
prefers-reduced-motion.

Verified by diffing two frames a quarter period apart: 6,399 pixels change and
79% of them are green, with the house render confirmed not re-run. Yaw drift
over 60 frames measured exactly zero.

Dragging to turn and scrolling to zoom both still work; only the automatic spin
is gone.

The "tap a label" hint sat grey on green, because a later rule overrode the
dark text the green pill was designed for. Its text is black now.

## Rebuilt on Three.js

The model was a hand-written canvas 2D rasteriser: perspective projection,
back-face culling, a software depth buffer, supersampling for antialiasing. It
worked, but it was the ceiling on quality. Every round of "structures are
missing", "it phases out", "vertices highlight on rotation" traced back to
something the rasteriser could only approximate.

It now runs on Three.js, loaded through an **import map** in `index.html`:

    "three":         .../three@0.182.0/build/three.module.js
    "three/addons/": .../three@0.182.0/examples/jsm/

### The tradeoff, stated plainly

The README says this repo has no build step and no dependencies. An import map
keeps the first half — there is still nothing to install, compile or bundle, and
the folder opens straight off disk. It breaks the second: the page now fetches
Three.js from a CDN and will not draw the model offline. The fallback paragraph
inside the figure covers that case.

It is worth it. Three things that were fought for by hand are now correct by
construction:

- **Occlusion** is the hardware depth buffer. The house is solid from every
  angle, with no sorting, no culling tricks, nothing to phase out. Every
  material is `DoubleSide`, so no surface can vanish to winding order either.
- **Antialiasing** is MSAA. Edges do not crawl between frames, which is what
  "vertices highlighting" was.
- **Surfaces** are lit `MeshStandardMaterial` with a real cast shadow, instead
  of a flat grey per face.

About 3,400 triangles and 226 draw calls — nothing that needs optimising.

### Built to the three-best-practices skill

Installed at `~/.claude/skills/three-best-practices/` (28 rules, MIT). What it
changed here: import maps rather than CDN script tags; `setAnimationLoop`
rather than a manual `requestAnimationFrame`; two lights, not more, with a
`DirectionalLight` carrying the shadow and a tight shadow frustum; geometry and
materials disposed on teardown.

React Three Fiber, the other skill the article recommends, does **not** apply —
it needs React and a bundler, and this repo deliberately has neither.

### What stayed the same

Everything already signed off: stationary with no auto-rotation, the ground
pulse as the interactivity hint, monochrome, solid at every angle, floating on
black with no box and no clipping, drag to turn, scroll and buttons to zoom,
labels pinned to the part they name, click a part to fly to it, no damage
selector, and the real 3-tab / lap siding / brick chimney / K-gutter detailing.

The K-gutter is now an `ExtrudeGeometry` swept from a `THREE.Shape` built out of
the same `KSEC` section as before — which is what that tool is for, and a lot
less code than sweeping it by hand.

### Four bugs found and fixed during the rebuild

- **The gutter ran off the building.** The section is drawn in the z/y plane and
  extrudes along +z, so it needs a quarter turn to run along x — and that turn
  maps the shape's first axis to **-z**, not +z. With the sign wrong the whole
  run was thrown eleven units clear of the house, which also inflated the
  bounding sphere and pushed the camera miles back. `addPlate(…, "x", …)` has
  the same convention; the porch returns pass negated z for that reason.
- **A sawtooth ran the length of every eave.** Not depth fighting, as it looked:
  shadow-map acne. The roof planes are zero-thickness quads, so the fascia top
  sat only two shadow texels off the roof plane. `shadow.normalBias = 0.055`
  cured it, plus dropping the eave assembly clear of the roof by `EPS`.
- **Two labels collided** ("Field shingles" over "Gable end & vent"). The
  de-overlap test used one guessed pixel gap for labels that range from
  "Valley" to "Eave, fascia & drip edge". It now measures each label's real box.
- **Every close-up put the camera inside the geometry.** The per-part distances
  were written for the old lens. They are scaled and floored in `focus()`
  rather than re-tuned one by one.

### Testing note, again

`requestAnimationFrame` is paused while the Browser pane is hidden, so the model
freezes and anything that advances per frame — the fly-to-part, the pulse —
appears broken when inspected through JavaScript alone. It is not. Check it with
a screenshot batch, which keeps the pane awake. This cost time twice now.

### 3-tab shingles, as geometry

The first Three.js pass left the roof planes smooth. They are now laid with real
3-tab relief, built in `shinglePlane()` and merged into **one mesh** so the whole
roof costs a single draw call rather than a few thousand.

To spec: 12 by 36 inch shingles, three tabs so a cutout falls every 12 inches,
about 5 inches of exposure, and a 6 inch shift per course — half a tab — so no
two cutouts ever stack.

The part worth remembering: laying every course at the same height gave cutout
nicks but **no course lines**, because nothing stepped. Real shingles ramp *down*
as they rise — a course's butt rests on the head of the course below it, then
settles onto the deck further up the slope. So each course runs from `BASE+STEP`
at its butt to `BASE` at its head, and the next course's butt steps back up over
it. That step is the shadow line under every course, and because the profile
resets each course it never accumulates up the roof.

Each plane is read as a bilinear patch from four corners, eave edge first. A hip
or a gable return passes its apex twice; the patch collapses that edge on its own
and the courses narrow into the point. Watch the corner order — the deck quads
do not all start from the eave, so several planes pass a reordered set.

### Why it went laggy, and what it actually was

Adding the shingles took the model from 3.4k triangles to 44k and it started to
stutter. The obvious suspect is the GPU. It was not.

Measured, per frame: `placePins()` **120 ms**, `render()` 8 ms. The labels were
the whole problem. Occlusion is tested by raycasting the house once per label,
and `Raycaster` is CPU work with no acceleration structure behind it — so
fourteen labels against 44k triangles is over half a million ray-triangle tests
every frame, on the main thread. Before the shingles that was 48k tests and
nobody noticed.

Three fixes, in order of what they bought:

- **Shingles are excluded from raycasts** (`mesh.raycast = () => {}`). They are
  40k of the 44k triangles and they sit on the roof deck, which already occludes
  everything they would. Nothing is lost.
- **Labels are recomputed on camera change, not per frame.** The model is
  stationary, so while it sits still neither the label positions nor what hides
  them can change. Same idea as the old cached raster.
- **The shadow map is drawn once.** Neither the house nor the light ever moves,
  so re-rendering it from the light's view every frame was pure waste.

Also capped the pixel ratio at 1.75: 2x on a retina panel is four times the
fragments for a model MSAA has already smoothed.

After: `placePins()` **0.003 ms** parked and **0.21 ms** mid-drag, against 120 ms
before. Real frame timing over 50 frames is 16.6 ms median, 17.0 ms worst — a
locked 60 fps with nothing dropped.

The lesson worth keeping: in this model the triangle count is the GPU's problem
and the GPU does not care. Anything that *raycasts* per frame is the thing to
watch, and the fix is almost always to shrink what it can hit, or to stop asking
when the answer cannot have changed.
