/* Reading the office's own Facebook Page, read-only.
   The key (FB_TOKEN, a Worker secret) belongs to a Meta Business Suite "system user" with read-only
   permissions (pages_show_list, pages_read_engagement). It can't post, delete or change anything.
   A scheduled scan keeps the latest posts in KV ("fb:posts"); the app asks for the posts in an issue's dates. */
const GRAPH = 'https://graph.facebook.com/v21.0/';

/* the Page's own key: from the system user's list of Pages (or the key is already the Page's) */
async function pageAuth(env){
  const tok = env.FB_TOKEN; if (!tok) throw new Error('Facebook is not connected yet.');
  const r = await fetch(GRAPH + 'me/accounts?fields=id,name,username,access_token&limit=50&access_token=' + encodeURIComponent(tok));
  const j = await r.json();
  if (j.error) throw new Error('Facebook said: ' + (j.error.message || 'error'));
  const want = String(env.FB_PAGE || '').toLowerCase();
  const pages = j.data || [];
  const pg = pages.filter(function(p){ return String(p.username || '').toLowerCase() === want || p.id === env.FB_PAGE || String(p.name || '').toLowerCase() === want; })[0] || (pages.length === 1 ? pages[0] : null);
  if (pg) return { id: pg.id, token: pg.access_token, name: pg.name };
  return { id: 'me', token: tok, name: '' };   // the key may already be the Page's own
}

/* fetch the newest posts (a few pages back) and merge them into what we keep */
export async function fbScan(env){
  const pg = await pageAuth(env);
  let url = GRAPH + pg.id + '/posts?fields=id,message,created_time,permalink_url,full_picture&limit=100&access_token=' + encodeURIComponent(pg.token), got = [];
  for (let i = 0; i < 3 && url; i++){
    const r = await fetch(url), j = await r.json();
    if (j.error) throw new Error('Facebook said: ' + (j.error.message || 'error'));
    got = got.concat(j.data || []); url = j.paging && j.paging.next;
  }
  const keep = {}; (JSON.parse((await env.SUBS.get('fb:posts')) || '[]')).forEach(function(p){ keep[p.id] = p; });
  got.forEach(function(p){ keep[p.id] = { id: p.id, message: String(p.message || '').slice(0, 3000), at: p.created_time, link: p.permalink_url || '', image: p.full_picture || '' }; });
  const all = Object.keys(keep).map(function(k){ return keep[k]; }).sort(function(a, b){ return a.at < b.at ? 1 : -1; }).slice(0, 600);
  await env.SUBS.put('fb:posts', JSON.stringify(all));
  await env.SUBS.put('fb:at', JSON.stringify({ at: Date.now(), page: pg.name, count: got.length }));
  return all;
}

/* the posts in a date range (YYYY-MM-DD, in Philippine time); scans first if nothing is kept yet or if asked */
export async function fbPosts(env, from, to, fresh){
  let all = JSON.parse((await env.SUBS.get('fb:posts')) || 'null');
  if (!all || fresh) all = await fbScan(env);
  const day = function(iso){ return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10); };   // UTC+8
  const meta = JSON.parse((await env.SUBS.get('fb:at')) || '{}');
  return { posts: all.filter(function(p){ const d = day(p.at); return (!from || d >= from) && (!to || d <= to); }).map(function(p){ return Object.assign({ day: day(p.at) }, p); }), checkedAt: meta.at || 0, page: meta.page || '' };
}
