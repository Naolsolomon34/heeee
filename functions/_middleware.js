// functions/_middleware.js
export const onRequest = async ({ request, env, data, next }) => {
  data.user = null;
  try {
    const cookies = Object.fromEntries((request.headers.get('cookie') || '')
      .split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x[0]));
    const token = cookies.ec_session;
    if (token) {
      const payload = await verify(token, env.SESSION_SECRET);
      if (payload && payload.uid) data.user = payload; // { uid, email }
    }
  } catch (_) {}
  return next();
};

async function verify(token, secret) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const mac = await hmac(`${h}.${p}`, secret);
  if (timingSafeEqual(mac, s)) return JSON.parse(atobURL(p));
  return null;
}

function atobURL(s){ return atob(s.replace(/-/g,'+').replace(/_/g,'/')); }
async function hmac(input, secret){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function timingSafeEqual(a,b){ if(!a||!b||a.length!==b.length) return false; let r=0; for (let i=0;i<a.length;i++) r |= a.charCodeAt(i)^b.charCodeAt(i); return r===0; }
