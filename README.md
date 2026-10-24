# SAMP

Sample and client site builds. One folder per project, each self-contained with
relative paths so it can be lifted straight onto its own domain.

| Project | What it is | Status |
|---|---|---|
| `joses-painting/` | Jose's Painting Services — Woodbridge, VA residential painter | Built, not launched |
| `wicked-roadside/` | Wicked Roadside Assistance — flat $85 towing, AAA certified, nationwide | Built, waiting on owner answers |
| `pro-roofing/` | PRO Roofing — Lorton, VA roofing contractor, rebuild of proroofingpros.com | Built, waiting on owner answers |
| `_zips/` | Generated delivery zips, one per sample | gitignored |

`pro-roofing/` is the first multi-page sample in here — twelve pages rather than
one `index.html`. It has its own `NOTES.md` covering the logo rebuild, the
hand-rolled 3D roof figure on the home page, how the three damage articles were
sourced, and the six things only the owner can answer. Read that before the site
goes anywhere.

`wicked-roadside/` has a BEFORE LAUNCH block at the top of its `index.html`
listing six things only the owner can answer, including hours and the AAA
certification number. Read that block before the site goes anywhere.

## Working in here

Each project is plain HTML, CSS and JS. No build step, no package manager. Open
the folder, edit the files.

One exception so far: `pro-roofing` loads Three.js from a CDN through an import
map, for the roof model in its hero. There is still nothing to install or
compile, but that page needs a connection to draw the model. See its `NOTES.md`
for why that tradeoff was taken.

## Previewing a sample

Double-clicking `index.html` does not work. The page loads but the CSS and JS
do not, because `file://` URLs break the relative `css/` and `js/` paths. You
need a local server, which is what `serve.ps1` is for.

**One sample at a time.** Open PowerShell and run these two lines. The first
line is the folder this README is in — the one holding `serve.ps1`, not the
sample folder:

```powershell
cd "C:\Users\yahsh\Yahshua Enterprises, LLC\WEB CODES 2026\SAMP"
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Root .\joses-painting
```

**Read the address it prints**, then open that in a browser:

```
serving C:\...\SAMP\joses-painting
open http://localhost:8099/   (Ctrl+C to stop)
```

It usually says 8099, but not always. Windows hangs on to a port for a while
after a server is closed by shutting the window instead of pressing `Ctrl+C`,
so the script walks forward until it finds a free one and tells you which it
got. If the line says 8102, use 8102. Nothing is wrong when that happens.

`Ctrl+C` in that PowerShell window stops the server. Closing the window works
too, but it is what ties up the port for the next run.

To preview a different sample, stop it with `Ctrl+C` and run it again with that
folder after `-Root`, for example `-Root .\some-other-sample`.

Leaving `-Root` off serves this whole folder and shows a list of every sample
to click through, if you ever want them all up at once.

## Zipping a sample to send

One folder per sample. Never merge a new sample's files into an existing
sample's folder — that is what the zips exist to prevent.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\archive.ps1 -Project joses-painting
```

Writes `_zips\joses-painting_<today>.zip`. Running it twice in a day gives you
`-2`, `-3` and so on; nothing is ever overwritten. Everything inside the zip is
prefixed with the project folder name, so unzipping never spills loose files
into whatever directory the client happens to be in.

`_zips\` is gitignored. Zips are build output, not source — regenerate one any
time from the folder. They are also the client-facing format, since this repo
is private and nobody outside can browse it.

A zip contains the sample's working files, not git history, because the samples
are subfolders of this one repo rather than repos of their own. History lives
here and on GitHub.

## Branching

Separate samples are folders on `main`, not branches — a repo has one working
tree, so branch-per-sample means you can only ever see one sample on disk at a
time. Use a branch when you want a variant of an existing sample, or when you
are revising one that has already gone out.

`main` holds the last known-good state of each project. Cut a branch per change:

```
git switch -c joses-painting/add-photos
```

---

## joses-painting — before it goes live

The site is finished and verified, but five things are deliberately left blank
because only Jose can supply them. Each has a marked slot in the HTML.

1. **Licensed and insured.** Left off the page and out of the FAQ on purpose
   rather than guessed at. Needs the real Virginia contractor license number and
   insurance carrier. It is the biggest trust item on a painting site. See the
   `TODO` comment above the FAQ block.
2. **Project photos.** Six placeholder tiles in the gallery, clearly marked as
   placeholders. Drop real job photos into `joses-painting/img/` and follow the
   `PHOTO SLOTS` comment. Keep the `width`/`height` attributes so the layout
   does not jump while images load.
3. **Reviews.** The reviews section is an empty marked slot. Paste real Google
   Business Profile reviews using the template in the `REVIEWS` comment. Do not
   add a star rating or review count unless it matches the real profile.
4. **Form delivery.** The form currently opens the customer's mail app. To send
   leads straight to an inbox, create a free Web3Forms or Formspree endpoint and
   paste the URL into `data-endpoint` on the `<form>`. This is the single
   biggest conversion fix on the page.
5. **Domain.** Once the domain is live, uncomment the `canonical`, `og:url` and
   `og:image` tags in `<head>`.

### Verified at build time

Zero console errors. No duplicate IDs, no dead anchors. Zero horizontal overflow
at 375px, 820px and 1280px. Both JSON-LD blocks parse; the six rendered FAQs
match the six in the `FAQPage` schema. All 34 sampled text styles clear WCAG AA
contrast, minimum 4.94:1. Form validation, honeypot, submit, reset and error
states all exercised in a real browser.
