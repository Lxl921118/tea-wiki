# 🧋 台灣手搖飲百科

一個用 **LLM Wiki** 方式維護的台灣手搖飲知識庫：人把資料放進 `raw/`，AI 依照 [CLAUDE.md](CLAUDE.md) 的規則整理成互相連結的條目，網站直接讀這些 Markdown 條目顯示。

- 網站：https://lxl921118.github.io/tea-wiki/
- 開發工具：Claude Code，模型 Claude Opus 5.5（`claude-opus-5-5`）

## 為什麼這樣做

一般做網站是「把這一頁做出來」。這個專案想做的是一套**規則**：之後只要放進新資料，AI 讀了 CLAUDE.md 就知道該新增哪些條目、用什麼格式、怎麼連結、哪些事不能寫，網站也會自動多出新頁面。

## 專案結構

```
tea-wiki/
├── CLAUDE.md          給 AI 的工作規則（本專案的核心）
├── AGENTS.md          指向 CLAUDE.md，讓其他 AI 工具也照同一份規則
├── raw/               原始資料（人放入，AI 只讀）
├── wiki/              AI 整理出的條目，依分類分資料夾
│   ├── index.md       條目索引（自動產生）
│   └── log.md         整理紀錄
├── templates/         六個分類的條目模板
├── tools/build.py     檢查器：檢查規則並產生 data/pages.json
├── data/pages.json    網站讀的資料（自動產生）
├── index.html         網站
└── assets/            網站的 JS 與 CSS
```

## 本機預覽

```bash
python tools/build.py          # 檢查條目並更新網站資料
python -m http.server 8000     # 打開 http://localhost:8000
```

## 用 AI 繼續擴充

1. 把新資料存成 `raw/YYYY-MM-DD-<來源類型>-<slug>.md`（格式參考既有檔案）。
2. 在 Claude Code 裡說：「請依照 CLAUDE.md ingest 待整理的資料」。
3. AI 會先列出整理計畫，同意後新增、更新條目並跑檢查器。
4. commit、push，GitHub Pages 會自動更新網站。

目前 `raw/2026-11-16-wikipedia-mesona.md`（仙草）刻意留著還沒整理，用來示範這個流程。

## 授權

條目內容整理自維基百科（CC BY-SA 4.0），每則條目頁尾都列出資料出處。
