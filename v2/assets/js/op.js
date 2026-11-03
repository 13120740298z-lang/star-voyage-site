/* =========================================================
   星游记 · OP 改编版（v2）
   OP 节拍调度：每屏对应原作片头一段，HUD 按真实时间走带，
   切点（取自 op_breakdown.md）触发闪帧，歌词按实测时间切换。
   ========================================================= */
(function () {
  'use strict';

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  // in/out：该屏对应的 OP 时间（秒）；cuts：剪辑点；lyrics：[时间, 文本]
  var SEG = [
    { in: 0.0, out: 6.4, cuts: [0, 0.87, 1.67, 3.17, 3.83, 5.43], lyrics: [] },
    { in: 6.4, out: 11.8, cuts: [6.4, 7.0, 7.5, 8.2, 9.37], lyrics: [] },
    {
      in: 24.3, out: 36.1, cuts: [24.3, 24.5, 30.2, 33.2, 35.9, 36.1],
      lyrics: [[25, '眼前重复的风景'], [28, '渐渐模糊了约定'], [31, '星空下流浪的你'], [34, '仍然秘密的距离']]
    },
    { in: 11.8, out: 19.0, cuts: [11.8, 19.0], lyrics: [] },
    {
      in: 45.5, out: 59.5, cuts: [45.5, 49.8, 53.1],
      lyrics: [[46, '没有脚印的光年'], [49, '还在等着你出现'], [55, '日日夜夜自转的行星'],
               [58, '到处遮满别人的背影']]
    },
    {
      in: 64.7, out: 70.6, cuts: [64.7, 67.7, 68.7, 69.6, 70.6],
      lyrics: [[70, '天空洒满忽然的光明']]
    },
    { in: 78.0, out: 91.9, cuts: [78.0, 82.0, 83.2, 84.1, 88.0], lyrics: [] }
  ];

  var screens = document.querySelectorAll('.screen');
  if (!screens.length) return;

  function fmt(t) {
    var m = Math.floor(t / 60);
    var s = t - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }

  /* ---------------- HUD ---------------- */
  var bar = document.createElement('div');
  bar.className = 'opbar';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML =
    '<div class="opbar-head"><span>OP 节拍 · <b data-op-tc>00:00.0</b></span>' +
    '<em data-op-seg>原作片头 01 / 07</em></div>' +
    '<div class="opbar-lyric" data-op-lyric>—</div>' +
    '<div class="opbar-track"><span class="op-playhead" data-op-head></span></div>';
  document.body.appendChild(bar);

  var tcEl = bar.querySelector('[data-op-tc]');
  var segEl = bar.querySelector('[data-op-seg]');
  var lyricEl = bar.querySelector('[data-op-lyric]');
  var headEl = bar.querySelector('[data-op-head]');
  var track = bar.querySelector('.opbar-track');

  var flash = document.createElement('div');
  flash.className = 'op-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);

  var ticks = [];
  function buildTicks(seg) {
    ticks.forEach(function (t) { t.remove(); });
    ticks = [];
    seg.cuts.forEach(function (c, i) {
      var el = document.createElement('span');
      el.className = 'op-tick' + (i === 0 ? ' is-major' : '');
      el.style.left = ((c - seg.in) / (seg.out - seg.in) * 100).toFixed(2) + '%';
      track.appendChild(el);
      ticks.push(el);
    });
  }

  var raf = null, startAt = 0, seg = null, cutIdx = 0, lastLyric = -1, mediaVideo = null;

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function paint(t) {
    if (!seg) return;
    var p = (t - seg.in) / (seg.out - seg.in);
    p = Math.max(0, Math.min(1, p));
    headEl.style.left = (p * 100).toFixed(2) + '%';
    tcEl.textContent = fmt(t);

    var li = -1;
    for (var i = 0; i < seg.lyrics.length; i++) {
      if (t >= seg.lyrics[i][0]) li = i;
    }
    if (li !== lastLyric) {
      lastLyric = li;
      lyricEl.textContent = li >= 0 ? seg.lyrics[li][1] : '—';
    }

    while (cutIdx < seg.cuts.length && t >= seg.cuts[cutIdx]) {
      if (!reduced) {
        flash.classList.remove('is-cut');
        void flash.offsetWidth;
        flash.classList.add('is-cut');
      }
      cutIdx++;
    }
  }

  function play(index) {
    stop();
    seg = SEG[index] || SEG[0];
    mediaVideo = screens[index] ? screens[index].querySelector('.gate video') : null;
    // 只让当前屏的片子占用带宽：其余机位暂停，当前机位优先加载
    var allVideos = document.querySelectorAll('.gate video');
    for (var vi = 0; vi < allVideos.length; vi++) {
      if (allVideos[vi] !== mediaVideo) {
        try { allVideos[vi].pause(); } catch (e) {}
      }
    }
    if (mediaVideo) {
      mediaVideo.preload = 'auto';
      try {
        // 之前被暂停过的片子可能一直没发起加载，强制重启一次请求
        if (mediaVideo.readyState === 0) mediaVideo.load();
        mediaVideo.currentTime = 0;
        if (mediaVideo.paused) {
          var pr = mediaVideo.play();
          if (pr && pr.catch) pr.catch(function () {});
        }
      } catch (e) {}
    }
    lastLyric = -2;
    lyricEl.textContent = '—';
    cutIdx = 0;
    buildTicks(seg);
    segEl.textContent = '原作片头 ' + String(index + 1).padStart(2, '0') + ' / 07';

    if (reduced) {
      paint(seg.out);
      return;
    }
    startAt = 0;
    for (var i = 0; i < seg.lyrics.length; i++) {
      if (seg.lyrics[i][0] >= seg.in) { lastLyric = i - 1; break; }
    }

    function step(now) {
      if (!startAt) startAt = now;
      var elapsed = (now - startAt) / 1000;
      var t;
      if (mediaVideo && mediaVideo.readyState >= 2) {
        // 有原作片段的屏：走带直接跟随视频播放头，HUD 与原片字幕同步
        t = seg.in + mediaVideo.currentTime;
      } else {
        t = seg.in + elapsed;
      }
      t = Math.min(seg.out, t);
      paint(t);
      if (mediaVideo || elapsed < seg.out - seg.in + 0.2) raf = requestAnimationFrame(step);
    }
    paint(seg.in);
    raf = requestAnimationFrame(step);
  }

  /* ---------------- 监听当前屏 ---------------- */
  var active = -1;
  function sync() {
    var idx = -1;
    for (var i = 0; i < screens.length; i++) {
      if (screens[i].classList.contains('is-active')) { idx = i; break; }
    }
    if (idx >= 0 && idx !== active) {
      active = idx;
      play(idx);
    }
  }

  if ('MutationObserver' in window) {
    var mo = new MutationObserver(sync);
    for (var i = 0; i < screens.length; i++) {
      mo.observe(screens[i], { attributes: true, attributeFilter: ['class'] });
    }
  } else {
    setInterval(sync, 400);
  }

  sync();
})();
