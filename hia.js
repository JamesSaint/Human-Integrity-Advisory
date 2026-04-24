/* hia.js — Intervene Advisory v5 */
(function () {
  'use strict';

  /* MOBILE NAV */
  var ham = document.getElementById('hamburger');
  var mob = document.getElementById('mobile-nav');
  if (ham && mob) {
    ham.addEventListener('click', function () {
      var open = ham.classList.toggle('open');
      mob.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', String(open));
      mob.setAttribute('aria-hidden', String(!open));
    });
    mob.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        ham.classList.remove('open');
        mob.classList.remove('open');
        ham.setAttribute('aria-expanded', 'false');
        mob.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* SCROLL REVEAL */
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); rio.unobserve(e.target); }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  /* SCORECARD BARS */
  var sc = document.getElementById('scorecard');
  if (sc && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.sc-bar').forEach(function (bar, i) {
            setTimeout(function () { bar.style.width = (bar.getAttribute('data-w') || '0') + '%'; }, i * 65 + 100);
          });
          sio.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    sio.observe(sc);
  }

  /* COUNTERS */
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function counter(el) {
    var d = el.getAttribute('data-display');
    if (d) { el.textContent = d; return; }
    var target = parseFloat(el.getAttribute('data-target') || '0');
    var dur = 1500, t0 = performance.now();
    (function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(ease(p) * target);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var sb = document.querySelector('.stat-band');
  if (sb && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.querySelectorAll('.counter').forEach(counter); cio.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    cio.observe(sb);
  }

  /* ACCORDION */
  document.querySelectorAll('.acc-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.acc-trigger').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        var bd = document.getElementById(b.getAttribute('aria-controls'));
        if (bd) bd.classList.remove('open');
      });
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        var bd = document.getElementById(btn.getAttribute('aria-controls'));
        if (bd) bd.classList.add('open');
      }
    });
  });

  /* CONTACT FORM — FORMSPREE */
  var form    = document.getElementById('contact-form');
  var success = document.getElementById('form-success');
  var ferror  = document.getElementById('form-error');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.form-submit');
      var orig = btn.textContent;
      btn.textContent = 'Sending\u2026'; btn.disabled = true;
      if (ferror) ferror.classList.remove('show');
      fetch(form.action, {
        method: 'POST', body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (res.ok) {
          form.style.display = 'none';
          if (success) success.classList.add('show');
        } else { btn.textContent = orig; btn.disabled = false; if (ferror) ferror.classList.add('show'); }
      }).catch(function () { btn.textContent = orig; btn.disabled = false; if (ferror) ferror.classList.add('show'); });
    });
  }

}());
