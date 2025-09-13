// functions/api/docs.js
export const onRequest = async ({ request, env, data }) => {
  if (!data.user) return json({ error: 'Unauthorized' }, 401);

  const email = data.user.email.toLowerCase();
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const listKey = `docs:${email}`;
    const list = await env.ECKV.get(listKey, 'json') || [];
    return json({ docs: list });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(()=> ({}));
    const { text, html, meta } = body;
    if (!text) return json({ error: 'Missing text' }, 400);

    const listKey = `docs:${email}`;
    const list = await env.ECKV.get(listKey, 'json') || [];
    const doc = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      preview: String(text).slice(0,180),
      data: { text, html: html || '', meta: meta || {} }
    };
    list.unshift(doc);
    await env.ECKV.put(listKey, JSON.stringify(list.slice(0,50)));
    return json({ ok: true, id: doc.id });
  }

  return json({ error: 'Method not allowed' }, 405);
};

function json(obj, status=200){
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type':'application/json' }});
}
