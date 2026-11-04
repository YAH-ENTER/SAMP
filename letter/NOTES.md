# A Letter — J & M — build notes

Internal. Excluded from the published site by `_config.yml` (`**/NOTES.md`).

---

## What this is

A digital letter, not a sample site. One page. It loads to a sealed envelope
standing in a pointillist summer field, breaks its own wax, opens, lifts the
folded sheet out, unfolds it, and brings the writing into focus. The song fades
up as the envelope opens and is turned down once there is something to read.

The sheet is a real page: 8.5 by 11, one-inch margins, set in Fell types and
signed Jonathan Anthony.

Static HTML. No build step, no framework, no dependencies, no images. Two
webfonts from Google Fonts, and everything else is generated in the browser.

```
letter/
  index.html        the page, plus the letter text in a <template>
  css/letter.css    paper, wax, fold geometry, tearstains
  js/painting.js    the field, generated and animated on a canvas
  js/letter.js      measuring, the sequence, the music
  audio/            where the song goes; see its README.txt
```

Preview with `serve.ps1` from the SAMP folder, then
<http://localhost:8099/letter/>. Opening the HTML as a `file://` URL breaks the
relative paths.

---

## Two things still open

1. **The song plays here, but not at the published URL.** Your mp3 is in
   `audio/je-te-laisserai-des-mots.mp3` and the page plays it: faded up as the
   envelope opens, eased down to a quarter once the writing sharpens. It is kept
   out of the repository by `audio/.gitignore`, because the recording is Patrick
   Watson's and this repository and its Pages site are both public — committing
   it would put a commercial track on an open address. So the full version lives
   on this machine and in any zip of this folder; the live page opens in
   silence. If the song has to reach someone, send them the folder.

2. **This is published to a public address.** `_config.yml` does not exclude
   this folder, so it is live at
   <https://yah-enter.github.io/SAMP/letter/> and the files are readable on
   github.com, since the repository itself is public. The page carries
   `noindex, nofollow`, so search engines will not list it, but anyone with the
   link can read it. To take it off the web, add these three lines to the
   `exclude:` block in `_config.yml`, the same way `pro-roofing` was unpublished:

   ```yaml
   - letter
   - letter/
   - "letter/**"
   ```

---

## How the fold works

This was the part worth getting right, so it is a real fold rather than a
picture of one.

The sheet is cut into three panels of exactly one third the text height. Each
panel holds its own copy of the entire letter, shifted up by one panel, and
clips it. Lying flat, the three copies line up into one continuous page; the
only evidence of the seam is the crease shading, which is meant to be there.

Each panel has a front and a back, both with `backface-visibility: hidden`.
Folded, the top third is turned down over the middle and the bottom third up
over that, so what you see is the *back* of two panels: blank paper, exactly as
with a real letter. The writing has to line up only at the moment the sheet
opens out, which is also the moment the ink sharpens.

Two things about this that cost time:

- **`translateZ` after a half turn inverts.** `rotateX(180deg) translateZ(2px)`
  puts the panel 2px *behind* where it started, because the translate happens in
  the panel's own flipped frame. Both folded panels were sitting behind the
  middle third, which showed its text through the "closed" letter. The folded
  transforms use negative Z for that reason.

- **Panel-sized paper tiles three times.** The paper's highlight was painted on
  each panel, so the open letter had three identical bands of lighting down it.
  The surface now lives on `.sheet`, which spans all three panels and is offset
  with the text, and only the blank backs are lit panel by panel.

The panel height depends on the exact height of the text, which depends on the
fonts, so nothing is positioned until `document.fonts.ready` resolves. There is
a 1.8s timeout behind that in case the font server is slow.

---

## How the field works

Divisionist in the real sense: no shapes, only dabs of unmixed colour next to
each other. About one dab in six is thrown deliberately off-hue — a warm note in
a cold sky — because that disagreement between neighbours is what makes the
surface shimmer rather than sit flat.

The cost of that is dab count, so the work is split:

- **Baked once** into an offscreen buffer and blitted as one image per frame:
  sky, sun, two ranges of hills, trunks, the meadow floor, and the dense inner
  body of every tree canopy.
- **Redrawn per frame:** the outer canopy dabs, the grass, and the light motes.
  A few thousand, bucketed by colour, so `fillStyle` is set a few dozen times a
  frame instead of a few thousand. Round dabs go out as one path and one fill
  per bucket.
- **Baked and then moved:** the cloud bank is its own transparent layer, drawn
  twice per frame at a sliding offset so it wraps. Two `drawImage` calls instead
  of four thousand dabs.

The first version ran at 21fps. The fix was not fewer dabs, it was getting
`createRadialGradient` out of the frame loop: the sun's bloom and every light
mote were building gradients 34 times a second. Both are sprites now. Measured
after: 60fps at 644×534, 54fps at 1600×900.

Dab counts are areal and the divisor carries `scale` squared, so a high-DPI
screen gets bigger dabs rather than four times as many of them.

The whole painting is generated from a seeded random, so it comes out the same
every time. Change `seed` in `painting.js` for a different field.

---

## The rest of it

**The music.** Faded up to 0.8 over 4.5s as the envelope opens, then eased down
to 0.2 over 6s the moment the ink sharpens, on an ease-in-out curve so it feels
like a hand on a dial rather than a switch. The toggle sits bottom right.

**Autoplay.** Every current browser blocks audio the visitor did not ask for.
The page attempts it, and only if refused shows one line of letterspaced small
caps and starts on the first press. With no audio file at all, the letter opens
immediately and in silence, and the music switch stays hidden. There is a 2.5s
timer behind the whole thing because a `play()` promise can hang unresolved
while the element works through three sources that are all missing.

**Tearstains.** Layered radial gradients under `filter: url(#wet)`, an inline
`feTurbulence` + `feDisplacementMap` that roughens the edges into something wet
rather than circular. Six blots, two tracks where a tear ran before it dried,
two dried rings. They multiply onto the paper and fade in with the writing.
`.face` carries `isolation: isolate`, or the untransformed middle panel lets the
multiply blend through to the green field behind it.

**The wind.** A 15s keyframe on the sheet itself: about a degree of yaw, less
pitch, a few pixels of travel. It moves without going anywhere.

**Grain and vignette.** One 180px tile of generated noise nudged five ways in
0.62s steps, at 7% over an overlay blend, plus a radial vignette. Both inline
SVG, so neither is a network request.

---

## The setting

IM Fell English, a digitisation of the types Bishop Fell brought to Oxford in
the 1670s, with the inked and slightly uneven edges left in. It carries most of
the period feel without anything else being done to it.

On top of that: the text justified with hyphenation, a versal at the opening and
the first few words in small capitals, paragraph indents of a line and a half,
and the ink shifting density from paragraph to paragraph, the way it does when a
nib runs dry and gets dipped again. The salutation and the signature are in a
Spencerian script, and the signature has a pen flourish under it, drawn as four
bezier curves rather than set as a character.

No ruled lines. Ruling would read as an exercise book, and the paper already has
its fibre and foxing.

## Sizing

The page is US Letter, properly: **8.5 by 11, with one-inch margins**. The
proportion is held, and the type is set to the page rather than the page to the
type — a binary search of eight off-screen measurements finds the largest size
that still fits inside the margins. That is why the type is around 17.5px on a
1600-wide screen and around 11px on a phone. A letter-size page shrunk to the
width of a phone really is that small; holding the ratio and lying about the
scale would have been the worse answer. Pinch-zoom works.

The sheet is sized against whichever way the screen is tighter, so it fits
without scrolling at nearly every window size. Two safety valves behind that:

- if the window is too small to hold a page at readable type, the sheet is
  allowed to run longer than 11 inches rather than cut the last paragraph off —
  the proportions give way before the words do;
- if even that leaves the sheet taller than the window, the page scrolls.

Two scale bugs worth remembering, both from the letter being a *child* of the
envelope:

- The measuring probe set `font-size` but not `--fs`. The salutation and the
  signature are sized off `calc(var(--fs) * n)`, so they were being measured at
  whatever the previous layout had left on `:root`, and the fitted size came out
  wrong. The probe sets the variable now.
- The envelope used to settle back 220px on the Z axis as the letter came out.
  Under perspective that was quietly showing the open page at about 81% of true
  size. The envelope now fades where it stands, and `--letter-scale` divides the
  envelope's own fit scale back out. Measured after: the rendered sheet is
  within 0.6% of its declared width, the rest being the wind.

`clientWidth`, not `innerWidth`, throughout: `innerWidth` counts the scrollbar,
and the scrollbar turns up exactly when the letter is at its longest. When the
page does scroll, `body` goes to `overflow: visible; height: auto` rather than
`overflow-y: auto`, or the body becomes its own scroll box at `height: 100%` and
`window.scrollTo` has nothing to scroll.

---

## Verified at build time

No JavaScript errors. 60fps at 644×534, 54fps at 1600×900. The page geometry
measures 1.293 against a target of 1.294, and one inch comes out at 77px on a
652px sheet. No horizontal overflow at 375px, 644px or 1600px. The whole letter
reads on one screen at 375×812 and at 1600×900. The sequence was stepped through
frame by frame: seal intact, wax broken, flap open, sheet risen, sheet flat, ink
sharp. The song was confirmed playing from the mp3 and ducking to 0.2 on cue.

One note on checking it in a preview pane: screenshots of an emulated viewport
larger than the pane come back several seconds stale, which looks exactly like a
page that failed to start. Query the DOM before believing a dark frame.

`prefers-reduced-motion: reduce` skips the whole performance. No envelope, no
wind, no grain animation, a still field, and the letter simply open and
readable. The music still has to be asked for.

The letter is also in a `<noscript>` block and in a visually hidden copy for
screen readers, so it can be read without JavaScript and out loud.
