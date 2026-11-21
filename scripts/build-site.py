"""Build the writer's portfolio: index.html and the reading pages in writing/.

Sources: templates/home.html, content/writing/index.json and the .txt files
beside it (blank line between paragraphs, '## ' for a subheading, '- ' for a
list item, [[double brackets]] around a sentence to highlight).

Run from anywhere:  python3 scripts/build-site.py
"""
import html, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "content" / "writing"
V = "20261121h"          # bump when css/writer.css or js/writer.js change

data = json.loads((SRC / "index.json").read_text(encoding="utf-8"))
GROUPS, PIECES, LOGOS = data["groups"], data["pieces"], data["logos"]
esc = html.escape

# the cards' cursors and their resting tilts, dealt round in turn
COLOURS = ["#3d7f86", "#6b2a19", "#485068", "#8d5f24", "#5a6b3a"]
TILTS = [-1.1, 0.9, 1.3, -0.7, 0.6, -0.9, 1.0, -0.5]
CURSOR = '<svg viewBox="0 0 16 18"><path d="M1 1l13.2 7.4-6.1 1.5-3 5.7z"/></svg>'


def inline(text):
    text = esc(text, quote=False)
    return re.sub(r"\[\[(.+?)\]\]", r'<mark class="hl">\1</mark>', text)


def to_html(text, indent="        "):
    out, items = [], []
    def flush():
        if items:
            out.append(indent + "<ul>\n" + "\n".join(f"{indent}  <li>{inline(i)}</li>" for i in items) + f"\n{indent}</ul>")
            items.clear()
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = block.strip().split("\n")
        if all(l.startswith("- ") for l in lines):
            items.extend(l[2:] for l in lines)
            continue
        flush()
        block = " ".join(lines)
        if block.startswith("## "):
            out.append(f"{indent}<h2>{inline(block[3:])}</h2>")
        else:
            out.append(f"{indent}<p>{inline(block)}</p>")
    flush()
    return "\n".join(out)


def client_cell(p, prefix=""):
    logo = p.get("logo")
    if logo:
        l = LOGOS[logo]
        return f'<img src="{prefix}images/clients/{logo}.webp" alt="{esc(l["alt"])}" width="{l["w"]}" height="{l["h"]}" loading="lazy">'
    return esc(p["client"])


for p in PIECES:
    if p.get("file"):
        p["text"] = (SRC / p["file"]).read_text(encoding="utf-8")
    p["page"] = bool(p.get("file"))

# ---------------------------------------------------------------- the home page
cards = []
for i, p in enumerate(PIECES):
    passage = "".join(f"<p>{inline(line)}</p>" for line in p["passage"].split("\n"))
    top = f'<div class="w-top"><span class="w-format">{esc(p["format"])}</span><span class="w-client">{client_cell(p)}</span></div>'
    foot = f'<div class="w-foot"><strong class="w-title">{esc(p["title"], quote=False)}</strong><span class="w-meta">{esc(p["published"])}</span>'
    cursor = f'<span class="t-cursor" style="--d:{-(i * 1.7) % 7:.1f}s" aria-hidden="true">{CURSOR}<b>{esc(p["tag"])}</b></span>'
    style = f'--tilt:{TILTS[i % len(TILTS)]}deg;--c:{COLOURS[i % len(COLOURS)]}'
    if p["page"]:
        open_tag, close_tag = f'<a class="card w-card" href="writing/{p["slug"]}/" data-cursor="Read" style="{style}">', "</a>"
        foot += '<span class="w-go">Read</span></div>'
    elif p.get("href"):
        where = p["published"].split(",")[0]
        open_tag, close_tag = f'<a class="card w-card" href="{p["href"]}" target="_blank" rel="noopener" data-cursor="Read" style="{style}">', "</a>"
        foot += f'<span class="w-go">Read on {esc(where)}</span></div>'
    else:
        open_tag, close_tag = f'<div class="card w-card" style="{style}">', "</div>"
        foot += "</div>"
    cards.append(f'''          <div class="w-item" role="listitem" data-group="{p["group"]}">
            {open_tag}
              {cursor}
              {top}
              <div class="w-passage">{passage}</div>
              {foot}
            {close_tag}
          </div>''')

filters = [f'          <button type="button" data-filter="all" aria-pressed="true">All<span>{len(PIECES)}</span></button>']
for g in GROUPS:
    n = sum(1 for p in PIECES if p["group"] == g["id"])
    if n:
        filters.append(f'          <button type="button" data-filter="{g["id"]}" aria-pressed="false">{esc(g["label"])}<span>{n}</span></button>')

home = (ROOT / "templates" / "home.html").read_text(encoding="utf-8")
for key, value in {
    "{{V}}": V,
    "{{COUNT}}": str(len(PIECES)),
    "{{CARDS}}": "\n".join(cards),
    "{{FILTERS}}": "\n".join(filters),
}.items():
    home = home.replace(key, value)
assert "{{" not in home, re.findall(r"\{\{.*?\}\}", home)
(ROOT / "index.html").write_text(home, encoding="utf-8")

# ------------------------------------------------------------ the reading pages
PIECE = '''<!DOCTYPE html>
<!-- Built by scripts/build-site.py from content/writing/{file}. Edit that, then rebuild. -->
<html lang="en-ZA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_plain} | Mike Whyle</title>
  <meta name="description" content="{desc}">
  <meta property="og:title" content="{title_plain}">
  <meta property="og:description" content="{desc}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://portfolio.mikewhyle.com/assets/brand/og-writer.jpg">
  <link rel="canonical" href="https://portfolio.mikewhyle.com/writing/{slug}/">
  <link rel="icon" href="../../favicon.png" type="image/png">
  <meta name="theme-color" content="#ece7db">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../css/writer.css?v={v}">
</head>
<body class="piece-page">
  <a class="skip" href="#piece">Skip to the piece</a>
  <div class="progress" aria-hidden="true"><span id="progress-bar"></span></div>
  <header class="top">
    <a class="top-name" href="../../">Mike Whyle</a>
    <nav class="top-nav" aria-label="Site">
      <a href="../../#writing">Writing</a>
      <a class="top-cv" href="../../cv/Mike-Whyle-CV-2026.pdf" download="Mike-Whyle-CV-2026.pdf">CV <span aria-hidden="true">&darr;</span></a>
    </nav>
  </header>
  <main>
    <article id="piece" class="piece">
      <header class="piece-head">
        <h1 class="piece-title">{title}</h1>{dek}{credit}
        <dl class="cells">
          <div><dt>Format</dt><dd>{format}</dd></div>
          <div><dt>Client</dt><dd>{client}</dd></div>
          <div><dt>Published</dt><dd>{published}</dd></div>
        </dl>
      </header>
      <div class="prose">
{body}
      </div>
      <footer class="piece-foot">{original}
        <div class="actions">
          <a class="btn btn-ink" href="../../#writing">All writing</a>
          <a class="btn" href="mailto:mikewhyle@gmail.com">Email</a>
          <a class="btn" href="../../cv/Mike-Whyle-CV-2026.pdf" download="Mike-Whyle-CV-2026.pdf">CV <small>PDF</small></a>
        </div>
        <a class="next" href="../{next_slug}/"><small>Next</small><b>{next_title}</b></a>
      </footer>
    </article>
  </main>
  <script src="../../js/writer.js?v={v}" defer></script>
</body>
</html>
'''

pages = [p for p in PIECES if p["page"]]
for i, p in enumerate(pages):
    nxt = pages[(i + 1) % len(pages)]
    dek = f'\n        <p class="piece-dek">{esc(p["dek"], quote=False)}</p>' if p.get("dek") else ""
    credit = f'\n        <p class="piece-credit">{esc(p["credit"], quote=False)}</p>' if p.get("credit") else ""
    original = ""
    if p.get("original"):
        original = f'\n        <p>Read the published version in <a class="plain" href="{esc(p["original"])}" target="_blank" rel="noopener">{esc(p["original_label"])}</a>.</p>'
    page = PIECE.format(
        file=p["file"], slug=p["slug"], v=V,
        title=esc(p["title"], quote=False), title_plain=esc(p["title"].strip("“”")),
        desc=esc(f'{p["title"].strip("“”")}. {p["format"]}; {p["client"]}; {p["published"]}. By Mike Whyle.'),
        dek=dek, credit=credit,
        format=esc(p["format"]), client=client_cell(p, "../../"), published=esc(p["published"]),
        body=to_html(p["text"], "        "), original=original,
        next_slug=nxt["slug"], next_title=esc(nxt["title"], quote=False),
    )
    out = ROOT / "writing" / p["slug"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")

# writing/ itself points at the cards on the home page
(ROOT / "writing" / "index.html").write_text('''<!DOCTYPE html>
<html lang="en-ZA">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Writing | Mike Whyle</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="https://portfolio.mikewhyle.com/#writing">
  <meta http-equiv="refresh" content="0; url=../#writing">
  <link rel="icon" href="../favicon.png" type="image/png">
  <style>html { background: #ece7db; } body { margin: 0; color: #1c1104; font-family: Georgia, serif; }</style>
  <script>location.replace('../#writing');</script>
</head>
<body>
  <p style="padding: 3rem 2rem;"><a href="../#writing">Writing</a></p>
</body>
</html>
''', encoding="utf-8")

print(f"Built index.html with {len(PIECES)} cards, and {len(pages)} reading pages.")
