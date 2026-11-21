"""Build the writer's portfolio: index.html and the reading pages in writing/.

Sources: templates/home.html, content/writing/index.json and the .txt files
beside it (blank line between paragraphs, '## ' for a subheading, '- ' for a
list item, [[double brackets]] around a sentence to highlight).

Run from anywhere:  python3 scripts/build-site.py
"""
import html, json, math, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "content" / "writing"
V = "20261121b"          # bump when css/writer.css or js/writer.js change

data = json.loads((SRC / "index.json").read_text(encoding="utf-8"))
GROUPS, PIECES, LOGOS = data["groups"], data["pieces"], data["logos"]
group_label = {g["id"]: g["label"] for g in GROUPS}
esc = html.escape


def words_in(text):
    plain = re.sub(r"^(## |- )", "", text.replace("[[", "").replace("]]", ""), flags=re.M)
    return len(re.findall(r"\S+", plain))


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


def fmt(n):
    return f"{n:,}"


def client_cell(p, prefix=""):
    logo = p.get("logo")
    if logo:
        l = LOGOS[logo]
        return f'<img src="{prefix}images/clients/{logo}.webp" alt="{esc(l["alt"])}" width="{l["w"]}" height="{l["h"]}" loading="lazy">'
    return esc(p["client"])


for p in PIECES:
    if p.get("file"):
        p["text"] = (SRC / p["file"]).read_text(encoding="utf-8")
        p["words"] = words_in(p["text"])
    p["page"] = bool(p.get("file"))

# ---------------------------------------------------------------- the home page
rows = []
for p in PIECES:
    if p["page"]:
        href, attrs, where = f'writing/{p["slug"]}/', "", ""
    elif p.get("href"):
        href, attrs = p["href"], ' target="_blank" rel="noopener"'
        where = f'<span class="work-where">Opens on {esc(p["published"].split(",")[0])}</span>'
    else:
        href, attrs, where = p["home_href"], "", '<span class="work-where">Shown above</span>'
    rows.append(f'''            <li class="work-row" data-group="{p["group"]}">
              <a class="work-link" href="{href}"{attrs}>
                <span class="work-words">{fmt(p["words"])}<i> words</i></span>
                <span class="work-main"><span class="work-title"><b>{esc(p["title"], quote=False)}</b></span><span class="work-dek">{esc(p["dek"], quote=False)}</span>{where}</span>
                <span class="work-cell work-format"><em>Format</em>{esc(p["format"])}</span>
                <span class="work-cell work-client"><em>Client</em>{client_cell(p)}</span>
                <span class="work-cell work-pub"><em>Published</em>{esc(p["published"])}</span>
              </a>
            </li>''')

filters = [f'            <button type="button" data-filter="all" aria-pressed="true">All<span>{len(PIECES)}</span></button>']
for g in GROUPS:
    n = sum(1 for p in PIECES if p["group"] == g["id"])
    filters.append(f'            <button type="button" data-filter="{g["id"]}" aria-pressed="false">{esc(g["label"])}<span>{n}</span></button>')

essay = next(p for p in PIECES if p["slug"] == "blood-books-and-bots")
keys = re.findall(r"\[\[(.+?)\]\]", essay["text"])
keys = [k[0].upper() + k[1:] for k in keys]
essay_lines = "\n".join(f"              <li>{esc(k, quote=False)}</li>" for k in keys)
lines_words = sum(len(k.split()) for k in keys)

home = (ROOT / "templates" / "home.html").read_text(encoding="utf-8")
for key, value in {
    "{{V}}": V,
    "{{COUNT}}": str(len(PIECES)),
    "{{WORK_ROWS}}": "\n".join(rows),
    "{{FILTERS}}": "\n".join(filters),
    "{{ESSAY_LINES}}": essay_lines,
    "{{ESSAY_LINES_WORDS}}": str(lines_words),
    "{{ESSAY_WORDS}}": fmt(essay["words"]),
    "{{ESSAY_FULL}}": to_html(essay["text"], "              "),
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
      <a href="../../#writing">All writing</a>
      <a href="../../#services">Services</a>
      <a class="top-cv" href="../../cv/Mike-Whyle-CV-2026.pdf" download="Mike-Whyle-CV-2026.pdf">CV <span aria-hidden="true">&darr;</span></a>
    </nav>
  </header>
  <main>
    <article id="piece">
      <section class="piece-head">
        <div class="lane">
          <p class="note">{words} words<br>{minutes} min read</p>
          <div>
            <h1 class="piece-title">{title}</h1>
            <p class="piece-dek">{dek}</p>{credit}
            <dl class="cells">
              <div><dt>Format</dt><dd>{format}</dd></div>
              <div><dt>Client</dt><dd>{client}</dd></div>
              <div><dt>Published</dt><dd>{published}</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <section class="piece-body">
        <div class="lane">
          <p class="note" id="read-count">0 of {words} words</p>
          <div class="prose">
{body}
          </div>
        </div>
      </section>
    </article>
    <section class="piece-foot">
      <div class="lane">
        <span class="note-gap"></span>
        <div class="foot-box">{original}
          <div class="actions">
            <a class="btn btn-ink" href="../../#writing">All writing</a>
            <a class="btn" href="mailto:mikewhyle@gmail.com">Email Mike</a>
            <a class="btn" href="../../cv/Mike-Whyle-CV-2026.pdf" download="Mike-Whyle-CV-2026.pdf">CV <small>PDF</small></a>
          </div>
          <a class="next" href="../{next_slug}/"><small>Next: {next_format}, {next_client}</small><b>{next_title}</b></a>
        </div>
      </div>
    </section>
  </main>
  <footer class="foot">
    <div class="lane">
      <span class="note-gap"></span>
      <div class="foot-inner">
        <p>&copy; 2026 Mike Whyle. Cape Town.</p>
        <nav aria-label="More">
          <a href="../../">Home</a>
          <a href="../../#writing">Writing</a>
          <a href="../../#services">Services</a>
          <a href="../../#film">Film and design</a>
        </nav>
      </div>
    </div>
  </footer>
  <script src="../../js/writer.js?v={v}" defer></script>
</body>
</html>
'''

pages = [p for p in PIECES if p["page"]]
for i, p in enumerate(pages):
    nxt = pages[(i + 1) % len(pages)]
    credit = p.get("credit") or (f'Ghostwritten for {p["client"]}.' if p["group"] == "oped" else "")
    credit = f'\n            <p class="piece-credit">{esc(credit, quote=False)}</p>' if credit else ""
    original = ""
    if p.get("original"):
        original = f'\n          <p>Read the published version in <a class="plain" href="{esc(p["original"])}" target="_blank" rel="noopener">{esc(p["original_label"])}</a>.</p>'
    page = PIECE.format(
        file=p["file"], slug=p["slug"], v=V,
        title=esc(p["title"], quote=False), title_plain=esc(p["title"].strip("“”")),
        desc=esc(f'{p["dek"]} {p["format"]} by Mike Whyle; {p["client"]}; {p["published"]}.'),
        dek=esc(p["dek"], quote=False), credit=credit,
        words=fmt(p["words"]), minutes=max(1, math.ceil(p["words"] / 230)),
        format=esc(p["format"]), client=client_cell(p, "../../"), published=esc(p["published"]),
        body=to_html(p["text"], "            "), original=original,
        next_slug=nxt["slug"], next_title=esc(nxt["title"], quote=False),
        next_format=esc(nxt["format"]), next_client=esc(nxt["client"]),
    )
    out = ROOT / "writing" / p["slug"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(page, encoding="utf-8")

# writing/ itself points at the index on the home page
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
  <p style="padding: 3rem 2rem;">The writing is on the home page. <a href="../#writing">Continue</a></p>
</body>
</html>
''', encoding="utf-8")

print(f"Built index.html and {len(pages)} reading pages. Essay: {essay['words']} words; key lines: {lines_words} words.")
for p in PIECES:
    print(f'  {p["words"]:>5}  {p["group"]:<8} {p["title"]}')
