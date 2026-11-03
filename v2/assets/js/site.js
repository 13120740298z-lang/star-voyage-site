/* =========================================================
   星游记 · 新作启航
   单页分屏叙事 / 手写 Canvas 2D 星海 + 航线 + 程序化跃迁
   无第三方库、无网络请求
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(reduceQuery && reduceQuery.matches);

  var screens = $$('.screen');
  var N = screens.length;
  var current = 0;
  var locked = false;
  var lockTimer = null;
  var DUR = reduced ? 180 : 640;
  var booted = false;

  /* ---------------- 小工具 ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function mod(n, m) { return ((n % m) + m) % m; }

  /* =========================================================
     航线数据：7 个航点 = 7 屏
     ========================================================= */
  var WP = {
    name: ['启航点', '星海公约环', '亚亚罗残环', '封锁线外', '第三跃迁窗口', '共振 · 跃迁', '彩虹海'],
    x: [0.06, 0.20, 0.34, 0.50, 0.66, 0.80, 0.94],
    y: [0.74, 0.80, 0.78, 0.14, 0.22, 0.84, 0.30],
    anchor: [0.62, 0.78, 0.72, 0.62, 0.78, 0.82, 0.70],
    cam: [0.55, 0.62, 0.50, 1.10, 0.70, 0.40, 0.50]
  };

  /* =========================================================
     程序化星海 / 航线渲染器
     ========================================================= */
  var Space = (function () {
    var canvas = document.getElementById('space');
    if (!canvas) return { resize: function () {}, navigate: function () {}, render: function () {}, setActive: function () {} };
    var ctx = null;
    try { ctx = canvas.getContext('2d', { alpha: true }); } catch (e) { ctx = null; }
    if (!ctx) {
      canvas.style.display = 'none';
      document.documentElement.classList.add('no-canvas');
      return { resize: function () {}, navigate: function () {}, render: function () {}, setActive: function () {} };
    }

    var W = 0, H = 0, DPR = 1;
    var compact = false;
    var stars = [];
    var sparks = [];
    var samples = [];
    var dust = [];
    var nebula = document.createElement('canvas');
    var nctx = nebula.getContext('2d');
    var dustSprite = document.createElement('canvas');

    var cam = { x: 0, y: 0 };
    var camFrom = 0, camTo = 0;
    var nav = { from: 0, to: 0, start: 0, dur: DUR, active: false };
    var clock = 0, last = 0;
    var fps = 60, frames = 0, fpsAt = 0;

    function worldW() { return W * 2.6; }

    function wpPoint(i) {
      return { x: WP.x[i] * worldW(), y: WP.y[i] * H };
    }

    function buildRoute() {
      var pts = [];
      for (var i = 0; i < N; i++) pts.push(wpPoint(i));
      var padFirst = { x: pts[0].x - (pts[1].x - pts[0].x), y: pts[0].y + 70 };
      var padLast = { x: pts[N - 1].x + (pts[N - 1].x - pts[N - 2].x), y: pts[N - 1].y - 60 };
      var all = [padFirst].concat(pts, [padLast]);
      samples = [];
      for (var s = 1; s < all.length - 2; s++) {
        var p0 = all[s - 1], p1 = all[s], p2 = all[s + 1], p3 = all[s + 2];
        for (var k = 0; k < 44; k++) {
          var t = k / 44, t2 = t * t, t3 = t2 * t;
          samples.push({
            x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
          });
        }
      }
      var end = { x: all[all.length - 2].x, y: all[all.length - 2].y };
      samples.push(end);
    }

    function sampleAt(u) {
      if (!samples.length) return { x: 0, y: 0, ax: 1, ay: 0 };
      var f = clamp(u, 0, 1) * (samples.length - 1);
      var i = Math.floor(f), j = Math.min(i + 1, samples.length - 1), t = f - i;
      var a = samples[i], b = samples[j];
      return {
        x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t),
        ax: b.x - a.x, ay: b.y - a.y
      };
    }

    function makeStars() {
      stars = [];
      var layers = [
        { count: Math.round(W / 4), par: 0.05, rmin: 0.35, rmax: 1.0, a: 0.55 },
        { count: Math.round(W / 5), par: 0.16, rmin: 0.6, rmax: 1.5, a: 0.7 },
        { count: Math.round(W / 9), par: 0.34, rmin: 1.0, rmax: 2.2, a: 0.8 }
      ];
      layers.forEach(function (L, li) {
        for (var i = 0; i < L.count; i++) {
          stars.push({
            x: Math.random() * W, y: Math.random() * H,
            r: lerp(L.rmin, L.rmax, Math.random()),
            a: L.a * (0.35 + Math.random() * 0.65),
            par: L.par * (1 + li * 0.3),
            tw: 0.4 + Math.random() * 1.6,
            ph: Math.random() * Math.PI * 2,
            warm: Math.random() > 0.82
          });
        }
      });
      dust = [];
      for (var d = 0; d < 26; d++) {
        dust.push({ x: Math.random() * W, y: Math.random() * H, r: 40 + Math.random() * 110, a: 0.02 + Math.random() * 0.035 });
      }
      sparks = [];
      for (var s = 0; s < 24; s++) {
        sparks.push({ u: Math.random(), v: 0.035 + Math.random() * 0.07, warm: Math.random() > 0.5, r: 0.7 + Math.random() * 1.3 });
      }
    }

    function makeNebula() {
      // 预渲染雾团贴图，避免每帧创建大半径渐变
      dustSprite.width = 128; dustSprite.height = 128;
      var dctx = dustSprite.getContext('2d');
      var dg = dctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      dg.addColorStop(0, 'rgba(150,195,245,.16)');
      dg.addColorStop(0.45, 'rgba(120,165,225,.07)');
      dg.addColorStop(1, 'rgba(120,165,225,0)');
      dctx.fillStyle = dg;
      dctx.fillRect(0, 0, 128, 128);

      nebula.width = Math.max(1, Math.round(W * 0.7));
      nebula.height = Math.max(1, Math.round(H * 0.7));
      nctx.clearRect(0, 0, nebula.width, nebula.height);
      var blobs = [
        { x: 0.66, y: 0.30, r: 0.55, c: '40,58,120', a: 0.42 },
        { x: 0.20, y: 0.80, r: 0.44, c: '18,66,78', a: 0.30 },
        { x: 0.88, y: 0.86, r: 0.34, c: '92,52,66', a: 0.16 }
      ];
      blobs.forEach(function (b) {
        var cx = b.x * nebula.width, cy = b.y * nebula.height, rr = b.r * Math.max(nebula.width, nebula.height);
        var g = nctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 'rgba(' + b.c + ',' + b.a + ')');
        g.addColorStop(0.45, 'rgba(' + b.c + ',' + (b.a * 0.4) + ')');
        g.addColorStop(1, 'rgba(' + b.c + ',0)');
        nctx.fillStyle = g;
        nctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      });
    }

    function camTargetFor(u) {
      var i = clamp(Math.floor(u), 0, N - 1);
      var j = Math.min(i + 1, N - 1);
      var t = u - i;
      var wpX = lerp(WP.x[i], WP.x[j], t) * worldW();
      var anchor = lerp(WP.anchor[i], WP.anchor[j], t) * W;
      return wpX - anchor;
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      compact = W < 820;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildRoute();
      makeStars();
      makeNebula();
      cam.x = camTargetFor(current);
      cam.y = 0;
      renderStatic();
    }

    function drawBackground(now) {
      // 雾与底色
      var g = ctx.createLinearGradient(0, 0, W * 0.4, H);
      g.addColorStop(0, 'rgba(10,16,28,0)');
      g.addColorStop(1, 'rgba(4,6,11,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // 星云
      var ox = -mod(cam.x * 0.025, W * 0.4);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(nebula, ox, -H * 0.12, W * 0.7, H * 0.7);
      ctx.drawImage(nebula, ox + W * 0.55, -H * 0.1, W * 0.7, H * 0.7);
      ctx.globalAlpha = 1;

      // 星尘
      dust.forEach(function (d) {
        var x = mod(d.x - cam.x * 0.03, W + 300) - 150;
        ctx.globalAlpha = d.a * 3.2;
        ctx.drawImage(dustSprite, x - d.r, d.y - d.r, d.r * 2, d.r * 2);
      });
      ctx.globalAlpha = 1;

      // 星点
      stars.forEach(function (s) {
        var x = mod(s.x - cam.x * s.par, W);
        var a = s.a * (0.55 + 0.45 * Math.sin(now * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm ? 'rgba(240,205,160,' + a + ')' : 'rgba(210,230,250,' + a + ')';
        ctx.fill();
      });
    }

    function drawRoute(u, now, shipScale) {
      var pts = [];
      for (var i = 0; i < samples.length; i++) {
        var sx = samples[i].x - cam.x;
        var sy = samples[i].y - cam.y;
        if (sx > -120 && sx < W + 120) pts.push({ x: sx, y: sy, t: i / (samples.length - 1) });
      }
      if (pts.length > 1) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(150,195,235,.15)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
        ctx.stroke();

        // 已经飞过的航段（琥珀色）
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(240,180,95,.32)';
        ctx.beginPath();
        var started = false;
        for (var m = 0; m < pts.length; m++) {
          if (pts[m].t > u) break;
          if (!started) { ctx.moveTo(pts[m].x, pts[m].y); started = true; }
          else ctx.lineTo(pts[m].x, pts[m].y);
        }
        if (started) ctx.stroke();
      }

      // 航点
      for (var w = 0; w < N; w++) {
        var p = wpPoint(w);
        var x = p.x - cam.x, y = p.y - cam.y;
        if (x < -40 || x > W + 40) continue;
        var isOn = Math.abs(u - w) < 0.02;
        var r = isOn ? 4 : 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isOn ? 'rgba(240,180,95,.95)' : 'rgba(200,220,240,.55)';
        ctx.fill();
        if (isOn) {
          var pulse = 9 + 5 * Math.sin(now * 2.2);
          ctx.beginPath();
          ctx.arc(x, y, pulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(240,180,95,.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (!compact && Math.abs(u - w) < 0.4) {
          ctx.font = '9px "Consolas", monospace';
          ctx.fillStyle = isOn ? 'rgba(240,180,95,.85)' : 'rgba(140,160,185,.55)';
          ctx.textAlign = 'left';
          ctx.fillText('WP-0' + (w + 1) + ' ' + WP.name[w], x + 12, y + 16);
        }
      }

      // 航线火花
      sparks.forEach(function (s) {
        var uu = mod(s.u + now * s.v, 1);
        var q = sampleAt(uu);
        var x = q.x - cam.x, y = q.y - cam.y;
        if (x < -20 || x > W + 20) return;
        var alpha = 0.25 + 0.45 * Math.abs(Math.sin(uu * 9));
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm ? 'rgba(255,205,140,' + alpha + ')' : 'rgba(170,230,255,' + alpha + ')';
        ctx.fill();
      });
    }

    function drawShipAt(q, scale, engine) {
      var x = q.x - cam.x, y = q.y - cam.y;
      if (x < -260 || x > W + 260) return;
      var ang = Math.atan2(q.ay, q.ax);
      var s = scale * (compact ? 0.72 : 1.15) * (Math.min(W, H) / 900);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(s, s);
      if (compact) ctx.globalAlpha = 0.5;

      // 引擎尾焰
      var eg = 0.25 + engine;
      var tg = ctx.createLinearGradient(-40, 0, -170, 0);
      tg.addColorStop(0, 'rgba(255,200,140,' + (0.55 * Math.min(eg, 1.6)) + ')');
      tg.addColorStop(0.4, 'rgba(240,150,80,' + (0.22 * Math.min(eg, 1.6)) + ')');
      tg.addColorStop(1, 'rgba(240,150,80,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-34, -6);
      ctx.lineTo(-120 - 70 * eg, 0);
      ctx.lineTo(-34, 6);
      ctx.closePath();
      ctx.fill();

      // 速度线
      if (engine > 0.05) {
        ctx.strokeStyle = 'rgba(200,225,250,' + (0.18 * engine) + ')';
        ctx.lineWidth = 1;
        for (var i = 0; i < 4; i++) {
          var yy = -14 + i * 9;
          ctx.beginPath();
          ctx.moveTo(-30, yy);
          ctx.lineTo(-90 - i * 24 * engine, yy * 1.06);
          ctx.stroke();
        }
      }

      // 船体（极简几何剪影）
      ctx.beginPath();
      ctx.moveTo(66, 0);
      ctx.quadraticCurveTo(34, -12, 2, -11);
      ctx.lineTo(-32, -19);
      ctx.lineTo(-24, -4);
      ctx.lineTo(-24, 4);
      ctx.lineTo(-32, 19);
      ctx.lineTo(2, 11);
      ctx.quadraticCurveTo(34, 12, 66, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(7,10,16,.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(196,220,244,.5)';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 脊线
      ctx.beginPath();
      ctx.moveTo(58, 0);
      ctx.lineTo(-18, 0);
      ctx.strokeStyle = 'rgba(200,225,250,.22)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // 舷窗
      ctx.beginPath();
      ctx.arc(26, 0, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(135,224,244,.95)';
      ctx.fill();
      var cg = ctx.createRadialGradient(26, 0, 0, 26, 0, 14);
      cg.addColorStop(0, 'rgba(135,224,244,.35)');
      cg.addColorStop(1, 'rgba(135,224,244,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(12, -14, 28, 28);

      // 引擎灯
      [-7, 7].forEach(function (yy) {
        ctx.beginPath();
        ctx.arc(-30, yy, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,196,120,' + (0.55 + engine * 0.45) + ')';
        ctx.fill();
      });

      ctx.restore();
    }

    function drawVignetteMask() {
      // 让右侧/顶部文字区保持干净：在极低透明度下压一层暗角
      var g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      g.addColorStop(0, 'rgba(5,7,11,0)');
      g.addColorStop(1, 'rgba(5,7,11,.55)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function renderStatic() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      drawBackground(0);
      var q = wpPoint(current);
      drawRoute(current, 0, WP.cam[current]);
      drawShipAt(q, WP.cam[current], 0);
      drawVignetteMask();
    }

    function render(now) {
      if (!ctx) return;
      if (!last) last = now;
      var dt = Math.min(32, now - last);
      last = now;
      clock += dt;

      var u = current;
      var engine = 0;
      if (nav.active) {
        var p = clamp((now - nav.start) / nav.dur, 0, 1);
        var e = easeInOutCubic(p);
        u = lerp(nav.from, nav.to, e);
        engine = Math.sin(Math.PI * p) * 1.15;
        if (p >= 1) { nav.active = false; u = nav.to; }
      }

      var targetCam = camTargetFor(u);
      cam.x += (targetCam - cam.x) * 0.16;

      ctx.clearRect(0, 0, W, H);
      drawBackground(now / 1000);
      drawRoute(u, now / 1000, 0);

      var q = sampleAt(u / (N - 1));
      var scale = 0;
      if (nav.active) {
        var pp = clamp((now - nav.start) / nav.dur, 0, 1);
        scale = lerp(WP.cam[nav.from], WP.cam[nav.to], pp) * (1 + 0.55 * Math.sin(Math.PI * pp));
        engine = Math.sin(Math.PI * pp) * 1.15;
      } else {
        scale = WP.cam[current];
        engine = 0.12 + 0.08 * Math.sin(now / 900);
      }
      drawShipAt(q, scale, engine);
      drawVignetteMask();

      frames++;
      if (now - fpsAt > 1000) {
        fps = Math.round(frames * 1000 / (now - fpsAt));
        frames = 0; fpsAt = now;
        TELE.updateFps(fps);
      }
    }

    function frame(now) {
      if (reduced) { renderStatic(); return; }
      if (document.hidden) { last = 0; requestAnimationFrame(frame); return; }
      render(now);
      requestAnimationFrame(frame);
    }

    function navigate(from, to, dur) {
      nav.from = from; nav.to = to; nav.start = performance.now(); nav.dur = dur; nav.active = true;
      if (reduced) {
        nav.active = false;
        current = to;
        cam.x = camTargetFor(to);
        renderStatic();
      }
    }

    function setActive(i) {
      current = i;
      if (reduced) { cam.x = camTargetFor(i); renderStatic(); }
    }

    buildRoute();
    requestAnimationFrame(frame);
    return { resize: resize, navigate: navigate, render: render, setActive: setActive };
  })();

  /* =========================================================
     第 6 屏：程序化跃迁
     ========================================================= */
  var VFX = (function () {
    var canvas = document.getElementById('vfx');
    if (!canvas) return { setActive: function () {}, resize: function () {}, count: function () { return 0; } };
    var ctx = null;
    try { ctx = canvas.getContext('2d', { alpha: true }); } catch (e) { ctx = null; }
    if (!ctx) return { setActive: function () {}, resize: function () {}, count: function () { return 0; } };

    var W = 0, H = 0, DPR = 1;
    var parts = [], rings = [], streaks = [];
    var on = false, raf = null, last = 0, t = 0, flash = 0;
    var coreGrad = null, hGrad = null, fGrad = null;

    function buildGrads() {
      var base = Math.min(W, H), cx = W * 0.5, cy = H * 0.48;
      coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.46);
      coreGrad.addColorStop(0, 'rgba(200,240,255,.55)');
      coreGrad.addColorStop(0.2, 'rgba(100,170,235,.20)');
      coreGrad.addColorStop(0.6, 'rgba(90,80,190,.09)');
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      hGrad = ctx.createLinearGradient(0, cy, W, cy);
      hGrad.addColorStop(0, 'rgba(120,180,255,0)');
      hGrad.addColorStop(0.42, 'rgba(160,220,255,.10)');
      hGrad.addColorStop(0.5, 'rgba(225,247,255,.34)');
      hGrad.addColorStop(0.58, 'rgba(160,220,255,.10)');
      hGrad.addColorStop(1, 'rgba(120,180,255,0)');

      fGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.62);
      fGrad.addColorStop(0, 'rgba(230,248,255,.42)');
      fGrad.addColorStop(0.35, 'rgba(140,195,255,.16)');
      fGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildGrads();
      if (reduced) drawStatic();
    }

    function spawnBurst() {
      parts = []; rings = []; streaks = [];
      var cx = W * 0.5, cy = H * 0.48;
      var n = Math.min(360, Math.round(W * H / 2600));
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var v = 40 + Math.pow(Math.random(), 1.8) * Math.max(W, H) * 0.9;
        parts.push({
          x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.72,
          life: 0, max: 1.6 + Math.random() * 2.4,
          r: 0.7 + Math.random() * 1.9,
          hue: Math.random() > 0.55 ? 1 : 0
        });
      }
      for (var k = 0; k < 5; k++) {
        rings.push({ r: 0, max: Math.min(W, H) * (0.32 + k * 0.14), speed: 0.55 + k * 0.12, delay: k * 0.22, rot: Math.random() * Math.PI });
      }
      for (var s = 0; s < 26; s++) {
        streaks.push({ a: Math.random() * Math.PI * 2, len: 30 + Math.random() * 120, off: Math.random() * 0.4, sp: 0.4 + Math.random() * 0.7 });
      }
      flash = 1;
    }

    function ambient(dt, now) {
      var cx = W * 0.5, cy = H * 0.48;
      var rate = 26 * dt;
      for (var i = 0; i < rate; i++) {
        if (parts.length > 460) break;
        var a = Math.random() * Math.PI * 2;
        var v = 20 + Math.random() * 90;
        parts.push({
          x: cx + Math.cos(a) * 12, y: cy + Math.sin(a) * 10,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7,
          life: 0, max: 1.2 + Math.random() * 2.2,
          r: 0.5 + Math.random() * 1.4,
          hue: Math.random() > 0.5 ? 1 : 0
        });
      }
    }

    function step(dt, now) {
      var drag = Math.pow(0.945, dt);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life += dt;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= drag; p.vy *= drag;
        p.vy += 8 * dt;
      }
      for (var r = rings.length - 1; r >= 0; r--) {
        var g = rings[r];
        if (g.delay > 0) { g.delay -= dt; continue; }
        g.r += g.max * g.speed * dt * 0.7;
        if (g.r > g.max * 1.35) rings.splice(r, 1);
      }
      if (flash > 0) flash -= dt * 0.9;
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var cx = W * 0.5, cy = H * 0.48;
      var base = Math.min(W, H);
      ctx.globalCompositeOperation = 'lighter';

      // 中心核光
      var pulse = 0.75 + 0.25 * Math.sin(now / 720);
      if (!coreGrad) buildGrads();
      ctx.globalAlpha = 0.6 + 0.22 * pulse;
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // 横向镜头光
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, cy - 1.2, W, 2.4);
      ctx.fillRect(0, cy - 0.4, W, 0.8);

      // 事件视界：两道强椭圆 + 缓慢旋转的六边形
      var horizon = base * (0.19 + 0.012 * Math.sin(now / 900));
      ctx.strokeStyle = 'rgba(225,244,255,.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, horizon, horizon * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,190,130,.32)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, horizon * 1.2, horizon * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(170,215,255,.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var hx = 0; hx < 6; hx++) {
        var ha = hx / 6 * Math.PI * 2 + now / 4200;
        var hxx = cx + Math.cos(ha) * base * 0.3;
        var hyy = cy + Math.sin(ha) * base * 0.3 * 0.55;
        if (hx === 0) ctx.moveTo(hxx, hyy); else ctx.lineTo(hxx, hyy);
      }
      ctx.closePath();
      ctx.stroke();

      // 几何环
      rings.forEach(function (g) {
        if (g.delay > 0) return;
        var alpha = clamp(1 - g.r / (g.max * 1.4), 0, 1) * 0.55;
        ctx.strokeStyle = 'rgba(150,205,245,' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, g.r, g.r * 0.42, g.rot + now / 6000, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(240,180,95,' + (alpha * 0.4) + ')';
        ctx.beginPath();
        ctx.ellipse(cx, cy, g.r * 0.78, g.r * 0.9, g.rot - now / 9000, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 放射轨迹线
      streaks.forEach(function (s) {
        var ph = mod(now / 2600 + s.off, 1);
        var r0 = base * (0.06 + ph * 0.55);
        var len = s.len * (0.4 + ph * 1.6);
        var x0 = cx + Math.cos(s.a) * r0, y0 = cy + Math.sin(s.a) * r0 * 0.72;
        var x1 = cx + Math.cos(s.a) * (r0 + len), y1 = cy + Math.sin(s.a) * (r0 + len) * 0.72;
        var lg = ctx.createLinearGradient(x0, y0, x1, y1);
        lg.addColorStop(0, 'rgba(180,225,255,0)');
        lg.addColorStop(0.6, 'rgba(180,225,255,' + (0.12 * (1 - ph)) + ')');
        lg.addColorStop(1, 'rgba(240,200,140,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      });

      // 粒子
      parts.forEach(function (p) {
        var a = clamp(1 - p.life / p.max, 0, 1);
        var rr = p.r * (1 + p.life * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = p.hue
          ? 'rgba(255,214,160,' + (a * 0.75) + ')'
          : 'rgba(170,225,255,' + (a * 0.75) + ')';
        ctx.fill();
        if (rr > 1.6) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, rr * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = p.hue ? 'rgba(255,180,110,.05)' : 'rgba(140,210,255,.05)';
          ctx.fill();
        }
      });

      // 闪光
      if (flash > 0) {
        if (!fGrad) buildGrads();
        ctx.globalAlpha = Math.min(1, flash);
        ctx.fillStyle = fGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // 中心亮点
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      if (TELE) TELE.updateParticles(parts.length);
    }

    function drawStatic() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      var cx = W * 0.5, cy = H * 0.48, base = Math.min(W, H);
      ctx.globalCompositeOperation = 'lighter';
      var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.4);
      core.addColorStop(0, 'rgba(190,235,255,.16)');
      core.addColorStop(0.5, 'rgba(90,150,230,.06)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 160; i++) {
        var a = i * 2.39996, r = (i % 37) / 37 * Math.max(W, H) * 0.45;
        var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 0.6 + (i % 3) * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = i % 5 === 0 ? 'rgba(255,210,160,.35)' : 'rgba(170,225,255,.28)';
        ctx.fill();
      }
      [0.2, 0.34, 0.5].forEach(function (k, idx) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, base * k, base * k * 0.4, idx * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(150,205,245,.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.globalCompositeOperation = 'source-over';
      if (TELE) TELE.updateParticles(160);
    }

    function loop(now) {
      if (!on) return;
      if (!last) last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      ambient(dt, now);
      step(dt, now);
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    function setActive(isOn) {
      on = isOn;
      canvas.classList.toggle('is-on', isOn);
      if (isOn) {
        if (reduced) { drawStatic(); return; }
        spawnBurst();
        last = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        ctx.clearRect(0, 0, W, H);
      }
    }

    return { setActive: setActive, resize: resize, count: function () { return parts.length; } };
  })();

  /* =========================================================
     遥测读数（第 6 屏）
     ========================================================= */
  var TELE = (function () {
    var fpsEl = document.getElementById('tFps');
    var pEl = document.getElementById('tParticles');
    var lastFpsAt = 0, lastP = 0;
    return {
      updateFps: function (v) {
        var now = performance.now();
        if (now - lastFpsAt < 500 || !fpsEl) return;
        lastFpsAt = now;
        fpsEl.textContent = String(Math.min(120, v));
      },
      updateParticles: function (v) {
        if (!pEl || v === lastP) return;
        lastP = v;
        pEl.textContent = String(v);
      }
    };
  })();

  /* =========================================================
     分屏控制器
     ========================================================= */
  var railDots = document.getElementById('railDots');
  var railFill = document.getElementById('railFill');
  var wpCode = document.getElementById('wpCode');
  var wpName = document.getElementById('wpName');
  var screenName = WP.name;

  function buildRail() {
    if (!railDots) return;
    screens.forEach(function (s, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', '跳转到第 ' + (i + 1) + ' 屏：' + (s.dataset.name || screenName[i]));
      b.dataset.index = String(i);
      b.innerHTML = '<span>' + ('0' + (i + 1)) + ' · ' + (s.dataset.name || screenName[i]) + '</span>';
      b.addEventListener('click', function () { go(i, { force: true }); });
      li.appendChild(b);
      railDots.appendChild(li);
    });
  }

  function setRail(i) {
    if (!railDots) return;
    $$('button', railDots).forEach(function (b, k) {
      b.classList.toggle('is-on', k === i);
    });
    if (railFill) railFill.style.height = ((i / (N - 1)) * 100) + '%';
    if (wpCode) wpCode.textContent = 'WP-0' + (i + 1);
    if (wpName) wpName.textContent = screens[i].dataset.name || screenName[i];
  }

  function applyState(i, prev) {
    screens.forEach(function (s, k) {
      var isOn = k === i;
      s.classList.toggle('is-active', isOn);
      s.setAttribute('aria-hidden', isOn ? 'false' : 'true');
      if ('inert' in s) s.inert = !isOn;
      if (!isOn) s.classList.remove('is-leaving');
    });
    if (prev != null && prev !== i) {
      var out = screens[prev];
      out.classList.add('is-leaving');
      setTimeout(function () { out.classList.remove('is-leaving'); }, DUR + 80);
    }
    setRail(i);
  }

  function go(i, opts) {
    opts = opts || {};
    i = clamp(i, 0, N - 1);
    if (i === current) return;
    if (locked && !opts.force) return;

    var prev = current;
    current = i;
    applyState(i, prev);
    Space.navigate(prev, i, DUR);
    Space.setActive(i);
    VFX.setActive(i === 5);

    // 状态同步到地址栏，不触发原生滚动
    try {
      if (history.replaceState) history.replaceState(null, '', '#s' + (i + 1));
    } catch (e) {}

    if (opts.instant) return;

    // 阶梯锁时长跟随该屏的 OP 过场时长（--sd），保证"一步一屏"卡在剪辑节奏上
    var stepDur = DUR;
    try {
      var sd = getComputedStyle(screens[i]).getPropertyValue('--sd');
      if (sd) stepDur = parseFloat(sd) || DUR;
    } catch (e) {}

    locked = true;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () { locked = false; }, Math.max(stepDur + 60, 620));
  }

  /* ---------- 输入：滚轮（阶梯 + 手势锁） ---------- */
  var stage = document.getElementById('stage');
  var wheelAccum = 0, wheelResetTimer = null, burstActive = false, burstTimer = null;

  function userStep(dir) {
    if (locked) return;
    go(current + dir);
  }

  if (stage) {
    stage.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      e.preventDefault();
      if (locked) {
        // 锁定期内的惯性事件继续延长手势锁，避免解锁瞬间被余量推走第二屏
        clearTimeout(burstTimer);
        burstTimer = setTimeout(function () { burstActive = false; }, 260);
        return;
      }
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) * 1.2) return;

      // 一次手势只走一屏：手势期间忽略后续惯性事件
      if (burstActive) {
        clearTimeout(burstTimer);
        burstTimer = setTimeout(function () { burstActive = false; }, 260);
        return;
      }

      var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      wheelAccum += e.deltaY * unit;

      clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(function () { wheelAccum = 0; }, 320);

      if (Math.abs(wheelAccum) >= 30) {
        var dir = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        burstActive = true;
        clearTimeout(burstTimer);
        burstTimer = setTimeout(function () { burstActive = false; }, 300);
        userStep(dir);
      }
    }, { passive: false });
  }

  /* ---------- 输入：触控 ---------- */
  var touchStartY = 0, touchStartX = 0, touching = false;
  if (stage) {
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touching = true;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    stage.addEventListener('touchmove', function (e) {
      e.preventDefault();
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      if (!touching) return;
      touching = false;
      var t = e.changedTouches[0];
      var dy = touchStartY - t.clientY;
      var dx = touchStartX - t.clientX;
      if (Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx)) userStep(dy > 0 ? 1 : -1);
    }, { passive: true });

    stage.addEventListener('touchcancel', function () { touching = false; }, { passive: true });
  }

  /* ---------- 输入：键盘 ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Spacebar') {
      e.preventDefault(); userStep(1);
    } else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault(); userStep(-1);
    } else if (k === 'Home') {
      e.preventDefault(); go(0, { force: true });
    } else if (k === 'End') {
      e.preventDefault(); go(N - 1, { force: true });
    }
  });

  /* ---------- 窗口尺寸 ---------- */
  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      Space.resize();
      VFX.resize();
    }, 140);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

  /* ---------- 媒体空机位：有 data-src 才插片 ---------- */
  $$('.gate').forEach(function (gate) {
    var src = (gate.dataset.src || '').trim();
    if (!src) return;
    var frame = $('.gate-frame', gate);
    if (!frame) return;
    var v = document.createElement('video');
    v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.preload = 'metadata';
    // 海报静帧取自同一 OP 片源（同名 .jpg），弱网下先出画面再等视频
    var posterSrc = src.replace(/\.mp4$/i, '.jpg');
    v.poster = posterSrc;
    var probe = new Image();
    probe.onload = function () { gate.classList.add('has-poster'); };
    probe.src = posterSrc;
    v.addEventListener('canplay', function () {
      gate.classList.add('is-loaded');
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    frame.appendChild(v);
  });

  /* ---------- CTA ---------- */
  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 3600);
  }
  var ctaBook = document.getElementById('ctaBook');
  if (ctaBook) ctaBook.addEventListener('click', function () {
    showToast('演示版本：预约接口尚未接入，上映信息与片段位待官方更新。');
  });
  var ctaTop = document.getElementById('ctaTop');
  if (ctaTop) ctaTop.addEventListener('click', function () { go(0, { force: true }); });

  /* ---------- 时间码 ---------- */
  var tcEl = document.getElementById('timecode');
  var tcStart = performance.now(), tcLast = 0;
  function tickTimecode(now) {
    if (!tcEl) return;
    if (now - tcLast < 90) return;
    tcLast = now;
    var el = (now - tcStart) / 1000;
    var f = Math.floor((el % 1) * 25);
    var s = Math.floor(el) % 60, m = Math.floor(el / 60) % 60, h = Math.floor(el / 3600);
    tcEl.textContent = ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2) + ':' + ('0' + f).slice(-2);
  }

  /* ---------- 开机 ---------- */
  function bootDone() {
    if (booted) return;
    booted = true;
    document.body.classList.remove('is-booting');
  }

  /* ---------- 初始化 ---------- */
  buildRail();
  var startIndex = 0;
  var m = /#s(\d+)/.exec(location.hash || '');
  if (m) startIndex = clamp(parseInt(m[1], 10) - 1, 0, N - 1);
  current = startIndex;
  Space.resize();
  VFX.resize();
  applyState(startIndex, null);
  Space.setActive(startIndex);
  VFX.setActive(startIndex === 5);
  setTimeout(function () {
    Space.resize();
    VFX.resize();
    Space.setActive(startIndex);
  }, 60);

  if (reduced) { document.body.classList.remove('is-booting'); booted = true; }
  else { setTimeout(bootDone, 1500); }
  // 兜底：无论如何 4 秒后移除开机遮罩
  setTimeout(bootDone, 4000);

  (function loopUI(now) {
    tickTimecode(now);
    requestAnimationFrame(loopUI);
  })(performance.now());

  // 运行期切换"减少动态"偏好
  if (reduceQuery) {
    var onPref = function (e) {
      reduced = e.matches;
      DUR = reduced ? 180 : 640;
      Space.resize();
      VFX.resize();
      VFX.setActive(current === 5);
      if (reduced) document.body.classList.remove('is-booting');
    };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onPref);
    else if (reduceQuery.addListener) reduceQuery.addListener(onPref);
  }

  // 调试/自验接口
  window.__starSite = {
    go: function (i) { go(i, { force: true }); },
    index: function () { return current; },
    screens: N
  };
})();
