/* ==========================================================================
   All About Trees On The Emerald Coast — site scripts
   Vanilla JS, no dependencies. Progressive enhancement only:
   every form still works with JavaScript disabled.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;

  /* ----------------------------------------------------------------------
     1. Mobile navigation drawer
     ---------------------------------------------------------------------- */
  function initNav() {
    var drawer = doc.getElementById('mobile-nav');
    var toggle = doc.querySelector('.nav-toggle');
    if (!drawer || !toggle) return;

    var closers = drawer.querySelectorAll('[data-nav-close]');

    function open() {
      drawer.classList.add('is-open');
      drawer.removeAttribute('aria-hidden');
      toggle.setAttribute('aria-expanded', 'true');
      doc.body.classList.add('nav-open');
      var first = drawer.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    }

    function close() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      doc.body.classList.remove('nav-open');
    }

    toggle.addEventListener('click', function () {
      if (drawer.classList.contains('is-open')) close();
      else open();
    });

    Array.prototype.forEach.call(closers, function (el) {
      el.addEventListener('click', close);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        close();
        toggle.focus({ preventScroll: true });
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1080 && drawer.classList.contains('is-open')) close();
    });

    /* Collapsible service group inside the drawer */
    var groups = drawer.querySelectorAll('.mobile-nav__group > button');
    Array.prototype.forEach.call(groups, function (btn) {
      btn.addEventListener('click', function () {
        var panel = doc.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.classList.toggle('is-open', !expanded);
      });
    });
  }

  /* ----------------------------------------------------------------------
     2. Sticky header shadow
     ---------------------------------------------------------------------- */
  function initHeader() {
    var header = doc.querySelector('.site-header');
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ----------------------------------------------------------------------
     3. Scroll reveal
     ---------------------------------------------------------------------- */
  function initReveal() {
    var items = doc.querySelectorAll('.reveal');
    if (!items.length) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     4. Urgency range readout (contact form)
     ---------------------------------------------------------------------- */
  function initRanges() {
    var ranges = doc.querySelectorAll('input[type="range"][data-output]');
    Array.prototype.forEach.call(ranges, function (input) {
      var out = doc.getElementById(input.getAttribute('data-output'));
      if (!out) return;
      var sync = function () { out.textContent = input.value; };
      sync();
      input.addEventListener('input', sync);
    });
  }

  /* ----------------------------------------------------------------------
     5. Forms — set _page, honour ?submitted=1, fetch submit with fallback
     ---------------------------------------------------------------------- */
  function showAlert(form, type) {
    var ok = form.querySelector('[data-alert="ok"]');
    var err = form.querySelector('[data-alert="err"]');
    if (ok) ok.classList.toggle('is-visible', type === 'ok');
    if (err) err.classList.toggle('is-visible', type === 'err');
    var target = type === 'ok' ? ok : err;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function formToObject(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (typeof value !== 'string') return; // never send files
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (Array.isArray(data[key])) data[key].push(value);
        else data[key] = [data[key], value];
      } else {
        data[key] = value;
      }
    });
    return data;
  }

  function initForms() {
    var forms = doc.querySelectorAll('form[data-leadr]');
    if (!forms.length) return;

    var submitted = false;
    try {
      submitted = new URLSearchParams(window.location.search).get('submitted') === '1';
    } catch (e) {
      submitted = window.location.search.indexOf('submitted=1') > -1;
    }

    Array.prototype.forEach.call(forms, function (form) {
      /* Always stamp the current page so visitors come back here. */
      var pageField = form.querySelector('input[name="_page"]');
      if (pageField) pageField.value = window.location.href;

      if (submitted) showAlert(form, 'ok');

      form.addEventListener('submit', function (e) {
        if (form.dataset.fallback === '1') return; // native submit in progress
        if (!window.fetch) return;                 // let the browser post it
        if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
          e.preventDefault();
          return;
        }

        e.preventDefault();

        var btn = form.querySelector('button[type="submit"]');
        var label = btn ? btn.textContent : '';
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Sending…';
        }

        var payload = formToObject(form);
        payload._page = window.location.href;

        fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Bad response');
            return res.json().catch(function () { return { ok: true }; });
          })
          .then(function (json) {
            if (json && json.ok === false) throw new Error('Rejected');
            if (btn) { btn.disabled = false; btn.textContent = label; }
            form.reset();
            var p = form.querySelector('input[name="_page"]');
            if (p) p.value = window.location.href;
            initRanges();
            showAlert(form, 'ok');
          })
          .catch(function () {
            /* Fall back to a plain HTML POST so the lead is never lost. */
            form.dataset.fallback = '1';
            if (btn) { btn.disabled = false; btn.textContent = label; }
            form.submit();
          });
      });
    });
  }

  /* ----------------------------------------------------------------------
     6. Footer year
     ---------------------------------------------------------------------- */
  function initYear() {
    var nodes = doc.querySelectorAll('[data-year]');
    var year = String(new Date().getFullYear());
    Array.prototype.forEach.call(nodes, function (el) { el.textContent = year; });
  }

  /* ---------------------------------------------------------------------- */
  function boot() {
    initNav();
    initHeader();
    initReveal();
    initRanges();
    initForms();
    initYear();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
