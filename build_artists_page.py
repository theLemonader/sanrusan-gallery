#!/usr/bin/env python3
"""Generate a public, shareable web page listing all 38 artists.
Deploys to sanrusan.gallery/artists via Vercel auto-deploy on git push.
"""

import shutil
from pathlib import Path
import sys, importlib.util

# Load ARTISTS list from build_artists_xlsx.py
spec = importlib.util.spec_from_file_location("ax", "/Users/san/sanrusan/build_artists_xlsx.py")
ax = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ax)
ARTISTS = ax.ARTISTS

OUT_DIR = Path("/Users/san/sanrusan/artists")
OUT_DIR.mkdir(exist_ok=True)
TILES_OUT = OUT_DIR / "tiles"
TILES_OUT.mkdir(exist_ok=True)

# Copy tiles into public folder
TILES_SRC = Path("/Users/san/sanrusan/artisti/tiles")
for f in TILES_SRC.glob("*.jpg"):
    dst = TILES_OUT / f.name
    if not dst.exists() or dst.stat().st_mtime < f.stat().st_mtime:
        shutil.copy2(f, dst)
print(f"Copied tiles into {TILES_OUT}")


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def url_or(s: str) -> str:
    if not s: return ""
    s = s.strip()
    if s.startswith("http"): return s
    # Extract first token (some entries have "site / othersite")
    s = s.split("/")[0] if " " not in s else s
    s = s.split(" ")[0]
    return "https://" + s if s and "." in s else ""


def mailto(s: str) -> str:
    if not s: return ""
    if "@" in s and " " not in s and "via" not in s.lower() and "instagram" not in s.lower():
        return "mailto:" + s
    return ""


def insta_url(handle: str) -> str:
    h = (handle or "").lstrip("@").strip()
    return f"https://instagram.com/{h}" if h else ""


def render_card(a):
    tile = f"/artists/tiles/{a['img'].replace('.PNG', '.jpg')}"
    name = esc(a.get("name", ""))
    studio = esc(a.get("studio", ""))
    handle = a.get("handle", "")
    loc = esc(a.get("location", ""))
    tags = esc(a.get("tags", ""))
    approach = esc(a.get("approach", ""))
    email = a.get("email", "") or ""
    phone = a.get("phone", "") or ""
    website = a.get("website", "") or ""
    address = esc(a.get("address", ""))

    pills = []
    if handle:
        pills.append(f'<a class="pill" href="{esc(insta_url(handle))}" target="_blank" rel="noopener">IG</a>')
    if url_or(website):
        pills.append(f'<a class="pill" href="{esc(url_or(website))}" target="_blank" rel="noopener">Web</a>')
    if mailto(email):
        pills.append(f'<a class="pill pill-strong" href="{esc(mailto(email))}">Email</a>')
    if phone:
        tel = "tel:" + phone.replace(" ", "").replace("(", "").replace(")", "")
        pills.append(f'<a class="pill" href="{esc(tel)}">Tel</a>')

    email_display = ""
    if email:
        if mailto(email):
            email_display = f'<div class="meta-row"><span class="meta-key">email</span><a class="meta-val link" href="{esc(mailto(email))}">{esc(email)}</a></div>'
        else:
            email_display = f'<div class="meta-row"><span class="meta-key">contact</span><span class="meta-val">{esc(email)}</span></div>'

    phone_display = f'<div class="meta-row"><span class="meta-key">phone</span><span class="meta-val">{esc(phone)}</span></div>' if phone else ""
    addr_display = f'<div class="meta-row"><span class="meta-key">address</span><span class="meta-val">{address}</span></div>' if address else ""
    handle_display = f'<div class="meta-row"><span class="meta-key">ig</span><a class="meta-val link" href="{esc(insta_url(handle))}" target="_blank" rel="noopener">{esc(handle)}</a></div>' if handle else ""
    web_display = f'<div class="meta-row"><span class="meta-key">web</span><a class="meta-val link" href="{esc(url_or(website))}" target="_blank" rel="noopener">{esc(website)}</a></div>' if website else ""

    search_text = " ".join([name, studio, handle, loc, tags, approach]).lower()

    return f'''      <article class="card" data-search="{esc(search_text)}">
        <div class="tile" style="background-image:url('{tile}')"></div>
        <div class="body">
          <h2 class="studio">{studio or name}</h2>
          <p class="name-line">{name}{(" · " + loc) if loc else ""}</p>
          {f'<p class="tags">{tags}</p>' if tags else ""}
          <div class="meta">
            {handle_display}
            {web_display}
            {email_display}
            {phone_display}
            {addr_display}
          </div>
          {f'<p class="approach">{approach}</p>' if approach else ""}
          <div class="pills">{''.join(pills)}</div>
        </div>
      </article>
'''


cards_html = "\n".join(render_card(a) for a in ARTISTS)

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#000000">
<meta name="robots" content="noindex,nofollow">
<title>SANRUSAN · Outreach</title>
<meta name="description" content="SANRUSAN curated outreach list — functional art studios and makers.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
<style>
  :root {{
    --ink: #ffffff;
    --ink-soft: rgba(255,255,255,0.72);
    --ink-faint: rgba(255,255,255,0.42);
    --hair: rgba(255,255,255,0.12);
    --bg: #0a0a0a;
    --card: rgba(255,255,255,0.025);
    --card-hover: rgba(255,255,255,0.05);
  }}

  * {{ margin:0; padding:0; box-sizing:border-box; }}
  html, body {{
    background: var(--bg);
    color: var(--ink);
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100%;
  }}

  a {{ color: inherit; text-decoration: none; }}

  /* Header */
  .header {{
    padding: 4rem 2rem 2.5rem;
    text-align: center;
    border-bottom: 1px solid var(--hair);
  }}
  .brand {{
    font-family: 'Avenir Next', 'Avenir', 'Jost', system-ui, sans-serif;
    font-weight: 300;
    font-size: clamp(2rem, 6vw, 3.5rem);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 0.85rem;
  }}
  .brand a:hover {{ opacity: 0.7; }}
  .subtitle {{
    font-size: 0.78rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }}
  .meta-strip {{
    margin-top: 1.5rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }}
  .meta-strip span {{ margin: 0 0.6rem; }}

  /* Search */
  .controls {{
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--hair);
  }}
  .search-wrap {{
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    gap: 1rem;
    align-items: center;
  }}
  .search {{
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--hair);
    color: var(--ink);
    padding: 0.6rem 0;
    font-family: inherit;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    outline: none;
    transition: border-color 0.15s ease;
  }}
  .search:focus {{ border-color: var(--ink); }}
  .search::placeholder {{ color: var(--ink-faint); letter-spacing: 0.15em; text-transform: uppercase; font-size: 0.72rem; }}
  .count {{
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
    white-space: nowrap;
  }}

  /* Grid */
  .grid {{
    max-width: 1400px;
    margin: 0 auto;
    padding: 2.5rem 2rem 5rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    gap: 1.5rem;
  }}

  .card {{
    background: var(--card);
    border: 1px solid var(--hair);
    border-radius: 2px;
    overflow: hidden;
    transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  }}
  .card:hover {{
    background: var(--card-hover);
    border-color: rgba(255,255,255,0.22);
    transform: translateY(-2px);
  }}
  .card.hidden {{ display: none; }}

  .tile {{
    aspect-ratio: 1 / 1;
    background-size: cover;
    background-position: center;
    background-color: #181818;
    border-bottom: 1px solid var(--hair);
    filter: grayscale(100%) opacity(0.5);
    transition: filter 0.3s ease;
  }}
  .card:hover .tile {{ filter: grayscale(100%) opacity(0.85); }}

  .body {{
    padding: 1.25rem 1.25rem 1.4rem;
  }}

  .studio {{
    font-family: 'Avenir Next', 'Avenir', 'Jost', system-ui, sans-serif;
    font-weight: 400;
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
    margin-bottom: 0.35rem;
  }}
  .name-line {{
    font-size: 0.72rem;
    color: var(--ink-soft);
    letter-spacing: 0.04em;
    margin-bottom: 0.9rem;
    line-height: 1.4;
  }}
  .tags {{
    font-size: 0.7rem;
    color: var(--ink-soft);
    line-height: 1.55;
    margin-bottom: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px dashed var(--hair);
  }}

  .meta {{ margin-bottom: 0.9rem; }}
  .meta-row {{
    display: flex;
    gap: 0.6rem;
    font-size: 0.68rem;
    line-height: 1.45;
    padding: 0.18rem 0;
  }}
  .meta-key {{
    color: var(--ink-faint);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    flex: 0 0 56px;
    padding-top: 1px;
  }}
  .meta-val {{
    color: var(--ink-soft);
    word-break: break-word;
    flex: 1;
  }}
  .meta-val.link {{ color: var(--ink); border-bottom: 1px solid var(--hair); transition: border-color 0.15s; }}
  .meta-val.link:hover {{ border-color: var(--ink); }}

  .approach {{
    font-size: 0.68rem;
    color: var(--ink-soft);
    line-height: 1.55;
    padding: 0.85rem 0.9rem;
    background: rgba(255,255,255,0.025);
    border-left: 2px solid rgba(255,255,255,0.25);
    margin-bottom: 1rem;
    font-style: italic;
  }}

  .pills {{
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }}
  .pill {{
    font-size: 0.62rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--hair);
    color: var(--ink-soft);
    transition: all 0.15s ease;
  }}
  .pill:hover {{
    border-color: var(--ink);
    color: var(--ink);
  }}
  .pill-strong {{
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
  }}
  .pill-strong:hover {{
    background: transparent;
    color: var(--ink);
  }}

  /* Footer */
  .footer {{
    border-top: 1px solid var(--hair);
    padding: 2rem;
    text-align: center;
    font-size: 0.65rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }}
  .footer a {{ border-bottom: 1px solid var(--hair); }}
  .footer a:hover {{ border-color: var(--ink); color: var(--ink); }}

  /* Empty state */
  .empty {{
    display: none;
    text-align: center;
    padding: 4rem 2rem;
    color: var(--ink-faint);
    font-size: 0.85rem;
    letter-spacing: 0.1em;
  }}
  .empty.show {{ display: block; }}

  /* Mobile */
  @media (max-width: 600px) {{
    .header {{ padding: 3rem 1.5rem 2rem; }}
    .controls {{ padding: 0.85rem 1.25rem; }}
    .search-wrap {{ flex-direction: column; align-items: stretch; gap: 0.5rem; }}
    .grid {{ padding: 1.5rem 1.25rem 3rem; gap: 1rem; grid-template-columns: 1fr; }}
    .meta-strip span {{ margin: 0 0.3rem; display: inline-block; }}
  }}
</style>
</head>
<body>
  <header class="header">
    <h1 class="brand"><a href="/">SANRUSAN</a></h1>
    <p class="subtitle">Outreach · Functional Art</p>
    <p class="meta-strip">
      <span>{len(ARTISTS)} studios</span>·<span>curated 2026</span>·<span>private working list</span>
    </p>
  </header>

  <div class="controls">
    <div class="search-wrap">
      <input id="search" class="search" type="search" placeholder="Search artist · studio · location · tag" autocomplete="off">
      <span class="count" id="count">{len(ARTISTS)} of {len(ARTISTS)}</span>
    </div>
  </div>

  <main class="grid" id="grid">
{cards_html}
  </main>

  <p id="empty" class="empty">No matches.</p>

  <footer class="footer">
    SANRUSAN · <a href="/">sanrusan.gallery</a>
  </footer>

<script>
(() => {{
  const grid = document.getElementById('grid');
  const cards = [...grid.querySelectorAll('.card')];
  const search = document.getElementById('search');
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  const total = cards.length;

  function update() {{
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach(c => {{
      const hay = c.dataset.search || '';
      const ok = !q || hay.includes(q);
      c.classList.toggle('hidden', !ok);
      if (ok) shown++;
    }});
    count.textContent = shown + ' of ' + total;
    empty.classList.toggle('show', shown === 0);
  }}

  search.addEventListener('input', update);
}})();
</script>
</body>
</html>
'''

(OUT_DIR / "index.html").write_text(HTML)
print(f"Wrote {OUT_DIR / 'index.html'} ({len(HTML)} chars)")
