/* ============================================================
   The letter: measuring, folding, and the music.

   The fold is real rather than faked. The sheet is cut into three
   equal panels, each one holding its own copy of the whole letter
   shifted up by a third, so the three of them together read as one
   continuous page once they lie flat. While the letter is folded you
   are looking at the backs of two of those panels — blank paper, as
   you would be with a real letter — which is why the writing only
   has to line up at the moment the sheet opens out.

   All of that depends on knowing the exact height of the text, so
   nothing is positioned until the fonts have loaded and the letter
   has been measured off-screen.
   ============================================================ */

(function () {
  "use strict";

  var body = document.body;
  var root = document.documentElement;
  var stage = document.querySelector(".stage");
  var letter = document.getElementById("letter");
  var carrier = document.getElementById("carrier");
  var tpl = document.getElementById("letter-copy");
  var plain = document.getElementById("plainText");
  var audio = document.getElementById("music");
  var musicBtn = document.getElementById("musicBtn");
  var overtureBtn = document.getElementById("overtureBtn");

  if (!letter || !tpl) return;

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var FULL = 0.8;       /* the music at its loudest */
  var QUIET = 0.2;      /* and where it settles once there is reading to do */

  var started = false;
  var hasMusic = false;
  var muted = false;
  var timers = [];

  /* ---------- measuring ---------- */

  function fill() {
    var sheets = letter.querySelectorAll(".sheet");
    for (var i = 0; i < sheets.length; i++) {
      sheets[i].textContent = "";
      sheets[i].appendChild(tpl.content.cloneNode(true));
    }

    /* the two fold lines, drawn over the flat sheet */
    if (!letter.querySelector(".crease")) {
      ["top", "bottom"].forEach(function (which) {
        var c = document.createElement("div");
        c.className = "crease " + which;
        letter.appendChild(c);
      });
    }

    if (plain && !plain.textContent) {
      var copy = tpl.content.cloneNode(true).querySelector(".ink");
      plain.textContent = copy ? copy.textContent.replace(/\s+/g, " ").trim() : "";
    }
  }

  /* The writing is set to the page rather than the page to the writing:
     the sheet is a fixed 8.5 by 11, and the type is sized to the largest
     that still fits inside its margins. Eight measurements of a binary
     search, off-screen, at the real width. */
  function measureAt(w, fs) {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;left:-10000px;top:0;visibility:hidden;" +
      "pointer-events:none;width:" + w + "px;";
    var copy = tpl.content.cloneNode(true).querySelector(".ink");
    copy.style.position = "static";
    /* the variable, not font-size: the salutation and the signature are
       sized off calc(var(--fs) * n), so overriding font-size alone would
       measure them at whatever the last layout left on :root */
    copy.style.setProperty("--fs", fs + "px");
    copy.style.opacity = "1";
    copy.style.filter = "none";
    probe.appendChild(copy);
    body.appendChild(probe);
    var h = copy.getBoundingClientRect().height;
    body.removeChild(probe);
    return h;
  }

  function fitType(w, sheetH) {
    var lo = 8, hi = 32, mid;
    for (var i = 0; i < 8; i++) {
      mid = (lo + hi) / 2;
      if (measureAt(w, mid) <= sheetH) lo = mid; else hi = mid;
    }
    return Math.max(8, Math.floor(lo * 2) / 2);
  }

  function layout() {
    /* clientWidth, not innerWidth: innerWidth counts the scrollbar, and
       the scrollbar appears exactly when the letter is at its longest */
    var vw = root.clientWidth;
    var vh = root.clientHeight;
    var gx = vw < 700 ? 16 : 48;
    var gy = vw < 700 ? 24 : 56;

    /* US Letter, held to 8.5 by 11 whichever way the screen is tighter */
    var w = Math.min(820, vw - gx, Math.round((vh - gy) * 8.5 / 11));
    w = Math.max(248, w);

    var panel = Math.round(w * 11 / 8.5 / 3);
    var sheetH = panel * 3;
    var margin = Math.round(w / 8.5);          /* one inch */

    root.style.setProperty("--letter-w", w + "px");
    root.style.setProperty("--margin", margin + "px");

    var fs = fitType(w, sheetH);
    root.style.setProperty("--fs", fs + "px");

    /* In a window too small to hold a page at readable type, the sheet
       is allowed to run long rather than cut the last paragraph off.
       The proportions give way before the words do. */
    var actual = measureAt(w, fs);
    if (actual > sheetH) {
      panel = Math.ceil(actual / 3);
      sheetH = panel * 3;
    }
    root.style.setProperty("--panel-h", panel + "px");

    /* the envelope is built around the folded sheet, with a little room,
       so the letter genuinely fits inside the thing it comes out of */
    var ex = Math.max(14, Math.round(w * 0.04));
    var ey = Math.max(11, Math.round(panel * 0.1));
    var envW = w + ex * 2;
    var envH = panel + ey * 2;
    var envFit = Math.min(1, (vh - 40) / envH, (vw - 18) / envW);

    root.style.setProperty("--env-w", envW + "px");
    root.style.setProperty("--env-h", envH + "px");
    root.style.setProperty("--env-fit", envFit.toFixed(4));

    /* The sheet is already sized to the screen, so this almost always
       comes out at 1. It only bites on a window too short to hold a
       page at the minimum width, and then the page scrolls. */
    var need = (vh - gy) / sheetH;
    var fit, scroll;
    if (need >= 1) { fit = 1; scroll = false; }
    else if (need >= 0.84) { fit = need; scroll = false; }
    else { fit = 1; scroll = true; }

    /* The carrier sits inside the envelope, so it already carries the
       envelope's fit scale. Divide it back out, or the open sheet reads
       a few per cent under true size on a narrow screen — which would
       defeat the point of setting it to 8.5 by 11 in the first place. */
    root.style.setProperty("--letter-scale", (fit / envFit).toFixed(4));

    if (scroll) {
      var tall = Math.round(sheetH * fit + 96);
      stage.style.minHeight = tall + "px";
      body.classList.add("can-scroll");
      /* start the view on the envelope, which sits at the stage's centre */
      if (!started) window.scrollTo(0, Math.max(0, (tall - vh) / 2));
    } else {
      stage.style.minHeight = "";
      body.classList.remove("can-scroll");
    }
  }

  /* ---------- the music ---------- */

  var fadeRaf = 0;
  function fadeTo(target, ms, done) {
    if (!audio) return;
    cancelAnimationFrame(fadeRaf);
    var from = audio.volume;
    var delta = target - from;
    if (Math.abs(delta) < 0.001 || ms <= 0) {
      audio.volume = target;
      if (done) done();
      return;
    }
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / ms);
      /* ease in and out, so the turn-down feels like a hand on a dial */
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      audio.volume = Math.max(0, Math.min(1, from + delta * e));
      if (p < 1) fadeRaf = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }

  function showMusicButton() {
    if (!musicBtn) return;
    musicBtn.hidden = false;
    musicBtn.addEventListener("click", function () {
      muted = !muted;
      musicBtn.setAttribute("aria-pressed", muted ? "false" : "true");
      musicBtn.setAttribute("aria-label", muted ? "Turn the music on" : "Turn the music off");
      if (muted) {
        fadeTo(0, 700, function () { audio.pause(); });
      } else {
        audio.play().catch(function () {});
        fadeTo(body.classList.contains("is-read") ? QUIET : FULL, 1200);
      }
    });
  }

  /* ---------- the sequence ---------- */

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function mark(cls) { body.classList.add(cls); }

  function run() {
    if (still) {
      /* no choreography: the letter is simply open and readable */
      mark("is-risen");
      mark("is-flat");
      mark("is-read");
      return;
    }

    at(900,  function () { mark("is-cracked"); });   /* the wax gives */
    at(2300, function () { mark("is-open"); });      /* the flap swings back */
    at(3700, function () { mark("is-risen"); });     /* the letter comes out */
    at(6000, function () { mark("is-flat"); });      /* both folds open */
    at(8400, function () {
      mark("is-read");                               /* the ink sharpens */
      if (hasMusic && !muted) fadeTo(QUIET, 6000);   /* and the song steps back */
    });
  }

  function begin() {
    if (started) return;
    started = true;
    body.classList.remove("needs-press");
    run();
  }

  function beginWithMusic() {
    if (!audio) { begin(); return; }
    audio.play().then(function () {
      hasMusic = true;
      showMusicButton();
      fadeTo(FULL, 4500);
      begin();
    }).catch(function () {
      /* the file is missing or unplayable: the letter still opens */
      begin();
    });
  }

  /* ---------- wiring ---------- */

  function init() {
    fill();
    layout();

    if (!audio) { begin(); return; }
    audio.volume = 0;

    /* Whatever happens with the sound, it settles exactly once, and the
       letter opens either way. With no file in audio/ the play promise
       can sit unresolved while the element works through three sources
       that are all missing, so there is a timer behind it: the letter is
       the point, the music is not a condition of it. */
    var settled = false;
    function settle(fn) {
      if (settled) return;
      settled = true;
      fn();
    }
    function withMusic() {
      hasMusic = true;
      showMusicButton();
      fadeTo(FULL, 4500);
      begin();
    }

    audio.addEventListener("error", function () { settle(begin); });

    /* Browsers block audio the visitor did not ask for. If the attempt
       is refused we show one quiet line and start on the first press. */
    var attempt = audio.play();
    if (!attempt || !attempt.then) {
      settle(withMusic);
    } else {
      attempt.then(function () {
        settle(withMusic);
      }).catch(function (err) {
        if (err && err.name === "NotAllowedError") {
          settle(function () { body.classList.add("needs-press"); });
        } else {
          /* nothing wrong with the browser, only with the file */
          settle(begin);
        }
      });
    }

    setTimeout(function () { settle(begin); }, 2500);
  }

  function press() {
    if (started) return;
    beginWithMusic();
  }

  if (overtureBtn) overtureBtn.addEventListener("click", press);
  document.addEventListener("pointerdown", function () {
    if (body.classList.contains("needs-press")) press();
  });
  document.addEventListener("keydown", function (e) {
    if (body.classList.contains("needs-press") && (e.key === "Enter" || e.key === " ")) press();
  });

  var resizeTimer = 0;
  var lastW = root.clientWidth;
  window.addEventListener("resize", function () {
    /* phone toolbars change the height constantly; only width matters */
    if (Math.abs(root.clientWidth - lastW) < 2 && body.classList.contains("can-scroll")) return;
    lastW = root.clientWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 220);
  });

  /* Measure after the fonts arrive, or the thirds come out wrong. If the
     font server is slow, start anyway and measure again when it answers. */
  var booted = false;
  function boot() {
    if (booted) { layout(); return; }
    booted = true;
    init();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    setTimeout(boot, 1800);
  } else {
    boot();
  }
})();
