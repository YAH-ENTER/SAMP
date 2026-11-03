# Rendon Remodeling & Design — build notes

Internal. Excluded from the published site by `_config.yml` (`**/NOTES.md`).

---

## What this is

A rebuild of rendonremodeling.com keeping the existing design philosophy —
brass accent on near-black, uppercase letterspaced labels, a script flourish
for the tagline — with the type, spacing and page structure reworked.

Static HTML. No build step, no framework, no dependencies. One stylesheet, one
behaviour script, two data files.

```
rendon-remodeling/
  *.html          15 pages
  css/site.css    design system + every component
  js/site.js      all behaviour, feature-detected per page
  js/reviews.js   44 Google reviews, verbatim
  js/gallery-data.js  161 project photographs with captions
  img/            247 images pulled from the client's own media library
```

Preview with `serve.ps1` from the SAMP folder, then
<http://localhost:8099/rendon-remodeling/>. Opening the HTML as a `file://`
URL breaks the relative paths.

Published at <https://yah-enter.github.io/SAMP/rendon-remodeling/>. Note the
repo root `index.html` redirects the Pages root to `pro-roofing/`, so this
sample is only reachable by that deep link until the redirect is repointed.

Before sending that link to the client: the repository is public, so the 247
photographs under `img/` — their own photography, pulled from their media
library — are publicly reachable once Pages serves them. That is normally fine
for a pitch of their own site, but it is worth being a deliberate choice rather
than a surprise.

---

## Taken from the live site, unchanged

**Palette** — scraped from the live Elementor globals, used as-is:

| Token | Hex | Where |
|---|---|---|
| `--brass` | `#F99D50` | buttons, accents, the script line |
| `--brass-deep` | `#8F5100` | labels and links on light ground |
| `--teal` | `#00323D` | top bar, dark bands, closing CTA |
| `--teal-tint` | `#40C1D2` | one drift gradient only |
| `--ink` | `#201D1D` | body text, dark sections |
| `--grey` | `#656868` | secondary copy |
| `--stone-1/2/3` | `#ECEAEA` `#D8D4D4` `#BBB4B4` | surfaces and hairlines |

Two values are derived and nothing else: `--paper` (`#FBFAF9`, a warm white so
the stones do not go blue next to the brass) and `--ink-80` (`#4A4545`).

**Content** — services, the nine process steps, pricing, the Rendon family
history, team bios and the service-area list are the client's own facts.
Reviews are verbatim, including the ones that open by saying Rendon was not
the cheapest quote.

**Images** — 247 files from `rendonremodeling.com/wp-content/uploads`, their own
photography, downloaded one request at a time. Named by household and room, which
is where the gallery captions come from (`Ayers_Kitchen.webp` → "Ayers Residence
/ Kitchen Remodel").

## Changed deliberately

**Typography.** The live site runs Cammron (a licensed display sans) over Work
Sans, Poppins, Roboto and Avenir — five families. This uses three:

- **Cormorant Garamond** for display. Replaces Cammron's heavy uppercase, which
  was doing the work of a luxury face without the proportions for it.
- **Work Sans** for body, nav, buttons and labels. Already in their stack.
- **Allison** for the script flourish. Also already theirs, now used twice a
  page at most instead of as a hero headline.

**Margins.** One spacing scale, one container width (1280, 1500 for galleries),
one fluid gutter. Sections share a single `--section-y`. The live site's
sections each carried their own Elementor padding, which is why the rhythm
wandered.

**Borders.** Hairline rules and tonal steps only. No translucent rings around
cards, no gradient borders, nothing above a 2px radius. Where an edge reads, it
is because a surface stops.

---

## Page redundancy removed

The live site runs roughly 45 pages. This runs 15. What was folded in:

| Was | Now |
|---|---|
| 7 portfolio pages (all, kitchens, baths, additions, basements, porches, before/after) | `portfolio.html` — one filterable gallery with a lightbox, before/after at `#before-after` |
| 20 near-identical city pages | `service-areas.html` — all twenty towns, grouped by county, each county with its own copy |
| `/about-us/`, `/our-story/`, `/meet-our-team/` | `about.html` |
| Testimonial block repeated on home, about, services and every service page | `reviews.html` is the only page with review text in the HTML |

**The review point is the one that matters for SEO.** On the live site the same
testimonial text appears in the source of a dozen pages, so every one of them
competes with the others on identical content. Here the conveyor on the home
page is injected by `js/reviews.js` at runtime — a visitor sees it, a crawler
indexes the reviews once, on `reviews.html`.

Every page now has one `<h1>`, a unique title under 70 characters, a unique
meta description under about 160, and a canonical link. `index.html` carries
`GeneralContractor` JSON-LD with the service catalogue and all twenty towns.

---

## Needs the client before this goes live

1. ~~**Social links are guesses.**~~ **Done.** All four were read off the live
   site's own header and footer and verified 200:

   | | |
   |---|---|
   | Facebook | `facebook.com/rendonremodel` |
   | Instagram | `instagram.com/rendon_remodeling/` |
   | Houzz | `houzz.com/professionals/design-build-firms/rendon-remodeling-and-design-llc-pfvwus-pf~1325641576` |
   | YouTube | `youtube.com/user/RendonRemodeling123` |

   Note the live site also carries a second YouTube link
   (`channel/UCQUzjn1nNSyk3v_AmW9RX5w`); the `/user/` one is what both its header
   and footer icons point to, so that is what is used here. All social anchors now
   carry `target="_blank" rel="noopener"` — previously `rel="noopener"` was there
   without a target, which does nothing.

   The "Leave a review" button on `reviews.html` is a clean Google search for the
   business. The live site links to a Google URL carrying `stick=`, `mat=` and
   `authuser=0` session tokens, which is brittle and account-specific, so it was
   not copied. If they want the button to open the review box directly, get the
   Google Place ID and use
   `https://search.google.com/local/writereview?placeid=<ID>`.

2. **Review count and rating.** The page shows 5.0 and a count driven by the 44
   reviews in `js/reviews.js`, which is what the live site was publishing when
   this was captured. Confirm the current Google totals, then either refresh the
   data file or point the block at a live feed. No `aggregateRating` was put in
   the JSON-LD, deliberately — do not add one until the number is verified.
3. **Three team members have no role.** Jose, Will and Alex are on the live
   team page without titles, so `about.html` labels them "Project team" and
   describes the crew rather than inventing a job. Same for Leo Gunawan and
   George Mayaba, who are only identifiable from client reviews.
4. **No street address.** The live site publishes a phone number and email but
   no address, so the JSON-LD gives locality only (Chantilly, VA). Add
   `streetAddress` and `postalCode` if they want the map pack.
5. **The consult form has no backend.** It validates, then says plainly on
   screen that nothing was sent and gives the phone number. Wire it to the real
   handler before launch — see `consultForm()` in `js/site.js`.
6. **Canonical URLs assume the site replaces the current one** at
   `rendonremodeling.com/<page>.html`. Adjust if the paths change.

---

## Motion

Three layers, all off under `prefers-reduced-motion: reduce`:

- **Reveals.** `data-reveal` fades and lifts over 0.95s on an
  IntersectionObserver; `data-stagger` on a parent spaces the children.
  `data-reveal="mask"` unveils a photograph with a `clip-path` wipe instead.
- **Glare.** `.glare` bands get a raking highlight whose position is driven by
  how far the band has travelled through the viewport, so it sweeps once per
  pass. `.glare--soft` is the low-contrast version for light sections — white at
  full strength reads as a band rather than as light.
- **Drift.** `.drift` dark bands carry the client's own stone texture at 14%
  plus a 26-second wandering warm gradient.

One scroll listener drives all of it, reading the position once per frame.

## Review conveyor

`js/site.js` builds the belt from `window.RENDON_REVIEWS`. Cards are
`clamp(248px, 21.5vw, 306px)`, which puts **four to five in view** on desktop,
as asked. The track holds the list twice and the keyframe translates exactly
half of it, so the loop has no visible seam. Speed is 7.5s per card rather than
a fixed duration, so adding reviews slows the belt instead of speeding it up.
It pauses on hover and on keyboard focus. Reviews over ~460 characters are held
back for the wall on `reviews.html`, where "Read in full" opens any of them in a
dialog.

## Gallery

Mosaic on a 2/3/4-column grid by width, with a wide frame every twelfth tile and
a tall one every seventh — a fixed pattern, so the page looks the same on every
reload. Aspect-ratio boxes hold their place while images load, so nothing jumps.
28 tiles to start, "Load more" adds 28. The lightbox arrows through whatever is
currently filtered, preloads both neighbours, takes arrow keys, Escape and
swipe, and restores focus to the tile you opened.

Service pages reuse the same component with `data-only="kitchens"` and friends.
The home page's room cards deep-link in as `portfolio.html?cat=kitchens`.
