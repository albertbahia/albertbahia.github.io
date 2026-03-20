const PROTECTED_PATH = '/albert-ai-era-matrix.html';
const AUTH_PATH = '/matrix-auth';
const LOGOUT_PATH = '/matrix-logout';
const COOKIE_NAME = 'matrix_auth';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle logout — clear cookie via 200 + meta-refresh so browser processes Set-Cookie before navigating
    if (url.pathname === LOGOUT_PATH) {
      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${PROTECTED_PATH}"></head><body></body></html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
          }
        }
      );
    }

    // Pass through all other paths to GitHub Pages untouched
    if (url.pathname !== PROTECTED_PATH && url.pathname !== AUTH_PATH) {
      return fetch(request);
    }

    // Handle login form submission
    if (request.method === 'POST' && url.pathname === AUTH_PATH) {
      const form = await request.formData();
      const passcode = form.get('passcode') || '';
      if (passcode === env.MATRIX_PASSCODE) {
        const token = await sign('matrix_authenticated', env.COOKIE_SECRET);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': PROTECTED_PATH,
            'Set-Cookie': `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}; Path=/`
          }
        });
      }
      return new Response(loginHtml('Incorrect passcode.'), {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check auth cookie for GET to protected path
    const cookies = request.headers.get('Cookie') || '';
    const token = getCookie(cookies, COOKIE_NAME);
    const valid = token && await verify(token, 'matrix_authenticated', env.COOKIE_SECRET);
    if (!valid) {
      return new Response(loginHtml(), { headers: { 'Content-Type': 'text/html' } });
    }

    // Auth valid — proxy to GitHub Pages
    return fetch(request);
  }
};

// HMAC-SHA256 helpers
async function sign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(token, message, secret) {
  try {
    const expected = await sign(message, secret);
    return token === expected;
  } catch { return false; }
}

function getCookie(header, name) {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function loginHtml(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Access Restricted — Albert Bahia</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { --black:#0a0a0a; --white:#f5f2eb; --amber:#e8a020; --border:#2a2a2a; --red:#e84040; --mid:#1e1e1e; --dim:#6a6a6a; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--black); color:var(--white); font-family:'DM Mono',monospace; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .gate { background:var(--mid); border:1px solid var(--border); padding:40px 48px; max-width:420px; width:100%; }
  .eyebrow { font-size:10px; letter-spacing:0.25em; color:var(--dim); text-transform:uppercase; margin-bottom:16px; }
  h1 { font-family:'Bebas Neue',sans-serif; font-size:48px; line-height:1; margin-bottom:28px; }
  h1 span { color:var(--amber); }
  input { width:100%; background:var(--black); border:1px solid var(--border); color:var(--white); font-family:'DM Mono',monospace; font-size:13px; padding:12px 14px; outline:none; margin-bottom:10px; }
  input:focus { border-color:var(--amber); }
  button { width:100%; background:var(--amber); color:var(--black); border:none; font-family:'DM Mono',monospace; font-size:11px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase; padding:12px; cursor:pointer; }
  button:hover { background:#d4911c; }
  .error { font-size:11px; color:var(--red); letter-spacing:0.1em; margin-top:10px; min-height:16px; }
  .back { display:block; margin-top:20px; font-size:10px; letter-spacing:0.15em; color:var(--dim); text-decoration:none; text-transform:uppercase; }
  .back:hover { color:var(--amber); }
</style>
</head>
<body>
<div class="gate">
  <div class="eyebrow">Access Restricted</div>
  <h1>AI ERA<br><span>MATRIX</span></h1>
  <form method="POST" action="/matrix-auth">
    <input type="password" name="passcode" placeholder="Enter passcode" autocomplete="off" autofocus />
    <button type="submit">Unlock</button>
  </form>
  <div class="error">${error}</div>
  <a href="/" class="back">← albertbahia.ai</a>
</div>
</body>
</html>`;
}
