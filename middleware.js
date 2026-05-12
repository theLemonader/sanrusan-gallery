// Vercel Edge Middleware — protects /artists with a shared password.
// Password is stored as env var OUTREACH_PASSWORD (set in Vercel project settings).
// Two ways for the user to enter:
//   1) Visit /artists  -> sees login page, types password
//   2) Visit /artists?pwd=SECRET -> auto-login, cookie set, clean URL
//
// Once authenticated a cookie is set for 30 days.

export const config = {
  matcher: ['/artists', '/artists/:path*'],
};

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(request) {
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
