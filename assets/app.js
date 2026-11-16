// 台灣手搖飲百科：讀 data/pages.json 和 wiki/**/*.md，在瀏覽器裡渲染成網站。
// 新增或修改條目不需要改這個檔案；資料都由 tools/build.py 產生。
"use strict";

// 上傳到 GitHub 後填入 repo 網址，例如 "https://github.com/<帳號>/tea-wiki"；空字串就不顯示連結
const REPO_URL = "https://github.com/Lxl921118/tea-wiki";

const app = document.getElementById("app");
const CALLOUT = { tip: "💡 小知識", note: "📌 補充", warn: "⚠️ 注意" };
let DATA, PAGES, CATS, RAWS;
const cache = new Map();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fetchText(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`${path} 讀取失敗（${r.status}）`);
      return r.text();
    }));
  }
  return cache.get(path);
}

// ---------- Markdown ----------

function wikilink(slug, label) {
  const p = PAGES.get(slug);
  const text = esc(label || (p ? p.title : slug));
  return p
    ? `<a class="wikilink" data-cat="${p.category}" href="#/p/${p.slug}">${text}</a>`
    : `<span class="wikilink missing" title="還沒有「${esc(slug)}」這個條目">${text}</span>`;
}

marked.use({
  gfm: true,
  extensions: [{
    // [[slug]]、[[slug|文字]]，表格裡寫成 [[slug\|文字]]
    name: "wikilink",
    level: "inline",
    start(src) {
      const i = src.indexOf("[[");
      return i < 0 ? undefined : i;
    },
    tokenizer(src) {
      const m = /^\[\[([^\]|\\]+)(?:\\?\|([^\]]+))?\]\]/.exec(src);
      if (m) return { type: "wikilink", raw: m[0], slug: m[1].trim(), label: m[2] && m[2].trim() };
    },
    renderer(token) {
      return wikilink(token.slug, token.label);
    },
  }],
});

const stripFront = (md) => md.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");

function renderMarkdown(md) {
  const box = document.createElement("div");
  box.className = "prose";
  box.innerHTML = marked.parse(stripFront(md));
  // > [!tip] / [!note] / [!warn] 變成提示框
  box.querySelectorAll("blockquote").forEach((bq) => {
    const first = bq.firstElementChild;
    const m = first && /^\s*\[!(tip|note|warn)\]\s*/i.exec(first.innerHTML);
    if (!m) return;
    const kind = m[1].toLowerCase();
    first.innerHTML = first.innerHTML.slice(m[0].length);
    bq.classList.add("callout", `callout-${kind}`);
    bq.insertAdjacentHTML("afterbegin", `<div class="callout-label">${CALLOUT[kind]}</div>`);
  });
  box.querySelectorAll("table").forEach((t) => {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    t.before(wrap);
    wrap.append(t);
  });
  box.querySelectorAll("h2").forEach((h, i) => { h.id = `sec-${i + 1}`; });
  return box;
}

// ---------- 共用片段 ----------

const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

const PEARLS = [[68, 244], [86, 247], [104, 245], [122, 247], [138, 242], [77, 229], [95, 231], [113, 229], [131, 230], [104, 214]];
const CUP_SVG = `
<svg class="cup" viewBox="0 0 200 270" role="img" aria-label="一杯珍珠奶茶">
  <rect class="straw" x="114" y="0" width="16" height="124" rx="8" transform="rotate(10 122 62)"/>
  <path class="lid" d="M36 74 Q100 30 164 74 Z"/>
  <rect class="lid" x="30" y="70" width="140" height="14" rx="7"/>
  <path class="body" d="M38 84 H162 L148 248 Q147 260 135 260 H65 Q53 260 52 248 Z"/>
  <path class="drink" d="M41 112 H159 L148 248 Q147 258 135 258 H65 Q53 258 52 248 Z"/>
  <path class="foam" d="M41 112 H159 L158 124 Q100 133 42 124 Z"/>
  <g>${PEARLS.map(([x, y]) => `<circle class="pearl" cx="${x}" cy="${y}" r="9"/>`).join("")}</g>
  <path class="shine" d="M56 122 L64 122 L71 238 L63 238 Z"/>
</svg>`;

const FLOW_HTML = `
<section class="section">
  <div class="section-head"><h2>這個 Wiki 怎麼長出來的</h2><a class="hint" href="#/about">看完整規則 →</a></div>
  <ol class="flow flow-wrap">
    <li><strong>放入資料</strong><p>人把找到的資料放進 <code>raw/</code>。這一層 AI 只讀不改。</p></li>
    <li><strong>AI 整理（ingest）</strong><p>AI 依 CLAUDE.md 讀資料、提出整理計畫，再新增或更新條目、補上互相連結。</p></li>
    <li><strong>檢查器把關</strong><p><code>tools/build.py</code> 檢查格式、連結與出處，並產生索引。</p></li>
    <li><strong>網站自動更新</strong><p>網站直接讀 Markdown 條目，新增內容不必改任何網頁程式。</p></li>
  </ol>
</section>`;

function card(p) {
  const c = CATS.get(p.category);
  return `<a class="card" data-cat="${p.category}" href="#/p/${p.slug}">
    <span class="badge">${c.icon} ${esc(c.name)}</span>
    <h3>${esc(p.title)}</h3>
    ${p.aka.length ? `<p class="aka">${p.aka.map(esc).join(" · ")}</p>` : ""}
    <p>${esc(p.summary)}</p>
  </a>`;
}

const rawFile = (path) => path.replace(/^raw\//, "");
const status = (r) => (r.ingested ? `<span class="status done">已整理</span>` : `<span class="status todo">待整理</span>`);

function rawCard(r) {
  return `<a class="card" href="#/raw/${rawFile(r.path)}">
    ${status(r)}
    <h3>${esc(r.title)}</h3>
    <p class="aka">${esc(r.retrieved)} 擷取 · 被 ${r.citedBy.length} 則條目引用</p>
  </a>`;
}

function sourceItem(path) {
  const r = RAWS.get(path);
  if (!r) return `<li>${esc(path)}</li>`;
  const link = r.url ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">原始網頁 ↗</a>` : "";
  return `<li><a href="#/raw/${rawFile(path)}">${esc(r.title)}</a><br><span class="sub">${esc(r.retrieved)} 擷取${link}</span></li>`;
}

function crumbs(...items) {
  const parts = [`<a href="#/">首頁</a>`, ...items.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`))];
  return `<nav class="crumbs" aria-label="麵包屑">${parts.join("<span>/</span>")}</nav>`;
}

function mount(html, body) {
  app.innerHTML = html;
  if (body) app.querySelector("#body").replaceWith(body);
}

// ---------- 頁面 ----------

function home() {
  document.title = "台灣手搖飲百科";
  const ingested = DATA.raw.filter((r) => r.ingested).length;
  mount(`
  <section class="hero">
    <div>
      <p class="eyebrow">LLM WIKI · 一杯一杯慢慢整理</p>
      <h1>台灣手搖飲百科</h1>
      <p class="lead">從茶底、配料到點餐術語，把手搖飲的知識整理成互相連結的條目。每則條目都附上資料出處，沒有出處的事不寫。</p>
      <label class="search">${ICON_SEARCH}<input id="q" type="search" placeholder="搜尋：金萱、波霸、青蛙下蛋…" aria-label="搜尋條目" autocomplete="off"></label>
      <p class="stats">${DATA.pages.length} 則條目 · ${ingested} 份已整理資料 · 最後更新 ${esc(DATA.updated)}</p>
    </div>
    ${CUP_SVG}
  </section>
  <section class="section">
    <div class="section-head"><h2>分類</h2></div>
    <div class="cat-grid">${DATA.categories.map((c) => `
      <a class="cat-tile" data-cat="${c.id}" href="#/c/${c.id}">
        <span class="icon" aria-hidden="true">${c.icon}</span><strong>${esc(c.name)}</strong>
        <span>${esc(c.desc)}</span><span class="count">${c.count} 則</span>
      </a>`).join("")}
    </div>
  </section>
  <section class="section">
    <div class="section-head"><h2 id="list-title">所有條目</h2><span class="hint" id="list-hint"></span></div>
    <div class="card-grid" id="cards"></div>
    <p class="empty" id="no-result" hidden>找不到符合的條目。可以把相關資料放進 <code>raw/</code>，請 AI 依 CLAUDE.md 整理成新條目。</p>
  </section>
  ${FLOW_HTML}`);

  const input = app.querySelector("#q");
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const list = q
      ? DATA.pages.filter((p) => [p.title, p.slug, p.summary, ...p.aka].join(" ").toLowerCase().includes(q))
      : DATA.pages;
    app.querySelector("#cards").innerHTML = list.map(card).join("");
    app.querySelector("#no-result").hidden = list.length > 0;
    app.querySelector("#list-title").textContent = q ? `搜尋「${input.value.trim()}」` : "所有條目";
    app.querySelector("#list-hint").textContent = `${list.length} 則`;
  };
  input.addEventListener("input", draw);
  draw();
}

function categoryView(id) {
  const c = CATS.get(id);
  if (!c) return notFound();
  const list = DATA.pages.filter((p) => p.category === id);
  document.title = `${c.name}｜台灣手搖飲百科`;
  mount(`
  ${crumbs([c.name])}
  <header class="page-head"><h1>${c.icon} ${esc(c.name)}</h1><p>${esc(c.desc)} · ${list.length} 則</p></header>
  <div class="card-grid">${list.map(card).join("") || `<p class="empty">這個分類還沒有條目。</p>`}</div>`);
}

async function entryView(slug) {
  const p = PAGES.get(slug);
  if (!p) return notFound();
  const c = CATS.get(p.category);
  const body = renderMarkdown(await fetchText(p.path));
  const heads = [...body.querySelectorAll("h2")];
  const back = p.backlinks.map((s) => PAGES.get(s)).filter(Boolean);
  document.title = `${p.title}｜台灣手搖飲百科`;
  mount(`
  ${crumbs([c.name, `#/c/${c.id}`], [p.title])}
  <div class="entry-layout" data-cat="${p.category}">
    <article>
      <header class="entry-head">
        <a class="badge" href="#/c/${c.id}">${c.icon} ${esc(c.name)}</a>
        <h1>${esc(p.title)}</h1>
        ${p.aka.length ? `<ul class="chips" aria-label="別名">${p.aka.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
        <p class="summary">${esc(p.summary)}</p>
      </header>
      <div id="body"></div>
      <div class="entry-foot">
        <section class="panel">
          <h2>🔗 哪些條目提到它</h2>
          ${back.length ? `<ul>${back.map((b) => `<li>${wikilink(b.slug)}<br><span class="sub">${esc(b.summary)}</span></li>`).join("")}</ul>` : `<p class="sub">還沒有其他條目連到這裡。</p>`}
        </section>
        <section class="panel">
          <h2>📚 資料來源</h2>
          <ul>${p.sources.map(sourceItem).join("")}</ul>
          <p class="sub">最後更新：${esc(p.updated)}</p>
        </section>
      </div>
    </article>
    ${heads.length > 1 ? `<aside class="toc"><h2>本頁目錄</h2><ol>${heads.map((h) => `<li><a href="#${h.id}" data-jump="${h.id}">${esc(h.textContent)}</a></li>`).join("")}</ol></aside>` : ""}
  </div>`, body);
}

async function rawView(file) {
  const path = `raw/${file}`;
  const r = RAWS.get(path);
  if (!r) return notFound();
  const body = renderMarkdown(await fetchText(path));
  body.classList.add("raw-body");
  let shownUrl = r.url;
  try { shownUrl = decodeURI(r.url); } catch { /* 保留原樣 */ }
  document.title = `${r.title}｜原始資料`;
  mount(`
  ${crumbs(["原始資料", "#/about"], [file])}
  <header class="page-head"><h1>${esc(r.title)}</h1><p>這是放在 <code>raw/</code> 的原始資料，AI 只讀不改；條目裡的每一句事實都要能在這裡找到。</p></header>
  <dl class="raw-meta">
    <dt>狀態</dt><dd>${status(r)}</dd>
    <dt>檔案</dt><dd><code>${esc(path)}</code></dd>
    ${r.url ? `<dt>原始網頁</dt><dd><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(shownUrl)}</a></dd>` : ""}
    <dt>擷取日期</dt><dd>${esc(r.retrieved)}</dd>
    ${r.license ? `<dt>授權</dt><dd>${esc(r.license)}</dd>` : ""}
    <dt>被引用</dt><dd>${r.citedBy.map((s) => wikilink(s)).join("、") || "還沒有條目引用"}</dd>
  </dl>
  <div id="body"></div>`, body);
}

async function logView() {
  const md = (await fetchText("wiki/log.md")).replace(/(^|[\s|（(])(raw\/[\w.-]+\.md)/gm, "$1[$2](#/$2)");
  const body = renderMarkdown(md);
  body.querySelector("h1")?.remove();
  document.title = "整理紀錄｜台灣手搖飲百科";
  mount(`
  ${crumbs(["整理紀錄"])}
  <header class="page-head"><h1>📒 整理紀錄</h1><p>AI 每次整理資料（ingest）或做健康檢查（lint）都會在 <code>wiki/log.md</code> 記一筆，新的在最上面。</p></header>
  <div id="body"></div>`, body);
}

async function aboutView() {
  const body = renderMarkdown(await fetchText("CLAUDE.md"));
  body.classList.add("raw-body");
  document.title = "關於｜台灣手搖飲百科";
  const repo = REPO_URL ? `<a class="hint" href="${esc(REPO_URL)}" target="_blank" rel="noopener">在 GitHub 上看 ↗</a>` : "";
  mount(`
  ${crumbs(["關於"])}
  <header class="page-head">
    <h1>關於這個 Wiki</h1>
    <p>這是一個 LLM Wiki：人負責挑資料，AI 依照同一份規則（CLAUDE.md）把資料整理成條目。規則固定，所以之後每次加新資料，都能用同樣的方式快速長出新頁面。</p>
  </header>
  ${FLOW_HTML.replace(/<a class="hint"[^>]*>.*?<\/a>/, repo)}
  <section class="section">
    <div class="section-head"><h2>原始資料（raw/）</h2><span class="hint">${DATA.raw.length} 份</span></div>
    <div class="card-grid">${DATA.raw.map(rawCard).join("")}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>給 AI 的規則：CLAUDE.md</h2></div>
    <div id="body"></div>
  </section>`, body);
}

function notFound() {
  document.title = "找不到頁面｜台灣手搖飲百科";
  mount(`<header class="page-head"><h1>找不到這一頁</h1><p>可能是條目還沒建立，或網址打錯了。</p></header><a class="btn" href="#/">回首頁</a>`);
}

// ---------- 路由 ----------

function setNav(kind) {
  const current = { "": "home", c: "home", p: "home", log: "log", about: "about", raw: "about" }[kind];
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === current));
}

async function route() {
  let hash = location.hash.slice(1) || "/";
  try { hash = decodeURIComponent(hash); } catch { /* 保留原樣 */ }
  const [, kind = "", arg = ""] = /^\/([^/]*)\/?(.*)$/.exec(hash) || [];
  setNav(kind);
  try {
    if (kind === "") home();
    else if (kind === "c") categoryView(arg);
    else if (kind === "p") await entryView(arg);
    else if (kind === "raw") await rawView(arg);
    else if (kind === "log") await logView();
    else if (kind === "about") await aboutView();
    else notFound();
  } catch (err) {
    mount(`<p class="empty">${esc(err.message)}</p>`);
  }
  window.scrollTo(0, 0);
}

// 本頁目錄：捲動到段落，不改變網址（網址的 # 已經用在路由）
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-jump]");
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth" });
});

(async function init() {
  try {
    const res = await fetch("data/pages.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    DATA = await res.json();
  } catch {
    mount(`<p class="empty">讀不到 <code>data/pages.json</code>。如果是直接雙擊 index.html 開啟，請在專案資料夾執行 <code>python -m http.server 8000</code>，再打開 http://localhost:8000。</p>`);
    return;
  }
  PAGES = new Map(DATA.pages.map((p) => [p.slug, p]));
  CATS = new Map(DATA.categories.map((c) => [c.id, c]));
  RAWS = new Map(DATA.raw.map((r) => [r.path, r]));
  window.addEventListener("hashchange", route);
  route();
})();
