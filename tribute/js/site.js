/* 星游记「再飞行」致敬站 · 分屏 + 纸飞机航线
   音频规则：背景 OP 永不停播，片段出声时只把背景音量降到 0（不暂停）；
   片段结束停在最后一帧并恢复背景音量。 */
(function () {
  "use strict";

  var S = window.SITE || { stations: [], clips: {}, titleCards: [] };
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
  var evv = document.getElementById("evv");
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var state = {
    i: 0,
    audioOn: false,
    clipPlaying: null,
    finalPlaying: false,
    evPlaying: false,
    busy: false,
    px: 0,
    py: 0
  };

  /* ---------------- 音频 ---------------- */

  function personVideos() {
    return [].slice.call(document.querySelectorAll(".p-video"));
  }

  function anyClip() {
    return !!state.clipPlaying || state.finalPlaying || state.evPlaying;
  }

  /* 让位：只降背景音量并静音，背景画面继续循环，不暂停、不重播 */
  function duckBackground(on) {
    bg.volume = on ? 0 : 1;
    bg.muted = on || !state.audioOn;
  }

  function updateAudio() {
    duckBackground(anyClip());
    personVideos().forEach(function (v) { v.muted = !state.audioOn; });
    if (finalv) finalv.muted = !state.audioOn;
    if (evv) evv.muted = !state.audioOn;
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
  }

  /* 第一次点击解锁音频：排除“开声音”按钮与时间线节点（节点按规则不出声） */
  function unlockAudio(e) {
    if (state.audioOn) return;
    var t = e.target;
    if (t && t.closest && t.closest("#sound, #cta, .tl-item, .ev-head, .sound")) return;
    setAudio(true);
  }
  document.addEventListener("pointerdown", unlockAudio, true);

  soundBtn.addEventListener("click", toggleAudio);
  if (cta) cta.addEventListener("click", toggleAudio);

  /* ---------------- 片段播放 ---------------- */

  function seekTo(v, t) {
    var dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    var target = Math.max(0, Math.min(t, dur ? dur - 0.02 : t));
    try {
      if (Math.abs(v.currentTime - target) > 0.04) v.currentTime = target;
    } catch (err) {}
  }

  function seekWhenReady(v, t) {
    if (v.readyState >= 1) {
      seekTo(v, t);
    } else {
      v.addEventListener("loadedmetadata", function () { seekTo(v, t); }, { once: true });
    }
  }

  function attemptPlay(v) {
    v.muted = !state.audioOn;
    var p = v.play();
    if (p && p.catch) {
      p.catch(function () {
        /* 没有手势时先静音播，等第一次点击再出声 */
        v.muted = true;
        var p2 = v.play();
        if (p2 && p2.catch) p2.catch(function () {});
      });
    }
  }

  function pauseOthers(except) {
    personVideos().forEach(function (v) {
      if (v !== except) { v.pause(); v.muted = true; }
    });
  }

  /* 人物片段：进站自动播放；同一时刻只允许一个片段在播 */
  function playClip(v, t) {
    if (!v) return;
    pauseOthers(v);
    seekWhenReady(v, t);
    var vis = v.closest(".p-visual");
    if (vis) { vis.classList.add("playing"); vis.classList.remove("played"); }
    state.clipPlaying = v;
    updateAudio();
    attemptPlay(v);
    guardEnd(v);
  }

  /* 结束：停在最后一帧（在 rAF 里提前 0.06s 暂停，避免 ended 后画面回到 0）；恢复背景音量 */
  function finishVideo(v) {
    if (!v) return;
    try { v.pause(); } catch (err) {}
    if (v === finalv) {
      state.finalPlaying = false;
      updateAudio();
      return;
    }
    if (v === evv) {
      state.evPlaying = false;
      updateAudio();
      syncCue();
      return;
    }
    var vis = v.closest(".p-visual");
    if (vis) { vis.classList.remove("playing"); vis.classList.add("played"); }
    if (state.clipPlaying === v) state.clipPlaying = null;
    updateAudio();
  }

  function guardEnd(v) {
    if (v._raf) cancelAnimationFrame(v._raf);
    function tick() {
      if (v.paused || v.ended) { v._raf = null; return; }
      var d = v.duration;
      if (isFinite(d) && d > 0 && v.currentTime >= d - 0.04) {
        v._raf = null;
        finishVideo(v);
        return;
      }
      v._raf = requestAnimationFrame(tick);
    }
    v._raf = requestAnimationFrame(tick);
  }

  function bindPersonVideo(sec, v, times) {
    v.addEventListener("ended", function () { finishVideo(v); });

    /* 时间线节点：只跳帧 + 更新卡片，不重播、不重载、不打断播放、不出声 */
    [].slice.call(sec.querySelectorAll(".tl-item")).forEach(function (item, idx) {
      var btn = item.querySelector(".tl-dot");
      btn.addEventListener("click", function () {
        var willOpen = !item.classList.contains("open");
        closeAllCards();
        if (!willOpen) return;
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        seekWhenReady(v, times[idx] || 0);
        if (state.clipPlaying !== v) {
          /* 片段没在播：静默停在目标帧，不自动起播 */
          v.pause();
          v.muted = true;
          var vis = v.closest(".p-visual");
          if (vis) { vis.classList.remove("playing"); vis.classList.add("played"); }
        }
      });
    });
  }

  function closeAllCards() {
    document.querySelectorAll(".tl-item.open").forEach(function (el) {
      el.classList.remove("open");
      el.querySelector(".tl-dot").setAttribute("aria-expanded", "false");
    });
  }

  /* ---------------- 事件页：完整标题切片 ---------------- */

  var cues = [];
  var cueEls = [];
  var cueIdx = -1;

  function buildCues() {
    var box = document.getElementById("evcues");
    if (!box || !S.titleCards) return;
    S.titleCards.forEach(function (c) {
      var li = document.createElement("li");
      li.className = "ev-cue";
      var ts = document.createElement("span");
      ts.className = "ev-cue-t";
      ts.textContent = c.t.toFixed(2) + "s";
      var no = document.createElement("span");
      no.className = "ev-cue-no";
      no.textContent = c.no;
      var ln = document.createElement("span");
      ln.className = "ev-cue-x";
      ln.textContent = c.line;
      li.appendChild(ts);
      li.appendChild(no);
      li.appendChild(ln);
      li.addEventListener("click", function () {
        seekTo(evv, c.t + 0.02);
        if (evv.paused) attemptPlay(evv);
        state.evPlaying = !evv.paused;
        updateAudio();
      });
      box.appendChild(li);
      cues.push(c);
      cueEls.push(li);
    });
  }

  function syncCue() {
    if (!evv || !cueEls.length) return;
    var t = evv.currentTime;
    var idx = 0;
    for (var k = 0; k < cues.length; k++) if (t + 0.01 >= cues[k].t) idx = k;
    if (idx === cueIdx) return;
    if (cueIdx >= 0 && cueEls[cueIdx]) cueEls[cueIdx].classList.remove("on");
    cueIdx = idx;
    var el = cueEls[idx];
    if (!el) return;
    el.classList.add("on");
    var box = el.parentNode;
    if (el.offsetTop - box.scrollTop < 0 || el.offsetTop - box.scrollTop > box.clientHeight - el.offsetHeight) {
      box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2);
    }
  }

  function playEvent(t, unlock) {
    if (!evv) return;
    if (unlock && !state.audioOn) setAudio(true);
    seekWhenReady(evv, t);
    state.evPlaying = true;
    updateAudio();
    attemptPlay(evv);
    guardEnd(evv);
    syncCue();
  }

  if (evv) {
    evv.addEventListener("ended", function () { finishVideo(evv); });
    evv.addEventListener("timeupdate", syncCue);
    evv.addEventListener("click", function () { playEvent(0, true); });
  }

  /* ---------------- 收尾片段 ---------------- */

  function playFinal(t, unlock) {
    if (!finalv) return;
    if (unlock && !state.audioOn) setAudio(true);
    finalv.loop = false;
    seekWhenReady(finalv, t);
    state.finalPlaying = true;
    updateAudio();
    attemptPlay(finalv);
    guardEnd(finalv);
  }

  if (finalv) {
    finalv.addEventListener("ended", function () { finishVideo(finalv); });
    finalv.addEventListener("click", function () {
      if (finalv.paused) playFinal(0, true);
      else if (!state.audioOn) setAudio(true);
    });
  }

  /* ---------------- 站点切换 ---------------- */

  function currentStation() { return stations[state.i]; }

  function stationKind(sec) {
    for (var k = 0; k < S.stations.length; k++) if (S.stations[k].id === sec.id) return S.stations[k].kind;
    return "";
  }
  function currentKind() { return stationKind(currentStation()); }

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
    if (sec.id === "s7" && evv) { evv.pause(); state.evPlaying = false; }
    if (sec.id === "s9" && finalv) { finalv.pause(); state.finalPlaying = false; }
    [].slice.call(sec.querySelectorAll(".tl-item.open")).forEach(function (el) {
      el.classList.remove("open");
      el.querySelector(".tl-dot").setAttribute("aria-expanded", "false");
    });
  }

  function enterStation(sec) {
    var kind = stationKind(sec);
    if (kind === "person") {
      /* 进站自动播放该人物片段；未解锁音频时先静音，第一次点击后立刻有声 */
      playClip(sec.querySelector(".p-video"), 0);
    } else if (kind === "events") {
      playEvent(0, false);
    } else if (kind === "final") {
      playFinal(0, false);
    } else {
      updateAudio();
    }
  }

  function setStation(n) {
    if (n === state.i) return;
    var prev = stations[state.i];
    var next = stations[n];
    if (!next) return;

    stopStation(prev);

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
    var c1 = { x: mx - dy * 0.26, y: my + dx * 0.26 };
    var c2 = { x: mx + dy * 0.26, y: my - dx * 0.26 };
    /* 两条弧线里选更“向上”的一条，且不出屏 */
    var pick = c1;
    if (c1.y > c2.y) pick = c2;
    if (pick.y < 30) pick.y = 30;
    if (pick.y > window.innerHeight - 30) pick.y = window.innerHeight - 30;
    pick.x = Math.min(Math.max(pick.x, 24), window.innerWidth - 24);
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

  function go(n) {
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

  /* ---------------- 人物片段绑定 ---------------- */

  stations.forEach(function (sec) {
    var v = sec.querySelector(".p-video");
    if (!v) return;
    bindPersonVideo(sec, v, (S.clips[sec.id] || {}).times || []);
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

  /* ---------------- 键盘 / 触屏 ---------------- */

  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(state.i + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(state.i - 1); }
  });

  var touch = null;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    if (e.target.closest(".tl-card, .ev-cues")) return;
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
    buildCues();
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
