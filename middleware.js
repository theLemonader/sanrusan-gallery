// Vercel Edge Middleware — password gates for two areas.
//
// /preview — the full site while the public homepage shows "Coming soon".
//   Password entered through a POST form (never in the URL). The repo is public, so the code
//   only holds a salted SHA-256 of the password; setting PREVIEW_PASSWORD in Vercel overrides it.
//
// /artists — outreach page, password in env var OUTREACH_PASSWORD.
//   1) Visit /artists  -> sees login page, types password
//   2) Visit /artists?pwd=SECRET -> auto-login, cookie set, clean URL
//
// Once authenticated a cookie is set for 30 days.

export const config = {
  matcher: ['/artists', '/artists/:path*', '/preview', '/preview/:path*'],
};

const PREVIEW_SALT = 'sanrusan-preview:';
const PREVIEW_HASH = 'be56136f22acd671052fe07c99e44e1302c4faa6fed0316126083d59d22e1050';

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  if (pathname === '/preview' || pathname.startsWith('/preview/')) return previewGate(request);
  return artistsGate(request);
}

async function previewGate(request) {
  const url = new URL(request.url);
  const envPassword = (typeof process !== 'undefined' && process.env && process.env.PREVIEW_PASSWORD) || '';
  const expectedHash = envPassword ? await sha256Hex(PREVIEW_SALT + envPassword) : PREVIEW_HASH;
  const cookieToken = await sha256Hex('cookie:' + expectedHash);

  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)preview_auth=([a-f0-9]+)/);
  if (cookieMatch && safeEqual(cookieMatch[1], cookieToken)) return;

  let wrong = false;
  if (request.method === 'POST') {
    let supplied = '';
    try {
      const form = await request.formData();
      supplied = String(form.get('password') || '').trim();
    } catch (_) {}
    if (supplied && safeEqual(await sha256Hex(PREVIEW_SALT + supplied), expectedHash)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname + url.search,
          'Set-Cookie': `preview_auth=${cookieToken}; Path=/preview; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`,
          'Cache-Control': 'no-store',
        },
      });
    }
    wrong = true;
  }

  const html = PREVIEW_LOGIN_HTML.replace('{{ERROR}}', wrong ? '<p class="error" role="alert">Incorrect password</p>' : '');
  return new Response(html, {
    status: wrong ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

const PREVIEW_LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>SANRUSAN — Private preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    background: #f3f0ea;
    color: #161513;
    font-family: "Spline Sans Mono", ui-monospace, monospace;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    min-height: 100vh;
    min-height: 100svh;
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: clamp(1.25rem, 3vh, 2rem) clamp(1.25rem, 4vw, 3.5rem);
  }
  .row {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem 2rem;
    font-size: 0.64rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #7a756c;
  }
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 2.4rem;
  }
  .logo { width: min(420px, 72vw); height: auto; animation: rise 1.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
  form {
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    animation: rise 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
  }
  label {
    font-size: 0.64rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #7a756c;
  }
  input {
    appearance: none;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(22, 21, 19, 0.25);
    border-radius: 0;
    color: #161513;
    font: inherit;
    font-size: 1rem;
    letter-spacing: 0.2em;
    text-align: center;
    padding: 0.7rem 0.2rem;
    outline: none;
    transition: border-color 0.3s ease;
  }
  input:focus { border-color: #161513; }
  button {
    appearance: none;
    border: 1px solid #161513;
    background: #161513;
    color: #f3f0ea;
    font: inherit;
    font-size: 0.66rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    padding: 0.95rem;
    cursor: pointer;
    transition: background 0.3s ease, color 0.3s ease;
  }
  button:hover { background: transparent; color: #161513; }
  .error {
    font-size: 0.64rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #9a3b2e;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } }
  @media (prefers-reduced-motion: reduce) { .logo, form { animation: none; } }
</style>
</head>
<body>
  <div class="page">
    <div class="row"><span>Collectible Design Gallery</span><span>Private preview</span></div>
    <main>
      <img class="logo" src="/assets/logo-ink.png" alt="SANRUSAN">
      <form method="POST">
        <label for="password">Password</label>
        <input id="password" type="password" name="password" autocomplete="current-password" autofocus required>
        <button type="submit">Enter</button>
        {{ERROR}}
      </form>
    </main>
    <div class="row"><span>Bucharest &mdash; 2026</span><span>contact@sanrusan.gallery</span></div>
  </div>
</body>
</html>`;

async function artistsGate(request) {
  const url = new URL(request.url);
  const password = (typeof process !== 'undefined' && process.env && process.env.OUTREACH_PASSWORD) || '';

  if (!password) return;

  // Tile images are not sensitive; let them through unauthenticated.
  if (url.pathname.startsWith('/artists/tiles/')) return;

  const cookieValue = password; // cookie just needs to match the password
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/(?:^|; )outreach_auth=([^;]+)/);
  if (cookieMatch && cookieMatch[1] === cookieValue) return;

  // Derived share token: 32-hex-char prefix of SHA-256(password).
  // This way share links don't reveal the actual password.
  const shareToken = (await sha256Hex(password)).slice(0, 32);

  const suppliedPwd = url.searchParams.get('pwd');
  const suppliedKey = url.searchParams.get('k');

  // Accept either the plain password (typed via form) or the derived token (in share links)
  const okPwd = suppliedPwd && suppliedPwd === password;
  const okKey = suppliedKey && suppliedKey === shareToken;

  if (okPwd || okKey) {
    url.searchParams.delete('pwd');
    url.searchParams.delete('k');
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + (url.search || ''),
        'Set-Cookie': `outreach_auth=${cookieValue}; Path=/artists; Max-Age=2592000; HttpOnly; SameSite=Strict; Secure`,
      },
    });
  }

  // Login page (error if password was supplied incorrectly)
  const wrong = suppliedPwd || suppliedKey;
  const errorBlock = wrong ? '<p class="error show">Incorrect password</p>' : '';
  const html = LOGIN_HTML.replace('{{ERROR}}', errorBlock);
  return new Response(html, {
    status: wrong ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>SANRUSAN · Access</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    height: 100%;
    background: #0a0a0a;
    color: #fff;
    font-family: 'Courier Prime', monospace;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }
  .brand {
    font-family: 'Avenir Next', 'Avenir', 'Jost', sans-serif;
    font-weight: 300;
    font-size: clamp(2rem, 7vw, 3.5rem);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.85rem;
  }
  .subtitle {
    font-size: 0.72rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 3rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    width: 100%;
    max-width: 320px;
  }
  .label {
    font-size: 0.65rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-bottom: 0.3rem;
  }
  input[type="password"] {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    padding: 0.7rem 0.2rem;
    font-family: inherit;
    font-size: 1rem;
    letter-spacing: 0.05em;
    outline: none;
    text-align: center;
    transition: border-color 0.15s ease;
  }
  input[type="password"]:focus { border-color: #fff; }
  button {
    background: #fff;
    color: #0a0a0a;
    border: none;
    padding: 0.85rem;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.15s ease;
    margin-top: 0.6rem;
  }
  button:hover { opacity: 0.85; }
  .error {
    color: #ff6b6b;
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-top: 1rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .error.show { opacity: 1; }
  .foot {
    margin-top: 4rem;
    font-size: 0.6rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
  }
</style>
</head>
<body>
  <div class="wrap">
    <h1 class="brand">SANRUSAN</h1>
    <p class="subtitle">Restricted · Outreach</p>
    <form method="GET">
      <span class="label">Password</span>
      <input type="password" name="pwd" autocomplete="current-password" autofocus required>
      <button type="submit">Enter</button>
      {{ERROR}}
    </form>
    <p class="foot">sanrusan.gallery</p>
  </div>
</body>
</html>`;
