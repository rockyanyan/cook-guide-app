/* 做饭指南 —— 离线菜谱应用 */
(function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const vibrate = (ms) => {
    try { if (window.Bridge && Bridge.vibrate) { Bridge.vibrate(ms); return; } } catch (e) {}
    if (navigator.vibrate) navigator.vibrate(ms);
  };
  const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const CAT_EMOJI = { meat_dish: '🍖', vegetable_dish: '🥬', aquatic: '🦐', soup: '🍲', staple: '🍚', breakfast: '🥣', dessert: '🍰', drink: '🥤', condiment: '🧂', 'semi-finished': '🥟' };

  /* ---------------- 状态 ---------------- */
  let DB = null, ALL = [], BYID = {};
  const state = {
    tab: 'home',
    fav: new Set(store.get('cook.fav', [])),
    hist: store.get('cook.hist', []),
    theme: store.get('cook.theme', 'system'),
    fs: store.get('cook.fs', 1),
    lib: { cat: 'all', sort: 'default', q: '' },
    favTab: 'fav'
  };

  function applyTheme() {
    const q = new URLSearchParams(location.search);
    const pref = q.get('theme');
    const t = pref || state.theme;
    const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    try { if (window.Bridge && Bridge.setTheme) Bridge.setTheme(dark); } catch (e) {}
    document.documentElement.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', dark ? '#100f0e' : '#fbf7f2');
  }
  function applyFs() { document.documentElement.style.setProperty('--fs', state.fs); }

  /* ---------------- 图标 ---------------- */
  const ICON = {
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19z"/><path d="M9.5 20.6v-6h5v6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.5H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 19.5V5.5"/><path d="M9 8h6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3.4C19.5 15.3 12 20 12 20z"/></svg>',
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.4s-8-5-8-10.3A4.8 4.8 0 0 1 12 6.7a4.8 4.8 0 0 1 8 3.4c0 5.3-8 10.3-8 10.3z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20c.7-4 3.7-6 7.2-6s6.5 2 7.2 6"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    fire: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2s.8 3.2-1.6 5.4C9 9.6 7 11.3 7 14.2A5 5 0 0 0 17 15c0-2-.9-3.4-1.8-4.6-.4 1.2-1.2 1.9-2 1.7 1-2.8-.2-7.6-.2-10.1z"/></svg>',
    star: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.5 5.6 6 .7-4.5 4.1 1.2 5.9L12 16.4 6.8 19.3 8 13.4 3.5 9.3l6-.7z"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    timer: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.6l2.2 1.4M9 3h6M12 3v3"/></svg>',
    play: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>'
  };

  /* ---------------- 渲染：通用 ---------------- */
  function ph(r) {
    const idx = Object.keys(CAT_EMOJI).indexOf(r.cat);
    return `<div class="ph t${(idx < 0 ? 0 : idx) % 5}">${CAT_EMOJI[r.cat] || '🍳'}</div>`;
  }
  function thumb(r) {
    return r.img ? `<img src="img/${r.img}.jpg" alt="${esc(r.name)}" loading="lazy" onerror="imgFallback(this)">` : ph(r);
  }
  window.imgFallback = function (el) {
    const p = el.parentNode;
    el.remove();
    if (p && !p.querySelector('.ph')) {
      const d = document.createElement('div');
      d.className = 'ph t' + (el.dataset.t || 0);
      d.textContent = '🍳';
      p.appendChild(d);
    }
  };
  const metaLine = (r) => {
    const bits = [];
    if (r.diff) bits.push(`<span>${'★'.repeat(r.diff)}${'☆'.repeat(Math.max(0, 5 - r.diff))}</span>`);
    if (r.kcal) bits.push(`<span>${r.kcal} 大卡</span>`);
    if (r.time) bits.push(`<span>${esc(r.time)}</span>`);
    return bits.join('<span style="opacity:.35">·</span>');
  };
  const catLabel = (k) => (DB.cats.find((c) => c.key === k) || {}).label || '';

  function rowHTML(r) {
    return `<div class="row" data-id="${r.id}">
      <div class="thumb">${thumb(r)}</div>
      <div class="info">
        <div class="nm">${esc(r.name)}</div>
        <div class="mt">${metaLine(r)}</div>
      </div>
      <div class="go">${ICON.chev}</div>
    </div>`;
  }
  function cardHTML(r) {
    return `<div class="dish-card" data-id="${r.id}">
      <div class="thumb">${thumb(r)}</div>
      <div class="body">
        <div class="nm">${esc(r.name)}</div>
        <div class="mt">${metaLine(r)}</div>
      </div>
    </div>`;
  }
  function miniHTML(r) {
    return `<div class="mini-card" data-id="${r.id}">
      <div class="thumb">${thumb(r)}</div>
      <div class="nm">${esc(r.name)}</div>
      <div class="mt">${metaLine(r)}</div>
    </div>`;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('on'), 1700);
  }

  /* ---------------- 随机（按日期种子） ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailyPick(n) {
    const rnd = mulberry32(todayKey());
    const pool = ALL.filter((r) => r.img);
    const out = [];
    const used = new Set();
    while (out.length < n && used.size < pool.length) {
      const i = Math.floor(rnd() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      out.push(pool[i]);
    }
    return out;
  }

  /* ---------------- 发现页 ---------------- */
  function renderHome() {
    const total = ALL.length;
    const daily = dailyPick(4);
    const easy = ALL.filter((r) => r.diff > 0 && r.diff <= 2 && r.img).slice(0, 12);
    const light = ALL.filter((r) => r.kcal > 0 && r.kcal <= 300).sort((a, b) => a.kcal - b.kcal).slice(0, 12);
    const hour = new Date().getHours();
    const greet = hour < 10 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

    $('#view').innerHTML = `
    <div class="page">
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark">🍳</div>
          <div>
            <h1>${greet}，做饭吧</h1>
            <div class="sub">${total} 道家常菜 · 完全离线</div>
          </div>
        </div>
        <button class="searchbar" id="homeSearch">${ICON.search}<span>搜菜名、食材，例如「土豆」</span></button>
      </div>

      <div class="hero-pick" id="randomBtn">
        <div>
          <div class="t1">不知道吃什么？</div>
          <div class="t2">让我帮你从 ${total} 道菜里挑一道</div>
        </div>
        <div class="dice">🎲</div>
      </div>

      <div class="quick-row">
        <button class="quick" id="qFridge"><span class="emo">🧊</span>冰箱里有什么</button>
        <button class="quick" id="qEasy"><span class="emo">🌱</span>新手友好</button>
      </div>

      <div class="sec">
        <div class="sec-head"><h2>按分类找</h2><span class="more">${DB.cats.length} 类</span></div>
        <div class="chips">
          ${DB.cats.map((c) => `<button class="chip" data-cat="${c.key}">${c.emoji} ${c.label}<span class="n">${c.count}</span></button>`).join('')}
        </div>
      </div>

      <div class="sec">
        <div class="sec-head"><h2>今日推荐</h2><span class="more">每天都不一样</span></div>
        <div class="grid2">${daily.map(cardHTML).join('')}</div>
      </div>

      <div class="sec">
        <div class="sec-head"><h2>新手也能做</h2><span class="more">难度 ≤ ★★</span></div>
        <div class="hscroll">${easy.map(miniHTML).join('')}</div>
      </div>

      <div class="sec">
        <div class="sec-head"><h2>低卡轻食</h2><span class="more">≤ 300 大卡</span></div>
        <div class="hscroll">${light.length ? light.map(miniHTML).join('') : '<div class="tip-line" style="padding:0 4px">暂无</div>'}</div>
      </div>

      <div class="sec">
        <div class="sec-head"><h2>厨房基本功</h2><span class="more">新手指南</span></div>
        <div class="list">${DB.tips.map((t, i) => `<div class="row" data-tip="${i}">
          <div class="thumb"><div class="ph t${i % 5}">${['🧽', '🍽️', '🤔'][i % 3]}</div></div>
          <div class="info"><div class="nm">${esc(t.title)}</div><div class="mt">小贴士</div></div>
          <div class="go">${ICON.chev}</div></div>`).join('')}</div>
      </div>
      <div class="footer-note">数据来自开源项目 HowToCook<br>已完整打包，无网络也能用</div>
    </div>`;

    $('#homeSearch').onclick = openSearch;
    $('#randomBtn').onclick = () => {
      const el = $('#randomBtn');
      el.classList.add('spin');
      setTimeout(() => el.classList.remove('spin'), 520);
      vibrate(12);
      openRandom();
    };
    $('#qFridge').onclick = () => openSearch(true);
    $('#qEasy').onclick = () => { state.lib = { cat: 'all', sort: 'diff', q: '' }; switchTab('lib'); toast('已按难度排序，★ 越少越好做'); };
    bindCommon($('#view'));
  }

  /* ---------------- 菜谱库 ---------------- */
  function renderLib() {
    const s = state.lib;
    let list = ALL.slice();
    if (s.cat !== 'all') list = list.filter((r) => r.cat === s.cat);
    if (s.q) {
      const q = s.q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.ing.join(' ').toLowerCase().includes(q));
    }
    if (s.sort === 'diff') list.sort((a, b) => a.diff - b.diff || a.name.localeCompare(b.name, 'zh'));
    else if (s.sort === 'kcal') list.sort((a, b) => (a.kcal || 9999) - (b.kcal || 9999));
    else if (s.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

    $('#view').innerHTML = `
    <div class="page">
      <div class="topbar solid">
        <div class="brand" style="justify-content:space-between">
          <div><h1 style="font-size:1.35rem">菜谱库</h1><div class="sub">${list.length} 道菜 · ${s.sort === 'default' ? '默认排序' : s.sort === 'diff' ? '按难度' : s.sort === 'kcal' ? '按热量' : '按名称'}</div></div>
          <button class="seg" id="sortSeg" style="visibility:hidden"></button>
        </div>
        <div style="display:flex;gap:9px;margin-top:14px">
          <button class="searchbar" id="libSearch" style="margin:0;flex:1">${ICON.search}<span>${s.q ? esc(s.q) : '搜索菜谱或食材'}</span></button>
          <button class="chip" id="sortBtn" style="box-shadow:0 2px 10px var(--c-shadow)">⇅ 排序</button>
        </div>
        <div class="chips" style="padding:12px 0 2px;margin:0 -18px 0 0">
          <button class="chip ${s.cat === 'all' ? 'on' : ''}" data-cat="all">全部<span class="n">${ALL.length}</span></button>
          ${DB.cats.map((c) => `<button class="chip ${s.cat === c.key ? 'on' : ''}" data-cat="${c.key}">${c.emoji} ${c.label}<span class="n">${c.count}</span></button>`).join('')}
        </div>
      </div>
      ${list.length ? `<div class="list" style="margin-top:12px">${list.map(rowHTML).join('')}</div>` : `<div class="empty"><div class="big">🥄</div><p>没有找到相关菜谱</p><p style="font-size:.8rem">换个关键词试试</p></div>`}
    </div>`;

    $('#libSearch').onclick = openSearch;
    $('#sortBtn').onclick = () => {
      const order = ['default', 'diff', 'kcal', 'name'];
      const labels = { default: '默认排序', diff: '按难度排序', kcal: '按热量排序', name: '按名称排序' };
      s.sort = order[(order.indexOf(s.sort) + 1) % order.length];
      toast(labels[s.sort]);
      renderLib();
    };
    bindCommon($('#view'));
  }

  /* ---------------- 收藏 ---------------- */
  function renderFav() {
    const isFav = state.favTab === 'fav';
    const ids = isFav ? Array.from(state.fav) : state.hist.map((h) => h.id);
    const list = ids.map((id) => BYID[id]).filter(Boolean);
    $('#view').innerHTML = `
    <div class="page">
      <div class="topbar solid">
        <div class="brand"><h1 style="font-size:1.35rem">我的收藏</h1></div>
        <div class="seg" id="favSeg" style="margin-top:14px;width:100%">
          <button class="${isFav ? 'on' : ''}" data-t="fav" style="flex:1">收藏 ${state.fav.size}</button>
          <button class="${!isFav ? 'on' : ''}" data-t="hist" style="flex:1">最近浏览 ${state.hist.length}</button>
        </div>
      </div>
      ${list.length ? `<div class="list" style="margin-top:12px">${list.map(rowHTML).join('')}</div>`
        : `<div class="empty"><div class="big">${isFav ? '🍽️' : '🕘'}</div><p>${isFav ? '还没有收藏任何菜谱' : '还没有浏览记录'}</p><p style="font-size:.8rem">${isFav ? '在菜谱页点右上角 ♡ 就能收藏' : '看过的菜会出现在这里'}</p></div>`}
    </div>`;
    $$('#favSeg button').forEach((b) => (b.onclick = () => { state.favTab = b.dataset.t; renderFav(); }));
    bindCommon($('#view'));
  }

  /* ---------------- 我的 ---------------- */
  function renderMe() {
    const fsLabels = [[0.9, '小'], [1, '标准'], [1.08, '大'], [1.18, '特大']];
    const themes = [['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']];
    $('#view').innerHTML = `
    <div class="page">
      <div class="topbar solid"><div class="brand"><h1 style="font-size:1.35rem">我的厨房</h1></div></div>
      <div class="profile-head">
        <div class="avatar">🧑‍🍳</div>
        <div>
          <div style="font-size:1.05rem;font-weight:750">今天也要好好吃饭</div>
          <div style="font-size:.78rem;color:var(--c-muted);margin-top:3px">离线菜谱 · 无需登录</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div class="n">${ALL.length}</div><div class="l">菜谱</div></div>
        <div class="stat"><div class="n">${state.fav.size}</div><div class="l">收藏</div></div>
        <div class="stat"><div class="n">${state.hist.length}</div><div class="l">浏览</div></div>
      </div>

      <div class="card" style="margin:16px 18px 0">
        <div class="set-row"><div><div class="lb">外观</div><div class="ds">深色模式下不刺眼</div></div>
          <div class="seg" id="themeSeg">${themes.map(([k, l]) => `<button class="${state.theme === k ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
        </div>
        <div class="set-row"><div><div class="lb">字号</div><div class="ds">做菜时看不清楚就调大</div></div>
          <div class="seg" id="fsSeg">${fsLabels.map(([v, l]) => `<button class="${Math.abs(state.fs - v) < 0.01 ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
        </div>
      </div>

      <div class="sec"><div class="sec-head"><h2>厨房基本功</h2></div>
        <div class="list">${DB.tips.map((t, i) => `<div class="row" data-tip="${i}">
          <div class="thumb"><div class="ph t${i % 5}">${['🧽', '🍽️', '🤔'][i % 3]}</div></div>
          <div class="info"><div class="nm">${esc(t.title)}</div><div class="mt">小贴士</div></div>
          <div class="go">${ICON.chev}</div></div>`).join('')}</div>
      </div>

      <div class="card" style="margin:16px 18px 0">
        <div class="set-row" id="clearData"><div><div class="lb" style="color:var(--c-primary)">清除收藏与浏览记录</div><div class="ds">不影响已下载的菜谱</div></div></div>
      </div>

      <div class="footer-note">做饭指南 v1.0.0<br>菜谱内容来自开源项目 Anduin2017/HowToCook（MIT / CC BY-NC-SA）<br>本应用仅做离线整理与界面重制</div>
    </div>`;

    $$('#themeSeg button').forEach((b) => (b.onclick = () => {
      state.theme = b.dataset.k; store.set('cook.theme', state.theme); applyTheme(); renderMe();
    }));
    $$('#fsSeg button').forEach((b) => (b.onclick = () => {
      state.fs = parseFloat(b.dataset.v); store.set('cook.fs', state.fs); applyFs(); renderMe();
    }));
    $('#clearData').onclick = () => {
      if (!confirm('确定清除全部收藏和浏览记录吗？')) return;
      state.fav.clear(); state.hist = [];
      store.set('cook.fav', []); store.set('cook.hist', []);
      toast('已清除'); renderMe();
    };
    bindCommon($('#view'));
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindCommon(root) {
    $$('[data-id]', root).forEach((el) => {
      el.onclick = () => openDetail(el.dataset.id);
    });
    $$('[data-cat]', root).forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        state.lib = { cat: el.dataset.cat, sort: 'default', q: '' };
        switchTab('lib');
      };
    });
    $$('[data-tip]', root).forEach((el) => {
      el.onclick = () => openTip(parseInt(el.dataset.tip, 10));
    });
  }

  /* ---------------- 底部导航 ---------------- */
  const TABS = [
    { k: 'home', l: '发现', i: 'home' },
    { k: 'lib', l: '菜谱', i: 'book' },
    { k: 'fav', l: '收藏', i: 'heart' },
    { k: 'me', l: '我的', i: 'user' }
  ];
  function renderNav() {
    $('#nav').innerHTML = TABS.map((t) => `<button class="nav-item ${state.tab === t.k ? 'on' : ''}" data-tab="${t.k}">${ICON[t.i]}<span>${t.l}</span></button>`).join('');
    $$('#nav .nav-item').forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  }
  function switchTab(k) {
    state.tab = k;
    renderNav();
    ({ home: renderHome, lib: renderLib, fav: renderFav, me: renderMe })[k]();
    window.scrollTo(0, 0);
  }

  /* ---------------- 详情 ---------------- */
  function scaleAmount(amt, f) {
    if (f === 1) return amt;
    return String(amt).replace(/(\d+(?:\.\d+)?)/g, (m) => {
      let v = parseFloat(m) * f;
      v = Math.round(v * 10) / 10;
      return String(v);
    });
  }

  function openDetail(id) {
    const r = BYID[id];
    if (!r) return;
    // 浏览记录
    state.hist = [{ id: id, t: Date.now() }].concat(state.hist.filter((h) => h.id !== id)).slice(0, 60);
    store.set('cook.hist', state.hist);

    const page = document.createElement('div');
    page.className = 'detail-page';
    page.id = 'detailPage';
    const groups = [];
    r.steps.forEach((s, i) => {
      const g = s.group || '';
      if (!groups.length || groups[groups.length - 1].name !== g) groups.push({ name: g, items: [] });
      groups[groups.length - 1].items.push({ ...s, n: i + 1 });
    });
    const calcGroups = [];
    r.calc.forEach((c) => {
      const g = c.group || '用料';
      if (!calcGroups.length || calcGroups[calcGroups.length - 1].name !== g) calcGroups.push({ name: g, items: [] });
      calcGroups[calcGroups.length - 1].items.push(c);
    });
    const hasCalc = r.calc.length > 0;

    page.innerHTML = `
      <div class="hero">
        ${r.img ? `<img src="img/${r.img}.jpg" alt="${esc(r.name)}" onerror="imgFallback(this)">` : ph(r)}
        <div class="hero-actions">
          <button class="icon-btn" id="dBack">${ICON.back}</button>
          <button class="icon-btn fav ${state.fav.has(r.id) ? 'on' : ''}" id="dFav">${state.fav.has(r.id) ? ICON.heartFill : ICON.heart}</button>
        </div>
        <div class="hero-txt">
          <h2>${esc(r.name)}</h2>
          <div class="cat">${CAT_EMOJI[r.cat] || ''} ${catLabel(r.cat)}</div>
        </div>
      </div>
      <div class="detail-body">
        <div class="meta-row">
          ${r.diff ? `<div class="pill">${ICON.star}<span class="k">难度</span><span class="v">${'★'.repeat(r.diff)}</span></div>` : ''}
          ${r.kcal ? `<div class="pill">${ICON.fire}<span class="k">约</span><span class="v">${r.kcal}</span><span class="k">大卡</span></div>` : ''}
          ${r.time ? `<div class="pill">${ICON.clock}<span class="k">用时</span><span class="v">${esc(r.time)}</span></div>` : ''}
        </div>
        ${r.desc ? `<p class="desc">${esc(r.desc)}</p>` : ''}

        <div class="card">
          <div class="card-h">
            <h3>🧺 备料</h3>
            <div class="seg" id="portionSeg">
              <button data-f="0.5">半份</button><button data-f="1" class="on">1 份</button><button data-f="2">2 份</button><button data-f="3">3 份</button>
            </div>
          </div>
          <div class="card-b" id="ingBox">
            ${hasCalc
              ? calcGroups.map((g) => `<div class="ing-group-t">${esc(g.name)}</div>` + g.items.map((c, i) => `<div class="ing-row" data-i="c${g.name}${i}"><span class="ing-box"></span><span class="nm">${esc(c.name)}</span><span class="amt" data-raw="${esc(c.amount)}">${esc(c.amount)}</span></div>`).join('')).join('')
              : r.ing.map((n, i) => `<div class="ing-row" data-i="${i}"><span class="ing-box"></span><span class="nm">${esc(n)}</span><span class="amt"></span></div>`).join('')}
            ${r.opt.length ? `<div class="ing-group-t">可选</div>` + r.opt.map((n, i) => `<div class="ing-row" data-i="o${i}"><span class="ing-box"></span><span class="nm">${esc(n)}</span><span class="amt"></span></div>`).join('') : ''}
            ${!hasCalc && !r.ing.length ? '<div class="tip-line">这道菜没有列出具体用量，按经验来即可。</div>' : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-h"><h3>👨‍🍳 步骤</h3><span class="cnt" id="stepCnt">0 / ${r.steps.length}</span></div>
          <div class="card-b">
            ${groups.map((g) => (g.name ? `<div class="step-group-t">${esc(g.name)}</div>` : '') +
              g.items.map((s) => {
                const m = s.text.match(/(\d+(?:\.\d+)?)\s*(分钟|min|秒钟|秒)/);
                return `<div class="step" data-s="${s.n}">
                  <div class="idx">${s.n}</div>
                  <div class="txt">${fmtStep(s.text)}${m ? `<div><button class="timer-btn" data-min="${m[2].indexOf('秒') >= 0 ? parseFloat(m[1]) / 60 : parseFloat(m[1])}">${ICON.timer}${esc(m[1] + m[2])}计时</button></div>` : ''}</div>
                </div>`;
              }).join('')).join('')}
          </div>
        </div>

        ${r.tips.length ? `<div class="card"><div class="card-h"><h3>💡 小提示</h3></div><div class="card-b">${r.tips.map((t) => `<p class="tip-line">· ${esc(t)}</p>`).join('')}</div></div>` : ''}
      </div>
      <div class="detail-bar">
        <button class="btn-ghost ${state.fav.has(r.id) ? 'on' : ''}" id="dFav2">${state.fav.has(r.id) ? ICON.heartFill : ICON.heart}</button>
        <button class="btn-primary" id="dCook">${ICON.play}开始烹饪</button>
      </div>`;

    document.body.appendChild(page);
    history.pushState({ v: 'detail', id: id }, '');

    const close = () => { page.classList.add('closing'); setTimeout(() => page.remove(), 200); };
    $('#dBack').onclick = () => history.back();

    const toggleFav = () => {
      if (state.fav.has(r.id)) { state.fav.delete(r.id); toast('已取消收藏'); }
      else { state.fav.add(r.id); toast('已收藏'); vibrate(14); }
      store.set('cook.fav', Array.from(state.fav));
      const on = state.fav.has(r.id);
      [$('#dFav'), $('#dFav2')].forEach((b) => { if (!b) return; b.classList.toggle('on', on); b.innerHTML = on ? ICON.heartFill : ICON.heart; });
    };
    $('#dFav').onclick = toggleFav;
    $('#dFav2').onclick = toggleFav;

    // 份量
    $$('#portionSeg button').forEach((b) => (b.onclick = () => {
      $$('#portionSeg button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      const f = parseFloat(b.dataset.f);
      $$('#ingBox .amt[data-raw]').forEach((el) => { el.textContent = scaleAmount(el.dataset.raw, f); });
    }));

    // 勾选
    $$('#ingBox .ing-row').forEach((el) => (el.onclick = () => { el.classList.toggle('done'); vibrate(8); }));

    // 步骤完成
    const updateCnt = () => {
      const done = $$('#detailPage .step.done').length;
      $('#stepCnt').textContent = `${done} / ${r.steps.length}`;
    };
    $$('#detailPage .step').forEach((el) => {
      el.querySelector('.txt').onclick = () => { el.classList.toggle('done'); vibrate(10); updateCnt(); };
    });
    $$('#detailPage .timer-btn').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openTimer(parseFloat(b.dataset.min), b.textContent.trim()); }));

    $('#dCook').onclick = () => openCook(r);

    page._close = close;
    page._onPop = () => { close(); };
    POP_HANDLERS.push(page._onPop);
  }

  function fmtStep(t) {
    let s = esc(t);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/`([^`]+)`/g, '<code style="background:var(--c-surface2);padding:1px 4px;border-radius:4px">$1</code>');
    s = s.replace(/\*(?!\*)(.+?)\*/g, '<em>$1</em>');
    return s;
  }

  /* ---------------- 烹饪模式 ---------------- */
  function openCook(r) {
    const steps = r.steps;
    let i = 0;
    const el = document.createElement('div');
    el.className = 'cook';
    el.id = 'cookMode';
    el.innerHTML = `
      <div class="cook-top">
        <button class="icon-btn" id="cExit" style="background:var(--c-surface2);color:var(--c-text)">${ICON.close}</button>
        <div class="prog"><i id="cProg" style="width:0%"></i></div>
        <div class="cnt" id="cCnt">1/${steps.length}</div>
      </div>
      <div class="cook-main" id="cMain"></div>
      <div class="cook-bot">
        <button class="btn-ghost" id="cPrev">${ICON.back}</button>
        <button class="btn-primary" id="cNext">下一步 ${ICON.chev}</button>
      </div>`;
    document.body.appendChild(el);
    history.pushState({ v: 'cook' }, '');
    POP_HANDLERS.push(() => el.remove());

    const paint = () => {
      const s = steps[i];
      $('#cProg').style.width = ((i + 1) / steps.length * 100) + '%';
      $('#cCnt').textContent = `${i + 1}/${steps.length}`;
      const m = s.text.match(/(\d+(?:\.\d+)?)\s*(分钟|min|秒钟|秒)/);
      $('#cMain').innerHTML = `${s.group ? `<div class="gname">${esc(s.group)}</div>` : ''}
        <div class="stxt">${fmtStep(s.text)}</div>
        ${m ? `<div style="margin-top:18px"><button class="timer-btn" id="cTimer" style="font-size:.86rem;padding:9px 14px">${ICON.timer}${esc(m[1] + m[2])} 计时</button></div>` : ''}`;
      if ($('#cTimer')) $('#cTimer').onclick = () => openTimer(m[2].indexOf('秒') >= 0 ? parseFloat(m[1]) / 60 : parseFloat(m[1]), m[1] + m[2]);
      $('#cNext').innerHTML = i === steps.length - 1 ? '完成 🎉' : `下一步 ${ICON.chev}`;
      $('#cPrev').style.opacity = i === 0 ? '.4' : '1';
    };
    $('#cNext').onclick = () => {
      vibrate(10);
      if (i === steps.length - 1) { history.back(); toast('做完啦，开饭！'); return; }
      i++; paint();
    };
    $('#cPrev').onclick = () => { if (i > 0) { i--; paint(); } };
    $('#cExit').onclick = () => history.back();
    paint();

    try { if (window.Bridge && Bridge.keepScreenOn) Bridge.keepScreenOn(true); } catch (e) {}
  }

  /* ---------------- 计时器 ---------------- */
  let timer = { total: 0, left: 0, endAt: 0, running: false, tick: null, label: '' };
  function timerText(sec) {
    sec = Math.max(0, Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  function openTimer(minutes, label) {
    const el = document.createElement('div');
    el.innerHTML = `<div class="mask" id="tMask"></div>
      <div class="sheet" id="tSheet">
        <div class="grab"></div>
        <h3>${ICON.timer} 计时器 ${label ? '· ' + esc(label) : ''}</h3>
        <div class="timer-ring"><div class="num" id="tNum">${timerText((minutes || 5) * 60)}</div></div>
        <div class="presets" id="tPresets">${[1, 2, 3, 5, 8, 10, 15, 30].map((m) => `<button data-m="${m}" class="${Math.round((minutes || 5)) === m ? 'on' : ''}">${m} 分钟</button>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn-primary" id="tStart" style="height:46px">开始计时</button>
        </div>
        <div style="height:6px"></div>
      </div>`;
    document.body.appendChild(el);
    const sheet = $('#tSheet'), mask = $('#tMask');
    let chosen = minutes || 5;
    requestAnimationFrame(() => { sheet.classList.add('on'); mask.classList.add('on'); });
    const close = () => { sheet.classList.remove('on'); mask.classList.remove('on'); setTimeout(() => el.remove(), 260); };
    mask.onclick = close;
    $$('#tPresets button').forEach((b) => (b.onclick = () => {
      $$('#tPresets button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      chosen = parseFloat(b.dataset.m);
      $('#tNum').textContent = timerText(chosen * 60);
    }));
    $('#tStart').onclick = () => { startTimer(chosen * 60); close(); toast('计时开始，到点会提醒你'); };
  }
  function startTimer(sec) {
    clearInterval(timer.tick);
    timer.total = sec; timer.left = sec; timer.endAt = Date.now() + sec * 1000; timer.running = true;
    let fab = $('#fabTimer');
    if (!fab) {
      fab = document.createElement('button');
      fab.className = 'fab-timer';
      fab.id = 'fabTimer';
      document.body.appendChild(fab);
      fab.onclick = () => {
        if (timer.running) { clearInterval(timer.tick); timer.running = false; fab.classList.remove('ringing'); renderFab(); }
        else { timer.running = false; fab.remove(); }
      };
    }
    const paint = () => {
      const left = Math.max(0, (timer.endAt - Date.now()) / 1000);
      timer.left = left;
      fab.innerHTML = `${ICON.timer}<span>${timerText(left)}</span>`;
      if (left <= 0) {
        clearInterval(timer.tick);
        timer.running = false;
        fab.classList.add('ringing');
        fab.innerHTML = `${ICON.timer}<span>时间到！</span>`;
        vibrate([0, 500, 200, 500, 200, 500]);
        toast('⏰ 时间到了');
      }
    };
    const renderFab = () => { fab.innerHTML = `${ICON.timer}<span>已暂停</span>`; };
    paint();
    timer.tick = setInterval(paint, 250);
  }

  /* ---------------- 搜索 ---------------- */
  function openSearch(byIngredient) {
    const el = document.createElement('div');
    el.className = 'search-page';
    el.id = 'searchPage';
    el.innerHTML = `
      <div class="search-top">
        <div class="search-input-wrap">${ICON.search}
          <input id="sInput" placeholder="${byIngredient ? '输入食材，例如 鸡蛋、土豆' : '搜索菜名或食材'}" autocomplete="off">
        </div>
        <button class="search-cancel" id="sCancel">取消</button>
      </div>
      <div class="search-res" id="sRes"></div>`;
    document.body.appendChild(el);
    history.pushState({ v: 'search' }, '');
    POP_HANDLERS.push(() => el.remove());
    const input = $('#sInput'), res = $('#sRes');
    const paint = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        res.innerHTML = `<div style="padding:8px 2px">
          <div class="ing-group-t">试试这些</div>
          <div class="chips" style="padding:0;flex-wrap:wrap;gap:8px">
            ${['鸡蛋', '土豆', '五花肉', '番茄', '豆腐', '鸡腿', '面条', '虾'].map((k) => `<button class="chip" data-k="${k}">${k}</button>`).join('')}
          </div></div>`;
        $$('.chip[data-k]', res).forEach((b) => (b.onclick = () => { input.value = b.dataset.k; paint(); }));
        return;
      }
      const hits = ALL.filter((r) => r.name.toLowerCase().includes(q) || r.ing.join('|').toLowerCase().includes(q) || (r.opt || []).join('|').toLowerCase().includes(q));
      hits.sort((a, b) => (a.name.toLowerCase().indexOf(q) === 0 ? -1 : 0) - (b.name.toLowerCase().indexOf(q) === 0 ? -1 : 0));
      res.innerHTML = hits.length
        ? `<div class="ing-group-t">找到 ${hits.length} 道</div>` + hits.slice(0, 80).map(rowHTML).join('<div style="height:10px"></div>')
        : `<div class="empty"><div class="big">🔍</div><p>没有找到「${esc(input.value)}」</p><p style="font-size:.8rem">试试更简单的食材名</p></div>`;
      bindCommon(res);
    };
    input.oninput = paint;
    paint();
    $('#sCancel').onclick = () => history.back();
    setTimeout(() => input.focus(), 120);
  }

  /* ---------------- 随机推荐 ---------------- */
  function openRandom() {
    let r = ALL[Math.floor(Math.random() * ALL.length)];
    const el = document.createElement('div');
    el.innerHTML = `<div class="mask" id="rMask"></div>
      <div class="sheet" id="rSheet" style="padding-left:16px;padding-right:16px">
        <div class="grab"></div>
        <h3>就它了</h3>
        <div id="rCard"></div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn-ghost" id="rAgain" style="width:auto;padding:0 18px;font-size:.9rem;font-weight:650">换一道</button>
          <button class="btn-primary" id="rGo" style="height:46px">看看怎么做</button>
        </div>
        <div style="height:6px"></div>
      </div>`;
    document.body.appendChild(el);
    const sheet = $('#rSheet'), mask = $('#rMask');
    requestAnimationFrame(() => { sheet.classList.add('on'); mask.classList.add('on'); });
    const close = () => { sheet.classList.remove('on'); mask.classList.remove('on'); setTimeout(() => el.remove(), 260); };
    const paint = () => {
      $('#rCard').innerHTML = `<div style="display:flex;gap:14px;align-items:center">
        <div style="width:96px;height:96px;border-radius:16px;overflow:hidden;flex:0 0 auto;position:relative">${thumb(r)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:1.15rem;font-weight:750">${esc(r.name)}</div>
          <div style="font-size:.76rem;color:var(--c-muted);margin-top:6px">${metaLine(r)}</div>
          <div style="font-size:.76rem;color:var(--c-muted);margin-top:6px">${CAT_EMOJI[r.cat] || ''} ${catLabel(r.cat)}</div>
        </div></div>`;
    };
    paint();
    mask.onclick = close;
    $('#rAgain').onclick = () => { r = ALL[Math.floor(Math.random() * ALL.length)]; paint(); vibrate(10); };
    $('#rGo').onclick = () => { close(); setTimeout(() => openDetail(r.id), 180); };
  }

  /* ---------------- 小贴士 ---------------- */
  function openTip(i) {
    const t = DB.tips[i];
    if (!t) return;
    const el = document.createElement('div');
    el.className = 'detail-page';
    el.id = 'tipPage';
    el.innerHTML = `
      <div class="topbar solid" style="display:flex;align-items:center;gap:12px;position:sticky">
        <button class="icon-btn" id="tipBack" style="background:var(--c-surface2);color:var(--c-text)">${ICON.back}</button>
        <h1 style="font-size:1.1rem;margin:0">${esc(t.title)}</h1>
      </div>
      <div class="tips-doc md">${mdToHtml(t.body)}</div>`;
    document.body.appendChild(el);
    history.pushState({ v: 'tip' }, '');
    POP_HANDLERS.push(() => el.remove());
    $('#tipBack').onclick = () => history.back();
  }
  function mdToHtml(md) {
    const lines = md.split('\n');
    let out = '', inList = false;
    lines.forEach((ln) => {
      const t = ln.trim();
      if (!t) { if (inList) { out += '</ul>'; inList = false; } return; }
      let m;
      if ((m = t.match(/^(#{1,4})\s+(.+)$/))) {
        if (inList) { out += '</ul>'; inList = false; }
        out += `<h3>${esc(m[2])}</h3>`;
      } else if ((m = t.match(/^[-*]\s+(.+)$/))) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += `<li>${esc(m[1])}</li>`;
      } else if ((m = t.match(/^(\d+)[.、]\s*(.+)$/))) {
        if (!inList) { out += '<ul>'; inList = true; }
        out += `<li>${esc(m[2])}</li>`;
      } else {
        if (inList) { out += '</ul>'; inList = false; }
        out += `<p>${esc(t)}</p>`;
      }
    });
    if (inList) out += '</ul>';
    return out;
  }

  /* ---------------- 返回键 ---------------- */
  const POP_HANDLERS = [];
  window.addEventListener('popstate', () => {
    const h = POP_HANDLERS.pop();
    if (h) h();
    else if (state.tab !== 'home') { switchTab('home'); history.pushState({ tab: 'home' }, ''); }
    else if (window.Bridge && Bridge.exitApp) Bridge.exitApp();
  });

  /* ---------------- 启动 ---------------- */
  function boot() {
    applyTheme();
    applyFs();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.theme === 'system') applyTheme(); });

    fetch('data/recipes.json')
      .then((r) => r.json())
      .then((data) => {
        DB = data;
        ALL = data.recipes;
        ALL.forEach((r) => (BYID[r.id] = r));
        history.replaceState({ tab: 'home' }, '');
        const q = new URLSearchParams(location.search);
        const hash = location.hash;
        const mDish = hash.match(/^#r=([a-z0-9]+)/);
        const mCook = hash.match(/^#cook=([a-z0-9]+)/);
        const mTab = hash.match(/^#tab=(home|lib|fav|me)/);
        if (mCook && BYID[mCook[1]]) { switchTab('home'); openCook(BYID[mCook[1]]); }
        else if (mDish && BYID[mDish[1]]) { switchTab('home'); openDetail(mDish[1]); }
        else if (mTab) switchTab(mTab[1]);
        else switchTab('home');
      })
      .catch((e) => {
        $('#view').innerHTML = `<div class="empty" style="padding-top:120px"><div class="big">😵</div><p>菜谱数据加载失败</p><p style="font-size:.78rem">${esc(String(e))}</p></div>`;
      });
  }
  boot();
})();
