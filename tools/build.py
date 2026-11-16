"""檢查 wiki/ 條目是否符合 CLAUDE.md 的規則，並產生網站資料。

用法：python tools/build.py
產出：data/pages.json（網站讀這個）、wiki/index.md（條目索引）
有錯誤時結束碼為 1。警告不影響結束碼，但要清到 0 才算完成。
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "wiki"
RAW = ROOT / "raw"
LOG = WIKI / "log.md"
OUT_JSON = ROOT / "data" / "pages.json"
OUT_INDEX = WIKI / "index.md"

# 分類的唯一來源：網站上的分類名稱、圖示、說明和順序都從這裡來
CATEGORIES = [
    {"id": "drink", "name": "飲品", "icon": "🧋", "desc": "一杯完整的飲料或甜品飲"},
    {"id": "tea", "name": "茶底", "icon": "🍃", "desc": "茶種與茶樹品種"},
    {"id": "topping", "name": "配料", "icon": "⚫", "desc": "加進飲料裡的料"},
    {"id": "term", "name": "點餐術語", "icon": "📝", "desc": "菜單和點餐時會遇到的詞"},
    {"id": "compare", "name": "比較", "icon": "⚖️", "desc": "兩樣容易搞混的東西並排比較"},
    {"id": "culture", "name": "文化與歷史", "icon": "📜", "desc": "起源、典故與流行現象"},
]
CAT_IDS = [c["id"] for c in CATEGORIES]
PAGE_FIELDS = ["title", "aka", "category", "summary", "sources", "updated"]
OPTIONAL = {"aka"}
RAW_FIELDS = ["title", "type", "retrieved"]
LIST_FIELDS = {"aka", "sources"}
SUMMARY_MAX = 40
MIN_LINKS = 2

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RAW_NAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
LINK_RE = re.compile(r"\[\[([^\]|\\]+)(?:\\?\|[^\]]+)?\]\]")  # 表格裡寫成 [[slug\|文字]]
FRONT_RE = re.compile(r"\A---\n(.*?)\n---\n?(.*)\Z", re.S)

errors: list[str] = []
warnings: list[str] = []


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def parse(path: Path):
    """回傳 (frontmatter dict 或 None, 內文)。只支援 `key: value` 與 `key: [a, b]`。"""
    text = path.read_text(encoding="utf-8-sig")
    m = FRONT_RE.match(text)
    if not m:
        return None, text
    meta = {}
    for line in m.group(1).splitlines():
        if not line.strip():
            continue
        key, sep, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if not sep:
            errors.append(f"{rel(path)}：frontmatter 這行看不懂「{line}」")
            continue
        if key in LIST_FIELDS:
            if val.startswith("[") and val.endswith("]"):
                val = [v.strip() for v in val[1:-1].split(",") if v.strip()]
            else:
                errors.append(f"{rel(path)}：{key} 要寫成 [a, b] 的格式")
                val = [val] if val else []
        meta[key] = val
    return meta, m.group(2)


def load_raw(log_text: str) -> dict:
    raws = {}
    for path in sorted(RAW.glob("*.md")):
        where = rel(path)
        if not RAW_NAME_RE.match(path.name):
            errors.append(f"{where}：檔名要是 YYYY-MM-DD-<來源類型>-<slug>.md")
        meta, _ = parse(path)
        meta = meta or {}
        for field in RAW_FIELDS:
            if not meta.get(field):
                errors.append(f"{where}：frontmatter 缺少 {field}")
        raws[where] = {
            "path": where,
            "title": meta.get("title", path.stem),
            "type": meta.get("type", ""),
            "url": meta.get("source_url", ""),
            "retrieved": meta.get("retrieved", ""),
            "license": meta.get("license", ""),
            "ingested": where in log_text,
            "citedBy": [],
        }
    return raws


def load_pages(raws: dict) -> dict:
    pages = {}
    for path in sorted(WIKI.rglob("*.md")):
        where = rel(path)
        if path.parent == WIKI:
            if path not in (LOG, OUT_INDEX):
                errors.append(f"{where}：條目要放在 wiki/<分類>/ 底下")
            continue
        slug, folder = path.stem, path.parent.name
        meta, body = parse(path)
        if meta is None:
            errors.append(f"{where}：開頭缺少 --- 包起來的 frontmatter")
            continue
        for field in PAGE_FIELDS:
            if field not in meta or (not meta[field] and field not in OPTIONAL):
                errors.append(f"{where}：frontmatter 缺少 {field}")
        if folder not in CAT_IDS:
            errors.append(f"{where}：資料夾 {folder} 不是分類（可用：{', '.join(CAT_IDS)}）")
        if meta.get("category") != folder:
            errors.append(f"{where}：category 是 {meta.get('category')}，但放在 {folder}/ 資料夾")
        if not SLUG_RE.match(slug):
            errors.append(f"{where}：slug 只能用小寫英文、數字和連字號")
        if slug in pages:
            errors.append(f"{where}：slug 和 {pages[slug]['path']} 重複")
        summary = meta.get("summary", "")
        if len(summary) > SUMMARY_MAX:
            errors.append(f"{where}：summary 有 {len(summary)} 字，上限 {SUMMARY_MAX} 字")
        if meta.get("updated") and not DATE_RE.match(meta["updated"]):
            errors.append(f"{where}：updated 要寫成 YYYY-MM-DD")
        for src in meta.get("sources", []):
            if src not in raws:
                errors.append(f"{where}：sources 裡的 {src} 不在 raw/ 中")
            else:
                raws[src]["citedBy"].append(slug)
                if not raws[src]["ingested"]:
                    warnings.append(f"{where}：用了 {src}，但 log.md 還沒有它的整理紀錄")
        links = list(dict.fromkeys(m.strip() for m in LINK_RE.findall(body)))
        if slug in links:
            warnings.append(f"{where}：連結到自己")
            links.remove(slug)
        pages[slug] = {
            "slug": slug,
            "path": where,
            "title": meta.get("title", slug),
            "aka": meta.get("aka", []),
            "category": meta.get("category", folder),
            "summary": summary,
            "sources": meta.get("sources", []),
            "updated": meta.get("updated", ""),
            "links": links,
            "backlinks": [],
        }
    return pages


def check_links(pages: dict, log_text: str) -> None:
    for page in pages.values():
        for target in page["links"]:
            if target in pages:
                pages[target]["backlinks"].append(page["slug"])
            else:
                errors.append(f"{page['path']}：[[{target}]] 連到不存在的條目")
    for target in LINK_RE.findall(log_text):
        if target.strip() not in pages:
            errors.append(f"wiki/log.md：[[{target.strip()}]] 連到不存在的條目")
    for page in pages.values():
        if len(page["links"]) < MIN_LINKS:
            warnings.append(f"{page['path']}：只連出 {len(page['links'])} 個條目，至少要 {MIN_LINKS} 個")
        if not page["backlinks"]:
            warnings.append(f"{page['path']}：沒有任何條目連到它（孤兒條目）")


def write_outputs(pages: dict, raws: dict) -> None:
    order = sorted(pages.values(), key=lambda p: (CAT_IDS.index(p["category"]) if p["category"] in CAT_IDS else 99, p["slug"]))
    categories = [{**c, "count": sum(p["category"] == c["id"] for p in order)} for c in CATEGORIES]
    updated = max((p["updated"] for p in order), default="")
    OUT_JSON.parent.mkdir(exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({"updated": updated, "categories": categories, "pages": order, "raw": list(raws.values())},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    lines = ["# 條目索引", "", "> 由 `tools/build.py` 自動產生，手動修改會被覆蓋。", ""]
    for cat in categories:
        lines.append(f"## {cat['icon']} {cat['name']}（{cat['count']}）")
        lines.append("")
        lines += [f"- [[{p['slug']}]] {p['title']}：{p['summary']}" for p in order if p["category"] == cat["id"]] or ["- （尚無條目）"]
        lines.append("")
    lines.append("## 原始資料")
    lines.append("")
    for raw in raws.values():
        status = "已整理" if raw["ingested"] else "待整理"
        lines.append(f"- `{raw['path']}`（{status}）{raw['title']}")
    OUT_INDEX.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    log_text = LOG.read_text(encoding="utf-8-sig") if LOG.exists() else ""
    if not log_text:
        errors.append("wiki/log.md 不存在或是空的")
    raws = load_raw(log_text)
    pages = load_pages(raws)
    check_links(pages, log_text)
    if not errors:
        write_outputs(pages, raws)

    pending = [r["path"] for r in raws.values() if not r["ingested"]]
    print(f"條目 {len(pages)} 則、原始資料 {len(raws)} 份（待整理 {len(pending)} 份）")
    for path in pending:
        print(f"  待整理：{path}")
    for msg in errors:
        print(f"[錯誤] {msg}")
    for msg in warnings:
        print(f"[警告] {msg}")
    print(f"錯誤 {len(errors)}、警告 {len(warnings)}" + ("" if errors else "，已更新 data/pages.json 與 wiki/index.md"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
