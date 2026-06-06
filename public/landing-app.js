/* ============================================================
   Focul landing — interactions
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- waveform bars ---------- */
  function buildWave(el, count) {
    if (!el) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var bar = document.createElement('i');
      var h = 4 + Math.abs(Math.sin(i * 0.85) * (el.id === 'stepWave' ? 30 : 26)) + (i % 4 === 0 ? 5 : 0);
      bar.style.height = h.toFixed(1) + 'px';
      if (i < Math.round(count * 0.64)) bar.className = 'on';
      frag.appendChild(bar);
    }
    el.appendChild(frag);
  }
  buildWave(document.getElementById('heroWave'), 46);
  buildWave(document.getElementById('stepWave'), 48);

  /* ---------- scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function revealIfVisible() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('in');
    });
  }
  if (reduce) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
    // Immediate pass for anything already on screen (IO can be slow to first-fire)
    revealIfVisible();
    window.addEventListener('scroll', revealIfVisible, { passive: true });
    window.addEventListener('load', revealIfVisible);
    // Safety net: never leave content invisible
    setTimeout(function () { revealEls.forEach(function (el) { el.classList.add('in'); }); }, 2200);
  }

  /* ---------- count-up numbers ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce) { el.textContent = (el.dataset.prefix || '') + target + (el.dataset.suffix || ''); return; }
    var dur = 1200, start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll('[data-count]');
  var co = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  counters.forEach(function (el) { co.observe(el); });

  /* ---------- comparison bar fill ---------- */
  var fills = document.querySelectorAll('[data-fill]');
  var fo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var el = e.target;
        setTimeout(function () { el.style.width = el.getAttribute('data-fill') + '%'; }, 120);
        fo.unobserve(el);
      }
    });
  }, { threshold: 0.6 });
  fills.forEach(function (el) { fo.observe(el); });

  /* ---------- persona tabs ---------- */
  var tabs = document.querySelectorAll('.persona-tab');
  var panes = document.querySelectorAll('.persona-pane');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var idx = +tab.getAttribute('data-p');
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      panes.forEach(function (p, i) { p.classList.toggle('active', i === idx); });
    });
  });

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      faqItems.forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- adaptive nav (light/dark by section behind it) ---------- */
  var nav = document.getElementById('nav');
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  function updateNav() {
    var probe = 46; // px below top — where the nav pill sits
    var current = 'light';
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { current = sections[i].getAttribute('data-nav'); break; }
    }
    nav.classList.toggle('on-dark', current === 'dark');
  }
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
})();
