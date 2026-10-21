# -*- coding: utf-8 -*-
"""把 HowToCook 的 markdown 菜谱解析成 App 用的 JSON。"""
import os, re, json, hashlib, shutil

ROOT = r"C:\Desktop\菜单\ht"
OUT = r"C:\Desktop\菜单\CookApp\app\src\main\assets\www"
IMG_OUT = os.path.join(OUT, "img")

CATS = {
    "meat_dish": ("荤菜", "🍖"),
    "vegetable_dish": ("素菜", "🥬"),
    "aquatic": ("水产", "🦐"),
    "soup": ("汤羹", "🍲"),
    "staple": ("主食", "🍚"),
    "breakfast": ("早餐", "🥣"),
    "dessert": ("甜品", "🍰"),
    "drink": ("饮品", "🥤"),
    "condiment": ("调料", "🧂"),
    "semi-finished": ("半成品", "🥟"),
    "template": ("模板", "📄"),
}

def clean(t):
    t = t.replace("\u3000", " ")
    return t.strip()

def strip_md(s):
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = s.replace("**", "").replace("__", "")
    return clean(s)

def parse_file(path, cat_key):
    raw = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    name = os.path.splitext(os.path.basename(path))[0]
    lines = raw.split("\n")

    # 标题
    for ln in lines[:5]:
        m = re.match(r"^#\s+(.*)$", ln)
        if m:
            t = strip_md(m.group(1))
            t = re.sub(r"的做法$", "", t).strip()
            if t:
                name = t
            break

    difficulty, calories = 0, 0
    m = re.search(r"预估烹饪难度[：:]\s*(\S*)", raw)
    if m:
        difficulty = m.group(1).count("★")
    m = re.search(r"预估卡路里[：:]\s*(\d+)", raw)
    if m:
        calories = int(m.group(1))

    # 按 ## 切分
    blocks, cur = [], None
    for ln in lines:
        if re.match(r"^##\s+", ln):
            cur = {"title": strip_md(re.sub(r"^##\s+", "", ln)), "lines": []}
            blocks.append(cur)
        elif cur is not None:
            cur["lines"].append(ln)
        else:
            if not re.match(r"^#\s+", ln):
                blocks.insert(0, {"title": "__intro__", "lines": []}) if not blocks else None
                if blocks and blocks[0]["title"] == "__intro__":
                    blocks[0]["lines"].append(ln)

    intro_lines = []
    for b in blocks:
        if b["title"] == "__intro__":
            intro_lines.extend(b["lines"])

    # 简介：去掉难度/卡路里行
    desc = []
    for ln in intro_lines:
        s = strip_md(ln)
        if not s or s.startswith("预估"):
            continue
        desc.append(s)
    description = " ".join(desc)

    time_text = ""
    m = re.search(r"(?:大概|大约|约|需要)?\s*(?:需要)?\s*([\d.]+)\s*(小时|分钟|min|小时左右)", description)
    if m:
        time_text = f"{m.group(1)}{m.group(2)}"

    ingredients, optional, calc = [], [], []
    steps, tips = [], []
    seen_img = None

    for b in blocks:
        t = b["title"]
        body = b["lines"]

        if "原料" in t:
            sub_opt = False
            for ln in body:
                if re.match(r"^###\s+", ln):
                    sub_opt = "可选" in ln
                    continue
                m = re.match(r"^\s*[-*]\s+(.+)$", ln)
                if m:
                    v = strip_md(m.group(1))
                    if v:
                        (optional if sub_opt else ingredients).append(v)
        elif t.startswith("计算"):
            group = None
            for ln in body:
                m = re.match(r"^\s*[-*]\s+(.+)$", ln)
                if not m:
                    continue
                indent = len(ln) - len(ln.lstrip())
                val = strip_md(m.group(1))
                if not val:
                    continue
                if "=" in val:
                    k, _, v = val.partition("=")
                    calc.append({"group": group, "name": clean(k), "amount": clean(v)})
                elif indent <= 1:
                    group = val
        elif t.startswith("操作") or "步骤" in t:
            group = None
            for ln in body:
                m = re.match(r"^###\s+(.+)$", ln)
                if m:
                    group = strip_md(m.group(1))
                    continue
                if not ln.strip():
                    continue
                m = re.match(r"^\s*\d+[.、)]\s*(.+)$", ln)
                if m:
                    v = clean(m.group(1))
                    if v:
                        steps.append({"group": group, "text": v})
                    continue
                m = re.match(r"^\s*[-*]\s+(.+)$", ln)
                if m:
                    v = clean(m.group(1))
                    if v and not v.startswith("!["):
                        steps.append({"group": group, "text": v})
        elif "附加" in t or "其他" in t:
            for ln in body:
                v = strip_md(ln)
                if not v:
                    continue
                if "遵循本指南" in v or "Pull request" in v or "提出 Issue" in v:
                    continue
                tips.append(v)

        for ln in body:
            m = re.search(r"!\[[^\]]*\]\(([^)]+)\)", ln)
            if m and not seen_img:
                seen_img = m.group(1)

    # 图片
    img_id = None
    cand = None
    if seen_img:
        p = seen_img.split("?")[0]
        if p.startswith("./"):
            p = p[2:]
        c = os.path.normpath(os.path.join(os.path.dirname(path), p))
        if os.path.isfile(c):
            cand = c
    if not cand:
        # 兜底：同目录下的图片（优先与菜名同名）
        d = os.path.dirname(path)
        pics = [f for f in os.listdir(d) if os.path.splitext(f)[1].lower() in
                (".jpg", ".jpeg", ".png", ".webp")]
        if pics:
            same = [f for f in pics if os.path.splitext(f)[0] == name]
            pick = (same or pics)[0]
            cand = os.path.join(d, pick)
    if cand and os.path.splitext(cand)[1].lower() in (".jpg", ".jpeg", ".png", ".webp"):
        img_id = hashlib.md5(path.encode("utf-8")).hexdigest()[:10]
        IMGS.append((cand, img_id))

    dish_id = hashlib.md5((cat_key + "/" + name).encode("utf-8")).hexdigest()[:8]

    return {
        "id": dish_id,
        "name": name,
        "cat": cat_key,
        "desc": description,
        "diff": difficulty,
        "kcal": calories,
        "time": time_text,
        "ing": ingredients,
        "opt": optional,
        "calc": calc,
        "steps": steps,
        "tips": tips,
        "img": img_id,
        "path": os.path.relpath(path, ROOT).replace("\\", "/"),
    }

IMGS = []
recipes = []
for cat_key in CATS:
    d = os.path.join(ROOT, "dishes", cat_key)
    if not os.path.isdir(d):
        continue
    if cat_key == "template":
        continue
    for dirpath, _, files in os.walk(d):
        for f in sorted(files):
            if f.endswith(".md") and not f.startswith("."):
                r = parse_file(os.path.join(dirpath, f), cat_key)
                if r["name"] and r["steps"]:
                    recipes.append(r)

# 去重（同名取路径短的）
seen, uni = set(), []
for r in sorted(recipes, key=lambda x: len(x["path"])):
    if r["name"] in seen:
        continue
    seen.add(r["name"])
    uni.append(r)
recipes = uni

# 技巧
tips_docs = []
tdir = os.path.join(ROOT, "tips")
for f in sorted(os.listdir(tdir)):
    if f.endswith(".md"):
        raw = open(os.path.join(tdir, f), encoding="utf-8").read()
        title = os.path.splitext(f)[0]
        m = re.search(r"^#\s+(.+)$", raw, re.M)
        if m:
            title = m.group(1).strip()
        body = re.sub(r"^#\s+.+$", "", raw, count=1, flags=re.M).strip()
        tips_docs.append({"title": title, "body": body})

cats = []
for k, (label, emoji) in CATS.items():
    n = len([r for r in recipes if r["cat"] == k])
    if n:
        cats.append({"key": k, "label": label, "emoji": emoji, "count": n})

os.makedirs(OUT, exist_ok=True)
os.makedirs(IMG_OUT, exist_ok=True)

data = {
    "version": 1,
    "cats": cats,
    "recipes": recipes,
    "tips": tips_docs,
}
with open(os.path.join(OUT, "data", "recipes.json") if os.path.isdir(os.path.join(OUT, "data")) else os.path.join(OUT, "recipes.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

with open(r"C:\Desktop\菜单\CookApp\imgmap.txt", "w", encoding="utf-8") as f:
    for src, iid in IMGS:
        f.write(f"{iid}\t{src}\n")

print("recipes:", len(recipes), "cats:", len(cats), "tips:", len(tips_docs), "imgs:", len(IMGS))
print("steps avg:", round(sum(len(r["steps"]) for r in recipes) / max(1, len(recipes)), 1))
print("json KB:", round(os.path.getsize(os.path.join(OUT, "recipes.json")) / 1024, 1))
