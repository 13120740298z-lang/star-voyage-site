/* 星游记「再飞行」致敬站 · 分屏 + 纸飞机航线
   结构：state 统一管理当前站、音频解锁、片段播放；所有站点数据来自 js/data.js */
(function () {
  "use strict";

  var S = window.SITE || { stations: [], clips: {} };
  var stations = [].slice.call(document.querySelectorAll(".st"));
  var ticksBox = document.getElementById("ticks");
  var chapno = document.getElementById("chapno");
  var soundBtn = document.getElementById("sound");
  var soundLabel = document.getElementById("soundlabel");
  var cta = document.getElementById("cta");
  var plane = document.getElementById("plane");
  var trailPath = document.getElementById("trailpath");
  var bg = document.getElementById("bgvideo");
  var finalv = document.getElementById("finalv");
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var state = {
    i: 0,
    audioOn: false,
    clipPlaying: null,
    finalPlaying: false,
    busy: false,
    px: 0,
    py: 0
  };

  /* ---------------- 音频 ---------------- */

  function personVideos() {
    return [].slice.call(document.querySelectorAll(".p-video"));
  }

  function updateAudio() {
    var anyClip = !!state.clipPlaying;
    bg.muted = !state.audioOn || anyClip || state.finalPlaying;
    personVideos().forEach(function (v) { v.muted = !state.audioOn; });
    if (finalv) finalv.muted = !state.audioOn || anyClip;
    soundBtn.setAttribute("aria-pressed", state.audioOn ? "true" : "false");
    soundLabel.textContent = state.audioOn ? "关声音" : "开声音";
    if (cta) {
      cta.dataset.on = state.audioOn ? "1" : "0";
      cta.textContent = state.audioOn ? "片头曲正在播 · 点此静音" : "开声音，听片头曲";
    }
    if (state.audioOn && bg.paused && !reduceMQ.matches) bg.play().catch(function () {});
  }

  function setAudio(on) {
    state.audioOn = !!on;
    updateAudio();
  }

  function toggleAudio() {
    setAudio(!state.audioOn);
    if (state.audioOn && currentKind() === "person") {
      var v = currentStation().querySelector(".p-video");
      var openItem = currentStation().querySelector(".tl-item.open");
      var t = 0;
      if (openItem) {
        var idx = [].indexOf.call(openItem.parentNode.children, openItem);
        t = clipTime(currentStation(), idx);
      }
      startClip(v, t, false);
    }
    if (state.audioOn && currentKind() === "final" && finalv && finalv.paused) {
      finalv.play().catch(function () {});
      state.finalPlaying = true;
    }
    if (!state.audioOn) {
      personVideos().forEach(function (v) { v.pause(); });
      state.clipPlaying = null;
      if (finalv) finalv.pause();
      state.finalPlaying = false;
      updateAudio();
    }
  }

  function startClip(v, t, unlock) {
    if (!v) return;
    if (unlock && !state.audioOn) setAudio(true);
    var dur = v.duration && isFinite(v.duration) ? v.duration : 0;
    var target = Math.max(0, Math.min(t, dur ? dur - 0.2 : t));
    function seek() {
      try {
        if (Math.abs(v.currentTime - target) > 0.08) v.currentTime = target;
      } catch (e) {}
    }
    if (v.readyState >= 1) {
      seek();
    } else {
      v.addEventListener("loadedmetadata", seek, { once: true });
    }
    v.muted = !state.audioOn;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
    var vis = v.closest(".p-visual");
    if (vis) vis.classList.add("playing");
    state.clipPlaying = v;
    updateAudio();
  }

  function pauseClip(v) {
    if (!v) return;
    v.pause();
    var vis = v.closest(".p-visual");
    if (vis) {
      vis.classList.remove("playing");
      vis.classList.add("played");
    }
    if (state.clipPlaying === v) state.clipPlaying = null;
    updateAudio();
  }

  bg.addEventListener("play", function () { bg.muted = !state.audioOn || !!state.clipPlaying || state.finalPlaying; });

  soundBtn.addEventListener("click", toggleAudio);
  if (cta) cta.addEventListener("click", toggleAudio);

  /* ---------------- 站点切换 ---------------- */

  function currentStation() { return stations[state.i]; }
  function currentKind() {
    var id = currentStation().id;
    for (var k = 0; k < S.stations.length; k++) if (S.stations[k].id === id) return S.stations[k].kind;
    return "";
  }

  function clipTime(sec, idx) {
    var cfg = S.clips[sec.id];
    if (!cfg) return 0;
    return cfg.times[Math.min(idx, cfg.times.length - 1)] || 0;
  }

  function stopStation(sec) {
    var v = sec.querySelector(".p-video");
    if (v) {
      v.pause();
      v.muted = true;
      var vis = v.closest(".p-visual");
      if (vis) vis.classList.remove("playing");
      if (state.clipPlaying === v) state.clipPlaying = null;
    }
    sec.querySelectorAll(".tl-item.open").forEach(function (el) {
      el.classList.remove("open");
      el.querySelector(".tl-dot").setAttribute("aria-expanded", "false");
    });
  }

  function enterStation(sec) {
    var kind = "";
    for (var k = 0; k < S.stations.length; k++) if (S.stations[k].id === sec.id) kind = S.stations[k].kind;

    if (kind === "person") {
      /* 人物片段不自动起播：必须由用户点播放键或时间线节点，才出声 */
      var v = sec.querySelector(".p-video");
      if (v) v.muted = !state.audioOn;
      var vis = v && v.closest(".p-visual");
      if (vis) vis.classList.remove("playing");
    } else if (kind === "final") {
      if (finalv) {
        finalv.muted = !state.audioOn;
        finalv.currentTime = 0;
        if (!reduceMQ.matches) {
          var pr = finalv.play();
          if (pr && pr.catch) pr.catch(function () {});
          state.finalPlaying = true;
        }
      }
    }
    updateAudio();
  }

  function setStation(n) {
    if (n === state.i) return;
    var prev = stations[state.i];
    var next = stations[n];
    if (!next) return;

    stopStation(prev);
    if (prev.id === "s9" && finalv) { finalv.pause(); state.finalPlaying = false; }

    prev.classList.remove("on");
    prev.setAttribute("aria-hidden", "true");
    next.classList.add("on");
    next.setAttribute("aria-hidden", "false");

    var inner = next.querySelector(".st-in");
    if (inner) inner.scrollTop = 0;

    state.i = n;
    updateChrome();
    enterStation(next);
    updateAudio();
  }

  function updateChrome() {
    var num = state.i + 1;
    chapno.textContent = (num < 10 ? "0" : "") + num;
    [].slice.call(ticksBox.children).forEach(function (t, i) {
      t.classList.toggle("on", i === state.i);
      t.setAttribute("aria-selected", i === state.i ? "true" : "false");
    });
    /* 收尾屏保持安静：隐去底部上一站/下一站，仅留刻度与纸飞机 */
    document.body.classList.toggle("at-final", currentKind() === "final");
  }

  /* ---------------- 纸飞机航线 ---------------- */

  function dock() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w <= 640) return { x: w - 58, y: h - 112 };
    return { x: w - 62, y: h - 62 };
  }

  function placePlane(x, y, deg) {
    state.px = x; state.py = y;
    plane.style.transform = "translate3d(" + x + "px," + y + "px,0) rotate(" + (deg || 0) + "deg)";
  }

  function anchorOf(sec) {
    var a = sec.querySelector(".anchor");
    if (!a) return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };
    var r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function bez(p0, c, p1, t) {
    var mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x,
      y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y
    };
  }

  function control(p0, p1) {
    var dx = p1.x - p0.x, dy = p1.y - p0.y;
    var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
    var k = 0.26 * Math.sqrt(dx * dx + dy * dy);
    var c1 = { x: mx - dy * 0.26, y: my + dx * 0.26 };
    var c2 = { x: mx + dy * 0.26, y: my - dx * 0.26 };
    /* 两条弧线里选更“向上”的一条，且不出屏 */
    var pick = c1;
    if (c1.y > c2.y) pick = c2;
    if (k) {
      if (pick.y < 30) pick.y = 30;
      if (pick.y > window.innerHeight - 30) pick.y = window.innerHeight - 30;
      pick.x = Math.min(Math.max(pick.x, 24), window.innerWidth - 24);
    }
    return pick;
  }

  function drawTrail(d, len) {
    trailPath.setAttribute("d", d);
    trailPath.style.transition = "none";
    trailPath.style.opacity = "1";
    trailPath.style.strokeDashoffset = len + "px";
    /* 强制样式计算后再过渡，避免首帧不绘制 */
    void trailPath.getBoundingClientRect();
    trailPath.style.transition = "stroke-dashoffset 0.55s linear, opacity .5s ease";
    trailPath.style.strokeDashoffset = "0px";
  }

  function fadeTrail() {
    trailPath.style.transition = "opacity .45s ease";
    trailPath.style.opacity = "0";
  }

  function fly(to, dur, done) {
    var from = { x: state.px, y: state.py };
    var c = control(from, to);
    var d = "M " + from.x + " " + from.y + " Q " + c.x + " " + c.y + " " + to.x + " " + to.y;
    var len = Math.round(Math.sqrt((to.x - from.x) * (to.x - from.x) + (to.y - from.y) * (to.y - from.y)) * 1.25);
    drawTrail(d, len);

    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var pt = bez(from, c, to, e);
      var ahead = bez(from, c, to, Math.min(1, e + 0.02));
      var ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
      plane.style.transform = "translate3d(" + pt.x + "px," + pt.y + "px,0) rotate(" + ang + "deg)";
      state.px = pt.x; state.py = pt.y;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        state.px = to.x; state.py = to.y;
        if (done) done();
        fadeTrail();
      }
    }
    requestAnimationFrame(step);
  }

  function go(n, opts) {
    if (state.busy) return;
    n = ((n % stations.length) + stations.length) % stations.length;
    var reduced = reduceMQ.matches;

    if (reduced) {
      setStation(n);
      var home = dock();
      var a = anchorOf(stations[n]);
      placePlane(a.x, a.y, 0);
      window.setTimeout(function () { placePlane(home.x, home.y, 0); }, 120);
      return;
    }

    state.busy = true;
    plane.disabled = true;
    var target = anchorOf(stations[n]);
    fly(target, 620, function () {
      setStation(n);
      var home = dock();
      window.setTimeout(function () {
        fly(home, 460, function () {
          state.busy = false;
          plane.disabled = false;
        });
      }, 220);
    });
  }

  plane.addEventListener("click", function () { go(state.i + 1); });
  document.getElementById("next").addEventListener("click", function () { go(state.i + 1); });
  document.getElementById("prev").addEventListener("click", function () { go(state.i - 1); });

  /* ---------------- 顶部刻度 ---------------- */

  S.stations.forEach(function (st, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tick";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "第 " + (i + 1) + " 站 · " + st.title);
    b.addEventListener("click", function () { go(i); });
    ticksBox.appendChild(b);
  });

  /* ---------------- 人物片段与时间线 ---------------- */

  stations.forEach(function (sec) {
    var v = sec.querySelector(".p-video");
    if (!v) return;

    var times = (S.clips[sec.id] || {}).times || [];

    var playBtn = sec.querySelector(".p-play");
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        var openItem = sec.querySelector(".tl-item.open");
        var t = 0;
        if (openItem) {
          var idx = [].indexOf.call(openItem.parentNode.children, openItem);
          t = clipTime(sec, idx);
        }
        if (state.clipPlaying === v) { pauseClip(v); return; }
        startClip(v, t, true);
      });
    }

    v.addEventListener("click", function () {
      if (state.clipPlaying === v) { pauseClip(v); return; }
      startClip(v, 0, true);
    });

    v.addEventListener("ended", function () {
      var vis = v.closest(".p-visual");
      if (vis) { vis.classList.remove("playing"); vis.classList.add("played"); }
      if (state.clipPlaying === v) state.clipPlaying = null;
      updateAudio();
    });

    [].slice.call(sec.querySelectorAll(".tl-item")).forEach(function (item, idx) {
      var btn = item.querySelector(".tl-dot");
      btn.addEventListener("click", function () {
        var willOpen = !item.classList.contains("open");
        /* 先全部收起（含其它人物卡） */
        document.querySelectorAll(".tl-item.open").forEach(function (el) {
          el.classList.remove("open");
          el.querySelector(".tl-dot").setAttribute("aria-expanded", "false");
        });
        if (!willOpen) { pauseClip(v); return; }
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        /* 节点 → 视频时间点：画面与音频同时对齐 */
        startClip(v, times[idx] || 0, true);
      });
    });
  });

  /* ---------------- 事件卡 ---------------- */

  document.querySelectorAll(".ev-head").forEach(function (head) {
    head.addEventListener("click", function () {
      var ev = head.parentNode;
      var open = !ev.classList.contains("open");
      ev.classList.toggle("open", open);
      head.setAttribute("aria-expanded", open ? "true" : "false");
      head.querySelector(".ev-more").textContent = open ? "收起" : "展开";
    });
  });

  /* ---------------- 收尾视频：点本体解锁声音 ---------------- */

  if (finalv) {
    finalv.addEventListener("click", function () {
      /* 收尾屏不设额外按钮：点画面即解锁音频并从头播放 */
      if (!state.audioOn) setAudio(true);
      finalv.muted = !state.audioOn;
      if (finalv.paused) {
        finalv.play().catch(function () {});
      }
      state.finalPlaying = !finalv.paused;
      updateAudio();
    });
  }

  /* ---------------- 键盘 / 触屏 ---------------- */

  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(state.i + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(state.i - 1); }
  });

  var touch = null;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    if (e.target.closest(".tl-card")) return;
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });

  document.addEventListener("touchend", function (e) {
    if (!touch) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    var dt = Date.now() - touch.t;
    touch = null;
    if (dt > 600) return;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      go(state.i + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  /* ---------------- 减少动态 ---------------- */

  function applyReduce() {
    if (reduceMQ.matches) {
      bg.pause();
      if (finalv) finalv.pause();
      personVideos().forEach(function (v) { v.pause(); });
    } else if (bg.paused && !state.busy) {
      bg.play().catch(function () {});
    }
  }
  if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", applyReduce);

  /* ---------------- 初始化 ---------------- */

  function init() {
    var home = dock();
    placePlane(home.x, home.y, 0);
    stations.forEach(function (sec, i) {
      sec.setAttribute("aria-hidden", i === state.i ? "false" : "true");
    });
    stations[0].classList.add("on");
    updateChrome();
    updateAudio();
    applyReduce();
    enterStation(stations[0]);
  }

  window.addEventListener("resize", function () {
    if (!state.busy) {
      var home = dock();
      placePlane(home.x, home.y, 0);
    }
  });

  init();
})();
