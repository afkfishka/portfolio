/* Studio — лёгкие общие взаимодействия.
   Появление при скролле, переключение темы, курсорный свет.
   Без зависимостей. Если JS не загрузился — страница всё равно видна. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- Тема ---------- */
  var KEY = 'studio-theme';

  function paint(name) {
    root.setAttribute('data-theme', name);
    var btns = document.querySelectorAll('[data-theme-btn]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-theme-btn') === name;
      btns[i].setAttribute('aria-pressed', String(on));
    }
  }

  function setTheme(name) {
    if (!name) return;
    paint(name);
    try { localStorage.setItem(KEY, name); } catch (e) { /* файл без хранилища */ }
  }

  try {
    var saved = localStorage.getItem(KEY);
    if (saved) paint(saved);
  } catch (e) { /* игнорируем */ }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-btn]');
    if (btn) setTheme(btn.getAttribute('data-theme-btn'));
  });

  window.UITheme = { set: setTheme, current: function () { return root.getAttribute('data-theme'); } };

  /* ---------- Появление при скролле ---------- */
  var items = document.querySelectorAll('.ui-reveal');

  if (!('IntersectionObserver' in window)) {
    for (var j = 0; j < items.length; j++) items[j].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var order = Number(el.getAttribute('data-order') || 0);
        el.style.setProperty('--reveal-delay', (order * 60) + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    for (var k = 0; k < items.length; k++) io.observe(items[k]);
  }

  /* ---------- Cursor spotlight ----------
     Выключен на touch и при reduced motion. Один rAF-цикл,
     CSS-переменные вместо перерисовки UI/DOM-дерева. */
  var canSpotlight = window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canSpotlight) return;

  var px = window.innerWidth * 0.5;
  var py = window.innerHeight * 0.42;
  var x = px, y = py;
  var trailX = px, trailY = py;
  var active = false;
  var frame = 0;
  var currentTarget = null;
  var power = 0;
  var powerLevel = 0.72;

  function spotlightTarget(node) {
    if (!node || !node.closest) return null;
    return node.closest('.ui-card, .ui-btn, .ui-photo-frame, [data-spotlight]');
  }

  function clearTarget() {
    if (!currentTarget) return;
    currentTarget.removeAttribute('data-spotlit');
    currentTarget.style.removeProperty('--spot-local-x');
    currentTarget.style.removeProperty('--spot-local-y');
    currentTarget = null;
  }

  function tick() {
    frame = 0;
    x += (px - x) * 0.16;
    y += (py - y) * 0.16;
    trailX += (x - trailX) * 0.075;
    trailY += (y - trailY) * 0.075;
    var targetPower = active ? powerLevel : 0;
    power += (targetPower - power) * 0.1;

    root.style.setProperty('--spot-x', x.toFixed(1) + 'px');
    root.style.setProperty('--spot-y', y.toFixed(1) + 'px');
    root.style.setProperty('--spot-trail-x', trailX.toFixed(1) + 'px');
    root.style.setProperty('--spot-trail-y', trailY.toFixed(1) + 'px');
    root.style.setProperty('--spot-power', power.toFixed(3));

    var dx = Math.abs(px - x) + Math.abs(py - y);
    var tdx = Math.abs(x - trailX) + Math.abs(y - trailY);
    if (Math.abs(targetPower - power) > 0.004 || dx > 0.8 || tdx > 0.8) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  document.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse') return;
    px = event.clientX;
    py = event.clientY;
    active = true;

    var next = spotlightTarget(event.target);
    if (next !== currentTarget) {
      clearTarget();
      currentTarget = next;
      if (currentTarget) currentTarget.setAttribute('data-spotlit', 'true');
    }

    powerLevel = !currentTarget ? 0.72 :
      currentTarget.classList.contains('ui-btn') ? 0.9 :
      currentTarget.classList.contains('ui-card') ? 0.82 : 0.68;

    if (currentTarget) {
      var rect = currentTarget.getBoundingClientRect();
      var localX = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      var localY = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      currentTarget.style.setProperty('--spot-local-x', localX.toFixed(1) + '%');
      currentTarget.style.setProperty('--spot-local-y', localY.toFixed(1) + '%');
    }

    root.setAttribute('data-spot-active', 'true');
    schedule();
  }, { passive: true });

  function stopSpotlight() {
    active = false;
    root.setAttribute('data-spot-active', 'false');
    clearTarget();
    schedule();
  }

  window.addEventListener('pointerleave', stopSpotlight);
  window.addEventListener('pointerout', function (event) {
    if (!event.relatedTarget) stopSpotlight();
  });

  window.addEventListener('blur', function () {
    stopSpotlight();
  });
})();
