# A Letter — J & M — build notes

Internal. Excluded from the published site by `_config.yml` (`**/NOTES.md`).

---

## What this is

A digital letter, not a sample site. One page. It loads to a sealed envelope
standing in a pointillist summer field, breaks its own wax, opens, lifts the
folded sheet out, unfolds it, and brings the writing into focus. The song fades
up as the envelope opens and is turned down once there is something to read.

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

## Three things only you can settle

1. **The song is not here.** "Je Te Laisserai Des Mots" is Patrick Watson's
   recording and not ours to redistribute, so `audio/` holds a README and
   nothing else. Drop your own copy in as
   `je-te-laisserai-des-mots.m4a` (or `.mp3`) and it plays. The fade-up and the
   turn-down are already wired. Audio files in that folder are gitignored, so
   adding one does not accidentally commit it.

2. **A typo in the letter, left alone.** The second paragraph reads "I would do
   anything, if it that something or someone would take me from you". That is
   how you wrote it, and it is not mine to correct. Say the word and it changes;
   otherwise it stays exactly as sent.

3. **This is published to a public address.** `_config.yml` does not exclude
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

## Sizing

The sheet reads at up to 620px wide, 21px type. Opened out it is three times as
tall, so:

- if it fits the screen, it is shown at full size;
- if it nearly fits (84% or more), it is scaled down to fit and stays in one
  view;
- below that it is left at full size and the page scrolls, which is how you
  would read a long letter anyway.

The envelope is built around the folded sheet with a margin, so the letter
genuinely fits inside the thing it comes out of. On a narrow screen that makes
the envelope taller than it is wide. That is a consequence of the geometry, not
a bug: the folded sheet's proportions are fixed by the width and the amount of
text, and scaling cannot change them.

`clientWidth`, not `innerWidth`, throughout: `innerWidth` counts the scrollbar,
and the scrollbar turns up exactly when the letter is at its longest. When the
page does scroll, `body` goes to `overflow: visible; height: auto` rather than
`overflow-y: auto`, or the body becomes its own scroll box at `height: 100%` and
`window.scrollTo` has nothing to scroll.

---

## Verified at build time

No JavaScript errors. The only console entries are 404s for the three audio
sources, which is expected until a file is dropped in. 60fps at 644×534, 54fps
at 1600×900. No horizontal overflow at 375px, 644px or 1600px. The full letter
reads on one screen at 375×812. The sequence was stepped through frame by frame:
seal intact, wax broken, flap open, sheet risen, sheet flat, ink sharp.

`prefers-reduced-motion: reduce` skips the whole performance. No envelope, no
wind, no grain animation, a still field, and the letter simply open and
readable. The music still has to be asked for.

The letter is also in a `<noscript>` block and in a visually hidden copy for
screen readers, so it can be read without JavaScript and out loud.
