// Reddit Media Search — Cloudflare Worker proxy
// Deploy at: https://workers.cloudflare.com
// 1. Create a new Worker, paste this file, deploy
// 2. Copy the worker URL (e.g. https://reddit-proxy.yourname.workers.dev)
// 3. Paste it into the app's setup prompt

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const q      = url.searchParams.get('q') ?? '';
    const sort   = url.searchParams.get('sort') ?? 'relevance';
    const limit  = url.searchParams.get('limit') ?? '100';
    const after  = url.searchParams.get('after') ?? '';
    const over18 = url.searchParams.get('include_over_18') ?? 'on';
    const safe   = url.searchParams.get('safe_search') ?? 'off';

    if (!q) return json({ error: 'missing q param' }, 400);

    const redditParams = new URLSearchParams({
      q, sort, limit, type: 'link', raw_json: '1',
      include_over_18: over18, safe_search: safe,
    });
    if (after) redditParams.set('after', after);

    const redditUrl = `https://www.reddit.com/search.json?${redditParams}`;

    const resp = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'RedditMediaSearch/1.0 (Cloudflare Worker)',
        'Accept': 'application/json',
      },
      cf: { cacheTtl: 60, cacheEverything: false },
    });

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
