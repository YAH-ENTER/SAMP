# Design philosophy reference

Internal, not published (`_config.yml` excludes it). These are the design
thinkers the Grandior build draws on, what each one argued, and where it shows
up on the site.

## Dieter Rams: "less, but better"

Rams wrote down ten principles of good design in the 1970s and published them
in *Less but Better* (1995). Good design, in his list, is innovative, useful,
aesthetic, understandable, unobtrusive, honest, long-lasting, thorough down to
the last detail, environmentally friendly, and as little design as possible.

On Grandior: honesty and "as little design as possible" are why the fake stone
columns and the drawn red carpet came out. The building and the hall are shown
as they are, in the client's own photographs, edge to edge rather than boxed in
frames. "Thorough down to the last detail" is the reason for the strict type
scale below.

## Massimo Vignelli: few typefaces, one system

The Vignelli Canon argues that good typefaces are few and that a designer can
get by with about half a dozen. Vignelli treated the grid, the typefaces and
the hierarchy of text as the syntax of a design, fixed before anything else.

On Grandior: three typefaces (Cinzel, Cormorant Garamond, Lato) and five sizes.
Every headline is one size, every label is one size, and every block of
running serif text is one size.

## Josef Müller-Brockmann: the grid

*Grid Systems in Graphic Design* (1981) made the modular grid the basis of
Swiss style. He wrote that working within the grid means "submitting to laws of
universal validity."

On Grandior: one gutter value controls every left and right margin, so the
review carousel, the gallery heading and the form all line up on the same edges.
The review carousel used to run off the right side of the page. It now sits
inside the same margins as everything else.

## Mies van der Rohe and Robert Venturi: "less is more" against "less is a bore"

Mies's "less is more" became the motto of modernism. Venturi answered it in
*Complexity and Contradiction in Architecture* (1966) with "less is a bore,"
arguing for richness. Twenty years later he said that phrase was the one thing
he might take back, and called Mies one of the century's great masters.

On Grandior: the structure is Mies (white ground, few elements, a lot of space).
The richness is Venturi, and it comes from the venue itself: gold chairs, blue
velvet, roses, the brick storefront at dusk. The design stays quiet so the
photographs can be loud.

## Brutalism: the Smithsons and Reyner Banham

Alison and Peter Smithson coined "the New Brutalism" in 1953. Reyner Banham's
1955 essay turned it into a label for both an ethic and an aesthetic, tied to
Le Corbusier's *béton brut*, raw concrete that keeps the marks of its formwork.
The ethic was honesty about materials and structure.

On Grandior: the look is far from Brutalist, but the ethic carries over. The
site shows the real brick strip-mall storefront rather than hiding it, and uses
the venue's own photos with no stock imagery.

## Kenya Hara: emptiness and white

Muji's art director sets "emptiness" (*kū*) against Western minimalism: an
empty space is a receptacle that invites people to bring their own use and
imagination to it. His book *White* treats white as a design idea in its own
right.

On Grandior: the page opens on a white screen. The crest appears on it, and
then the storefront fades up. The porcelain ground between sections is there to
give each photo room.

## Type scale (Vignelli, applied)

| Token | Size | Used for |
|---|---|---|
| `--t-display` | clamp(40px, 4.4vw, 68px) | hero headline and every section title |
| `--t-lead` | clamp(24px, 2.2vw, 34px) | intro statement, event names, form title |
| `--t-serif` | clamp(19px, 1.4vw, 22px) | review text, list items, contact details, facts |
| `--t-body` | 17px | paragraphs |
| `--t-label` | 12px Cinzel, tracked | every label, button, nav link, caption, tag |

## Sources

- Vitsœ, [Good design](https://www.vitsoe.com/us/about/good-design) (Rams's ten principles)
- Wikipedia, [Dieter Rams](https://en.wikipedia.org/wiki/Dieter_Rams)
- RIT Vignelli Center, [The Vignelli Canon (PDF)](https://www.rit.edu/vignellicenter/sites/rit.edu.vignellicenter/files/documents/The%20Vignelli%20Canon.pdf)
- Fonts In Use, [Massimo Vignelli's A Few Basic Typefaces](https://fontsinuse.com/uses/14164/massimo-vignelli-s-a-few-basic-typefaces)
- J. Müller-Brockmann, [Grid and Design Philosophy (PDF)](https://openlab.citytech.cuny.edu/langecomd3504fa2019/files/2018/10/MullerBrockmann_Grid_Des-Phil.pdf)
- Wikipedia, [Swiss Style (design)](https://wikipedia.com/wiki/Swiss_Style_(design))
- Architizer, ["Less Is More" vs. "Less Is a Bore"](https://architizer.com/blog/practice/details/less-is-more-vs-less-is-a-bore/)
- New York Review of Books, [Building Nothingness](https://www.nybooks.com/articles/1986/06/12/building-nothingness/) (Venturi, 1986)
- Wikipedia, [Brutalist architecture](https://en.wikipedia.org/wiki/Brutalist_architecture)
- R. Banham, [The New Brutalism, Architectural Review, 1955 (PDF)](https://moodle2.units.it/pluginfile.php/318412/mod_resource/content/1/1955-december_-the-new-brutalism-by-reyner-banham-_-archive-_-architectural-review.pdf)
- Quartz, [Emptiness, not minimalism, is the path to creativity](https://qz.com/quartzy/1140182/mujis-design-philosophy-is-emptiness-not-minimalism-says-kenya-hara)
- Wikipedia, [Kenya Hara](https://en.wikipedia.com/wiki/Kenya_Hara)
