/* ===========================================================================
   Rendon Remodeling & Design — behaviour
   ---------------------------------------------------------------------------
   One file, no dependencies. Everything is feature-detected and every block
   exits quietly when its markup is not on the page, so the same script can be
   dropped on all fifteen pages.

   Motion rule: if the visitor asks for less of it, we do the layout and skip
   the movement. REDUCED is checked once and honoured everywhere below.
   =========================================================================== */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* -------------------------------------------------------------------------
     A single scroll loop. Everything that needs the scroll position reads it
     here, once per frame, so we never stack listeners that each force layout.
     ---------------------------------------------------------------------- */
  var scrollJobs = [];
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      var vh = window.innerHeight;
      for (var i = 0; i < scrollJobs.length; i++) scrollJobs[i](y, vh);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* =========================================================================
     Header
     ====================================================================== */
  (function header() {
    var head = $(".site-head");
    if (!head) return;

    var hero = $(".hero, .phero");
    if (hero) head.classList.add("is-over-hero");

    scrollJobs.push(function (y) {
      head.classList.toggle("is-scrolled", y > 40);
    });

    var burger = $(".burger");
    var panel = $(".mobile-nav");
    if (burger && panel) {
      burger.addEventListener("click", function () {
        var open = document.body.classList.toggle("nav-open");
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        panel.setAttribute("aria-hidden", open ? "false" : "true");
      });
      // a tap on any link closes the panel before the page moves
      $$("a", panel).forEach(function (a) {
        a.addEventListener("click", function () {
          document.body.classList.remove("nav-open");
          burger.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
          document.body.classList.remove("nav-open");
          burger.setAttribute("aria-expanded", "false");
          burger.focus();
        }
      });
    }
  })();

  /* =========================================================================
     Reveal on entry
     ====================================================================== */
  (function reveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;

    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    // a group gets its stagger from document order inside that group
    $$("[data-stagger]").forEach(function (group) {
      var step = parseInt(group.getAttribute("data-stagger"), 10) || 110;
      $$("[data-reveal]", group).forEach(function (el, i) {
        if (!el.style.getPropertyValue("--d")) {
          el.style.setProperty("--d", (i * step) + "ms");
        }
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* =========================================================================
     Glare and parallax
     ---------------------------------------------------------------------
     --glare runs 0 to 1 across the whole time a band is in view, so the
     highlight rakes across once per pass rather than ticking with the mouse.
     ====================================================================== */
  (function sheen() {
    var bands = $$(".glare");
    var floats = $$(".parallax");
    if (REDUCED || (!bands.length && !floats.length)) return;

    bands.forEach(function (b) {
      if (!$(".glare-layer", b)) {
        var layer = document.createElement("span");
        layer.className = "glare-layer";
        b.insertBefore(layer, b.firstChild);
      }
    });

    scrollJobs.push(function (y, vh) {
      bands.forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var p = (vh - r.top) / (vh + r.height);
        b.style.setProperty("--glare", Math.max(0, Math.min(1, p)).toFixed(4));
      });
      floats.forEach(function (f) {
        var r = f.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;
        var depth = parseFloat(f.getAttribute("data-depth")) || 0.08;
        var mid = r.top + r.height / 2 - vh / 2;
        f.style.setProperty("--shift", (-mid * depth).toFixed(2) + "px");
      });
    });
    onScroll();
  })();

  /* =========================================================================
     Hero slideshow
     ====================================================================== */
  (function heroShow() {
    var stage = $(".hero-stage");
    if (!stage) return;
    var slides = $$(".hero-slide", stage);
    if (slides.length < 2) { if (slides[0]) slides[0].classList.add("is-live"); return; }

    var dots = $$(".hero-dots button");
    var at = 0;
    var timer = null;
    var HOLD = 7000;

    function show(n) {
      slides[at].classList.remove("is-live");
      if (dots[at]) dots[at].setAttribute("aria-selected", "false");
      at = (n + slides.length) % slides.length;
      slides[at].classList.add("is-live");
      if (dots[at]) dots[at].setAttribute("aria-selected", "true");
    }
    function start() { if (!REDUCED) timer = setInterval(function () { show(at + 1); }, HOLD); }
    function restart() { clearInterval(timer); start(); }

    slides[0].classList.add("is-live");
    if (dots[0]) dots[0].setAttribute("aria-selected", "true");

    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { show(i); restart(); });
    });

    // nothing cycles while the tab is in the background
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearInterval(timer); else restart();
    });
    start();
  })();

  /* =========================================================================
     Review conveyor
     ---------------------------------------------------------------------
     The track holds the list twice. The keyframe translates exactly half the
     track, so the seam lands where the duplicate begins and the loop reads as
     one unbroken run. Speed is set from the card count, not a fixed duration,
     so adding reviews slows the belt instead of speeding it up.
     ====================================================================== */
  var STAR = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.6l2.47 5.3 5.83.67-4.33 3.95 1.17 5.74L10 14.4l-5.14 2.86 1.17-5.74L1.7 7.57l5.83-.67z"/></svg>';
  var STARS5 = '<span class="stars" role="img" aria-label="Five out of five stars">' + STAR + STAR + STAR + STAR + STAR + "</span>";

  function reviewCard(r, i, full) {
    var card = document.createElement(full ? "figure" : "article");
    card.className = "rev";
    card.style.margin = full ? "" : "";
    var initial = (r.name || "?").trim().charAt(0).toUpperCase();
    card.innerHTML =
      '<div class="rev-head">' +
        '<span class="rev-av" aria-hidden="true">' + initial + "</span>" +
        '<span class="rev-who"><b>' + esc(r.name) + "</b><span>" + esc(r.when) + "</span></span>" +
      "</div>" +
      STARS5 +
      '<p class="rev-text">' + esc(r.text) + "</p>" +
      (full ? "" : '<button class="rev-more" type="button" data-rev="' + i + '">Read in full</button>') +
      '<p class="rev-src">Posted on Google</p>';
    return card;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  (function conveyor() {
    var data = window.RENDON_REVIEWS;
    if (!data || !data.length) return;

    // the belt
    var belt = $(".conveyor");
    if (belt) {
      var track = document.createElement("div");
      track.className = "conveyor-track";

      // Short reviews read best on a moving belt; the essays get their own
      // page. Anything over ~460 characters is held back for the wall.
      var short = data.filter(function (r) { return r.text.length <= 460; });
      var belted = (short.length >= 12 ? short : data).slice(0, 18);

      belted.forEach(function (r) { track.appendChild(reviewCard(r, data.indexOf(r), false)); });
      // the duplicate pass, hidden from assistive tech
      belted.forEach(function (r) {
        var clone = reviewCard(r, data.indexOf(r), false);
        clone.setAttribute("aria-hidden", "true");
        $$("button", clone).forEach(function (b) { b.setAttribute("tabindex", "-1"); });
        track.appendChild(clone);
      });

      // ~7.5s of travel per card keeps it unhurried at any card count
      track.style.setProperty("--dur", (belted.length * 7.5) + "s");
      belt.appendChild(track);
    }

    // the wall, full text, no clamp
    var wall = $(".rev-wall");
    if (wall) {
      data.forEach(function (r, i) { wall.appendChild(reviewCard(r, i, true)); });
    }

    // counts, wherever they are quoted
    $$("[data-review-count]").forEach(function (el) { el.textContent = data.length; });

    /* the full-text modal */
    var modal = $(".modal");
    if (!modal) return;
    var body = $(".modal-body", modal);
    var lastFocus = null;

    document.addEventListener("click", function (e) {
      var hit = e.target.closest ? e.target.closest(".rev-more") : null;
      if (hit) {
        var r = data[parseInt(hit.getAttribute("data-rev"), 10)];
        if (!r) return;
        lastFocus = hit;
        body.innerHTML =
          '<div class="rev-head">' +
            '<span class="rev-av" aria-hidden="true">' + esc(r.name.charAt(0).toUpperCase()) + "</span>" +
            '<span class="rev-who"><b>' + esc(r.name) + "</b><span>" + esc(r.when) + " · Google</span></span>" +
          "</div>" + STARS5 + "<p>" + esc(r.text) + "</p>";
        modal.classList.add("is-open");
        $(".modal-x", modal).focus();
        return;
      }
      if (e.target.closest && (e.target.closest(".modal-x") || e.target === modal)) close();
    });

    function close() {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      if (lastFocus) lastFocus.focus();
    }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  })();

  /* =========================================================================
     Gallery: mosaic, filters, load more
     ====================================================================== */
  (function gallery() {
    var grid = $(".mosaic");
    var data = window.RENDON_GALLERY;
    if (!grid || !data || !data.length) return;

    var PAGE = parseInt(grid.getAttribute("data-page"), 10) || 24;
    var only = grid.getAttribute("data-only");          // one category, no filters
    var pool = only ? data.filter(function (p) { return p.cat === only; }) : data.slice();

    var filter = "all";
    var shown = 0;
    var moreBtn = $(".gal-more");
    var countEl = $("[data-gal-count]");

    // portfolio.html?cat=kitchens — the room cards on the home page link in
    // this way, so the gallery opens already filtered
    (function fromQuery() {
      var want = (location.search.match(/[?&]cat=([a-z]+)/) || [])[1];
      if (!want) return;
      var btn = $('.filters button[data-filter="' + want + '"]');
      if (!btn) return;
      filter = want;
      $$(".filters button").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
    })();

    // Two wide frames and one tall frame per twelve tiles. The pattern is
    // fixed rather than random so the page looks the same on every reload.
    function shapeFor(i) {
      var m = i % 12;
      if (m === 0) return " tile--wide";
      if (m === 7) return " tile--tall";
      return "";
    }

    function matching() {
      return filter === "all" ? pool : pool.filter(function (p) { return p.cat === filter; });
    }

    function render(reset) {
      var list = matching();
      if (reset) { grid.innerHTML = ""; shown = 0; }
      var slice = list.slice(shown, shown + PAGE);
      var frag = document.createDocumentFragment();

      slice.forEach(function (p, n) {
        var i = shown + n;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "tile" + shapeFor(i);
        b.setAttribute("data-i", String(pool.indexOf(p)));
        b.setAttribute("aria-label", "Open " + p.title + " — " + p.label + ", larger");
        b.innerHTML =
          '<img src="' + p.src + '" alt="' + esc(p.alt) + '" loading="lazy" decoding="async">' +
          '<span class="tile-cap"><span>' + esc(p.label) + "</span>" + esc(p.title) + "</span>";
        frag.appendChild(b);
      });

      grid.appendChild(frag);
      shown += slice.length;

      if (moreBtn) moreBtn.hidden = shown >= list.length;
      if (countEl) countEl.textContent = String(list.length);
    }

    render(true);

    if (moreBtn) moreBtn.addEventListener("click", function () { render(false); });

    $$(".filters button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".filters button").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        filter = b.getAttribute("data-filter");
        render(true);
      });
    });

    /* ---- lightbox ---- */
    var box = $(".lbox");
    if (!box) return;
    var img = $(".lbox-figure img", box);
    var cap = $(".lbox-cap", box);
    var pos = $(".lbox-pos", box);
    var at = 0;
    var seq = [];
    var opener = null;

    function openAt(poolIndex) {
      seq = matching();
      var p = pool[poolIndex];
      at = Math.max(0, seq.indexOf(p));
      paint();
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      $(".lbox-x", box).focus();
    }

    function paint() {
      var p = seq[at];
      if (!p) return;
      img.classList.remove("is-ready");
      var next = new Image();
      next.onload = function () { img.src = p.full || p.src; img.classList.add("is-ready"); };
      next.src = p.full || p.src;
      img.alt = p.alt;
      cap.innerHTML = esc(p.title) + "<small>" + esc(p.label) + "</small>";
      if (pos) pos.textContent = (at + 1) + " / " + seq.length;
      // warm the neighbours so arrowing through does not flash
      [seq[at + 1], seq[at - 1]].forEach(function (n) {
        if (n) { var w = new Image(); w.src = n.full || n.src; }
      });
    }

    function step(d) { at = (at + d + seq.length) % seq.length; paint(); }

    function shut() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }

    grid.addEventListener("click", function (e) {
      var t = e.target.closest(".tile");
      if (!t) return;
      opener = t;
      openAt(parseInt(t.getAttribute("data-i"), 10));
    });

    $(".lbox-x", box).addEventListener("click", shut);
    var prev = $(".lbox-prev", box), next = $(".lbox-next", box);
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });

    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") shut();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    });

    // swipe
    var x0 = null;
    box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  })();

  /* =========================================================================
     Before / after compare
     ====================================================================== */
  (function compare() {
    var frames = $$(".compare");
    if (!frames.length) return;

    frames.forEach(function (f) {
      var dragging = false;

      function setFrom(clientX) {
        var r = f.getBoundingClientRect();
        var pct = ((clientX - r.left) / r.width) * 100;
        f.style.setProperty("--split", Math.max(0, Math.min(100, pct)).toFixed(2) + "%");
      }

      f.addEventListener("pointerdown", function (e) {
        dragging = true;
        f.setPointerCapture(e.pointerId);
        setFrom(e.clientX);
      });
      f.addEventListener("pointermove", function (e) { if (dragging) setFrom(e.clientX); });
      f.addEventListener("pointerup", function () { dragging = false; });
      f.addEventListener("pointercancel", function () { dragging = false; });

      // keyboard: the frame itself takes focus and the arrows nudge the split
      f.setAttribute("tabindex", "0");
      f.setAttribute("role", "slider");
      f.setAttribute("aria-label", "Drag to compare before and after");
      f.addEventListener("keydown", function (e) {
        var now = parseFloat(f.style.getPropertyValue("--split")) || 50;
        if (e.key === "ArrowRight") { f.style.setProperty("--split", Math.min(100, now + 4) + "%"); e.preventDefault(); }
        if (e.key === "ArrowLeft")  { f.style.setProperty("--split", Math.max(0, now - 4) + "%"); e.preventDefault(); }
      });
    });
  })();

  /* =========================================================================
     Consult form
     ---------------------------------------------------------------------
     A sample build with no endpoint behind it. The form validates, then says
     plainly that nothing was sent, so nobody is left waiting on a reply.
     ====================================================================== */
  (function consultForm() {
    var form = $("#consult");
    if (!form) return;
    var ok = $(".form-ok", form.parentNode) || $(".form-ok");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (ok) {
        ok.hidden = false;
        ok.textContent =
          "Thanks, " + (form.elements.first.value || "there").trim() +
          ". This is a demonstration build, so nothing was sent — on the live site " +
          "this reaches the Rendon office and Beth replies the same business day. " +
          "To talk now, call (703) 444-3127.";
        ok.focus && ok.focus();
        ok.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
      }
      form.reset();
    });
  })();

  /* =========================================================================
     Phone call bar — appears once the hero is behind you
     ====================================================================== */
  (function callbar() {
    var bar = $(".callbar");
    if (!bar) return;
    scrollJobs.push(function (y, vh) { bar.classList.toggle("is-up", y > vh * 0.6); });
  })();

  /* =========================================================================
     Year in the footer
     ====================================================================== */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
