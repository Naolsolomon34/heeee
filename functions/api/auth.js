// functions/api/auth.js
export const onRequest = async ({ request, env, data }) => {
  const url = new URL(request.url);
  const path = url.pathname; // /api/auth/xxx
  const method = request.method;

  if (path.endsWith('/api/auth/me') && method === 'GET') {
    return json({ user: data.user ? { email: data.user.email } : null });
  }
  if (path.endsWith('/api/auth/logout') && method === 'POST') {
    return logout();
  }
  if (path.endsWith('/api/auth/signup') && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;
    if (!email || !password) return json({ error: 'Email and password required' }, 400);
    const key = `user:${email.toLowerCase()}`;
    const exists = await env.ECKV.get(key, 'json');
    if (exists) return json({ error: 'Account already exists' }, 409);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPassword(password, salt);
    await env.ECKV.put(key, JSON.stringify({ email, salt: buf2b64(salt), hash }));

    const token = await sign({ uid: email, email }, env.SESSION_SECRET);
    return withSession({ ok: true, user: { email } }, token);
  }
  if (path.endsWith('/api/auth/login') && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;
    if (!email || !password) return json({ error: 'Email and password required' }, 400);
    const rec = await env.ECKV.get(`user:${email.toLowerCase()}`, 'json');
    if (!rec) return json({ error: 'Invalid credentials' }, 401);
    const ok = await verifyPassword(password, rec.salt, rec.hash);
    if (!ok) return json({ error: 'Invalid credentials' }, 401);

    const token = await sign({ uid: email, email }, env.SESSION_SECRET);
    return withSession({ ok: true, user: { email } }, token);
  }
  return json({ error: 'Not found' }, 404);
};

function json(obj, status=200, headers={}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers }});
}
function withSession(obj, token){
  return json(obj, 200, { 'set-cookie': cookie('ec_session', token, { httpOnly:true, secure:true, sameSite:'Lax', path:'/', maxAge:60*60*24*7 }) });
}
function logout(){
  return new Response(null, { status:204, headers: { 'set-cookie': cookie('ec_session', '', { path:'/', maxAge:0 }) }});
}
function cookie(name, value, opts={}){
  const parts = [`${name}=${value}`];
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

async function sign(payload, secret){
  const enc = new TextEncoder();
  const header = b64url(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  const s = b64urlBytes(new Uint8Array(sig));
  return `${header}.${body}.${s}`;
}
function b64url(json){ return btoa(json).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64urlBytes(buf){ let s=''; buf.forEach(b=>s+=String.fromCharCode(b)); return b64url(s); }
function buf2b64(buf){ let s=''; buf.forEach(b=>s+=String.fromCharCode(b)); return btoa(s); }
async function hashPassword(password, saltB64){
  const enc = new TextEncoder();
  const salt = typeof saltB64 === 'string' ? Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0)) : saltB64;
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations:600000, hash:'SHA-256' }, keyMaterial, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
async function verifyPassword(password, saltB64, hashB64){
  const h = await hashPassword(password, saltB64);
  return timingSafeEqual(h, hashB64);
}
function timingSafeEqual(a,b){ if(!a||!b||a.length!==b.length) return false; let r=0; for (let i=0;i<a.length;i++) r |= a.charCodeAt(i)^b.charCodeAt(i); return r===0; }
