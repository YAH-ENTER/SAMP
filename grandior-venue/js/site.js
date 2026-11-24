/* Grandior Event Venue — behaviour. No dependencies. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- header state + hero pull-back -------------------------------- */
  var head = $(".head");
  var hero = $(".hero");
  var stage = $(".hero");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    head.classList.toggle("is-scrolled", y > 40);
    if (stage && !reduce) {
      // 0 at the top, 1 once the visitor has scrolled one screen.
      var p = Math.min(1, Math.max(0, y / (window.innerHeight * 0.75)));
      stage.style.setProperty("--p", p.toFixed(4));
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---- mobile nav ---------------------------------------------------- */
  var burger = $(".burger");
  var nav = $("#nav");
  function setNav(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setNav(!nav.classList.contains("is-open")); });
  $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });

  /* ---- photographs settle from a zoom as they arrive ----------------- */
  var zoomers = $$("[data-zoom]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    zoomers.forEach(function (el) { io.observe(el); });
  } else {
    zoomers.forEach(function (el) { el.classList.add("is-in"); });
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
        var show = f === "all" || cats.indexOf(f) > -1 || cats.indexOf("all") > -1;
        t.classList.toggle("is-hidden", !show);
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
    var isVideo = t.getAttribute("data-type") === "video";
    media.innerHTML = "";
    var el;
    if (isVideo) {
      el = document.createElement("video");
      el.src = src;
      el.controls = true;
      el.playsInline = true;
      el.autoplay = true;
      el.loop = true;
      el.muted = true;
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

  function open(tile) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    render(visibleItems().indexOf(tile));
    requestAnimationFrame(function () { lb.classList.add("is-open"); });
    $(".lb__close", lb).focus();
  }
  function close() {
    lb.classList.remove("is-open");
    media.innerHTML = "";
    document.body.style.overflow = "";
    setTimeout(function () { lb.hidden = true; }, reduce ? 0 : 300);
    if (lastFocus) lastFocus.focus();
  }

  items.forEach(function (t) {
    $(".tile__btn", t).addEventListener("click", function () { open(t); });
  });
  $(".lb__close", lb).addEventListener("click", close);
  $(".lb__nav--prev", lb).addEventListener("click", function () { render(current - 1); });
  $(".lb__nav--next", lb).addEventListener("click", function () { render(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setNav(false);
      return;
    }
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") render(current - 1);
    else if (e.key === "ArrowRight") render(current + 1);
    else if (e.key === "Tab") {
      // keep focus inside the viewer
      var f = $$("button, video", lb);
      var first = f[0], last = f[f.length - 1];
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
    if (bad.length) { note.textContent = "Please fill in the highlighted fields."; bad[0].focus(); return; }

    var d = {
      name: form.name.value.trim(), email: form.email.value.trim(), phone: form.phone.value.trim(),
      type: form.type.value, date: form.date.value, guests: form.guests.value.trim(), message: form.message.value.trim()
    };
    var endpoint = form.getAttribute("data-endpoint");
    if (endpoint) {
      note.textContent = "Sending…";
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(d) })
        .then(function (r) { if (!r.ok) throw new Error(); form.reset(); note.textContent = "Thank you. We’ll be in touch shortly."; })
        .catch(function () { note.textContent = "That didn’t send. Please call (510) 458-9232 or email info@grandiorvenue.com."; });
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
