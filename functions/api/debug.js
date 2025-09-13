export const onRequest = async ({ env }) => {
  return new Response(JSON.stringify({
    ok: true,
    hasKV: !!env.ECKV,
    hasSecret: !!env.SESSION_SECRET
  }), { status: 200, headers: { 'content-type': 'application/json' }});
};
