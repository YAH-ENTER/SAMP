# Grandior Event Venue — concept build notes

Internal. Excluded from the published site by `_config.yml` (`**/NOTES.md`).

---

## What this is

A new concept for grandiorvenue.com (currently a Hostinger/Zyro site). The brief:
keep the colour scheme, zoom the layout out so the venue reads as a spacious,
digital event space, make it picture-heavy, put the storefront in the hero, give
the logo black and white transparent versions, and add a gallery for photos and
video.

```
grandior-venue/
  index.html      one page: hero, intro, space, events, why, gallery, reviews, visit
  brand.html      logo kit, palette, type (noindex)
  css/site.css    everything
  js/site.js      header, hero pull-back, zoom reveals, gallery filter + lightbox, form
  img/photos/     6 real photographs, WebP at 2400w and 1000w (-sm)
  img/brand/      crest in gold / white / black (transparent PNG) + favicons
  img/video/      12-second photo reel + poster
```

No build step. Fonts come from Google Fonts; the map is a Google Maps embed.

## The "zoomed out" system

- A fixed hairline **frame** sits inset from the screen edge on every page, with
  gold corner ticks, plus vertical rails on wide screens (name / coordinates).
- **Gutters** run to `8.5vw` (up to 176px), several times a normal site's, with
  `15vw` section spacing.
- **Hero**: the storefront is shown whole and uncropped in a framed panel, with a
  blurred copy of the same photo as atmosphere behind it. On load it pulls back
  from 1.4x; on scroll it eases back a further 7%.
- **Photographs** start at 1.16x and settle to 1x as they scroll into view.
- Monospace labels (`01.1 THE HALL, END TO END`) add the digital/HUD feel.

All motion is disabled under `prefers-reduced-motion`.

## Palette — taken from the live site's theme, unchanged

| Token | Hex | Where it is used on the live site |
|---|---|---|
| `--night` | `#242109` | header, footer, section backgrounds (`rgba(36,33,9,.98)`) |
| `--deep` | `#1C1B0F` | deepest ground |
| `--bronze` | `#594D11` | button background |
| `--bronze-2` | `#554E15` | header contrast background |
| `--gold` | `#E0BF1B` | headings |
| `--amber` | `#CF921A` | nav hover, input borders |
| `--marigold` | `#DE9E1E` | social icon hover |
| `--parchment` | `#FCEBCD` | nav links, form labels |
| `--cream` | `#FFEACC` | body copy on dark, input hover |
| `--champagne` | `#E3C69E` | submit buttons |
| `--oxblood` | `#381616` | body copy on light, submit text |
| `--ink` | `#0D141A` | input text and borders |
| `--copper` | `#CC6333` | gradient stop (unused live); one blinking dot here |

One addition: `--crest` `#E7AE33`, the average gold of the crest artwork. The
live site also sets `rgb(143,17,168)` as the far end of an unused gradient. Being
purple, it is left out.

Type: the live site uses Lato throughout, so Lato is kept for body copy. Added:
Cinzel for the wordmark (it echoes the roman caps on the storefront sign),
Cormorant Garamond for headlines, IBM Plex Mono for labels.

## Sources

- **grandiorvenue.com**: the logo (`fulllogo_transparent`), 3 photos
  (`img_2955` → hall-aisle, `img_2975` → stage-backdrop, `img_2978` →
  hall-tables) and all copy. The live gallery is an Instagram feed loaded with
  an access token, so its images could not be pulled.
- **Google Business Profile** (place `ChIJ6eFdMwBBtokRFf5RwCnpANA`): the
  storefront (hero), ceremony-aisle and mandap-stage photos, five review
  excerpts, amenities (stage, sound, projector, free lot, wheelchair-accessible
  entrance/parking/restroom), address. The profile lists **37 photos**; only
  the three above were reachable from here.
- **Black and white crests** were made from the colour PNG by thresholding on
  luminance, so the dark centre disc drops out and the G, ring and flourishes
  stay solid. Clean at the full 1118×941.

## Not from the client

- `img/video/grandior-reel.mp4` is **not footage**. It is a 12-second slow-zoom
  montage of five of the photos above, made so the video slot in the gallery is
  real and playable. No video exists on the site or the reachable profile data.
  Replace it with real walkthrough footage as soon as there is some. The gallery
  labels it "Video" and the caption says "slow pan".
- No star average is shown. The profile says 29 reviews; the average was not
  confirmed, so it is left out.

## Before it goes anywhere

1. **More photos.** Ask the owner for the 37 Google profile photos and the
   Instagram originals. Add each to the gallery by copying a `<figure>` (the
   `GALLERY ITEMS` comment explains the fields).
2. **Real video.** Drop MP4s into `img/video/` and copy the video figure.
3. **Capacity.** Not stated anywhere public; one review mentions a 50–100 guest
   event. Add a capacity figure to the intro facts row once the owner confirms it.
4. **Form delivery.** Currently opens the visitor's mail app. Paste a Web3Forms
   or Formspree URL into `data-endpoint` on `#enquiry`.
5. **Domain.** Remove `noindex` and uncomment the canonical / `og:url` in
   `index.html` when this replaces the live site.
6. **Phone.** The live site and profile both list (510) 458-9232, a California
   area code. Worth confirming it is the number they want on the new site.

## Verified at build time

Headless Chromium at 1440×900 and 390×844: no horizontal overflow, no script
errors. The only failed request was the Google Maps embed script, which this
sandbox's network blocks (it works on a normal connection). Filters show the
right tiles, the lightbox opens and steps with the arrow keys, Escape closes it
and returns focus, and the video loads and plays.
