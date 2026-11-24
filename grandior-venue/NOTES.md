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
  img/brand/      crest in gold / white / black (transparent PNG), crest in black
                  banner, round black seal, favicons (from the seal)
  img/video/      12-second photo reel + poster
```

No build step. Fonts come from Google Fonts; the map is a Google Maps embed.

## Design: the palace (revision 2)

The first pass used the live site's olive and gold theme in a dark "digital"
frame. On review the client asked for a palace instead: a throne room, columns,
ivory porcelain, gilt, prestige, and no jagged lines. The palette now comes from
the venue's own photographs rather than its current website.

- **Header**: a black band, with the crest hanging below it in a black banner
  that has a fully rounded foot, a gilt inner line and a pearl. The crest's gold
  needs black around it to hold its presence on a light page. The banner shrinks
  on scroll.
- **Hero**: the storefront fills the screen, as in revision 1, which the client
  preferred. (A throne-room version with columns and a red carpet was tried and
  dropped.) The headline, buttons and address sit in a dark band low on the
  photo, below the sign. The focal point is set to `54% 40%` because the sign
  sits right of centre, which keeps it whole on phones. On load the photo
  pulls back from 1.3x. On scroll the stage stays pinned while the photo eases
  into a porcelain frame with a gilt line, matching the photos further down.
- **Shape language**: arches (plates, tall gallery tiles, review cards), pills
  (buttons, filters, tags), circles (numerals, bullets, socials, lightbox
  controls), pearls. Every corner is rounded.
- **Inlay framing**: photos and the form sit in a porcelain gap with a gilt line
  around them (`box-shadow` rings, so they follow the curves).
- **Events** is the royal-blue velvet hall: soft vertical folds, a string of
  pearls and gilt rules top and bottom.
- **Ornament**: one inline SVG symbol (`#ornament`), a gilt rule with a pearl
  and two leaf curves, reused under the intro, in the form and in the footer.
- Section numbers are Roman numerals in gilt circles. The monospace HUD labels
  from revision 1 are gone.
- Wide gutters (up to 176px) and tall sections are kept from the first brief.

All motion is disabled under `prefers-reduced-motion`.

## Palette — sampled from the venue photographs

K-means and targeted hue sampling over the five interior photos.

| Token | Hex | Taken from | Used for |
|---|---|---|---|
| `--porcelain` | `#F8F8F4` | brightest marble floor | page ground |
| `--marble` | `#EBEDE9` | floor in shade | alternate bands |
| `--ivory` | `#E6E2DA` | table linen | column bodies |
| `--satin` | `#D9D3C0` | satin tablecloths | hairlines, inputs |
| `--gold` | `#B29B4B` | chiavari chairs | gilt, rules, buttons, ornament |
| `--gold-lit` | `#E0D1A7` | gold arch under stage light | gold on dark |
| `--gold-deep` | `#816B2D` | gilt in shadow | large gold type on light |
| `--gold-ink` | `#6E5A22` | darker gilt | small gold text (6.3:1 on porcelain) |
| `--royal` | `#162156` | velvet drape behind the stage | events hall |
| `--royal-deep` | `#090F45` | velvet in the folds | events hall shading |
| `--carpet` | `#C43043` | red carpet, lit | reserved |
| `--crimson` | `#AF1E2F` | red carpet, shadow | form errors |
| `--blush` | `#E9B1AA` | the roses | reserved |
| `--onyx` | `#13131B` | the black ceiling | crest banner, footer, menu |
| `--ink` | `#232630` | ceiling fixtures | body copy (14:1) |

Plain `--gold` is 2.6:1 on porcelain, so it never carries small text. Gold
lettering on light grounds uses the darker `.gilt-text` gradient.

Type: Cinzel (wordmark, inscriptions, labels), Cormorant Garamond (headlines),
Lato (body, as on the current site).

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
- **Banner and seal PNGs** were drawn in Python (PIL, 3x supersampled for
  smooth curves) around the original crest.
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
