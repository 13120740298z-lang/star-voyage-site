/* =========================================================
   星游记 · 人物专辑（原型）
   开篇风筝动画 + 四张角色专辑 + 风筝进度切换
   无外链、无生成图，风筝与开篇全部程序绘制
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------------------------------------------------------
     数据（改这里即可换角色 / 换文案）
     --------------------------------------------------------- */
  const FIELDS = [
    { key: 'name', label: '姓名', en: 'NAME' },
    { key: 'age', label: '年龄', en: 'AGE' },
    { key: 'bg', label: '背景', en: 'BACKGROUND' },
    { key: 'origin', label: '身世', en: 'ORIGIN' },
    { key: 'faction', label: '所属势力', en: 'FACTION' },
    { key: 'tag', label: '一句话标签', en: 'TAG', cls: 'field--tag' },
  ];

  const BODY_SAMPLE = '这一段放这段经典故事的简述（1–3 行）。当前为文字位示例，可整体替换。';

  /* ---------------------------------------------------------
     媒体位（只填文件名，留空 = 显示设计好的空机位）
     文件名建议放在与 index.html 同级的 media/ 目录，例如 'media/M-01.mp4'
     清单见 media_manifest.md
     --------------------------------------------------------- */
  const MEDIA = {
    'M-00': '', 'M-01': '',
    'M-T1': '', 'M-T2': '', 'M-T3': '', 'M-T4': '', 'M-T5': '',
    'A1': '', 'A2': '',
    'G-01': '', 'G-T1': '', 'G-T2': '', 'G-T3': '', 'G-T4': '', 'G-T5': '',
    'D-01': '', 'D-T1': '', 'D-T2': '', 'D-T3': '', 'D-T4': '', 'D-T5': '',
    'L-01': '', 'L-T1': '', 'L-T2': '', 'L-T3': '', 'L-T4': '', 'L-T5': '',
  };

  const ALBUMS = [
    {
      id: 'mcd', name: '麦当', en: 'MCDONALD', code: 'CH-01', roman: '01',
      accent: '#f0b45f', accent2: '#87e0f4', soon: false,
      eyebrow: '主角 · 风筝与航线',
      fields: {
        name: '麦当',
        age: '示例：17（待订）',
        bg: '一段可替换的背影描述位（示例）。两行以内，用来看排版密度。',
        origin: '身世与来历说明位（示例）',
        faction: '所属势力 / 阵营名称位（示例）',
        tag: '给我，高高的飞起来啊。（示例）',
      },
      nodes: [
        { title: '启程的早晨（示例）', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
      ],
    },
    {
      id: 'gudong', name: '咕咚', en: 'GUDONG', code: 'CH-02', roman: '02',
      accent: '#87e0f4', accent2: '#a99cf5', soon: false,
      eyebrow: '第二话 · 国王登场',
      fields: {
        name: '咕咚',
        age: '待回填',
        bg: '一段可替换的背景描述位（示例）',
        origin: '身世与来历说明位（示例）',
        faction: '待回填',
        tag: '叫我国王，咕咚国王。（示例）',
      },
      nodes: [
        { title: '兔子出场（示例）', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
      ],
    },
    {
      id: 'diya', name: '笛亚', en: 'DIYA', code: 'CH-03', roman: '03',
      accent: '#a99cf5', accent2: '#87e0f4', soon: true,
      eyebrow: '第三话 · 即将登场',
      fields: {
        name: '笛亚', age: '待回填', bg: '资料未公布', origin: '资料未公布',
        faction: '资料未公布', tag: '一句话标签 · 待填',
      },
      nodes: [
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
      ],
    },
    {
      id: 'milon', name: '米龙', en: 'MILON', code: 'CH-04', roman: '04',
      accent: '#e0735a', accent2: '#f0b45f', soon: true,
      eyebrow: '第四话 · 即将登场',
      fields: {
        name: '米龙', age: '待回填', bg: '资料未公布', origin: '资料未公布',
        faction: '资料未公布', tag: '一句话标签 · 待填',
      },
      nodes: [
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
        { title: '故事标题 · 待填', year: '年份位 · 待填' },
      ],
    },
  ];

  /* ---------------------------------------------------------
     专辑模板
     --------------------------------------------------------- */
  function gateMarkup(opt) {
    const cls = opt.cls ? ` ${opt.cls}` : '';
    const id = opt.id;
    return `
      <div class="gate${cls}" data-media="${id}" data-ratio="16:9" data-dur="${opt.meta}"
           data-label="${opt.code} · ${opt.type} · ${opt.meta}" data-src="${MEDIA[id] || ''}">
        <div class="gate__frame">
          <span class="gate__corner tl"></span><span class="gate__corner tr"></span>
          <span class="gate__corner bl"></span><span class="gate__corner br"></span>
          <span class="gate__sweep" aria-hidden="true"></span>
          <div class="gate__ticks" aria-hidden="true"></div>
          <div class="gate__mid">
            <span class="gate__code">${opt.code}</span>
            <span class="gate__type">${opt.type}</span>
            <span class="gate__meta">${opt.meta}</span>
            <span class="gate__note">${opt.note || '空机位 · 待接入官方画面'}</span>
            <span class="gate__standby"><i></i></span>
          </div>
          <div class="gate__foot"><span>${id}.MP4</span><span>AWAITING FOOTAGE</span></div>
          ${opt.soon ? '<span class="gate__soon">即将登场 · SOON</span>' : ''}
        </div>
        <div class="gate__media"></div>
      </div>`;
  }

  /* 有 data-src 才挂视频；没素材时保留设计好的空机位 */
  function hydrateGates(root) {
    (root || document).querySelectorAll('.gate[data-src]').forEach((gate) => {
      const src = gate.dataset.src;
      if (!src || gate.dataset.hydrated === '1') return;
      gate.dataset.hydrated = '1';
      const box = gate.querySelector('.gate__media');
      if (!box) return;
      const v = document.createElement('video');
      v.src = src;
      v.autoplay = true;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('preload', 'metadata');
      v.addEventListener('error', () => {
        gate.classList.remove('has-media');
        gate.dataset.hydrated = '';
        box.innerHTML = '';
      });
      box.appendChild(v);
      gate.classList.add('has-media');
    });
  }

  function albumMarkup(a, idx) {
    const p = a.id;
    const prefix = a.id === 'mcd' ? 'M' : a.id === 'gudong' ? 'G' : a.id === 'diya' ? 'D' : 'L';
    const fields = FIELDS.map((f) => {
      const slot = `${p}_${f.key}`;
      const value = a.fields[f.key] || '待回填';
      return `
        <div class="field${f.cls ? ' ' + f.cls : ''}">
          <dt>${f.label}<i>${slot}</i></dt>
          <dd><span class="slot" data-slot="${slot}">${value}</span></dd>
        </div>`;
    }).join('');

    const nodes = a.nodes.map((n, i) => `
      <button class="tl-node" type="button" data-node="${i}" style="--i:${i}">
        <span class="tl-node-year">${String(i + 1).padStart(2, '0')} · ${n.year}</span>
        <span class="tl-dot" aria-hidden="true"></span>
        <span class="tl-node-title" data-slot="${p}_t${i + 1}_title">${n.title}</span>
      </button>`).join('');

    const next = ALBUMS[(idx + 1) % ALBUMS.length];

    return `
      <div class="album-inner">
        <div class="hero">
          <div class="hero-rail">
            <span class="hero-code">${a.code}</span>
            <span class="hero-rule"></span>
            <span class="hero-vlabel">CHARACTER FILE</span>
          </div>

          ${gateMarkup({
            id: `${prefix}-01`, code: `位 ${prefix}-01`, type: '动作特写 · ACTION CLOSE-UP',
            meta: '16:9 · 3–6s', cls: 'gate--hero', soon: a.soon,
          })}

          <div class="hero-ghost" aria-hidden="true">${a.roman}</div>

          <div class="hero-title">
            <p class="hero-eyebrow" data-slot="${p}_eyebrow">${a.eyebrow}</p>
            <h1 class="hero-name" data-slot="${p}_name">${a.name}</h1>
            <p class="hero-en">${a.en} · CHARACTER ALBUM ${a.roman}</p>
            ${a.soon ? '<span class="soon-note"><i></i>结构已就位 · 资料待公布 / COMING SOON</span>' : ''}
          </div>

          <aside class="dossier" aria-label="${a.name} 档案">
            <div class="dossier-head"><span>档案 / DOSSIER</span><em>${a.roman} / 04</em></div>
            <div class="dossier-body">
              <dl>${fields}</dl>
            </div>
            <div class="dossier-foot"><span>资料位可整体替换</span><em>${a.soon ? 'COMING SOON' : 'SAMPLE VALUES'}</em></div>
          </aside>

          <div class="hero-scroll"><i></i><span>沿时间线向下 / TIMELINE</span></div>
        </div>

        <section class="tl" aria-label="${a.name} 时间线">
          <header class="tl-head">
            <p class="tl-kicker">时间线 / TIMELINE</p>
            <h2 class="tl-title" data-slot="${p}_tl_title">经典故事</h2>
            <p class="tl-note">至少五段节点 · 点击节点展开文字与片段位</p>
            <div class="tl-legend"><i></i><span>曲线随滚动描出 · 节点依次亮起</span></div>
          </header>
          <div class="tl-stage">
            <svg class="tl-path" aria-hidden="true">
              <defs>
                <linearGradient id="tlGrad-${a.id}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="rgba(135,224,244,.7)"></stop>
                  <stop offset="1" stop-color="rgba(240,180,95,.9)"></stop>
                </linearGradient>
              </defs>
              <path class="tl-ghost"></path>
              <path class="tl-live" stroke="url(#tlGrad-${a.id})"></path>
            </svg>
            ${nodes}
          </div>
        </section>

        <footer class="album-foot">
          <div>
            <strong data-slot="${p}_foot">${a.name} · 人物专辑</strong>
            <span>文字字段均为可替换占位 · 媒体位留空</span>
          </div>
          <div>
            <span class="next-cue">${idx < ALBUMS.length - 1 ? `下一位 · ${next.name} →` : '← 返回 麦当'}</span>
          </div>
        </footer>
      </div>`;
  }

  const deck = $('#deck');
  ALBUMS.forEach((a, i) => {
    const el = document.createElement('section');
    el.className = 'album' + (a.soon ? ' is-soon' : '');
    el.dataset.id = a.id;
    el.style.setProperty('--accent', a.accent);
    el.style.setProperty('--accent-2', a.accent2);
    el.innerHTML = albumMarkup(a, i);
    deck.appendChild(el);
  });

  const albumEls = $$('.album', deck);

  /* ---------------------------------------------------------
     时间线布局 / 展开卡片
     --------------------------------------------------------- */
  const moment = $('#moment');
  const momentIdx = $('#momentIdx');
  const momentTitle = $('#momentTitle');
  const momentBody = $('#momentBody');
  const momentGate = $('#momentGate');
  const momentYear = $('#momentYear');
  let activeNode = null;

  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || pts[i + 1];
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}`;
      d += ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}`;
      d += ` ${p2.x} ${p2.y}`;
    }
    return d;
  }

  function layoutTimeline(album) {
    const stage = $('.tl-stage', album);
    if (!stage) return;
    const nodes = $$('.tl-node', stage);
    const W = stage.clientWidth;
    if (!W) return;
    const mobile = W < 640;
    const pad = mobile ? 76 : 122;
    const amp = Math.min(W * (mobile ? 0.29 : 0.23), mobile ? 96 : 246);
    const gap = mobile ? 126 : 162;
    const top = mobile ? 54 : 72;

    const pts = nodes.map((n, i) => {
      let x = W / 2 + amp * Math.sin(i * 1.62 + 0.45);
      x = Math.max(pad, Math.min(W - pad, x));
      return { x, y: top + i * gap };
    });
    nodes.forEach((n, i) => {
      n.style.left = pts[i].x + 'px';
      n.style.top = pts[i].y + 'px';
    });
    stage.style.height = (top + gap * (nodes.length - 1) + (mobile ? 96 : 128)) + 'px';

    const svg = $('.tl-path', stage);
    const ghost = $('.tl-ghost', stage);
    const live = $('.tl-live', stage);
    const d = smoothPath(pts);
    svg.setAttribute('viewBox', `0 0 ${W} ${parseFloat(stage.style.height)}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', parseFloat(stage.style.height));
    ghost.setAttribute('d', d);
    live.setAttribute('d', d);
    live.style.setProperty('--len', live.getTotalLength());
  }

  function initAlbum(album) {
    if (album.dataset.init === '1') return;
    album.dataset.init = '1';
    layoutTimeline(album);
    const stage = $('.tl-stage', album);
    if (!stage) return;
    if (RM.matches) { stage.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        stage.classList.add('is-in');
        io.disconnect();
      });
    }, { root: album, threshold: 0.26, rootMargin: '0px 0px -6% 0px' });
    io.observe(stage);
  }

  function closeMoment() {
    if (!moment.classList.contains('is-on')) return;
    moment.classList.remove('is-on');
    moment.setAttribute('aria-hidden', 'true');
    if (activeNode) activeNode.classList.remove('is-active');
    activeNode = null;
  }

  function openMoment(album, idx) {
    const a = ALBUMS.find((x) => x.id === album.dataset.id);
    if (!a) return;
    const n = a.nodes[idx];
    if (!n) return;
    const p = a.id;
    const prefix = p === 'mcd' ? 'M' : p === 'gudong' ? 'G' : p === 'diya' ? 'D' : 'L';
    const code = `${prefix}-T${idx + 1}`;

    momentIdx.textContent = `节点 ${String(idx + 1).padStart(2, '0')} / 05 · ${a.name}`;
    momentTitle.textContent = n.title;
    momentTitle.dataset.slot = `${p}_t${idx + 1}_title`;
    momentBody.textContent = BODY_SAMPLE + `（节点 ${String(idx + 1).padStart(2, '0')}）`;
    momentBody.dataset.slot = `${p}_t${idx + 1}_body`;
    momentYear.textContent = n.year;
    momentGate.innerHTML = gateMarkup({
      id: code, code: `位 ${code}`, type: '片段 · STORY CUT',
      meta: '16:9 · 6–12s', note: '空机位 · 待接入片段', cls: 'gate--moment',
    });
    hydrateGates(momentGate);
    moment.classList.add('is-on');
    moment.setAttribute('aria-hidden', 'false');

    const nodes = $$('.tl-node', $('.tl-stage', album));
    if (activeNode) activeNode.classList.remove('is-active');
    activeNode = nodes[idx] || null;
    if (activeNode) activeNode.classList.add('is-active');
  }

  deck.addEventListener('click', (e) => {
    const node = e.target.closest('.tl-node');
    if (!node) return;
    const album = node.closest('.album');
    openMoment(album, parseInt(node.dataset.node, 10));
  });

  $('#momentClose').addEventListener('click', closeMoment);
  document.addEventListener('click', (e) => {
    if (!moment.classList.contains('is-on')) return;
    if (e.target.closest('#moment') || e.target.closest('.tl-node')) return;
    closeMoment();
  });

  /* ---------------------------------------------------------
     音频位 / 中间提示
     --------------------------------------------------------- */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  document.addEventListener('click', (e) => {
    const slot = e.target.closest('.voiceslot');
    if (!slot) return;
    const id = slot.dataset.audio;
    const src = slot.dataset.src;
    if (!src) { toast(`音频位 ${id} · 待接入素材`); return; }
    const audio = new Audio(src);
    audio.play().then(() => {
      slot.classList.add('is-playing');
      audio.addEventListener('ended', () => slot.classList.remove('is-playing'));
    }).catch(() => toast(`音频位 ${id} · 播放失败`));
  });

  /* ---------------------------------------------------------
     开篇 · Canvas
     --------------------------------------------------------- */
  const introEl = $('#intro');
  const canvas = $('#introCanvas');
  const ctx = canvas.getContext('2d');
  const cueEl = $('#clickCue');
  const hitEl = $('#kiteHit');
  const bubbleEl = $('#mcdBubble');
  const filmEl = $('#filmStage');
  const introTc = $('#introTc');
  const introBar = $('#introBar');
  const shotNoEl = $('#shotNo');
  const shotNameEl = $('#shotName');
  const skipBtn = $('#skipIntro');

  const INTRO = {
    t: 0, playing: true, ended: false, clicked: false, clickT: 0,
    filmShown: false, raf: 0, last: 0, W: 0, H: 0, dpr: 1,
    pose: null, cueVisible: false, started: false,
  };

  const SHOT1_END = 4.4;
  const SHOT2_END = 9.55;
  const CUE_AT = 9.65;

  const rnd = (() => {
    let s = 20261103;
    return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  })();
  const STARS = Array.from({ length: 170 }, () => ({
    x: rnd(), y: rnd() * 0.82, r: 0.35 + rnd() * 1.3, a: 0.18 + rnd() * 0.55, z: 0.2 + rnd() * 0.9,
  }));

  function resizeIntro() {
    INTRO.dpr = Math.min(window.devicePixelRatio || 1, 2);
    INTRO.W = introEl.clientWidth || window.innerWidth;
    INTRO.H = introEl.clientHeight || window.innerHeight;
    canvas.width = Math.round(INTRO.W * INTRO.dpr);
    canvas.height = Math.round(INTRO.H * INTRO.dpr);
    canvas.style.width = INTRO.W + 'px';
    canvas.style.height = INTRO.H + 'px';
    ctx.setTransform(INTRO.dpr, 0, 0, INTRO.dpr, 0, 0);
  }

  function poseAt(t) {
    const W = INTRO.W, H = INTRO.H;
    if (!W || !H) return { x: 0, y: 0, scale: 1, yaw: 0, cosY: 1, camX: 0, rot: 0 };
    const push = clamp(t / 3.8, 0, 1);
    let scale = 0.26 + 1.19 * push;
    const yaw = smooth(2.1, 4.2, t) * 1.22;
    const lat = smooth(2.1, 4.3, t);
    const camX = -0.13 * W * lat;
    let x = W * 0.5 + 0.045 * W * lat;
    let y = H * 0.46;

    if (t > 4.3) {
      const u = t - 4.3;
      const bumps = [[0.55, 1.5, -0.15], [1.7, 2.55, 0.12], [2.75, 3.65, -0.18]];
      bumps.forEach(([a, b, amp]) => {
        if (u > a && u < b) y += amp * H * Math.sin(Math.PI * (u - a) / (b - a));
      });
      x += 0.115 * W * smooth(0, 4.8, u);
      const d = smooth(3.5, 4.95, u);
      const targetY = H - (150 * (scale + 0.17) + 40);
      y = y * (1 - d) + targetY * d;
      scale += 0.17 * smooth(2.2, 4.95, u);
    }

    y += Math.sin(t * 1.35) * 2.6;

    let rot = 0;
    if (t > 4.3) {
      const y2 = poseYOnly(t + 0.045);
      rot = clamp(-(y2 - y) / 34, -0.26, 0.26) - 0.06;
    } else {
      rot = Math.sin(t * 0.9) * 0.02;
    }

    const cosY = Math.max(0.32, Math.cos(yaw));
    return { x, y, scale, yaw, cosY, camX, rot, h: 300 * scale, w: 210 * scale };
  }

  function poseYOnly(t) {
    const W = INTRO.W, H = INTRO.H;
    const push = clamp(t / 3.8, 0, 1);
    const scale = 0.26 + 1.19 * push + (t > 4.3 ? 0.17 * smooth(2.2, 4.95, t - 4.3) : 0);
    let y = H * 0.46;
    if (t > 4.3) {
      const u = t - 4.3;
      const bumps = [[0.55, 1.5, -0.15], [1.7, 2.55, 0.12], [2.75, 3.65, -0.18]];
      bumps.forEach(([a, b, amp]) => {
        if (u > a && u < b) y += amp * H * Math.sin(Math.PI * (u - a) / (b - a));
      });
      const d = smooth(3.5, 4.95, u);
      const targetY = H - (150 * scale + 40);
      y = y * (1 - d) + targetY * d;
    }
    y += Math.sin(t * 1.35) * 2.6;
    return y;
  }

  function flatOffset(t) {
    const W = INTRO.W;
    let o = 0;
    const seg = (a, b, v) => { if (t > a) o += v * W * (Math.min(t, b) - a); };
    seg(4.3, 4.95, 0.09);
    seg(4.95, 7.95, 0.58);
    seg(7.95, 9.35, 0.22);
    if (t > 9.35) o += 0.01 * W * (t - 9.35);
    return o;
  }

  function drawSpace(t, fade, pose) {
    const W = INTRO.W, H = INTRO.H;
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;

    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#04060b');
    base.addColorStop(0.55, '#070c14');
    base.addColorStop(1, '#03050a');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    const neb = ctx.createRadialGradient(W * 0.2 - pose.camX * 0.5, H * 0.24, 0, W * 0.2, H * 0.24, H * 0.72);
    neb.addColorStop(0, 'rgba(80,150,190,.14)');
    neb.addColorStop(1, 'rgba(5,7,11,0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, W, H);

    const neb2 = ctx.createRadialGradient(W * 0.82, H * 0.82, 0, W * 0.82, H * 0.82, H * 0.55);
    neb2.addColorStop(0, 'rgba(200,140,70,.09)');
    neb2.addColorStop(1, 'rgba(5,7,11,0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, W, H);

    STARS.forEach((s) => {
      const px = s.x * W + pose.camX * s.z * 0.9;
      const py = s.y * H;
      const a = s.a * (0.6 + 0.4 * Math.sin(t * 1.4 + s.x * 12));
      ctx.fillStyle = `rgba(210,232,255,${a})`;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 远山 / 云脊，逐层视差
    const ridges = [
      { y: 0.55, amp: 0.045, col: 'rgba(9,15,24,.85)', speed: 0.55 },
      { y: 0.68, amp: 0.06, col: 'rgba(7,11,18,.92)', speed: 0.9 },
      { y: 0.8, amp: 0.075, col: 'rgba(5,8,13,.96)', speed: 1.25 },
    ];
    ridges.forEach((r, idx) => {
      const shift = pose.camX * r.speed;
      ctx.beginPath();
      ctx.moveTo(-40, H);
      for (let x = -40; x <= W + 40; x += 24) {
        const yy = H * r.y + Math.sin((x + shift) * 0.0042 + idx * 1.6) * H * r.amp
          + Math.sin((x + shift) * 0.011 + idx) * H * 0.016;
        ctx.lineTo(x, yy);
      }
      ctx.lineTo(W + 40, H);
      ctx.closePath();
      ctx.fillStyle = r.col;
      ctx.fill();
      ctx.strokeStyle = 'rgba(135,224,244,.09)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let x = -40; x <= W + 40; x += 24) {
        const yy = H * r.y + Math.sin((x + shift) * 0.0042 + idx * 1.6) * H * r.amp;
        if (x === -40) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    });

    // 体积光（柔和的斜向渐变，避免硬边）
    const beam = ctx.createLinearGradient(-W * 0.1, -H * 0.1, W * 0.55, H * 0.75);
    beam.addColorStop(0, 'rgba(200,236,255,.09)');
    beam.addColorStop(0.34, 'rgba(135,224,244,.04)');
    beam.addColorStop(1, 'rgba(135,224,244,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function drawFlat(t, fade, pose, blur) {
    if (fade <= 0) return;
    const W = INTRO.W, H = INTRO.H;
    const off = flatOffset(t);
    ctx.save();
    ctx.globalAlpha = fade;
    if (blur > 0.4) ctx.filter = `blur(${blur}px)`;

    ctx.fillStyle = '#05090f';
    ctx.fillRect(0, 0, W, H);

    const bands = ['#08131d', '#091722', '#0a1a26', '#0c1f2b', '#0a1822'];
    const bandTop = H * 0.16;
    const bandH = (H * 0.74) / bands.length;
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, bandTop + i * bandH, W, bandH + 1);
      ctx.fillStyle = 'rgba(135,224,244,.08)';
      ctx.fillRect(0, bandTop + i * bandH, W, 1);
    });

    // 远处扁平星球（固定，不随卷轴）
    const cx = W * 0.79, cy = H * 0.34, cr = H * 0.17;
    const disc = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, 0, cx, cy, cr);
    disc.addColorStop(0, 'rgba(190,240,255,.16)');
    disc.addColorStop(0.72, 'rgba(120,200,230,.06)');
    disc.addColorStop(1, 'rgba(120,200,230,0)');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(135,224,244,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();

    // 速度线（横版平面感）
    const streaks = 16;
    for (let i = 0; i < streaks; i++) {
      const sy = H * (0.2 + ((i * 137) % 620) / 1000);
      const len = 70 + ((i * 91) % 190);
      const sx = W - ((off * (1.2 + (i % 3) * 0.25) + i * 143) % (W + len));
      ctx.strokeStyle = i % 4 === 0 ? 'rgba(240,180,95,.26)' : 'rgba(190,230,255,.2)';
      ctx.lineWidth = i % 5 === 0 ? 1.6 : 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len, sy);
      ctx.stroke();
    }

    // 速度线 / 平面卷轴
    ctx.strokeStyle = 'rgba(154,186,220,.07)';
    ctx.lineWidth = 1;
    const spacing = 148;
    const shift = -(off % spacing);
    for (let x = shift; x < W; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, bandTop);
      ctx.lineTo(x, bandTop + bandH * bands.length);
      ctx.stroke();
    }
    // 近景斜切面
    ctx.fillStyle = 'rgba(4,7,11,.85)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.9);
    ctx.lineTo(W, H * 0.88);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240,180,95,.2)';
    ctx.fillRect(0, H * 0.898, W, 1);

    // 侧光
    const side = ctx.createLinearGradient(W, 0, 0, H);
    side.addColorStop(0, 'rgba(240,180,95,.10)');
    side.addColorStop(0.4, 'rgba(240,180,95,.02)');
    side.addColorStop(1, 'rgba(4,7,11,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function drawStringAndTails(t, pose) {
    const H = INTRO.H;
    const tails = pose.y + pose.h * 0.48;
    const sway = 16 + 26 * clamp(Math.abs(pose.rot) / 0.26, 0, 1);
    const speed = t > 4.3 ? 1 : 0.55;

    // 线：从风筝底部长长拖向左下，带弹性摆动
    ctx.save();
    ctx.lineCap = 'round';
    const grad = ctx.createLinearGradient(pose.x, tails, 0, tails + 120);
    grad.addColorStop(0, 'rgba(233,239,248,.55)');
    grad.addColorStop(0.55, 'rgba(200,220,240,.22)');
    grad.addColorStop(1, 'rgba(200,220,240,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    const len = INTRO.W * 1.15;
    for (let i = 0; i <= 44; i++) {
      const u = i / 44;
      const px = pose.x - u * len;
      const py = tails + u * INTRO.H * 0.1
        + Math.sin(u * 6.8 - t * (2.1 * speed)) * sway * u
        + Math.sin(u * 13 + t * 1.1) * 6 * u;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // 尾巴飘带
    ctx.save();
    const tailLen = 96 + 34 * pose.scale;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 22; i++) {
        const u = i / 22;
        const px = pose.x + (k - 1) * 8 * pose.scale + Math.sin(u * 5.4 - t * 2.2 + k * 1.4) * (9 + u * 22) * u;
        const py = tails + u * tailLen;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = k === 0 ? 'rgba(240,180,95,.62)' : k === 1 ? 'rgba(135,224,244,.4)' : 'rgba(233,239,248,.26)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    // 飘带上的小方结
    for (let k = 0; k < 2; k++) {
      const px = pose.x + Math.sin(k * 3 + t * 1.6) * 10;
      const py = tails + tailLen * (0.45 + k * 0.28);
      ctx.fillStyle = 'rgba(240,180,95,.55)';
      ctx.beginPath();
      ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawKiteBody(pose) {
    const { x, y, scale, cosY, rot } = pose;
    const side = smooth(1.05, 1.45, pose.yaw);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale * cosY, scale);

    const W = 210, H = 300;
    const top = -H * 0.5, bot = H * 0.5;
    const midY = H * 0.04;
    const left = -W * 0.5, right = W * 0.5;

    // 面
    const g = ctx.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, 'rgba(135,224,244,.34)');
    g.addColorStop(0.5, 'rgba(233,239,248,.25)');
    g.addColorStop(1, 'rgba(240,180,95,.36)');
    ctx.beginPath();
    ctx.moveTo(0, top); ctx.lineTo(right, midY); ctx.lineTo(0, bot); ctx.lineTo(left, midY);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // 侧化后压暗，形成剪影
    if (side > 0.01) {
      ctx.fillStyle = `rgba(4,7,11,${0.28 + side * 0.58})`;
      ctx.fill();
    }

    // 骨架
    ctx.strokeStyle = `rgba(233,239,248,${0.45 + side * 0.2})`;
    ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, bot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(left, midY); ctx.lineTo(right, midY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, midY); ctx.stroke();

    // 迎光边 / 背光边
    ctx.lineWidth = 2.2;
    const edgeA = ctx.createLinearGradient(0, top, 0, bot);
    edgeA.addColorStop(0, 'rgba(240,180,95,.9)');
    edgeA.addColorStop(0.55, 'rgba(240,180,95,.5)');
    edgeA.addColorStop(1, 'rgba(240,180,95,.15)');
    ctx.strokeStyle = edgeA;
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(right, midY); ctx.lineTo(0, bot); ctx.stroke();
    ctx.strokeStyle = 'rgba(135,224,244,.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(left, midY); ctx.lineTo(0, bot); ctx.stroke();

    // 小内框
    ctx.strokeStyle = 'rgba(233,239,248,.22)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, top * 0.62); ctx.lineTo(right * 0.32, midY); ctx.lineTo(0, bot * 0.62); ctx.lineTo(left * 0.32, midY);
    ctx.closePath(); ctx.stroke();

    // 光晕
    if (side < 0.5) {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.7);
      glow.addColorStop(0, 'rgba(240,180,95,.10)');
      glow.addColorStop(1, 'rgba(240,180,95,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, W * 0.7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  function drawIntro() {
    const W = INTRO.W, H = INTRO.H;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    const t = INTRO.t;
    const pose = poseAt(t);
    INTRO.pose = pose;

    const flat = smooth(2.6, 4.4, t);
    const blur = 10 * smooth(7.35, 9.3, t);

    drawSpace(t, 1 - flat, pose);
    drawFlat(t, flat, pose, blur);

    let pose2 = pose;
    if (INTRO.clicked) {
      const u = clamp((t - INTRO.clickT) / 0.9, 0, 1);
      const lift = u * u * (H * 1.1);
      pose2 = { ...pose, y: pose.y - lift, x: pose.x + u * W * 0.06, rot: pose.rot - u * 0.24, scale: pose.scale * (1 + u * 0.14) };
    }

    ctx.save();
    // 二维飞行的速度残影
    if (t > 4.4 && !INTRO.clicked) {
      for (let k = 1; k <= 2; k++) {
        const past = poseAt(t - k * 0.075);
        ctx.globalAlpha = 0.12 / k;
        drawKiteBody({ ...past, x: pose.x - k * 10, scale: past.scale * 0.96 });
      }
      ctx.globalAlpha = 1;
    }
    drawStringAndTails(t, pose2);
    drawKiteBody(pose2);
    ctx.restore();

    // 压平瞬间的横向切光
    const flash = Math.max(0, 1 - Math.abs(t - 4.35) / 0.5);
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(135,224,244,${0.05 * flash})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(240,180,95,${0.06 * flash})`;
      ctx.fillRect(0, H * 0.47, W, 2);
    }
  }

  function syncIntroDom() {
    const t = INTRO.t;
    const pose = INTRO.pose || poseAt(t);
    const shot = t < SHOT1_END ? 1 : t < SHOT2_END ? 2 : 3;
    const names = { 1: '风筝从远方飞来', 2: '二维侧面的飞行', 3: '提示与点击' };

    if (shotNoEl.dataset.shot !== String(shot)) {
      shotNoEl.dataset.shot = String(shot);
      shotNoEl.textContent = `SHOT 0${shot}`;
      shotNameEl.textContent = names[shot];
    }
    introTc.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t * 10) % 10)}`;
    introBar.style.transform = `scaleX(${clamp(t / 9.9, 0, 1)})`;

    const showCue = t >= CUE_AT && !INTRO.clicked;
    if (showCue !== INTRO.cueVisible) {
      INTRO.cueVisible = showCue;
      cueEl.classList.toggle('is-on', showCue);
      hitEl.classList.toggle('is-on', showCue);
    }
    if (showCue) {
      const shownW = Math.max(40, pose.w * pose.cosY);
      const cx = pose.x - shownW * 0.5 - 92;
      const cy = pose.y - 18;
      cueEl.style.left = cx + 'px';
      cueEl.style.top = cy + 'px';
      const hitW = Math.max(110, shownW * 1.5);
      const hitH = Math.max(140, pose.h * 0.95);
      hitEl.style.width = hitW + 'px';
      hitEl.style.height = hitH + 'px';
      hitEl.style.left = (pose.x + 6) + 'px';
      hitEl.style.top = (pose.y + 6) + 'px';
    }

    if (INTRO.clicked && !INTRO.filmShown && t >= INTRO.clickT + 0.86) {
      INTRO.filmShown = true;
      filmEl.classList.add('is-on');
    }
    if (INTRO.filmShown && t >= INTRO.clickT + 7.0) endIntro(false);
  }

  function introTick(now) {
    if (INTRO.ended) return;
    if (!INTRO.last) INTRO.last = now;
    const dt = Math.min(0.05, (now - INTRO.last) / 1000);
    INTRO.last = now;
    if (INTRO.playing) INTRO.t += dt;
    drawIntro();
    syncIntroDom();
    INTRO.raf = requestAnimationFrame(introTick);
  }

  function startIntro() {
    INTRO.started = true;
    INTRO.ended = false;
    INTRO.clicked = false;
    INTRO.filmShown = false;
    INTRO.playing = true;
    INTRO.t = 0;
    INTRO.last = 0;
    introEl.style.display = '';
    introEl.classList.remove('is-out');
    bubbleEl.classList.remove('is-on');
    filmEl.classList.remove('is-on');
    introEl.classList.remove('is-cut');
    cueEl.classList.remove('is-on');
    hitEl.classList.remove('is-on');
    document.body.classList.add('is-intro');
    document.body.classList.remove('is-album');
    resizeIntro();
    drawIntro();
    syncIntroDom();
    cancelAnimationFrame(INTRO.raf);
    INTRO.raf = requestAnimationFrame(introTick);
  }

  function endIntro(silent) {
    if (INTRO.ended) return;
    INTRO.ended = true;
    INTRO.playing = false;
    cancelAnimationFrame(INTRO.raf);
    introEl.classList.add('is-out');
    document.body.classList.remove('is-intro');
    document.body.classList.add('is-album');
    store.set('starCastIntroSeen', '1');
    if (!state.active) activateAlbum(0, true);
    setTimeout(() => { introEl.style.display = 'none'; }, 700);
    setTimeout(() => { placeKiteAtMooring(true); }, 80);
    if (silent) closeMoment();
  }

  function introClick() {
    if (INTRO.clicked || !INTRO.cueVisible) return;
    INTRO.clicked = true;
    INTRO.clickT = INTRO.t;
    INTRO.cueVisible = false;
    introEl.classList.add('is-cut');
    cueEl.classList.remove('is-on');
    hitEl.classList.remove('is-on');
    const p = INTRO.pose;
    const W = INTRO.W;
    const bw = Math.min(440, W * 0.84);
    const shownW = Math.max(36, p.w * p.cosY);
    let left = p.x - shownW * 0.5 - bw - 26;
    let top = p.y;
    let ty = '-50%';
    let side = true;
    if (left < 16) {
      // 窄屏放风筝上方，避免盖住本体
      left = clamp(p.x - bw * 0.5, 16, W - bw - 16);
      top = Math.max(150, p.y - p.h * 0.55 - 16);
      ty = '-100%';
      side = false;
    }
    bubbleEl.style.setProperty('--bx', left + 'px');
    bubbleEl.style.setProperty('--by', top + 'px');
    bubbleEl.style.setProperty('--ty', ty);
    bubbleEl.classList.toggle('is-left', side);
    bubbleEl.classList.add('is-on');
    if (!INTRO.playing) INTRO.playing = true;
  }

  hitEl.addEventListener('click', (e) => { e.stopPropagation(); introClick(); });
  canvas.addEventListener('click', introClick);
  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); endIntro(true); });
  filmEl.addEventListener('click', () => { if (INTRO.filmShown) endIntro(false); });

  /* ---------------------------------------------------------
     专辑切换 / 风筝进度
     --------------------------------------------------------- */
  const kite = $('#kite');
  const kiteCap = $('#kiteCap');
  const groove = $('#groove');
  const grooveTicks = $('#grooveTicks');
  const grooveFill = $('#grooveFill');
  const grooveCount = $('#grooveCount');
  const mooring = $('#mooring');
  const mooringScale = $('#mooringScale');
  const flight = $('#flight');
  const flightPath = $('#flightPath');
  const voices = $('#gudongVoices');

  const state = { current: 0, busy: false, docked: false, active: false, gudongShown: false };
  const GROOVE_POS = [6, 35.4, 64.8, 94.2];

  function buildScales() {
    grooveTicks.innerHTML = ALBUMS.map((a, i) =>
      `<button class="groove-tick" type="button" data-i="${i}" style="left:${GROOVE_POS[i]}%">
        <em>${String(i + 1).padStart(2, '0')}</em><span>${a.name}</span>
      </button>`).join('');
    mooringScale.innerHTML = ALBUMS.map((a, i) =>
      `<li data-i="${i}"><span>${a.name}</span><i></i></li>`).join('');
    grooveCount.textContent = '01 / 04';
  }
  buildScales();

  function updateChrome() {
    const a = ALBUMS[state.current];
    $('#nowCode').textContent = a.code;
    $('#nowName').textContent = a.name;
    $('#nowIndex').textContent = `${String(state.current + 1).padStart(2, '0')} / 04`;
    grooveCount.textContent = `${String(state.current + 1).padStart(2, '0')} / 04`;
    grooveFill.style.width = GROOVE_POS[state.current] + '%';
    $$('.groove-tick', grooveTicks).forEach((b, i) => b.classList.toggle('is-on', i === state.current));
    $$('li', mooringScale).forEach((li, i) => li.classList.toggle('is-on', i === state.current));
    kiteCap.textContent = `${String(state.current + 1).padStart(2, '0')} · ${a.name}`;
  }

  function activateAlbum(i, first) {
    const prev = state.active ? state.current : -1;
    state.active = true;
    state.current = i;
    albumEls.forEach((el, k) => el.classList.toggle('is-active', k === i));
    const el = albumEls[i];
    initAlbum(el);
    if (prev !== i) el.scrollTop = 0;
    updateChrome();
    if (first) setTimeout(() => { el.querySelector('.gate--hero')?.classList.add('is-ready'); }, 40);
  }

  function kiteMooringPos() {
    if (window.innerWidth <= 900) {
      return { x: window.innerWidth - 32, y: window.innerHeight - 54 };
    }
    const li = $$('li', mooringScale)[state.current];
    const r = li.getBoundingClientRect();
    const m = mooring.getBoundingClientRect();
    return { x: m.left - 42, y: r.top + 4 };
  }

  function groovePos(i) {
    const rail = $('.groove-rail', groove).getBoundingClientRect();
    return {
      x: rail.left + rail.width * GROOVE_POS[i] / 100,
      y: rail.top + rail.height / 2 + 42,
    };
  }

  function applyKiteTransform(p, scale, rot) {
    const kw = kite.offsetWidth || 74;
    const kh = kite.offsetHeight || 112;
    kite.style.transform = `translate3d(${p.x - kw / 2}px,${p.y - kh / 2}px,0) rotate(${rot}deg) scale(${scale})`;
  }

  function placeKiteAtMooring(instant) {
    if (state.docked) { parkKiteAtGroove(instant); return; }
    const p = kiteMooringPos();
    kite.classList.add('is-docking');
    if (instant) {
      applyKiteTransform(p, 1, 0);
    } else {
      applyKiteTransform(p, 1, 0);
    }
    void kite.offsetWidth;
    kite.classList.remove('is-docking');
  }

  function parkKiteAtGroove(instant) {
    const p = groovePos(state.current);
    kite.classList.add('is-docking');
    applyKiteTransform(p, 0.78, 0);
    void kite.offsetWidth;
    kite.classList.remove('is-docking');
  }

  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  }

  function showPath(p0, p1, p2, p3) {
    flightPath.setAttribute('d', `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`);
    flight.classList.add('is-on');
  }

  function flyToGroove() {
    return new Promise((resolve) => {
      const W = window.innerWidth, H = window.innerHeight;
      const start = kiteMooringPos();
      const end = groovePos(state.current);
      const p1 = { x: start.x - W * 0.06, y: start.y - H * 0.42 };
      const p2 = { x: end.x + W * 0.18, y: end.y + H * 0.3 };
      showPath(start, p1, p2, end);
      kite.classList.add('is-flying');
      kite.classList.add('is-docking');
      const dur = 700;
      const t0 = performance.now();
      function frame(now) {
        const raw = clamp((now - t0) / dur, 0, 1);
        const u = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const p = bezier(u, start, p1, p2, end);
        const p2u = bezier(Math.min(1, u + 0.02), start, p1, p2, end);
        const dx = p2u.x - p.x, dy = p2u.y - p.y;
        const rot = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -22, 22);
        applyKiteTransform(p, 0.92, rot);
        if (raw < 1) requestAnimationFrame(frame);
        else {
          kite.classList.remove('is-docking');
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function slideKiteTo(i) {
    return new Promise((resolve) => {
      const p = groovePos(i);
      kite.style.transition = 'transform 520ms cubic-bezier(.22,.61,.36,1)';
      applyKiteTransform(p, 0.78, -1);
      setTimeout(() => { kite.style.transition = ''; resolve(); }, 540);
    });
  }

  function showGudong(n) {
    const b = n === 1 ? $('.vbubble--1', voices) : $('.vbubble--2', voices);
    if (b) {
      b.classList.add('is-on');
      setTimeout(() => b.classList.remove('is-on'), 3000);
    }
  }

  async function goToAlbum(target) {
    if (!state.active || state.busy || target === state.current) return;
    if (target < 0 || target >= ALBUMS.length) return;
    state.busy = true;
    closeMoment();

    const first = !state.docked;
    if (first) {
      state.docked = true;
      groove.classList.add('is-on');
      document.body.classList.add('is-docked');
      if (target === 1 && !state.gudongShown) {
        state.gudongShown = true;
        setTimeout(() => showGudong(1), 100);
        setTimeout(() => showGudong(2), 1000);
      }
      await flyToGroove();
      flight.classList.remove('is-on');
      kite.classList.remove('is-flying');
      activateAlbum(target);
      grooveFill.style.width = GROOVE_POS[target] + '%';
      await slideKiteTo(target);
    } else {
      kite.classList.add('is-docking');
      applyKiteTransform(groovePos(state.current), 0.84, -2);
      void kite.offsetWidth;
      kite.classList.remove('is-docking');
      await wait(160);
      kite.classList.add('is-docking');
      applyKiteTransform(groovePos(state.current), 0.78, 0);
      void kite.offsetWidth;
      kite.classList.remove('is-docking');
      if (target === 1 && !state.gudongShown) {
        state.gudongShown = true;
        setTimeout(() => showGudong(1), 120);
        setTimeout(() => showGudong(2), 1000);
      }
      activateAlbum(target);
      grooveFill.style.width = GROOVE_POS[target] + '%';
      await slideKiteTo(target);
    }

    if (target !== 1) {
      $('.vbubble--1', voices)?.classList.remove('is-on');
      $('.vbubble--2', voices)?.classList.remove('is-on');
    } else {
      // 落位后收起台词，别压在专辑上
      setTimeout(() => {
        $('.vbubble--1', voices)?.classList.remove('is-on');
        $('.vbubble--2', voices)?.classList.remove('is-on');
      }, 700);
    }
    state.busy = false;
  }

  kite.addEventListener('click', () => {
    if (!state.active || state.busy) return;
    kite.classList.add('is-pressed');
    setTimeout(() => kite.classList.remove('is-pressed'), 220);
    const next = (state.current + 1) % ALBUMS.length;
    goToAlbum(next);
  });
  kite.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const next = (state.current + 1) % ALBUMS.length;
      goToAlbum(next);
    }
  });

  grooveTicks.addEventListener('click', (e) => {
    const b = e.target.closest('.groove-tick');
    if (!b) return;
    goToAlbum(parseInt(b.dataset.i, 10));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!INTRO.ended) { endIntro(true); return; }
      if (moment.classList.contains('is-on')) { closeMoment(); return; }
    }
    if (!INTRO.ended) {
      if (INTRO.filmShown && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        endIntro(false);
      }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); goToAlbum((state.current + 1) % ALBUMS.length); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goToAlbum((state.current - 1 + ALBUMS.length) % ALBUMS.length); }
  });

  $('#replayIntro').addEventListener('click', () => {
    if (RM.matches) { toast('已开启减少动效：开篇动画省略'); return; }
    closeMoment();
    state.active = false;
    state.busy = false;
    state.current = 0;
    albumEls.forEach((el) => el.classList.remove('is-active'));
    if (state.docked) {
      state.docked = false;
      groove.classList.remove('is-on');
      document.body.classList.remove('is-docked');
      $('#gudongVoices').querySelectorAll('.vbubble').forEach((b) => b.classList.remove('is-on'));
    }
    startIntro();
  });

  window.addEventListener('resize', () => {
    if (!INTRO.ended) resizeIntro();
    albumEls.forEach((el) => { if (el.dataset.init === '1') layoutTimeline(el); });
    if (state.active && document.body.classList.contains('is-album')) {
      if (state.docked) parkKiteAtGroove(true); else placeKiteAtMooring(true);
    }
  });

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */
  const qs = new URLSearchParams(location.search);
  const mode = qs.get('intro');
  const seen = store.get('starCastIntroSeen');

  albumEls.forEach((el) => { if (el.dataset.init !== '1') layoutTimeline(el); });
  $$('[data-media]', document).forEach((g) => {
    if (!g.dataset.src) g.dataset.src = MEDIA[g.dataset.media] || '';
  });
  $$('[data-audio]', document).forEach((s) => {
    s.dataset.src = MEDIA[s.dataset.audio] || '';
  });
  hydrateGates(document);

  if (mode === 'off' || (mode !== '1' && seen) || RM.matches) {
    // 直接进入专辑
    introEl.style.display = 'none';
    INTRO.ended = true;
    document.body.classList.remove('is-intro');
    document.body.classList.add('is-album');
    activateAlbum(0, true);
    setTimeout(() => { placeKiteAtMooring(true); }, 60);
  } else {
    startIntro();
  }

  window.__starCast = {
    seek(t) { INTRO.t = t; INTRO.playing = false; drawIntro(); syncIntroDom(); },
    play() { INTRO.playing = true; },
    pause() { INTRO.playing = false; },
    skip() { endIntro(true); },
    switchTo(i) { goToAlbum(i); },
    state() { return { ...state, intro: { t: INTRO.t, clicked: INTRO.clicked, ended: INTRO.ended } }; },
  };
})();
