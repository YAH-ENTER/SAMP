# SAMP

Sample and client site builds. One folder per project, each self-contained with
relative paths so it can be lifted straight onto its own domain.

| Project | What it is | Status |
|---|---|---|
| `joses-painting/` | Jose's Painting Services — Woodbridge, VA residential painter | Built, not launched |

## Working in here

Each project is plain HTML, CSS and JS. No build step, no dependencies, no
package manager. Open the folder, edit the files.

To preview one with working relative paths (opening `index.html` as a `file://`
URL breaks them), run the local server from the repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Root .\joses-painting
```

Then open http://localhost:8099/. Ctrl+C stops it.

## Branching

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
