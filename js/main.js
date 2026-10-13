(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Small facts that should stay current ---------- */

  var year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // Time in industry, counted from July 2021.
  var uptime = $('[data-uptime]');
  if (uptime) {
    var now = new Date();
    var months = (now.getFullYear() - 2021) * 12 + (now.getMonth() - 6);
    if (months > 0) {
      var y = Math.floor(months / 12);
      var m = months % 12;
      var parts = [];
      if (y) parts.push(y + (y === 1 ? ' year' : ' years'));
      if (m) parts.push(m + (m === 1 ? ' month' : ' months'));
      uptime.textContent = parts.join(', ');
    }
  }

  /* ---------- Typewriter name ---------- */

  var live = $('.type__live');
  var typeLines = live ? live.getAttribute('data-type').split('|') : [];

  if (live && !reduceMotion) live.textContent = '';

  function typeName() {
    if (!live || reduceMotion) return;
    live.textContent = '';
    live.classList.add('is-typing');
    var spans = typeLines.map(function (_, i) {
      var s = document.createElement('span');
      live.appendChild(s);
      if (i < typeLines.length - 1) live.appendChild(document.createElement('br'));
      return s;
    });
    var line = 0;
    var ch = 0;
    function tick() {
      if (line >= typeLines.length) {
        live.classList.remove('is-typing');
        return;
      }
      ch++;
      spans[line].textContent = typeLines[line].slice(0, ch);
      var delay = 55 + Math.random() * 60;
      if (ch >= typeLines[line].length) {
        line++;
        ch = 0;
        delay = 220;
      }
      setTimeout(tick, delay);
    }
    setTimeout(tick, 250);
  }

  /* ---------- Intro: a fake judge run, once per visit ---------- */

  function runIntro(done) {
    var seen = false;
    try { seen = window.sessionStorage.getItem('ac-intro') === '1'; } catch (e) { seen = false; }
    var tpl = $('#intro-tpl');
    if (reduceMotion || seen || !tpl || !tpl.content) { done(); return; }
    try { window.sessionStorage.setItem('ac-intro', '1'); } catch (e) { /* private mode: show it anyway */ }

    var intro = tpl.content.firstElementChild.cloneNode(true);
    document.body.appendChild(intro);
    root.classList.add('is-intro');

    var timers = [];
    var finished = false;
    var lines = $$('.intro__line', intro);
    var last = 0;
    lines.forEach(function (el) {
      var at = parseInt(el.getAttribute('data-at'), 10) || 0;
      last = Math.max(last, at);
      timers.push(setTimeout(function () { el.classList.add('is-on'); }, at));
    });

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      lines.forEach(function (el) { el.classList.add('is-on'); });
      intro.classList.add('is-done');
      root.classList.remove('is-intro');
      window.removeEventListener('keydown', finish);
      setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 400);
      done();
    }

    timers.push(setTimeout(finish, last + 700));
    intro.addEventListener('click', finish);
    window.addEventListener('keydown', finish);
  }

  runIntro(typeName);

  /* ---------- Terminal progress bar ---------- */

  var bar = $('#termbar');
  var track = bar && $('.termbar__track', bar);
  var pctEl = bar && $('[data-pct]', bar);
  var leftEl = bar && $('[data-left]', bar);
  var links = bar ? $$('.termbar__path a', bar) : [];
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-section')); });
  var chunks = [];
  var ticking = false;

  function buildChunks() {
    if (!track) return;
    var n = Math.max(8, Math.min(48, Math.floor(track.clientWidth / 9)));
    if (n === chunks.length) return;
    track.textContent = '';
    chunks = [];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      track.appendChild(s);
      chunks.push(s);
    }
  }

  function update() {
    ticking = false;
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var pct = Math.round(p * 100);
    pctEl.textContent = String(pct);
    leftEl.textContent = String(100 - pct);

    var on = Math.round(p * chunks.length);
    for (var i = 0; i < chunks.length; i++) chunks[i].classList.toggle('on', i < on);

    var current = 0;
    var line = window.innerHeight * 0.35;
    for (var j = 0; j < sections.length; j++) {
      if (sections[j] && sections[j].getBoundingClientRect().top <= line) current = j;
    }
    if (p > 0.995) current = sections.length - 1;

    links.forEach(function (a, k) {
      a.classList.toggle('is-visited', k < current);
      a.classList.toggle('is-current', k === current);
      if (k === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  if (bar) {
    buildChunks();
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', function () { buildChunks(); requestUpdate(); });
    window.addEventListener('load', requestUpdate);
  }

  /* ---------- Brick breaker demo ---------- */

  var canvas = $('.game__canvas');
  if (canvas && canvas.getContext) startGame(canvas);

  function startGame(cv) {
    var W = 640, H = 400;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);

    var css = getComputedStyle(root);
    var C = {
      bg: '#05061A',
      star: css.getPropertyValue('--star').trim() || '#FFBF00',
      blue: css.getPropertyValue('--blue').trim() || '#2A35F0',
      blueText: css.getPropertyValue('--blue-text').trim() || '#9AA2FF',
      text: css.getPropertyValue('--text').trim() || '#E7E9F6',
      muted: css.getPropertyValue('--muted').trim() || '#868CB6'
    };
    var rowColors = [C.star, C.blue, C.blueText, C.star, C.blue];

    var cols = 10, rows = 5, pad = 6, top = 48, side = 24, bh = 16;
    var bw = (W - side * 2 - pad * (cols - 1)) / cols;
    var bricks, ball, paddle, score, manualUntil = 0, keyDir = 0;

    function reset() {
      bricks = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          bricks.push({ x: side + c * (bw + pad), y: top + r * (bh + pad), alive: true, color: rowColors[r] });
        }
      }
      score = 0;
      serve();
    }

    function serve() {
      paddle = paddle || { x: W / 2 - 45, y: H - 30, w: 90, h: 10 };
      ball = { x: W / 2, y: H - 60, r: 6, vx: 0.21 * (Math.random() < 0.5 ? -1 : 1), vy: -0.27 };
    }

    function aiTarget() {
      // Aim slightly off-centre so the ball keeps changing direction.
      return ball.x - paddle.w / 2 + Math.sin(ball.y / 37) * 22;
    }

    function step(dt) {
      var manual = performance.now() < manualUntil;
      if (keyDir) paddle.x += keyDir * 0.6 * dt;
      else if (!manual) {
        var target = aiTarget();
        var diff = target - paddle.x;
        var maxMove = 0.5 * dt;
        paddle.x += Math.max(-maxMove, Math.min(maxMove, diff));
      }
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 &&
          ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 8 &&
          ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) {
        var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        var angle = hit * 1.05;
        ball.vx = speed * Math.sin(angle);
        ball.vy = -Math.abs(speed * Math.cos(angle));
        ball.y = paddle.y - ball.r;
      }

      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + bw && ball.y + ball.r > b.y && ball.y - ball.r < b.y + bh) {
          b.alive = false;
          score += 10;
          var overlapX = Math.min(ball.x + ball.r - b.x, b.x + bw - (ball.x - ball.r));
          var overlapY = Math.min(ball.y + ball.r - b.y, b.y + bh - (ball.y - ball.r));
          if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
          break;
        }
      }

      if (ball.y > H + 20) serve();
      if (bricks.every(function (b) { return !b.alive; })) reset();
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    }

    function draw() {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.font = '12px "Martian Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = C.muted;
      ctx.fillText('score ' + score, side, 18);
      var manual = keyDir !== 0 || performance.now() < manualUntil;
      var label = manual ? 'you' : 'autopilot';
      ctx.fillStyle = manual ? C.star : C.muted;
      ctx.fillText(label, W - side - ctx.measureText(label).width, 18);

      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        roundRect(b.x, b.y, bw, bh, 2);
      }

      ctx.fillStyle = C.star;
      roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 2);

      ctx.fillStyle = C.text;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    reset();
    // A few bricks already gone makes the still frame read as a game in progress.
    [3, 4, 5, 14, 15, 24].forEach(function (i) { bricks[i].alive = false; });
    draw();

    if (reduceMotion) return;

    var running = false, visible = false, last = 0, raf = 0;

    function frame(t) {
      if (!running) return;
      var dt = Math.min(32, t - (last || t));
      last = t;
      step(dt);
      draw();
      raf = window.requestAnimationFrame(frame);
    }

    function sync() {
      var should = visible && !document.hidden;
      if (should && !running) { running = true; last = 0; raf = window.requestAnimationFrame(frame); }
      if (!should && running) { running = false; window.cancelAnimationFrame(raf); }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.2 }).observe(cv);
    } else {
      visible = true;
      sync();
    }
    document.addEventListener('visibilitychange', sync);

    cv.addEventListener('pointermove', function (e) {
      var rect = cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width * W;
      paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
      manualUntil = performance.now() + 2500;
    });

    cv.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keyDir = e.key === 'ArrowLeft' ? -1 : 1;
        manualUntil = performance.now() + 2500;
        e.preventDefault();
      }
    });

    cv.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        keyDir = 0;
        manualUntil = performance.now() + 2500;
      }
    });

    cv.addEventListener('blur', function () { keyDir = 0; });
  }
})();
