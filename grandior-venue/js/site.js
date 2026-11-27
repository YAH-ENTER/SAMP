/* Grandior Event Venue — behaviour. No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- opening: white screen, crest, then the storefront ------------ */
  // The hero photo is decoded before anything moves, so the zoom never
  // starts on a half-loaded image (the old lag/glitch).
  var heroImg = $(".hero__media img");
  var started = Date.now();
  var opened = false;
  requestAnimationFrame(function () { root.classList.add("crest"); });

  function openPage() {
    if (opened) return;
    opened = true;
    var wait = Math.max(0, (reduce ? 150 : 700) - (Date.now() - started)); // let the crest be seen
    setTimeout(function () {
      root.classList.add("ready");
      setTimeout(function () { var v = $(".veil"); if (v) v.remove(); }, 900);
    }, wait);
  }
  var decoded = heroImg && heroImg.decode ? heroImg.decode() : Promise.resolve();
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([decoded.catch(function () {}), fonts]).then(openPage, openPage);
  setTimeout(openPage, 3000); // never hold the page longer than this

  /* ---- header state + hero parallax ---------------------------------- */
  var head = $(".head");
  var hero = $(".hero");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    head.classList.toggle("is-scrolled", y > 40);
    if (hero && !reduce) {
      var p = Math.min(1, Math.max(0, y / hero.offsetHeight));
      hero.style.setProperty("--p", p.toFixed(4));
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- mobile menu --------------------------------------------------- */
  var burger = $(".burger");
  var menu = $("#menu");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  /* ---- scroll: text rises from a blur, photos open like curtains ----- */
  var watched = $$("[data-reveal], [data-unveil]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    watched.forEach(function (el) { io.observe(el); });
  } else {
    watched.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- gallery filters ----------------------------------------------- */
  var tiles = $$("#grid .tile");
  $$(".filters button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      $$(".filters button").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      tiles.forEach(function (t) {
        var cats = (t.getAttribute("data-cat") || "").split(" ");
        t.classList.toggle("is-hidden", !(f === "all" || cats.indexOf(f) > -1 || cats.indexOf("all") > -1));
      });
    });
  });

  /* ---- lightbox (photos + video) ------------------------------------- */
  var lb = $("#lb");
  var media = $(".lb__media", lb);
  var capText = $(".lb__text", lb);
  var capCount = $(".lb__count", lb);
  var items = tiles.filter(function (t) { return t.hasAttribute("data-full"); });
  var current = -1;
  var lastFocus = null;
  function visibleItems() { return items.filter(function (t) { return !t.classList.contains("is-hidden"); }); }
  function render(i) {
    var list = visibleItems();
    if (!list.length) return;
    current = (i + list.length) % list.length;
    var t = list[current];
    var src = t.getAttribute("data-full");
    var el;
    media.innerHTML = "";
    if (t.getAttribute("data-type") === "video") {
      el = document.createElement("video");
      el.src = src; el.controls = true; el.playsInline = true; el.autoplay = true; el.loop = true; el.muted = true;
      var poster = t.querySelector("img");
      if (poster) el.poster = poster.getAttribute("src");
    } else {
      el = document.createElement("img");
      el.src = src;
      el.alt = (t.querySelector("img") || {}).alt || "";
    }
    media.appendChild(el);
    capText.textContent = t.getAttribute("data-caption") || "";
    capCount.textContent = String(current + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
  }
  function openLb(tile) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    render(visibleItems().indexOf(tile));
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    $(".lb__close", lb).focus();
  }
  function closeLb() {
    lb.classList.remove("is-open");
    media.innerHTML = "";
    document.body.style.overflow = "";
    setTimeout(function () { lb.hidden = true; }, reduce ? 0 : 350);
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (t) { $(".tile__btn", t).addEventListener("click", function () { openLb(t); }); });
  $(".lb__close", lb).addEventListener("click", closeLb);
  $(".lb__nav--prev", lb).addEventListener("click", function () { render(current - 1); });
  $(".lb__nav--next", lb).addEventListener("click", function () { render(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
      return;
    }
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") render(current - 1);
    else if (e.key === "ArrowRight") render(current + 1);
    else if (e.key === "Tab") {
      var f = $$("button, video", lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var sx = null;
  lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) render(current + (dx < 0 ? 1 : -1));
    sx = null;
  });

  /* ---- reviews carousel: rotates on its own, loops without a jump ---- */
  (function () {
    var car = $(".carousel");
    if (!car) return;
    var track = $(".carousel__track", car);
    var dotsWrap = $(".carousel__dots", car);
    var cards = $$(".quote", track);
    var n = cards.length;
    // Clones of every card follow the originals, so moving past the last
    // review slides straight into the first one.
    cards.forEach(function (c) {
      var k = c.cloneNode(true);
      k.setAttribute("aria-hidden", "true");
      track.appendChild(k);
    });
    var i = 0, timer = null, paused = false;

    var dots = cards.map(function (_, d) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Review " + (d + 1) + " of " + n);
      b.addEventListener("click", function () { go(d); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function step() {
      var all = track.children;
      return all.length > 1 ? all[1].offsetLeft - all[0].offsetLeft : 0;
    }
    function place(animate) {
      track.classList.toggle("no-anim", !animate);
      track.style.transform = "translate3d(" + (-i * step()) + "px,0,0)";
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", String(k === i % n)); });
    }
    function go(to) { i = to; place(true); }
    function next() { go(i + 1); }
    function prev() {
      if (i === 0) { i = n; place(false); void track.offsetWidth; }
      go(i - 1);
    }
    track.addEventListener("transitionend", function (e) {
      if (e.target !== track) return;
      if (i >= n) { i = i - n; place(false); }
    });

    function restart() {
      clearInterval(timer);
      if (!reduce && !paused) timer = setInterval(next, 5500);
    }
    function pause(on) { paused = on; restart(); }
    car.addEventListener("mouseenter", function () { pause(true); });
    car.addEventListener("mouseleave", function () { pause(false); });
    car.addEventListener("focusin", function () { pause(true); });
    car.addEventListener("focusout", function () { pause(false); });
    document.addEventListener("visibilitychange", function () { pause(document.hidden); });
    $(".carousel__btn--next", car).addEventListener("click", function () { next(); restart(); });
    $(".carousel__btn--prev", car).addEventListener("click", function () { prev(); restart(); });

    var tx = null;
    track.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; pause(true); }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (tx !== null) {
        var dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
      }
      tx = null; pause(false);
    });

    window.addEventListener("resize", function () { place(false); });
    place(false);
    // Rotate only while the reviews are on screen, so a visitor arriving
    // there starts at the first one.
    var inView = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        pause(!inView);
      }, { threshold: 0.3 }).observe(car);
    } else { restart(); }
    var basePause = pause;
    pause = function (on) { basePause(on || !inView); };
  })();

  /* ---- enquiry form -------------------------------------------------- */
  var form = $("#enquiry");
  var note = $(".form__note", form);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.company.value) return; // honeypot
    var bad = $$("[required]", form).filter(function (f) {
      var ok = f.value.trim() !== "" && (f.type !== "email" || /.+@.+\..+/.test(f.value));
      f.classList.toggle("is-bad", !ok);
      f.setAttribute("aria-invalid", String(!ok));
      return !ok;
    });
    if (bad.length) { note.textContent = "A few fields still need filling in."; bad[0].focus(); return; }
    var d = {
      name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
      type: form.type.value, date: form.date.value, guests: form.guests.value.trim(), message: form.message.value.trim()
    };
    var endpoint = form.getAttribute("data-endpoint");
    if (endpoint) {
      note.textContent = "Sending…";
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) })
        .then(function (r) { if (!r.ok) throw new Error(); form.reset(); note.textContent = "Thanks. We'll be in touch soon."; })
        .catch(function () { note.textContent = "That didn't go through. Please call (510) 458-9232 or email info@grandiorvenue.com."; });
      return;
    }
    var body = "Name: " + d.name + "\nEmail: " + d.email + "\nPhone: " + d.phone +
      "\nEvent: " + d.type + "\nDate: " + (d.date || "flexible") + "\nGuests: " + (d.guests || "-") + "\n\n" + d.message;
    window.location.href = "mailto:info@grandiorvenue.com?subject=" +
      encodeURIComponent("Event enquiry: " + d.type) + "&body=" + encodeURIComponent(body);
    note.textContent = "Opening your email app…";
  });

  /* ---- year ---------------------------------------------------------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
