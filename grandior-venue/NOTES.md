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
  js/site.js      opening screen, header, scroll reveals, gallery + lightbox,
                  review carousel, form
  DESIGN-PHILOSOPHY.md  the design thinkers this draws on, with sources (not published)
  img/photos/     6 real photographs, WebP at 2400w and 1000w (-sm)
  img/brand/      crest in gold / white / black (transparent PNG), crest in black
                  banner, round black seal, favicons (from the seal)
  img/video/      12-second photo reel + poster
```

No build step. Fonts come from Google Fonts; the map is a Google Maps embed.

## Published

Live at <https://yah-enter.github.io/SAMP/grandior-venue/> (GitHub Pages from
`main`). The page stays `noindex` so it never competes with grandiorvenue.com
in search. The URL still works for anyone it's sent to. The photos in `img/`
are the client's own, from their site and Google profile, so they become
publicly reachable too, which is normal for a pitch of their own site. To take
it down, add `grandior-venue` to the `exclude:` list in `_config.yml`, as was
done for pro-roofing.

## Design (revision 3)

Revision 1 used the live site's olive theme in a dark "digital" frame.
Revision 2 moved to a palace look, with the palette sampled from the venue
photos, and briefly tried a throne-room hero with drawn columns and a red
carpet. Revision 3 keeps the palace palette and the black crest banner. It lets
the client's photographs carry the page, edge to edge with no frames, and
leaves the design around them quiet. The reasoning, and the designers behind
it, are in `DESIGN-PHILOSOPHY.md`.

- **Opening**: the page starts on a white screen, the crest fades in, then the
  page fades up. `site.js` waits for the hero photo to decode (and the fonts to
  load) before anything moves. The crest stays at least 0.7 seconds, and the
  page is never held longer than 3. Without JS there is no white screen.
- **Header**: a fixed black band, with the crest alone (no wordmark) in a black
  banner with a rounded foot. The grid row is pinned to the bar's height, so
  nothing sinks below the gold line. "Book now" is a gold button that never
  leaves the screen: on the right of the nav on desktop, and on the left of the
  header on phones, with a three-line burger on the right. Checked at 360, 390
  and 430px: the button sits inside the bar, at least 12px clear of the banner.
  Every "Book now" and "Book a tour" goes to the "Ask about a date" form
  (`#enquiry`).
- **Gold buttons**: a black outline, a bevel (light top edge, shaded bottom),
  a thin inner molding line and a dark gold ledge underneath, so they read as
  raised. A sheen crosses on hover, and they press down on click.
- **Gallery filters** use the same build in porcelain, one step quieter, and
  the selected one turns gold. The Roman numerals in the section labels are
  small gold coins with a lighter bevel.
- **Hero**: the storefront fills the screen with a slow parallax on scroll. The
  headline, buttons and address sit under the sign. The address is on a frosted
  glass pill so it reads over the brick. Focal point `54% 40%`. On phones the
  photo shifts up 16% at its normal size, so the whole sign shows above the
  text.
- **Photos**: full width. The hall is one tall band, then two photos side by
  side, then the ceremony stage running to the left edge beside the "Why"
  copy. The gallery spans the screen with 6px seams. The events section sits
  over the full-size banquet photo (`hall-tables.webp`), tinted navy. The
  stage photo used there before was the 1000px version, which looked soft
  when stretched. Event names are set at `--t-serif`, not `--t-lead`.
- **Scroll**: a brief fade in (0.6 seconds, opacity only) for text and photos
  alike, lightly staggered with `--d`. The client asked for this in place of
  the earlier blur-rise and curtain effects.
- **Form**: the address block and the form are one centred pair of equal
  columns (max 1180px). Event, date and guest count each get a full row, so the
  date field has room. Grid items get `min-width: 0` and the date input has its
  width and height pinned, so a phone's built-in date control can't push the
  form past the right margin. Checked in Chromium at 360, 390, 820 and 1440px.
  WebKit isn't installed in the build environment, so check on a real iPhone.
- **Reviews**: a carousel inside the page margins, three cards across on
  desktop, two on tablets, one on phones. It rotates every 5.5 seconds only
  while on screen, pauses on hover, focus, touch and hidden tabs, and loops
  through clones so it never jumps back. Checked at 1440, 820 and 390px: equal
  margins (115/115, 66/66, 31/31) and cards land flush after each slide.
- **Type**: one scale of five sizes (`--t-display`, `--t-lead`, `--t-serif`,
  `--t-body`, `--t-label`), plus `--t-micro` (10px), used only for captions
  laid over photos and video and in the lightbox. Every section title matches the hero headline, and
  every label, button and caption is 12px Cinzel.
- **Copy**: rewritten with the humanizer rules: no inflated claims, no stock
  triads, no dashes, plain verbs. Facts only from the client's site, Google
  profile and reviews. The reviews are verbatim. The client's line "Your story
  deserves the perfect setting" is kept.
- Shape language is unchanged: arches, pills, circles and pearls, with no points.

All motion is disabled under `prefers-reduced-motion`.

- **Footer** ends with "Powered by Yahshua Marketing", linked to
  <https://yahshuamarketing.com>.

## Palette — sampled from the venue photographs

K-means and targeted hue sampling over the five interior photos.

| Token | Hex | Taken from | Used for |
|---|---|---|---|
| `--porcelain` | `#F8F8F4` | brightest marble floor | page ground |
| `--marble` | `#EBEDE9` | floor in shade | alternate bands |
| `--ivory` | `#E6E2DA` | table linen | footer text, lines |
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
6. ~~**Phone.**~~ Confirmed by the client: +1 (510) 458-9232 is correct.
7. **Catering.** The live site promises "exceptional culinary and hospitality
   experiences", but one review is from an outside caterer. Until the owner
   says whether food is in-house, outside, or both, the new copy leaves catering
   out.

## Verified at build time

Headless Chromium at 1440×900 and 390×844: no horizontal overflow, no script
errors. The only failed request was the Google Maps embed script, which this
sandbox's network blocks (it works on a normal connection). Filters show the
right tiles, the lightbox opens and steps with the arrow keys, Escape closes it
and returns focus, and the video loads and plays.
