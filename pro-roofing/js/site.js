/* ==========================================================================
   site.js — nav, reveal-on-scroll, estimate form.
   No dependencies.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- mobile nav ---------- */
  var burger = document.querySelector("[data-burger]");
  var mnav = document.querySelector("[data-mnav]");
  if (burger && mnav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", open ? "false" : "true");
      mnav.setAttribute("data-open", open ? "false" : "true");
    });
    mnav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        burger.setAttribute("aria-expanded", "false");
        mnav.setAttribute("data-open", "false");
      }
    });
  }

  /* ---------- mark the current page in the nav ---------- */
  var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var ARTICLES = ["wind-damage.html", "hail-damage.html", "tree-falls.html", "articles.html"];
  var SERVICES = ["roof-installation.html", "roof-replacement.html", "roof-repair.html", "roof-inspection.html"];
  document.querySelectorAll(".navlink, .mnav a, .navitem__panel a").forEach(function (a) {
    var href = (a.getAttribute("href") || "").toLowerCase();
    if (href === here) { a.setAttribute("aria-current", "page"); return; }
    // light up the dropdown parent when a child page is open
    if (href === "articles.html" && ARTICLES.indexOf(here) > -1) a.setAttribute("aria-current", "page");
    if (href === "roof-repair.html" && a.classList.contains("navlink") && SERVICES.indexOf(here) > -1) {
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- reveal ---------- */
  var rv = document.querySelectorAll(".rv");
  if (rv.length) {
    if (!("IntersectionObserver" in window)) {
      rv.forEach(function (el) { el.setAttribute("data-in", "1"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.setAttribute("data-in", "1");
          io.unobserve(en.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      rv.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- CTA roll: duplicate the strip so the loop is seamless ---------- */
  var track = document.querySelector("[data-ctaroll]");
  if (track && track.children.length) {
    var html = track.innerHTML;
    track.innerHTML = html + html;
  }

  /* ---------- estimate form ---------- */
  var form = document.querySelector("[data-estimate]");
  if (!form) return;
  var state = form.querySelector("[data-formstate]");

  function setErr(field, msg) {
    var slot = field.parentNode.querySelector(".err");
    if (slot) slot.textContent = msg || "";
    field.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validate() {
    var ok = true;
    form.querySelectorAll("[required]").forEach(function (f) {
      var v = (f.value || "").trim();
      if (!v) { setErr(f, "Required"); ok = false; return; }
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        setErr(f, "Check this address"); ok = false; return;
      }
      if (f.type === "tel" && v.replace(/\D/g, "").length < 10) {
        setErr(f, "Needs 10 digits"); ok = false; return;
      }
      setErr(f, "");
    });
    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state) state.removeAttribute("data-show");

    // honeypot
    var hp = form.querySelector("[name=company_website]");
    if (hp && hp.value) return;

    if (!validate()) {
      if (state) {
        state.setAttribute("data-show", "bad");
        state.textContent = "Some fields still need filling in.";
      }
      var bad = form.querySelector("[aria-invalid=true]");
      if (bad) bad.focus();
      return;
    }

    var endpoint = form.getAttribute("data-endpoint");
    if (!endpoint) {
      // No endpoint wired yet — hand off to the visitor's mail client.
      var to = form.getAttribute("data-mailto") || "support@proroofingpros.com";
      var get = function (n) {
        var el = form.querySelector("[name=" + n + "]");
        return el ? (el.value || "").trim() : "";
      };
      var body = [
        "Name: " + get("name"),
        "Phone: " + get("phone"),
        "Email: " + get("email"),
        "State: " + get("state"),
        "Service: " + get("service"),
        "Found us via: " + get("source"),
        "",
        get("message")
      ].join("\n");
      window.location.href = "mailto:" + to +
        "?subject=" + encodeURIComponent("Estimate request — " + get("name")) +
        "&body=" + encodeURIComponent(body);
      if (state) {
        state.setAttribute("data-show", "ok");
        state.textContent = "Opening your mail app with the details filled in.";
      }
      return;
    }

    var btn = form.querySelector("[type=submit]");
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }

    fetch(endpoint, {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: new FormData(form)
    }).then(function (r) {
      if (!r.ok) throw new Error("bad response");
      form.reset();
      if (state) {
        state.setAttribute("data-show", "ok");
        state.textContent = "Got it. A specialist will call you back.";
      }
    }).catch(function () {
      if (state) {
        state.setAttribute("data-show", "bad");
        state.textContent = "That did not send. Call 703-772-0500 and we will take it down by phone.";
      }
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Request an estimate"; }
    });
  });

  form.querySelectorAll("input, select, textarea").forEach(function (f) {
    f.addEventListener("blur", function () {
      if (f.hasAttribute("required")) validate();
    });
  });
})();

/* ==========================================================================
   Page transition — the logo alone, full screen, then out
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("js-intro")) return;

  var veil = document.querySelector("[data-pageintro]");
  if (!veil) { root.classList.remove("js-intro"); return; }

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { root.classList.remove("js-intro"); return; }

  var HOLD = 450; // the mark is on screen once, then clears

  function clear() { veil.setAttribute("data-state", "out"); }

  // Timed from DOM ready, NOT window.load: load waits on every photo on the
  // page, which held the mark up for seconds and read as a second load.
  setTimeout(clear, HOLD);

  // coming back through history should not replay the whole thing
  window.addEventListener("pageshow", function (e) { if (e.persisted) clear(); });

})();

/* ==========================================================================
   Scroll photography — parallax on the filmstrips and the floating cards
   ========================================================================== */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  var strips = [].slice.call(document.querySelectorAll(".filmstrip__media"));
  var cards = [].slice.call(document.querySelectorAll("[data-drift]"));
  if (!strips.length && !cards.length) return;

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight || 1;

    strips.forEach(function (el) {
      var host = el.parentElement;
      var r = host.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120) return;
      // -1 at the bottom of the viewport, +1 at the top
      var p = ((vh - r.top) / (vh + r.height)) * 2 - 1;
      el.style.transform = "translate3d(0," + (p * -7).toFixed(2) + "%,0)";
    });

    cards.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -160 || r.top > vh + 160) return;
      var speed = parseFloat(el.getAttribute("data-drift")) || 0;
      var p = ((vh - r.top) / (vh + r.height)) * 2 - 1;
      el.style.transform = "translate3d(0," + (p * speed * -1).toFixed(2) + "px,0)";
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();
})();

/* ==========================================================================
   Always land at the top
   The browser restores the previous scroll offset on a same-page navigation,
   which left the sticky header sitting over the hero instead of above it.
   ========================================================================== */
(function () {
  "use strict";
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.hash) return;
    var href = (a.getAttribute("href") || "").toLowerCase();
    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (href !== here && !(href === "index.html" && here === "")) return;
    // already on this page: go back to the top rather than reloading
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    var mn = document.querySelector("[data-mnav]");
    if (mn) mn.setAttribute("data-open", "false");
    var bg = document.querySelector("[data-burger]");
    if (bg) bg.setAttribute("aria-expanded", "false");
  });
})();

/* ---- colour follows the reader on a touch screen --------------------------
   The photography is monochrome and comes back to colour on hover. A phone has
   no cursor, so on a phone it never came back at all.

   This lights whichever image is crossing the middle of the screen. The
   rootMargin leaves a band roughly a sixth of the viewport tall through the
   centre; an image is lit while it crosses that band, so colour tracks down the
   page as you scroll. The work is the observer's, not a scroll handler's, so it
   costs nothing per frame.

   Only on (hover: none). Anything with a cursor keeps the hover behaviour.
--------------------------------------------------------------------------- */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (!window.matchMedia || !window.matchMedia("(hover: none)").matches) return;

  var targets = document.querySelectorAll("a.card, .gal img, .floatcard, .filmstrip");
  if (!targets.length) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.classList.add("is-lit");
      else e.target.classList.remove("is-lit");
    });
  }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });

  Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
})();
