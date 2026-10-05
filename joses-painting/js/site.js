/* Jose's Painting Services — nav state, mobile drawer, scroll reveals,
   and the estimate form. No dependencies. */
(function () {
  'use strict';

  /* --- sticky nav shadow --- */
  var nav = document.getElementById('nav');
  function navState() {
    if (nav) nav.classList.toggle('solid', window.scrollY > 6);
  }
  navState();
  window.addEventListener('scroll', navState, { passive: true });

  /* --- mobile drawer --- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  function setDrawer(open) {
    if (!burger || !drawer) return;
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      setDrawer(drawer.hidden);
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) {
        setDrawer(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000 && !drawer.hidden) setDrawer(false);
    });
  }

  /* --- phone links break out of an embedding frame so the dialer opens --- */
  [].forEach.call(document.querySelectorAll('a[href^="tel:"]'), function (a) {
    a.setAttribute('target', '_top');
  });

  /* --- footer year --- */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* --- scroll reveals --- */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* --- estimate form --- */
  var form = document.getElementById('estimate-form');
  if (!form) return;

  var status = document.getElementById('form-status');
  var TEL = '703-798-9327';
  var INBOX = 'josespaintingservices@yahoo.com';

  // Each entry: the field, its error paragraph, and a test that returns true when valid.
  var checks = [
    { id: 'f-name', err: 'e-name', ok: function (v) { return v.length > 1; } },
    { id: 'f-phone', err: 'e-phone', ok: function (v) { return v.replace(/\D/g, '').length >= 10; } },
    { id: 'f-email', err: 'e-email', ok: function (v) { return v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); } },
    { id: 'f-service', err: 'e-service', ok: function (v) { return v !== ''; } }
  ];

  function say(msg, bad) {
    if (!status) return;
    status.textContent = msg;
    status.classList.toggle('bad', !!bad);
  }

  function clearOne(el, errEl) {
    el.removeAttribute('aria-invalid');
    if (errEl) errEl.hidden = true;
  }

  checks.forEach(function (c) {
    var el = document.getElementById(c.id);
    var errEl = document.getElementById(c.err);
    if (!el) return;
    el.addEventListener('input', function () { clearOne(el, errEl); });
    el.addEventListener('change', function () { clearOne(el, errEl); });
  });

  function validate() {
    var firstBad = null;
    checks.forEach(function (c) {
      var el = document.getElementById(c.id);
      var errEl = document.getElementById(c.err);
      if (!el) return;
      if (c.ok(el.value.trim())) {
        clearOne(el, errEl);
      } else {
        el.setAttribute('aria-invalid', 'true');
        if (errEl) errEl.hidden = false;
        if (!firstBad) firstBad = el;
      }
    });
    return firstBad;
  }

  function values() {
    function v(id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    }
    return {
      name: v('f-name'),
      phone: v('f-phone'),
      email: v('f-email'),
      service: v('f-service'),
      details: v('f-details')
    };
  }

  function mailtoFallback(d) {
    var body = [
      'Name: ' + d.name,
      'Phone: ' + d.phone,
      'Email: ' + (d.email || '(not given)'),
      'Service: ' + d.service,
      '',
      'Details:',
      d.details || '(none)'
    ].join('\n');
    var url = 'mailto:' + INBOX +
      '?subject=' + encodeURIComponent('Estimate request from ' + d.name) +
      '&body=' + encodeURIComponent(body);
    window.location.href = url;
    say('Your email app should be opening with the details filled in. Send it and we will call you back. If nothing opened, call or text ' + TEL + '.');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Bots fill the hidden field. Give them a thank-you and send nothing.
    var trap = document.getElementById('f-company');
    if (trap && trap.value !== '') {
      say('Thanks, we will be in touch.');
      return;
    }

    var bad = validate();
    if (bad) {
      say('Check the highlighted fields and send it again.', true);
      bad.focus();
      return;
    }

    var d = values();
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();

    if (!endpoint) {
      mailtoFallback(d);
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    say('Sending...');

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(d)
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status ' + res.status);
      form.reset();
      say('Got it. We will call you back to set a time. If you need us sooner, call ' + TEL + '.');
    }).catch(function () {
      say('That did not go through. Call or text ' + TEL + ', or email ' + INBOX + '.', true);
    }).then(function () {
      if (btn) btn.disabled = false;
    });
  });
})();
