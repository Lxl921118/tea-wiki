# 整理紀錄

每次 ingest、lint 或大幅修改都記一筆，新的寫在最上面，舊紀錄保持原樣。
每筆的標題格式是「## [日期] 類型 | 對象」，類型是 ingest、lint 或 setup；內容列出新增、更新的條目和備註。

## [2026-11-16] ingest | raw/2026-11-16-wikipedia-mesona.md
- 新增：[[mesona]]
- 更新：[[bubble-milk-tea]]、[[tapioca-pearl]]（延伸閱讀加上仙草，sources 加上這份資料）
- 備註：中醫功效與不宜飲用的狀況放在 warn 提示框，並註明維基百科條目被標為「需要補充更多來源」；資料沒有仙草凍的做法比例，已用 note 標出。

## [2026-11-16] ingest | raw/2026-11-16-wikipedia-ruby-black-tea.md
- 新增：[[ruby-black-tea]]、[[jinxuan-vs-ruby]]
- 更新：[[jin-xuan]]（延伸閱讀加上紅玉）
- 備註：資料只寫到「主要用於製作紅茶」，沒有手搖飲的用法，已在條目用 note 標出。

## [2026-11-16] ingest | raw/2026-11-16-wikipedia-jin-xuan.md
- 新增：[[jin-xuan]]
- 備註：「27仔」和試驗代號 2027 在資料中分開出現，條目沒有把兩者連在一起解釋。

## [2026-11-16] ingest | raw/2026-11-16-wikipedia-tapioca-balls.md
- 新增：[[tapioca-pearl]]、[[frog-lays-eggs]]、[[pearl-vs-boba]]
- 更新：[[bubble-milk-tea]]（連到粉圓）、[[boba]]（補上「粉圓在珍奶中也稱波霸」）
- 備註：資料沒有寫珍珠和波霸各自的尺寸，比較表填「資料未載」。

## [2026-11-16] ingest | raw/2026-11-16-wikipedia-bubble-tea.md
- 新增：[[bubble-milk-tea]]、[[boba]]、[[origin-dispute]]、[[bubble-tea-worldwide]]、[[fresh-milk-vs-creamer]]
- 備註：條目內起源年代前後不一致（1985／1986／1987），已在 [[origin-dispute]] 用 warn 標出。

## [2026-11-16] setup | 建立專案
- 建立 CLAUDE.md、六個分類模板、檢查器 tools/build.py 與網站。
