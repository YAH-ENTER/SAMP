The song goes here.
===================

The page looks for these three names, in this order, and plays the first
one the browser can handle:

    je-te-laisserai-des-mots.mp3    (there now, and what plays)
    je-te-laisserai-des-mots.m4a
    je-te-laisserai-des-mots.ogg

The mp3 is in this folder and the page plays it. One file is enough;
.mp3 alone covers every browser in use.

It is NOT in the repository, and that is deliberate rather than an
oversight. The `.gitignore` next to this file keeps every audio file out
of commits. "Je Te Laisserai Des Mots" is Patrick Watson's recording,
and the SAMP repository is public, as is the GitHub Pages site built
from it — so committing the file would put a commercial recording on an
open address for anyone to download, which is not ours to do.

What that means in practice:

    locally, and in a delivery zip    the letter plays the song
    at the published GitHub Pages URL the letter opens in silence

If the song needs to reach someone over the web, hand them the folder or
a zip of it rather than the public link.

If the file is missing the page does not break. The seal still breaks
and the sheet still unfolds, in silence, and the music switch in the
corner stays hidden.

What the page does with it
--------------------------

The track is faded up from nothing over about four and a half seconds as
the envelope opens, held while the letter comes out and unfolds, then
eased down to a quarter of its volume over six seconds at the moment the
writing comes into focus. The song steps aside once there is something
to read. The switch at the bottom right turns it off and on.

Autoplay
--------

Browsers refuse to start audio before the visitor has touched the page.
The page tries anyway, and if it is refused it shows one line, "press
anywhere to begin", and starts on the first press instead. Everything
after that press runs on its own.

Keep the file small. A four-minute track at 128 kbps is around 4 MB,
which is fine; a 40 MB WAV is not.
